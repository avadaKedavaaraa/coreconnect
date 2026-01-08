
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
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import webpush from 'web-push';

// Load env vars
dotenv.config();

const scryptAsync = promisify(crypto.scrypt);

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ CRITICAL: Supabase URL or Service Role Key is missing.");
    console.error("Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.");
}

const supabase = createClient(
  supabaseUrl || '', // Fallback to empty string to prevent crash on init, attempts will fail with specific error
  supabaseServiceKey || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// --- NOTIFICATION SETUP ---
// Generate ephemeral keys if not in env (Note: Subscriptions reset on server restart without persistent keys)
let vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn("⚠️  VAPID Keys missing in .env. Using ephemeral keys (Notifications will break on restart).");
    vapidKeys = webpush.generateVAPIDKeys();
    console.log("👉 Generated Public Key:", vapidKeys.publicKey);
}

webpush.setVapidDetails(
  'mailto:admin@coreconnect.com', 
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(hpp());

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !IS_PROD) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization']
}));

// Rate Limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3000, 
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(limiter);

// --- GEMINI CLIENT ---
let aiClient = null;
if (process.env.API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
      console.warn("AI Init failed:", e.message);
  }
}

// --- LOGGING HELPER ---
async function logAction(username, action, details, req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const safeDetails = xss(details).substring(0, 500);
    try {
        await supabase.from('audit_logs').insert({ 
            username, 
            action, 
            details: safeDetails, 
            ip: Array.isArray(ip) ? ip[0] : ip 
        });
    } catch(e) {
        console.error("Failed to write audit log:", e.message);
    }
}

// --- AUTH MIDDLEWARE ---
async function getSession(sessionId) {
    if (!sessionId) return null;
    try {
        const { data, error } = await supabase.from('admin_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .gt('expires_at', new Date().toISOString())
            .single();
            
        if (error || !data) return null;
        return data.data;
    } catch (e) {
        console.error("Session lookup error:", e.message);
        return null;
    }
}

const requireAuth = async (req, res, next) => {
    const sessionId = req.cookies.session_id;
    const sessionData = await getSession(sessionId);
    if (!sessionData) return res.status(401).json({ error: "Unauthorized" });

    const clientCsrfToken = req.headers['x-csrf-token'];
    if (req.method !== 'GET' && (!clientCsrfToken || clientCsrfToken !== sessionData.csrfToken)) {
        return res.status(403).json({ error: "Invalid CSRF Token" });
    }
    req.user = sessionData;
    next();
};

const hasPermission = (user, permission) => {
    return user.permissions?.isGod || user.permissions?.[permission];
};

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'active', platform: 'netlify' }));

