
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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.VITE_SUPABASE_URL || "https://*.supabase.co", "http://localhost:*", "https://*.vercel.app", "https://*.netlify.app"],
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
app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization'] }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, validate: {xForwardedForHeader: false} });
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' })); 
app.use(cookieParser());
app.use(limiter); 

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder', 
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let aiClient = null;
if (process.env.API_KEY) {
  try { aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY }); } catch (e) { console.error("AI Init Failed:", e.message); }
}

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret';
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

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const toDbItem = (item) => {
  const dbItem = { ...item };
  if (typeof dbItem.isUnread !== 'undefined') { dbItem.is_unread = dbItem.isUnread; delete dbItem.isUnread; }
  if (typeof dbItem.fileUrl !== 'undefined') { dbItem.file_url = dbItem.fileUrl; delete dbItem.fileUrl; }
  delete dbItem.isLiked; delete dbItem.is_liked;
  return dbItem;
};

const router = express.Router();
router.get('/health', (req, res) => res.json({ status: 'active', time: new Date().toISOString() }));

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { data: adminExists } = await supabase.from('admin_users').select('username').eq('username', 'admin').maybeSingle();
    if (!adminExists) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await scrypt(process.env.ADMIN_PASSWORD || 'admin123', salt, 64)).toString('hex');
        await supabase.from('admin_users').insert({
            username: 'admin', salt, password_hash: hash,
            // FIX: Added canViewLogs: true so the tab shows up
            permissions: { canEdit: true, canDelete: true, canManageUsers: true, canViewLogs: true, isGod: true }
        });
    }
    const { data: user } = await supabase.from('admin_users').select('*').eq('username', username).single();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const derivedKey = await scrypt(password, user.salt, 64);
    if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) return res.status(401).json({ error: "Invalid credentials" });
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const token = signSession({ username, permissions: user.permissions, csrfToken, expiresAt: Date.now() + 3600000 });
    res.cookie('session_id', token, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 3600000, path: '/' });
    res.json({ success: true, csrfToken, permissions: user.permissions });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', (req, res) => {
  const session = verifySession(req.cookies.session_id);
  if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Session Expired" });
  res.json({ authenticated: true, csrfToken: session.csrfToken, username: session.username, permissions: session.permissions });
});

router.get('/config', async (req, res) => {
    const { data } = await supabase.from('global_config').select('config').limit(1).single();
    res.json(data?.config || {});
});

// NEW: Sectors Endpoints for Persistence
router.get('/sectors', async (req, res) => {
    // Attempt to fetch from 'sectors_config' table or a JSON blob
    // Simpler approach: Store as a JSON blob in 'global_config' with id=2 or similar, 
    // or assume a 'sectors' table exists. 
    // Given previous setup, we'll try to use a dedicated row in global_config for simplicity if table doesn't exist,
    // BUT best practice is a separate table. Let's try 'sectors' table first.
    try {
        const { data, error } = await supabase.from('sectors').select('*').order('created_at', { ascending: true });
        if (error || !data || data.length === 0) {
             // Fallback: Check global_config for a 'sectors' entry
             const { data: configData } = await supabase.from('global_config').select('config').eq('id', 2).single();
             if (configData) return res.json(configData.config);
             return res.json([]); // Return empty if nothing found, frontend uses defaults
        }
        res.json(data);
    } catch(e) { res.json([]); }
});

