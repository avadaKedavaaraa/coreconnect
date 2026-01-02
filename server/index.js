
import dotenv from 'dotenv';
import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai'; 
import xss from 'xss';
import { promisify } from 'util';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet'; 
import hpp from 'hpp';

// Load env vars
dotenv.config();

const scryptAsync = promisify(crypto.scrypt);

const app = express();
const PORT = process.env.PORT || 3001;

// --- SECURITY: Trust Render's Proxy ---
// Essential for rate limiting and secure cookies to work behind Render's load balancer
app.set('trust proxy', 1);

// --- SECURITY: Hide Tech Stack ---
app.disable('x-powered-by');

// --- SECURITY: Helmet (Headers) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow connections to Supabase and Self
      connectSrc: ["'self'", process.env.VITE_SUPABASE_URL || "https://*.supabase.co"],
      // Allow Google Fonts
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      // Allow styles from Google Fonts
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Allow images from standard sources
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://cdn.pixabay.com", "https://*.supabase.co"],
      // Frame ancestors - prevent clickjacking but allow iframes if needed
      frameAncestors: ["'self'"],
    },
  },
  // Strict Transport Security (HSTS)
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

// --- SECURITY: Parameter Pollution Protection ---
app.use(hpp());

// --- SECURITY: CORS (Cross-Origin Resource Sharing) ---
// Strictly limit access to your Frontend URL
const allowedOrigins = [
    process.env.FRONTEND_URL, // e.g. https://my-app.vercel.app
    'http://localhost:3000',  // Local Dev
    'http://localhost:5173'   // Vite Dev
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) if necessary, 
    // but for a web app, usually we want to restrict.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS Policy'));
  },
  credentials: true, // Allow Cookies to travel
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization']
}));

// --- SECURITY: Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Strict limit on expensive AI calls
  message: { error: "Oracle connection overloaded. Please wait." }
});

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // Prevent brute force
  message: { error: "Too many login attempts. Account temporarily locked." }
});

// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' })); 
app.use(cookieParser());
app.use(limiter); 

// --- SECURITY: NoSQL Injection Sanitizer (Manual) ---
// Prevents MongoDB/NoSQL injection in req.body/req.query if user switches DBs later, 
// and generally good practice to sanitize inputs.
app.use((req, res, next) => {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove $ signs from start of keys (NoSQL operators)
                if (key.startsWith('$')) {
                    delete obj[key];
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    next();
});

// --- SUPABASE CLIENT ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Supabase credentials missing in Server Environment.");
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey, 
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// --- GEMINI CLIENT ---
let aiClient = null;
if (process.env.API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    console.log("AI System Online.");
  } catch (e) {
    console.error("AI System Init Failed:", e.message);
  }
}

// In-Memory Session Store (For Demo - Use Redis in Production for persistence)
// Map<sessionId, { username, csrfToken, permissions, expiresAt }>
const sessions = new Map();

// --- INITIALIZATION ---
(async function init() {
    try {
        const { data, error } = await supabase.from('admin_users').select('username').eq('username', 'admin').maybeSingle();
        if (!data && !error) {
            console.log("Initializing Root Admin...");
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = (await scryptAsync(process.env.ADMIN_PASSWORD || 'admin123', salt, 64)).toString('hex');
            await supabase.from('admin_users').insert({
                username: 'admin',
                salt,
                password_hash: hash,
                permissions: { canEdit: true, canDelete: true, canManageUsers: true, isGod: true }
            });
        }
    } catch (e) { console.error("Init Error:", e.message); }
})();

async function logAction(username, action, details, req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const safeDetails = xss(details); // Sanitize text for logs
    try {
        await supabase.from('audit_logs').insert({ username, action, details: safeDetails, ip });
    } catch(e) { console.error("Log failed:", e.message); }
}

// --- AUTH MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    const sessionId = req.cookies.session_id;
    const session = sessions.get(sessionId);
    
    if (!session || Date.now() > session.expiresAt) {
        return res.status(401).json({ error: "Unauthorized: Invalid or Expired Session" });
    }

    const clientCsrfToken = req.headers['x-csrf-token'];
    
    // Strict CSRF Check
    if (req.method !== 'GET' && (!clientCsrfToken || clientCsrfToken !== session.csrfToken)) {
        return res.status(403).json({ error: "Security Violation: Invalid CSRF Token" });
    }
    
    // Rolling Session
    session.expiresAt = Date.now() + 900000; // +15 mins
    req.user = session;
    next();
};

// --- ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'active', platform: 'Render' });
});