// --- NOTIFICATION ROUTES ---
router.get('/notifications/vapid-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

router.post('/notifications/subscribe', async (req, res) => {
    try {
        const subscription = req.body;
        // Use upsert or insert with ignore duplicates
        const { error } = await supabase.from('push_subscriptions').upsert({ subscription }, { onConflict: 'subscription' });
        
        if (error) {
            console.error("DB Subscription Error:", error);
            // If table doesn't exist or other DB error, don't crash, just warn
            return res.status(500).json({ error: "Database error saving subscription" });
        }
        
        res.status(201).json({ success: true });
    } catch (e) {
        console.error("Subscribe Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/visitor/heartbeat', async (req, res) => {
    const { visitorId, displayName, timeSpent, visitCount, type, resourceId, title } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Invalid ID' });
    
    try {
        const { error: logError } = await supabase.from('visitor_logs').upsert({
            visitor_id: xss(visitorId),
            display_name: xss(displayName || 'Guest').substring(0, 50),
            total_time_spent: Number(timeSpent) || 0,
            visit_count: Number(visitCount) || 1,
            last_active: new Date().toISOString()
        }, { onConflict: 'visitor_id' });

        if (logError) throw logError;

        if (type) {
            const { error: actError } = await supabase.from('visitor_activity').insert({
                visitor_id: xss(visitorId),
                activity_type: xss(type),
                resource_id: resourceId ? xss(resourceId) : null,
                resource_title: title ? xss(title).substring(0, 100) : null,
                duration_seconds: Number(timeSpent) || 0
            });
            if (actError) console.error("Activity Log Error:", actError.message);
        }

        res.json({ status: 'logged' });
    } catch (e) { 
        console.error("Heartbeat Error:", e.message);
        res.status(500).json({ error: "Server error: " + e.message }); 
    }
});

router.get('/config', async (req, res) => {
    try {
      const { data, error } = await supabase.from('global_config').select('config').eq('id', 1).maybeSingle();
      if (error) throw error;
      res.json(data?.config || {});
    } catch(e) { 
        console.error("Fetch Config Error:", e.message);
        res.status(500).json({ error: "Failed to fetch config" }); 
    }
});

router.get('/sectors', async (req, res) => {
    try {
      const { data, error } = await supabase.from('global_config').select('config').eq('id', 2).maybeSingle();
      if (error) throw error;
      res.json(data?.config || []);
    } catch(e) { 
        console.error("Fetch Sectors Error:", e.message);
        res.status(500).json({ error: "Failed to fetch sectors" }); 
    }
});

router.get('/items', async (req, res) => {
    try {
      const { data, error } = await supabase.from('items').select('*').order('order_index', { ascending: true }).order('date', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch(e) { 
        console.error("Fetch Items Error:", e.message);
        res.json([]); // Return empty array on fail to not break UI
    }
});

router.post('/admin/items', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canEdit')) return res.status(403).json({error: "Forbidden"});
    try {
      const { isUnread, isLiked, likes, ...cleanBody } = req.body;
      if (!cleanBody.id) cleanBody.id = crypto.randomUUID();

      const itemPayload = {
          ...cleanBody,
          title: xss(cleanBody.title || ''),
          content: xss(cleanBody.content || ''), 
          subject: xss(cleanBody.subject || 'General'),
          fileUrl: cleanBody.fileUrl ? xss(cleanBody.fileUrl) : null,
          author: xss(cleanBody.author || 'Admin'),
          order_index: 0
      };
      
      const { data: item, error } = await supabase.from('items').insert(itemPayload).select().single();
      if (error) throw error;

      if (item.fileUrl && item.fileUrl.length > 0) {
          await supabase.from('drive_registry').insert({
              item_id: item.id,
              drive_url: item.fileUrl,
              file_name: item.title,
              added_by: req.user.username
          });
      }

      await logAction(req.user.username, 'CREATE_ITEM', `Created item ${item.title}`, req);
      
      // --- TRIGGER WEB PUSH ---
      try {
          const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
          if (subs && subs.length > 0) {
              const payload = JSON.stringify({
                  title: `New Post: ${item.title}`,
                  body: `Sector: ${item.sector || 'Archives'} | Subject: ${item.subject || 'General'}`,
                  icon: '/favicon.ico',
                  data: { url: `/?item=${item.id}` } 
              });
              
              subs.forEach(({ subscription }) => {
                  webpush.sendNotification(subscription, payload).catch(err => {
                      if (err.statusCode === 410 || err.statusCode === 404) {
                          supabase.from('push_subscriptions').delete().match({ subscription }).then();
                      }
                  });
              });
          }
      } catch (pushError) {
          console.error("Push Notification Error:", pushError);
      }

      res.json({ success: true, item: item });
    } catch(e) { 
        res.status(500).json({ error: "Creation failed: " + e.message }); 
    }
});

router.post('/ai/chat', async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { message, lineage, history, context, visitorId } = req.body;
      
      const safeMessage = xss(message).substring(0, 1000); 
      const securityDirectives = `You are strictly a database assistant. Limit knowledge to CONTEXT.`;
      const fullPrompt = `${securityDirectives}\nCONTEXT:\n${xss(context).substring(0, 20000)}`;

      let contents = [];
      if (history && Array.isArray(history)) {
          history.slice(-5).forEach(h => {
              if(h.text) contents.push({ role: h.role, parts: [{ text: xss(h.text).substring(0, 1000) }] });
          });
      }
      contents.push({ role: 'user', parts: [{ text: safeMessage }] });

      const response = await aiClient.models.generateContent({ 
          model: "gemini-3-flash-preview",
          contents: contents,
          config: { systemInstruction: fullPrompt, temperature: 0.3 }
      });
      const botText = response.text;

      if (visitorId) {
          supabase.from('visitor_chats').insert({
              visitor_id: xss(visitorId),
              user_query: safeMessage.substring(0, 500),
              bot_response: xss(botText).substring(0, 1000)
          }).then(({ error }) => {
              if (error) console.error("Chat logging failed:", error.message);
          });
      }

      res.json({ text: botText });
    } catch (error) { res.status(500).json({ error: "Oracle Error" }); }
});

router.post('/ai/parse', requireAuth, multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
    try {
      if (!aiClient) return res.status(503).json({ error: "Oracle Disconnected" });
      const { prompt } = req.body;
      let parts = [];
      if (req.file) parts.push({ inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } });
      parts.push({ text: prompt ? xss(prompt) : "Analyze." });

      const response = await aiClient.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts }],
          config: { responseMimeType: "application/json" }
      });
      res.json(JSON.parse(response.text));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/admin/upload', requireAuth, uploadMiddleware.single('file'), async (req, res) => {
  if(!hasPermission(req.user, 'canEdit')) return res.status(403).json({error: "Forbidden"});

  try {
    if (!req.file) return res.status(400).json({error: "No file"});
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('items').upload(uniqueName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(uniqueName);
    res.json({ url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const { data: user, error } = await supabase.from('admin_users').select('*').eq('username', username).maybeSingle();
    
    if (error) throw error;
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const derivedKey = await scryptAsync(password, user.salt, 64);
    if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) return res.status(401).json({ error: "Invalid credentials" });

    const csrfToken = crypto.randomBytes(32).toString('hex');
    const sessionId = await createSession({ username, csrfToken, permissions: user.permissions });

    res.cookie('session_id', sessionId, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 24 * 60 * 60 * 1000 });
    await logAction(username, 'LOGIN', 'User logged in', req);
    res.json({ success: true, csrfToken, permissions: user.permissions });
  } catch(e) { 
      console.error("Login Error:", e.message);
      res.status(500).json({ error: "System Error or DB Connection Failed" }); 
  }
});

