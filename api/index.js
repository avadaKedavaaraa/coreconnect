
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

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(hpp());

// Permissive CORS for troubleshooting
app.use(cors({
  origin: true,
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3000, // Increased limit for admin actions
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use(express.json({ limit: '50mb' })); // Increased limit for Backups
app.use(express.urlencoded({ extended: true, limit: '50mb' })); 
app.use(cookieParser());
app.use(limiter); 

app.use((req, res, next) => {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                if (key.startsWith('$')) delete obj[key];
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Supabase credentials missing.");
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
  } catch (e) {
    console.error("AI System Init Failed:", e.message);
  }
}

const sessions = new Map();

(async function init() {
    try {
        // Ensure Admin exists
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
    const safeDetails = xss(details).substring(0, 500);
    try {
        await supabase.from('audit_logs').insert({ username, action, details: safeDetails, ip });
    } catch(e) { console.error("Log failed:", e.message); }
}

const requireAuth = (req, res, next) => {
    const sessionId = req.cookies.session_id;
    const session = sessions.get(sessionId);
    
    if (!session || Date.now() > session.expiresAt) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const clientCsrfToken = req.headers['x-csrf-token'];
    if (req.method !== 'GET' && (!clientCsrfToken || clientCsrfToken !== session.csrfToken)) {
        return res.status(403).json({ error: "Invalid Token" });
    }
    
    session.expiresAt = Date.now() + 900000;
    req.user = session;
    next();
};

const router = express.Router();

// --- PUBLIC ROUTES ---

router.get('/health', (req, res) => {
    res.json({ status: 'active' });
});

router.post('/visitor/heartbeat', async (req, res) => {
    const { visitorId, displayName, timeSpent, visitCount } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Invalid ID' });

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
            console.error("Supabase Visitor Error:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ status: 'logged' });
    } catch (e) {
        res.status(500).json({ error: e.message }); 
    }
});

router.get('/config', async (req, res) => {
    try {
      // ID 1 is Global Config
      const { data, error } = await supabase.from('global_config').select('config').eq('id', 1).maybeSingle();
      if (error) throw error;
      res.json(data?.config || {});
    } catch(e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// Fetch Sectors (Stored in Global Config ID 2 for simplicity)
router.get('/sectors', async (req, res) => {
    try {
      const { data, error } = await supabase.from('global_config').select('config').eq('id', 2).maybeSingle();
      if (error) throw error;
      res.json(data?.config || []); // Return array or empty
    } catch(e) { 
        res.status(500).json({ error: e.message }); 
    }
});

router.post('/ai/chat', async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { message, lineage, history, context } = req.body;
      const safeMessage = xss(message).substring(0, 1000); 
      
      const isWizard = lineage === 'WIZARD';
      const systemInstruction = isWizard 
        ? "You are a wise magical portrait. Answer purely based on the provided CONTEXT."
        : "You are CORE.ARCH system. Answer purely based on the provided CONTEXT.";
      
      const fullPrompt = `${systemInstruction}\n\nCONTEXT:\n${context ? xss(context) : "No context available."}`;

      let contents = [];
      if (history && Array.isArray(history)) {
          history.forEach(h => {
              if(h.text) contents.push({ role: h.role, parts: [{ text: xss(h.text).substring(0, 1000) }] });
          });
      }
      contents.push({ role: 'user', parts: [{ text: safeMessage }] });

      const response = await aiClient.models.generateContent({ 
          model: "gemini-3-flash-preview",
          contents: contents,
          config: { systemInstruction: fullPrompt }
      });
      res.json({ text: response.text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/ai/parse', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { prompt } = req.body;
      let parts = [];
      if (req.file) parts.push({ inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } });
      parts.push({ text: prompt ? xss(prompt) : "Analyze this content." });

      const response = await aiClient.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts }],
          config: { systemInstruction: `Return ONLY a valid JSON object with keys: title, content, date (YYYY-MM-DD), type, subject.`, responseMimeType: "application/json" }
      });
      res.json(JSON.parse(response.text));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { data: user, error } = await supabase.from('admin_users').select('*').eq('username', username).single();
    if (!user || error) return res.status(401).json({ error: "Invalid credentials" });

    const derivedKey = await scryptAsync(password, user.salt, 64);
    if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) return res.status(401).json({ error: "Invalid credentials" });

    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, { username, csrfToken, permissions: user.permissions, expiresAt: Date.now() + 900000 });

    res.cookie('session_id', sessionId, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 900000, partitioned: true });
    await logAction(username, 'LOGIN', 'User logged in', req);
    res.json({ success: true, csrfToken, permissions: user.permissions });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', (req, res) => {
  const sessionId = req.cookies.session_id;
  const session = sessions.get(sessionId);
  if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Session Expired" });
  res.json({ authenticated: true, csrfToken: session.csrfToken, username: session.username, permissions: session.permissions });
});

// --- ADMIN ROUTES ---

router.get('/admin/visitors', requireAuth, async (req, res) => {
    if(!req.user.permissions.canViewLogs) return res.status(403).json({error: "Forbidden"});
    try {
        const { data, error } = await supabase.from('visitor_logs').select('*').order('last_active', { ascending: false }).limit(100);
        if (error) throw error;
        res.json(data);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
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
    } else return res.status(400).json({error: "No file data"});

    const ext = fileName.split('.').pop().toLowerCase();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('items').upload(uniqueName, fileBuffer, { contentType: fileType, upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(uniqueName);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/items', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const { data, error } = await supabase.from('items').insert({ ...req.body, id: undefined }).select().single();
      if (error) throw error;
      await logAction(req.user.username, 'CREATE_ITEM', `Created item`, req);
      res.json({ success: true, item: data });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/admin/items/:id', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('items').update(req.body).eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/admin/items/:id', requireAuth, async (req, res) => {
    if(!req.user.permissions.canDelete) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('items').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Global Config (ID 1)
router.post('/admin/config', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('global_config').upsert({ id: 1, config: req.body });
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Sector Config (ID 2)
router.post('/admin/sectors', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('global_config').upsert({ id: 2, config: req.body });
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Logs
router.get('/admin/logs', requireAuth, async (req, res) => {
    if(!req.user.permissions.canViewLogs) return res.status(403).json({error: "Forbidden"});
    try {
        const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
        res.json(data || []);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- USER MANAGEMENT ROUTES (Restored) ---
router.get('/admin/users', requireAuth, async (req, res) => {
    if (!req.user.permissions.canManageUsers) return res.status(403).json({error: "Forbidden"});
    try {
        const { data, error } = await supabase.from('admin_users').select('username, permissions, last_active');
        if (error) throw error;
        res.json(data);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/users/add', requireAuth, async (req, res) => {
    if (!req.user.permissions.canManageUsers) return res.status(403).json({error: "Forbidden"});
    try {
        const { username, password, permissions } = req.body;
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await scryptAsync(password, salt, 64)).toString('hex');
        const { error } = await supabase.from('admin_users').insert({ username, salt, password_hash: hash, permissions });
        if (error) throw error;
        await logAction(req.user.username, 'ADD_USER', `Added user ${username}`, req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/users/delete', requireAuth, async (req, res) => {
    if (!req.user.permissions.canManageUsers) return res.status(403).json({error: "Forbidden"});
    try {
        const { targetUser } = req.body;
        if (targetUser === 'admin') return res.status(400).json({ error: "Cannot delete root admin" });
        const { error } = await supabase.from('admin_users').delete().eq('username', targetUser);
        if (error) throw error;
        await logAction(req.user.username, 'DEL_USER', `Deleted user ${targetUser}`, req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- IMPORT/EXPORT ROUTES (Restored) ---
router.get('/admin/export', requireAuth, async (req, res) => {
    if (!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
        const { data: items } = await supabase.from('items').select('*');
        const { data: config } = await supabase.from('global_config').select('*');
        const { data: visitors } = await supabase.from('visitor_logs').select('*');
        
        const backup = { data: { items, global_config: config, visitor_logs: visitors }, timestamp: new Date() };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(backup));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/import', requireAuth, async (req, res) => {
    if (!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
        const { data } = req.body;
        if (data.items?.length) await supabase.from('items').upsert(data.items);
        if (data.global_config?.length) await supabase.from('global_config').upsert(data.global_config);
        
        await logAction(req.user.username, 'IMPORT', 'Restored backup', req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', router);
app.use('/', router);
app.use('/.netlify/functions/api', router);

export default app;
if (process.argv[1] && process.argv[1].endsWith('index.js')) { app.listen(PORT, () => console.log(`Server running on ${PORT}`)); }
