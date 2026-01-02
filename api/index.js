
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

dotenv.config();

const scryptAsync = promisify(crypto.scrypt);
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.VITE_SUPABASE_URL || "https://*.supabase.co", "http://localhost:*", "https://*.vercel.app"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://cdn.pixabay.com", "https://*.supabase.co"],
      frameAncestors: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

app.use(hpp());

app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization']
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' })); 
app.use(cookieParser());
app.use(limiter); 

// --- SUPABASE & GEMINI SETUP ---
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder', 
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let aiClient = null;
if (process.env.API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) { console.error("AI Init Failed:", e.message); }
}

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret';

// --- AUTH UTILS ---
const scrypt = promisify(crypto.scrypt);

function signSession(data) {
    const str = Buffer.from(JSON.stringify(data)).toString('base64');
    const sig = crypto.createHmac('sha256', SECRET).update(str).digest('base64').replace(/=/g, '');
    return `${str}.${sig}`;
}

function verifySession(token) {
    if (!token) return null;
    const [str, sig] = token.split('.');
    if (!str || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(str).digest('base64').replace(/=/g, '');
    if (sig !== expectedSig) return null;
    try { return JSON.parse(Buffer.from(str, 'base64').toString('utf-8')); } catch { return null; }
}

const requireAuth = (req, res, next) => {
    const token = req.cookies.session_id;
    const session = verifySession(token);
    
    if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Unauthorized" });

    const clientCsrfToken = req.headers['x-csrf-token'];
    if (req.method !== 'GET' && (!clientCsrfToken || clientCsrfToken !== session.csrfToken)) {
        return res.status(403).json({ error: "Invalid CSRF Token" });
    }
    
    req.user = session;
    next();
};

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// --- ROUTE DEFINITIONS ---
// We define functions for logic to attach them to multiple paths
// This solves Vercel stripping /api prefixes

const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Auto-init admin if missing (Lazy Init)
    const { data: adminExists } = await supabase.from('admin_users').select('username').eq('username', 'admin').maybeSingle();
    if (!adminExists) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await scrypt(process.env.ADMIN_PASSWORD || 'admin123', salt, 64)).toString('hex');
        await supabase.from('admin_users').insert({
            username: 'admin', salt, password_hash: hash,
            permissions: { canEdit: true, canDelete: true, canManageUsers: true, isGod: true }
        });
    }

    const { data: user } = await supabase.from('admin_users').select('*').eq('username', username).single();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const derivedKey = await scrypt(password, user.salt, 64);
    if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const csrfToken = crypto.randomBytes(32).toString('hex');
    const sessionData = { 
        username, permissions: user.permissions, csrfToken, expiresAt: Date.now() + 3600000 
    };
    
    const token = signSession(sessionData);

    res.cookie('session_id', token, { 
        httpOnly: true, sameSite: 'none', secure: true, maxAge: 3600000, path: '/'
    });
    
    res.json({ success: true, csrfToken, permissions: user.permissions });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

const handleMe = (req, res) => {
  const session = verifySession(req.cookies.session_id);
  if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Session Expired" });
  res.json({ authenticated: true, csrfToken: session.csrfToken, username: session.username, permissions: session.permissions });
};

// --- ROUTER MOUNTING ---
const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'active', time: new Date().toISOString() }));
router.post('/login', handleLogin);
router.get('/me', handleMe);
router.get('/config', async (req, res) => {
    const { data } = await supabase.from('global_config').select('config').limit(1).single();
    res.json(data?.config || {});
});

// AI
router.post('/ai/chat', async (req, res) => {
    if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
    try {
        const { message, lineage, history, context } = req.body;
        const baseInstruction = lineage === 'WIZARD' 
            ? "You are a magical portrait. Speak wisely." 
            : "You are the CORE.ARCH system.";
        const systemInstruction = `${baseInstruction}\nCONTEXT:\n${context || ''}`;
        
        let contents = [];
        if (history) history.forEach(h => contents.push({ role: h.role, parts: [{ text: h.text }] }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await aiClient.models.generateContent({ model: "gemini-3-flash-preview", contents, config: { systemInstruction }});
        res.json({ text: response.text });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/parse', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: req.body.prompt || "Analyze" }] }],
            config: { responseMimeType: "application/json" }
        });
        res.json(JSON.parse(response.text));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Admin
router.post('/admin/items', requireAuth, async (req, res) => {
    const { data, error } = await supabase.from('items').insert(req.body).select().single();
    if(error) return res.status(400).json({error: error.message});
    res.json({success: true, item: data});
});
router.put('/admin/items/:id', requireAuth, async (req, res) => {
    const { error } = await supabase.from('items').update(req.body).eq('id', req.params.id);
    if(error) return res.status(400).json({error: error.message});
    res.json({success: true});
});
router.delete('/admin/items/:id', requireAuth, async (req, res) => {
    const { error } = await supabase.from('items').delete().eq('id', req.params.id);
    if(error) return res.status(400).json({error: error.message});
    res.json({success: true});
});
router.post('/admin/config', requireAuth, async (req, res) => {
    const { error } = await supabase.from('global_config').upsert({ id: 1, config: req.body });
    if(error) return res.status(400).json({error: error.message});
    res.json({success: true});
});
router.post('/admin/upload', requireAuth, async (req, res) => {
    const { fileName, fileType, fileData } = req.body;
    const buffer = Buffer.from(fileData, 'base64');
    const uniqueName = `${crypto.randomUUID()}.${fileName.split('.').pop()}`;
    const { error } = await supabase.storage.from('items').upload(uniqueName, buffer, { contentType: fileType });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = supabase.storage.from('items').getPublicUrl(uniqueName);
    res.json({ url: data.publicUrl });
});

// IMPORTANT: Mount on root AND /api to catch both Vercel rewrite and direct file hits
app.use('/api', router);
app.use('/', router);

// Export for Vercel
export default app;

if (process.argv[1].endsWith('index.js')) {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}