router.get('/me', async (req, res) => {
  const sessionId = req.cookies.session_id;
  const sessionData = await getSession(sessionId);
  if (!sessionData) return res.status(401).json({ error: "Session Expired" });
  res.json({ authenticated: true, csrfToken: sessionData.csrfToken, username: sessionData.username, permissions: sessionData.permissions });
});

router.post('/logout', async (req, res) => {
    const sessionId = req.cookies.session_id;
    try {
        if (sessionId) await supabase.from('admin_sessions').delete().eq('session_id', sessionId);
    } catch(e) {}
    res.clearCookie('session_id');
    res.json({ success: true });
});

router.post('/admin/reorder', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canEdit')) return res.status(403).json({error: "Forbidden"});
    try {
        const { updates } = req.body;
        for (const update of updates) {
            await supabase.from('items').update({ order_index: update.order_index }).eq('id', update.id);
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/admin/items/:id', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canEdit')) return res.status(403).json({error: "Forbidden"});
    try {
      const { isUnread, isLiked, likes, created_at, ...cleanBody } = req.body;
      const { error } = await supabase.from('items').update(cleanBody).eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Update failed" }); }
});

router.delete('/admin/items/:id', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canDelete')) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('items').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Delete failed" }); }
});

router.post('/admin/config', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canEdit')) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('global_config').upsert({ id: 1, config: req.body });
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Update failed" }); }
});

