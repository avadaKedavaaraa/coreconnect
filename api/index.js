
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
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const scryptAsync = promisify(crypto.scrypt);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- SECURITY ---
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(hpp());

// Permissive CORS for Frontend/Netlify
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization']
}));

// Increase payload limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3000, 
  standardHeaders: true,
  legacyHeaders: false,
});
// Apply rate limiting to API routes
app.use('/api', limiter);

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

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key for backend operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

let supabase;
let isMock = false;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        console.log("✅ API: Connected to Supabase (Permanent Mode)");
    } catch (e) {
        console.error("❌ API: Supabase Connection Failed:", e.message);
        isMock = true;
    }
} else {
    console.warn("⚠️ API: Supabase credentials missing (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
    isMock = true;
}

// --- GEMINI CLIENT ---
let aiClient = null;
if (process.env.API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.error("AI System Init Failed:", e.message);
  }
}

// --- AUTH HELPERS ---
const AUTH_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret';

const createSignature = (data) => {
    const hmac = crypto.createHmac('sha256', AUTH_SECRET);
    hmac.update(data);
    return hmac.digest('hex');
};

const encodeSession = (payload) => {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = createSignature(data);
    return `${data}.${signature}`;
};

const decodeSession = (token) => {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 2) return null;
        
        const [data, signature] = parts;
        const expectedSignature = createSignature(data);
        
        const bufA = Buffer.from(signature);
        const bufB = Buffer.from(expectedSignature);

        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
             return JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
        }
        return null;
    } catch(e) { return null; }
};

const requireAuth = (req, res, next) => {
    const sessionToken = req.cookies.session_id;
    const session = decodeSession(sessionToken);
    
    if (!session || Date.now() > session.expiresAt) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const clientCsrfToken = req.headers['x-csrf-token'];
    if (req.method !== 'GET' && (!clientCsrfToken || clientCsrfToken !== session.csrfToken)) {
        return res.status(403).json({ error: "Invalid Token" });
    }
    
    req.user = session;
    next();
};

// --- DATA MAPPING ---
// Maps Frontend CamelCase -> Database Snake_Case
const mapItemPayload = (body) => {
    return {
        id: body.id,
        title: body.title,
        content: body.content,
        date: body.date,
        type: body.type,
        sector: body.sector,
        subject: body.subject,
        image: body.image,
        file_url: body.fileUrl,
        author: body.author,
        is_unread: body.isUnread,
        likes: body.likes,
        style: body.style
    };
};

const router = express.Router();

// --- ROUTES ---

router.get('/health', (req, res) => res.json({ status: 'active', db: isMock ? 'mock' : 'connected' }));