router.post('/admin/sectors', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
        // We will store the entire array as a JSON blob in global_config with id=2 to avoid complex schema migrations
        // This ensures "whatever I save... saves for all users"
        const { error } = await supabase.from('global_config').upsert({ id: 2, config: req.body });
        if (error) throw error;
        res.json({success: true});
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- VISITOR TRACKING ---
router.post('/visitor/heartbeat', async (req, res) => {
    const { visitorId, displayName, timeSpent, visitCount } = req.body;
    if (!visitorId || typeof visitorId !== 'string') return res.status(400).json({ error: 'Invalid ID' });
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipHash = crypto.createHash('sha256').update(ip || 'unknown').digest('hex').substring(0, 10);
    try {
        await supabase.from('visitor_logs').upsert({
            visitor_id: visitorId,
            display_name: xss(displayName || 'Guest'),
            total_time_spent: Number(timeSpent) || 0,
            visit_count: Number(visitCount) || 1,
            last_active: new Date().toISOString(),
            ip_hash: ipHash
        }, { onConflict: 'visitor_id' });
        res.json({ status: 'logged' });
    } catch (e) { res.status(200).json({ status: 'ignored' }); }
});

router.get('/admin/visitors', requireAuth, async (req, res) => {
    if(!req.user.permissions.canViewLogs) return res.status(403).json({error: "Forbidden"});
    const { data } = await supabase.from('visitor_logs').select('*').order('last_active', { ascending: false }).limit(100);
    res.json(data || []);
});

router.post('/ai/chat', async (req, res) => {
    if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
    try {
        const { message, lineage, history, context } = req.body;
        const systemInstruction = `${lineage === 'WIZARD' ? "You are a magical portrait." : "You are CORE.ARCH system."}\nCONTEXT:\n${context || ''}`;
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

router.post('/admin/items', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    const { data } = await supabase.from('items').upsert(toDbItem(req.body)).select().single();
    res.json({success: true, item: data});
});

router.put('/admin/items/:id', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    const { id, ...updateData } = toDbItem(req.body); 
    await supabase.from('items').update(updateData).eq('id', req.params.id);
    res.json({success: true});
});

router.delete('/admin/items/:id', requireAuth, async (req, res) => {
    if(!req.user.permissions.canDelete) return res.status(403).json({error: "Forbidden"});
    await supabase.from('items').delete().eq('id', req.params.id);
    res.json({success: true});
});

router.post('/admin/config', requireAuth, async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    await supabase.from('global_config').upsert({ id: 1, config: req.body });
    res.json({success: true});
});

router.post('/admin/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    if(!req.user.permissions.canEdit) return res.status(403).json({error: "Forbidden"});
    try {
        let fileBuffer, fileType, fileName;
        if (req.file) { fileBuffer = req.file.buffer; fileType = req.file.mimetype; fileName = req.file.originalname; } 
        else if (req.body.fileData) { fileBuffer = Buffer.from(req.body.fileData, 'base64'); fileType = req.body.fileType; fileName = req.body.fileName; } 
        else return res.status(400).json({error: "No file data"});
        const uniqueName = `${crypto.randomUUID()}.${fileName.split('.').pop()}`;
        const { error } = await supabase.storage.from('items').upload(uniqueName, fileBuffer, { contentType: fileType, upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('items').getPublicUrl(uniqueName);
        res.json({ url: data.publicUrl });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/users', requireAuth, async (req, res) => {
    if(!req.user.permissions.canManageUsers) return res.status(403).json({error: "Forbidden"});
    const { data } = await supabase.from('admin_users').select('username, permissions, last_active');
    res.json(data);
});

router.post('/admin/users/add', requireAuth, async (req, res) => {
    if(!req.user.permissions.canManageUsers) return res.status(403).json({error: "Forbidden"});
    const { username, password, permissions } = req.body;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64)).toString('hex');
    await supabase.from('admin_users').insert({ username, password_hash: hash, salt, permissions });
    res.json({success: true});
});

router.post('/admin/users/delete', requireAuth, async (req, res) => {
    if(!req.user.permissions.canManageUsers) return res.status(403).json({error: "Forbidden"});
    const { targetUser } = req.body;
    if(targetUser === 'admin') return res.status(400).json({error: "Cannot delete root admin"});
    await supabase.from('admin_users').delete().eq('username', targetUser);
    res.json({success: true});
});

app.use('/api', router);
app.use('/', router);
app.use('/.netlify/functions/api', router);

export default app;
if (process.argv[1] && process.argv[1].endsWith('index.js')) { app.listen(PORT, () => console.log(`Server running on ${PORT}`)); }