router.post('/admin/sectors', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canEdit')) return res.status(403).json({error: "Forbidden"});
    try {
      const { error } = await supabase.from('global_config').upsert({ id: 2, config: req.body });
      if (error) throw error;
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Update failed" }); }
});

router.get('/admin/logs', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canViewLogs')) return res.status(403).json({error: "Forbidden"});
    try {
        const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
        res.json(data || []);
    } catch(e) { res.status(500).json({ error: "Fetch failed" }); }
});

router.get('/admin/visitors', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canViewLogs')) return res.status(403).json({error: "Forbidden"});
    try {
        const { data } = await supabase.from('visitor_logs').select('*').order('last_active', { ascending: false }).limit(100);
        res.json(data || []);
    } catch(e) { res.status(500).json({ error: "Fetch failed" }); }
});

router.get('/admin/visitor-details/:id', requireAuth, async (req, res) => {
    if(!hasPermission(req.user, 'canViewLogs')) return res.status(403).json({error: "Forbidden"});
    try {
        const { id } = req.params;
        const [activityRes, chatsRes] = await Promise.all([
            supabase.from('visitor_activity').select('*').eq('visitor_id', id).order('timestamp', { ascending: false }).limit(50),
            supabase.from('visitor_chats').select('*').eq('visitor_id', id).order('timestamp', { ascending: false }).limit(20)
        ]);
        
        res.json({ 
            activity: activityRes.data || [], 
            chats: chatsRes.data || [] 
        });
    } catch(e) { res.status(500).json({ error: "Fetch failed" }); }
});

router.get('/admin/users', requireAuth, async (req, res) => {
    if (!hasPermission(req.user, 'canManageUsers')) return res.status(403).json({error: "Forbidden"});
    try {
        const { data } = await supabase.from('admin_users').select('username, permissions, last_active');
        res.json(data);
    } catch(e) { res.status(500).json({ error: "Fetch failed" }); }
});

router.post('/admin/users/add', requireAuth, async (req, res) => {
    if (!hasPermission(req.user, 'canManageUsers')) return res.status(403).json({error: "Forbidden"});
    try {
        const { username, password, permissions } = req.body;
        const safeUsername = xss(username);
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await scryptAsync(password, salt, 64)).toString('hex');
        
        const { error } = await supabase.from('admin_users').insert({ username: safeUsername, salt, password_hash: hash, permissions });
        if (error) throw error;
        await logAction(req.user.username, 'ADD_USER', `Added user ${safeUsername}`, req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/users/delete', requireAuth, async (req, res) => {
    if (!hasPermission(req.user, 'canManageUsers')) return res.status(403).json({error: "Forbidden"});
    try {
        const { targetUser } = req.body;
        if (targetUser === 'admin') return res.status(400).json({ error: "Cannot delete root admin" });
        
        const { error } = await supabase.from('admin_users').delete().eq('username', targetUser);
        if (error) throw error;
        await logAction(req.user.username, 'DEL_USER', `Deleted user ${targetUser}`, req);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Delete failed" }); }
});

router.post('/admin/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { username } = req.user;
        
        const { data: user, error } = await supabase.from('admin_users').select('*').eq('username', username).single();
        if (error || !user) return res.status(404).json({ error: "User not found" });

        const derivedKey = await scryptAsync(currentPassword, user.salt, 64);
        if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derivedKey)) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        const newSalt = crypto.randomBytes(16).toString('hex');
        const newHash = (await scryptAsync(newPassword, newSalt, 64)).toString('hex');
        
        await supabase.from('admin_users').update({ salt: newSalt, password_hash: newHash }).eq('username', username);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

app.use('/api', router);

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

export default app;