// 1. ITEMS CRUD
router.post('/admin/items', requireAuth, async (req, res) => {
    if (!req.user.permissions.canEdit) return res.status(403).json({ error: "Forbidden" });
    if (isMock) return res.status(500).json({ error: "Database not configured" });

    try {
        const payload = mapItemPayload(req.body);
        // Supabase will generate ID if not provided, but we usually provide UUID from frontend
        const { data, error } = await supabase.from('items').upsert(payload).select().single();
        if (error) throw error;
        await logAction(req.user.username, 'CREATE', `Created item ${data.title}`, req);
        res.json({ success: true, item: data });
    } catch (e) {
        console.error("Create Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.put('/admin/items/:id', requireAuth, async (req, res) => {
    if (!req.user.permissions.canEdit) return res.status(403).json({ error: "Forbidden" });
    if (isMock) return res.status(500).json({ error: "Database not configured" });

    try {
        const payload = mapItemPayload(req.body);
        delete payload.id; // Don't change PK
        const { error } = await supabase.from('items').update(payload).eq('id', req.params.id);
        if (error) throw error;
        await logAction(req.user.username, 'UPDATE', `Updated item ${req.params.id}`, req);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/admin/items/:id', requireAuth, async (req, res) => {
    if (!req.user.permissions.canDelete) return res.status(403).json({ error: "Forbidden" });
    if (isMock) return res.status(500).json({ error: "Database not configured" });

    try {
        const { error } = await supabase.from('items').delete().eq('id', req.params.id);
        if (error) throw error;
        await logAction(req.user.username, 'DELETE', `Deleted item ${req.params.id}`, req);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. CONFIG & SECTORS
router.get('/config', async (req, res) => {
    if (isMock) return res.json({});
    const { data } = await supabase.from('global_config').select('config').eq('id', 1).maybeSingle();
    res.json(data?.config || {});
});

router.get('/sectors', async (req, res) => {
    if (isMock) return res.json([]);
    const { data } = await supabase.from('global_config').select('config').eq('id', 2).maybeSingle();
    res.json(data?.config || []);
});

router.post('/admin/config', requireAuth, async (req, res) => {
    if (isMock) return res.status(500).json({ error: "DB Missing" });
    try {
        const { error } = await supabase.from('global_config').upsert({ id: 1, config: req.body });
        if(error) throw error;
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/sectors', requireAuth, async (req, res) => {
    if (isMock) return res.status(500).json({ error: "DB Missing" });
    try {
        const { error } = await supabase.from('global_config').upsert({ id: 2, config: req.body });
        if(error) throw error;
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 3. LOGIN & AUTH
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Auto-init Admin if table is empty (Self-Healing)
    if (username === 'admin' && !isMock) {
        const { data } = await supabase.from('admin_users').select('username').eq('username', 'admin').maybeSingle();
        if (!data) {
            console.log("Lazy-init: Creating root admin");
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = (await scryptAsync(process.env.ADMIN_PASSWORD || 'Admin8210@', salt, 64)).toString('hex');
            await supabase.from('admin_users').insert({
                username: 'admin',
                salt,
                password_hash: hash,
                permissions: { canEdit: true, canDelete: true, canManageUsers: true, isGod: true }
            });
        }
    }

    if (isMock) return res.status(500).json({ error: "Database not connected" });

    try {
        const { data: user } = await supabase.from('admin_users').select('*').eq('username', username).single();
        if (!user) return res.status(401).json({ error: "User not found" });

        const derivedKey = await scryptAsync(password, user.salt, 64);
        // Timing safe check
        if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const csrfToken = crypto.randomBytes(32).toString('hex');
        // Session valid for 24 hours
        const expiresAt = Date.now() + 86400000;
        const token = encodeSession({ username, csrfToken, permissions: user.permissions, expiresAt });

        res.cookie('session_id', token, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 86400000, partitioned: true });
        await logAction(username, 'LOGIN', 'Logged in', req);
        res.json({ success: true, csrfToken, permissions: user.permissions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/me', (req, res) => {
    const session = decodeSession(req.cookies.session_id);
    if (!session || Date.now() > session.expiresAt) return res.status(401).json({ error: "Session Expired" });
    res.json({ authenticated: true, csrfToken: session.csrfToken, username: session.username, permissions: session.permissions });
});

// 4. STORAGE & LOGS
const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/admin/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    if (isMock) return res.status(500).json({ error: "DB Missing" });
    try {
        const file = req.file;
        const ext = file.originalname.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('items').upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('items').getPublicUrl(path);
        res.json({ url: data.publicUrl });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/visitor/heartbeat', async (req, res) => {
    if (isMock) return res.json({ status: 'ignored' });
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ipHash = crypto.createHash('sha256').update(ip || 'unknown').digest('hex').substring(0, 10);
        
        await supabase.from('visitor_logs').upsert({
            visitor_id: req.body.visitorId,
            display_name: xss(req.body.displayName || 'Guest'),
            total_time_spent: req.body.timeSpent,
            visit_count: req.body.visitCount,
            last_active: new Date().toISOString(),
            ip_hash: ipHash
        }, { onConflict: 'visitor_id' });
        res.json({ status: 'logged' });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/visitors', requireAuth, async (req, res) => {
    if (isMock) return res.json([]);
    const { data } = await supabase.from('visitor_logs').select('*').order('last_active', { ascending: false }).limit(100);
    res.json(data || []);
});

router.get('/admin/logs', requireAuth, async (req, res) => {
    if (isMock) return res.json([]);
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
    res.json(data || []);
});

// 5. AI
router.post('/ai/chat', async (req, res) => {
    if (!aiClient) return res.status(503).json({ error: "AI Not Configured" });
    try {
        const { message, lineage, history, context } = req.body;
        const systemInstruction = lineage === 'WIZARD' 
            ? "You are a wise magical portrait. Answer purely based on the provided CONTEXT."
            : "You are CORE.ARCH system. Answer purely based on the provided CONTEXT.";
        
        let contents = [];
        if (history) history.forEach(h => contents.push({ role: h.role, parts: [{ text: xss(h.text) }] }));
        contents.push({ role: 'user', parts: [{ text: `${systemInstruction}\nCONTEXT:\n${context || ''}\n\nQUERY: ${message}` }] });

        const response = await aiClient.models.generateContent({ 
            model: "gemini-3-flash-preview", 
            contents 
        });
        res.json({ text: response.text });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/parse', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
    if (!aiClient) return res.status(503).json({ error: "AI Not Configured" });
    try {
        let parts = [];
        if (req.file) parts.push({ inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } });
        parts.push({ text: "Analyze this. Return JSON with keys: title, content, date (YYYY.MM.DD), type, subject." });
        
        const response = await aiClient.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts }],
            config: { responseMimeType: "application/json" }
        });
        res.json(JSON.parse(response.text));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Admin User Management
router.get('/admin/users', requireAuth, async (req, res) => {
    if (isMock) return res.json([]);
    const { data } = await supabase.from('admin_users').select('username, permissions, last_active');
    res.json(data || []);
});

router.post('/admin/users/add', requireAuth, async (req, res) => {
    if (isMock) return res.status(500).json({ error: "DB Missing" });
    try {
        const { username, password, permissions } = req.body;
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await scryptAsync(password, salt, 64)).toString('hex');
        await supabase.from('admin_users').insert({ username, salt, password_hash: hash, permissions });
        await logAction(req.user.username, 'ADD_USER', `Added ${username}`, req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/users/delete', requireAuth, async (req, res) => {
    if (isMock) return res.status(500).json({ error: "DB Missing" });
    try {
        const { targetUser } = req.body;
        if(targetUser === 'admin') return res.status(400).json({error: "Cannot delete root"});
        await supabase.from('admin_users').delete().eq('username', targetUser);
        await logAction(req.user.username, 'DEL_USER', `Deleted ${targetUser}`, req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Import/Export
router.get('/admin/export', requireAuth, async (req, res) => {
    if (isMock) return res.status(500).json({ error: "DB Missing" });
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
    if (isMock) return res.status(500).json({ error: "DB Missing" });
    try {
        const { data } = req.body;
        if (data.items?.length) await supabase.from('items').upsert(data.items);
        if (data.global_config?.length) {
            for (const cfg of data.global_config) {
                 const { id, ...rest } = cfg; 
                 await supabase.from('global_config').upsert({ id, config: rest.config || rest });
            }
        }
        await logAction(req.user.username, 'IMPORT', 'Restored backup', req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

async function logAction(username, action, details, req) {
    if (isMock) return;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try { await supabase.from('audit_logs').insert({ username, action, details: xss(details).substring(0, 500), ip }); } catch(e){}
}

// *** IMPORTANT: MOUNT ROUTER TO /api ***
app.use('/api', router);

try {
    if (process.argv[1] === fileURLToPath(import.meta.url)) {
        app.listen(PORT, () => {
            console.log(`✅ CoreConnect Server running on port ${PORT}`);
        });
    }
} catch (e) {}

export default app;
