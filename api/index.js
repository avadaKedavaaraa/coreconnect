
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
      connectSrc: ["'self'", process.env.VITE_SUPABASE_URL || "https://*.supabase.co", "http://localhost:*", "https://*.vercel.app", "https://*.netlify.app"],
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
    return callback(null, true); // Permissive for now to fix access issues, tighten later
  },
  credentials: true, // Allow Cookies to travel
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization']
}));

// --- SECURITY: Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for assets/heartbeats
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
  max: 20, // Prevent brute force
  message: { error: "Too many login attempts. Account temporarily locked." }
});

// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' })); 
app.use(cookieParser());
app.use(limiter); 

// --- SECURITY: NoSQL Injection Sanitizer (Manual) ---
app.use((req, res, next) => {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
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
const sessions = new Map();

// --- INITIALIZATION ---
(async function init() {
    try {
        const { data, error } = await supabase.from('admin_users').select('username').eq('username', 'admin').maybeSingle();
        if (!data && !error && process.env.ADMIN_PASSWORD) {
            console.log("Initializing Root Admin...");
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = (await scryptAsync(process.env.ADMIN_PASSWORD, salt, 64)).toString('hex');
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

// --- VISITOR TRACKING ENDPOINT ---
app.post('/api/visitor/heartbeat', async (req, res) => {
    const { visitorId, displayName, timeSpent, visitCount } = req.body;
    
    // Basic validation
    if (!visitorId || typeof visitorId !== 'string') return res.status(400).json({ error: 'Invalid ID' });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipHash = crypto.createHash('sha256').update(ip || 'unknown').digest('hex').substring(0, 10);

    try {
        const { error } = await supabase.from('visitor_logs').upsert({
            visitor_id: visitorId,
            display_name: xss(displayName || 'Guest'),
            total_time_spent: Number(timeSpent) || 0,
            visit_count: Number(visitCount) || 1,
            last_active: new Date().toISOString(),
            ip_hash: ipHash
        }, { onConflict: 'visitor_id' });

        if (error) {
            console.error("Visitor DB Error:", error);
            throw error;
        }
        res.json({ status: 'logged' });
    } catch (e) {
        res.status(500).json({ error: e.message }); 
    }
});

// --- CONFIG ENDPOINT ---
app.get('/api/config', async (req, res) => {
    try {
      // FORCE ID 1 to ensure we always get the main config
      const { data, error } = await supabase.from('global_config').select('config').eq('id', 1).maybeSingle();
      
      if (error) throw error;
      
      if (data && data.config) {
          res.json(data.config);
      } else {
          // If no config found, return empty to let frontend use defaults
          res.json({});
      }
    } catch(e) { 
        console.error("Config fetch error:", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// --- AI CHAT ---
app.post('/api/ai/chat', aiLimiter, async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { message, lineage, history, context } = req.body;
      
      const safeMessage = xss(message).substring(0, 1000); 

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
  limits: { fileSize: 10 * 1024 * 1024 } 
});

app.post('/api/ai/parse', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { prompt } = req.body;
      
      let parts = [];
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

      let text = response.text.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      try {
          res.json(JSON.parse(text));
      } catch (e) {
          res.json({ title: "Analysis Result", content: text, type: 'announcement', date: new Date().toISOString().split('T')[0] });
      }
    } catch (e) { res.status(500).json({ error: e.message }); }
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

    res.cookie('session_id', sessionId, { 
        httpOnly: true, 
        sameSite: 'none', 
        secure: true, 
        maxAge: 900000,
        partitioned: true 
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

app.get('/api/admin/visitors', requireAuth, async (req, res) => {
    if(!req.user.permissions.canViewLogs) return res.status(403).json({error: "Forbidden"});
    try {
        const { data, error } = await supabase.from('visitor_logs').select('*').order('last_active', { ascending: false }).limit(100);
        if (error) throw error;
        res.json(data);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
  if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
  
  try {
    let fileBuffer, fileType, fileName;

    if (req.file) {
        fileBuffer = req.file.buffer;
        fileType = req.file.mimetype;
        fileName = req.file.originalname;
    } else if (req.body.fileData) {
        fileBuffer = Buffer.from(req.body.fileData, 'base64');
        fileType = req.body.fileType;
        fileName = req.body.fileName;
    } else {
        return res.status(400).json({error: "No file data"});
    }

    const ext = fileName.split('.').pop().toLowerCase();
    const bucket = 'items'; 
    const uniqueName = `${crypto.randomUUID()}.${ext}`;

    // Ensure bucket exists or handle error (usually manual setup required in Supabase)
    const { error } = await supabase.storage.from(bucket).upload(uniqueName, fileBuffer, { contentType: fileType, upsert: true });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
    await logAction(req.user.username, 'UPLOAD', `Uploaded ${uniqueName}`, req);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/items', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const dbItem = { ...req.body, id: undefined }; 
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
      const { data: item } = await supabase.from('items').select('*').eq('id', req.params.id).single();
      const { error } = await supabase.from('items').delete().eq('id', req.params.id);
      if (error) throw error;
      
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
      // FORCE ID 1 for global config to avoid duplicates
      const { error } = await supabase.from('global_config').upsert({ id: 1, config: req.body });
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/logs', requireAuth, async (req, res) => {
    if(!req.user.permissions.canViewLogs) return res.status(403).json({error: "Forbidden"});
    try {
        const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
        res.json(data || []);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', router);
app.use('/', router);
app.use('/.netlify/functions/api', router);

export default app;
if (process.argv[1] && process.argv[1].endsWith('index.js')) { app.listen(PORT, () => console.log(`Server running on ${PORT}`)); }