app.post('/api/ai/chat', aiLimiter, async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { message, lineage, history, context } = req.body;
      
      const safeMessage = xss(message).substring(0, 1000); // Limit input length

      const isWizard = lineage === 'WIZARD';
      const baseInstruction = isWizard 
        ? "CORE DIRECTIVE: You are a wise and helpful magical portrait. Speak kindly and politely. GROUNDING RULE: Answer ONLY based on the provided DATABASE CONTEXT. If not found, say 'I cannot find that information'."
        : "CORE DIRECTIVE: You are the CORE.ARCH system administrator. Provide clear, concise answers. GROUNDING RULE: Answer ONLY based on the provided DATABASE CONTEXT. If not found, state 'Information not found in database'.";

      const safeContext = context ? xss(context) : "";
      const systemInstruction = `${baseInstruction}\n\n--- DATABASE CONTEXT ---\n${safeContext}\n--- END CONTEXT ---`;

      let contents = [];
      if (history && Array.isArray(history)) {
          history.forEach(h => {
              if(h.text && typeof h.text === 'string') {
                  contents.push({ role: h.role, parts: [{ text: xss(h.text).substring(0, 1000) }] });
              }
          });
      }
      contents.push({ role: 'user', parts: [{ text: safeMessage }] });

      const response = await aiClient.models.generateContent({ 
          model: "gemini-3-flash-preview",
          contents: contents,
          config: { systemInstruction }
      });
      res.json({ text: response.text });
    } catch (error) {
        res.status(500).json({ error: "Oracle Error: " + error.message });
    }
});

const uploadMiddleware = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

app.post('/api/ai/parse', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { prompt } = req.body;
      
      let parts = [];
      // If uploadMiddleware processes a file, send it
      if (req.file) {
            parts.push({
              inlineData: {
                  data: req.file.buffer.toString('base64'),
                  mimeType: req.file.mimetype
              }
          });
      }
      
      parts.push({ text: prompt ? xss(prompt) : "Analyze." });

      const response = await aiClient.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts }],
          config: {
              systemInstruction: `Return ONLY a valid JSON object with keys: title, content, date (YYYY-MM-DD), type (announcement, file, video, task), subject.`,
              responseMimeType: "application/json"
          }
      });

      // Cleanup response
      let text = response.text.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      try {
          res.json(JSON.parse(text));
      } catch (e) {
          res.json({ title: "Analysis Result", content: text, type: 'announcement', date: new Date().toISOString().split('T')[0] });
      }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/config', async (req, res) => {
    try {
      const { data } = await supabase.from('global_config').select('config').limit(1).single();
      if (data) res.json(data.config);
      else res.status(404).json({ error: "Config not found" });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const { data: user, error } = await supabase.from('admin_users').select('*').eq('username', username).single();
    
    if (!user || error) return res.status(401).json({ error: "Invalid credentials" });

    const derivedKey = await scryptAsync(password, user.salt, 64);
    if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, { username, csrfToken, permissions: user.permissions, expiresAt: Date.now() + 900000 });

    // SECURITY: Cross-Domain Cookie Settings
    res.cookie('session_id', sessionId, { 
        httpOnly: true, // Prevent JS access
        sameSite: 'none', // Allow Cross-Site (Vercel -> Render)
        secure: true, // Required for SameSite=None
        maxAge: 900000,
        partitioned: true // Future-proofing Chrome
    });
    
    await logAction(username, 'LOGIN', 'User logged in', req);
    res.json({ success: true, csrfToken, permissions: user.permissions });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', (req, res) => {
  const sessionId = req.cookies.session_id;
  const session = sessions.get(sessionId);
  if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Session Expired" });
  res.json({ authenticated: true, csrfToken: session.csrfToken, username: session.username, permissions: session.permissions });
});

// --- ADMIN ROUTES (Protected) ---

app.post('/api/admin/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
  // Check permission
  if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
  
  try {
    // If sent as FormData with file
    let fileBuffer, fileType, fileName;

    if (req.file) {
        fileBuffer = req.file.buffer;
        fileType = req.file.mimetype;
        fileName = req.file.originalname;
    } else if (req.body.fileData) {
        // Fallback for Base64 JSON
        fileBuffer = Buffer.from(req.body.fileData, 'base64');
        fileType = req.body.fileType;
        fileName = req.body.fileName;
    } else {
        return res.status(400).json({error: "No file data"});
    }

    const ext = fileName.split('.').pop().toLowerCase();
    const bucket = 'items'; 
    const uniqueName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(uniqueName, fileBuffer, { contentType: fileType });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
    await logAction(req.user.username, 'UPLOAD', `Uploaded ${uniqueName}`, req);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Standard CRUD
app.post('/api/admin/items', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const dbItem = { ...req.body, id: undefined }; // Let DB gen ID usually, or validate
      const { data, error } = await supabase.from('items').insert(dbItem).select().single();
      if (error) throw error;
      await logAction(req.user.username, 'CREATE_ITEM', `Created item`, req);
      res.json({ success: true, item: data });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/items/:id', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('items').update(req.body).eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/items/:id', requireAuth, async (req, res) => {
    if(!req.user.permissions.canDelete) return res.status(403).json({error: "Forbidden"});
    try {
      // 1. Get item to find image path
      const { data: item } = await supabase.from('items').select('*').eq('id', req.params.id).single();
      // 2. Delete item
      const { error } = await supabase.from('items').delete().eq('id', req.params.id);
      if (error) throw error;
      
      // 3. Attempt to delete storage file if exists (Cleanup)
      if (item && item.image && item.image.includes('supabase')) {
          const parts = item.image.split('/');
          const fileName = parts[parts.length - 1];
          await supabase.storage.from('items').remove([fileName]);
      }
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/config', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('global_config').upsert({ id: 1, config: req.body });
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err.message);
  if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`CoreConnect Server running on port ${PORT}`));
