import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import {
    connectDB,
    getMembers,
    addMember,
    updateMember,
    deleteMember,
    importMembers,
    getArchive,
    getArchiveForMember,
    addArchiveRecord,
    updateArchiveRecord,
    deleteArchiveRecord,
    importArchive,
    getNiftarim,
    addNiftar,
    updateNiftar,
    deleteNiftar,
    importNiftarim,
    authenticateUser,
    getUsers,
    addUser,
    updateUser,
    deleteUser,
    getConnectionStatus,
    saveMongoConfig,
    ensureLocalAdmin,
    getSynagogues,
    addSynagogue,
    updateSynagogue,
    deleteSynagogue,
    getCachedCities,
    getCachedStreets,
    cacheCities,
    cacheStreets,
    loadGeocodingCacheAfterConnection,
    addGuestLog,
    getGuestLogs,
    clearGuestLogs
} from './db.js';
import { normalizeRole, isAdminRole, isSuperAdmin, resolveEffectiveSynagogueId } from './accessControl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// CORS Middleware to allow requests from the frontend (Vite/Electron)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});


// Logging setup for production debugging
const logPath = process.env.APP_DATA_PATH ? path.join(path.dirname(process.env.APP_DATA_PATH), 'app.log') : null;
function log(msg) {
    const entry = `[${new Date().toISOString()}] [SERVER] ${msg}\n`;
    console.log(msg);
    if (logPath) {
        try {
            fsSync.appendFileSync(logPath, entry);
        } catch (e) { }
    }
}

process.on('uncaughtException', (err) => {
    log(`CRITICAL UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`CRITICAL UNHANDLED REJECTION: ${reason}`);
});

log('Server starting...');
log(`__dirname: ${__dirname}`);
log(`Port: ${port}`);

app.use(express.json({ limit: '50mb', strict: false }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const allParshot = [
    "בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי",
    "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצווה", "כי תשא", "ויקהל", "פקודי",
    "ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי",
    "במדבר", "נשא", "בהעלותך", "שלח לך", "קרח", "חקת", "בלק", "פנחס", "מטות", "מסעי",
    "דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא", "נצבים", "וילך", "האזינו", "וזאת הברכה",
    "ויקהל-פקודי", "תזריע-מצורע", "אחרי מות-קדושים", "בהר-בחוקותי", "חקת-בלק", "מטות-מסעי", "נצבים-וילך"
];

// נתיב שיחזיר את רשימת הפרשות בפורמט JSON
app.get('/api/parshot', (req, res) => {
    res.json(allParshot);
});

// API to get all Parashot
app.get('/api/parashot', (req, res) => {
    console.log('API Request: /api/parashot');
    try {
        // Get all parashot for the current year
        const year = new HDate().getFullYear();
        const options = {
            year: year,
            isHebrewYear: true,
            sedrot: true,
            il: true
        };
        const events = HebrewCalendar.calendar(options);
        const parashot = events
            .filter(ev => ev.getFlags() & flags.PARSHA_HASHAVUA)
            .map(ev => ev.render('he'))
            // Filter unique names
            .filter((v, i, a) => a.indexOf(v) === i);

        res.json(parashot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

log(`__dirname: ${__dirname}`);
log(`APP_DATA_PATH env var: ${process.env.APP_DATA_PATH}`);
const DATA_DIR = process.env.APP_DATA_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');
const NIFTARIM_FILE = path.join(DATA_DIR, 'niftarim.json');

log(`Using data directory: ${DATA_DIR}`);
console.log('Using data directory:', DATA_DIR);

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error('Error creating data directory:', err);
    }
}
ensureDataDir();

// CRITICAL: Immediately create local admin user so login always works,
// even during the 15-20 seconds MongoDB is still connecting in background.
ensureLocalAdmin().catch(err => log(`Error ensuring local admin: ${err.message}`));

// Start database connection in the background so it doesn't block server startup
connectDB()
    .then(() => {
        // Load geocoding cache after MongoDB connection is established
        loadGeocodingCacheAfterConnection().catch(err => log(`Error loading geocoding cache: ${err.message}`));
    })
    .catch(err => log(`Error in connectDB: ${err.message}`));

// === Active Sessions memory storage ===
const activeSessions = new Map(); // token -> { username, role }

// === Middleware to require Admin role ===
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[AUTH] Unauthorized write attempt: ${req.method} ${req.path} - No Bearer token`);
        return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
    }
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (!session || !isAdminRole(session.role)) {
        console.warn(`[AUTH] Unauthorized write attempt: ${req.method} ${req.path} - Invalid session or not admin`);
        return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
    }
    req.currentUser = session;
    next();
}

function requireSuperAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized. Super Admin credentials required.' });
    }
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (!session || !isSuperAdmin(session.role)) {
        return res.status(403).json({ error: 'Forbidden. Super Admin credentials required.' });
    }
    req.currentUser = session;
    next();
}

function requireAuthenticatedUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.currentUser = { role: 'viewer', username: 'guest' };
        return next();
    }
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (!session) {
        req.currentUser = { role: 'viewer', username: 'guest' };
        return next();
    }
    req.currentUser = session;
    next();
}

// === Authentication APIs ===
app.post('/api/auth/login', async (req, res) => {
    try {
        const username = req.body.username ? String(req.body.username).trim() : '';
        const password = req.body.password ? String(req.body.password).trim() : '';
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions.set(token, user);

        // Record admin / user login in guest & access logs
        try {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const now = new Date();
            const hebrewDateStr = new HDate(now).renderGematriya(true);

            let synagogueName = req.body.synagogueName || null;
            if (!synagogueName && user.synagogueId) {
                const synagogues = await getSynagogues();
                const syn = synagogues.find(s => s.id === user.synagogueId);
                if (syn) synagogueName = syn.name;
            }

            let platform = req.body.platform || 'web';
            if (!req.body.platform && userAgent) {
                if (/android/i.test(userAgent)) platform = 'android';
                else if (/iphone|ipad|ipod/i.test(userAgent)) platform = 'ios';
                else if (/electron/i.test(userAgent)) platform = 'electron';
            }

            await addGuestLog({
                platform,
                synagogueId: user.synagogueId || null,
                synagogueName: synagogueName || null,
                screen: req.body.screen || null,
                userAgent,
                ip: clientIp,
                hebrewDate: hebrewDateStr,
                clientTimestamp: now.toISOString(),
                userRole: user.role || 'synagogue_admin',
                username: user.username
            });
        } catch (logErr) {
            console.error('Error logging user login:', logErr);
        }

        res.json({ success: true, token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        activeSessions.delete(token);
    }
    res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const session = activeSessions.get(token);
        if (session) {
            return res.json({ loggedIn: true, user: session });
        }
    }
    res.json({ loggedIn: false });
});

app.post('/api/auth/change-credentials', requireAdmin, async (req, res) => {
    try {
        const { username, password } = req.body;
        const nextUsername = String(username || '').trim();
        const nextPassword = String(password || '').trim();

        if (!nextUsername || !nextPassword) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const currentUsername = req.currentUser.username;
        const updatedUser = await updateUser(currentUsername, {
            username: nextUsername,
            password: nextPassword
        });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            activeSessions.set(token, {
                username: updatedUser.username,
                role: updatedUser.role
            });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating admin credentials:', error);
        res.status(400).json({ error: error.message || 'Failed to update admin credentials' });
    }
});

// === Database Status and Logs APIs ===
app.get('/api/db-status', (req, res) => {
    res.json(getConnectionStatus());
});

// === Local Preferences API ===
app.get('/api/preferences', async (req, res) => {
    try {
        const prefPath = path.join(DATA_DIR, 'preferences.json');
        if (fsSync.existsSync(prefPath)) {
            const data = await fs.readFile(prefPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({});
        }
    } catch (error) {
        console.error('Error reading preferences:', error);
        res.json({});
    }
});

app.post('/api/preferences', async (req, res) => {
    try {
        const prefPath = path.join(DATA_DIR, 'preferences.json');
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(prefPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

// === Synagogue Name API - Simple file access ===
app.get('/api/synagogue-name', (req, res) => {
    try {
        const synNamePath = path.join(DATA_DIR, 'synagogue_name.json');
        if (fsSync.existsSync(synNamePath)) {
            const data = fsSync.readFileSync(synNamePath, 'utf8');
            const parsed = JSON.parse(data);
            res.json({ synagogueName: parsed.synagogueName });
        } else {
            res.json({ synagogueName: null });
        }
    } catch (error) {
        console.error('Error reading synagogue name:', error);
        res.json({ synagogueName: null });
    }
});

app.post('/api/synagogue-name', (req, res) => {
    try {
        const { synagogueName } = req.body;
        const synNamePath = path.join(DATA_DIR, 'synagogue_name.json');
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(synNamePath, JSON.stringify({ synagogueName }, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving synagogue name:', error);
        res.status(500).json({ error: 'Failed to save synagogue name' });
    }
});

// === Current User Info API ===
app.get('/api/current-user', requireAuthenticatedUser, (req, res) => {
    try {
        const userInfo = {
            username: req.currentUser?.username || 'guest',
            role: req.currentUser?.role || 'viewer',
            synagogueId: req.currentUser?.synagogueId || null
        };
        res.json(userInfo);
    } catch (error) {
        console.error('Error getting current user info:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

app.post('/api/db-config', async (req, res) => {
    try {
        const { mongoUri } = req.body;
        if (!mongoUri) return res.status(400).json({ error: 'MongoDB URI is required' });
        const success = await saveMongoConfig(mongoUri);
        res.json({ success, status: getConnectionStatus() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/db-reconnect', async (req, res) => {
    try {
        const success = await connectDB();
        res.json({ success, status: getConnectionStatus() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        if (logPath && fsSync.existsSync(logPath)) {
            const logs = await fs.readFile(logPath, 'utf8');
            res.send(logs);
        } else {
            res.send('קובץ הלוג לא נמצא במערכת.');
        }
    } catch (error) {
        res.status(500).send('שגיאה בקריאת הלוגים: ' + error.message);
    }
});

// === Synagogue Management APIs ===
app.get('/api/synagogues', requireAuthenticatedUser, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const synagogues = await getSynagogues();
        res.json(synagogues);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch synagogues' });
    }
});

app.post('/api/synagogues', requireAdmin, async (req, res) => {
    try {
        console.log('Received synagogue data:', req.body);
        const synagogue = await addSynagogue(req.body);
        console.log('Created synagogue:', synagogue);
        res.json(synagogue);
    } catch (error) {
        console.error('Failed to create synagogue:', error);
        res.status(500).json({ error: 'Failed to create synagogue: ' + error.message });
    }
});

app.put('/api/synagogues/:id', requireAdmin, async (req, res) => {
    try {
        const user = req.currentUser;
        const rawId = req.params.id; // keep as string for DB calls

        // synagogue_admin may only update their own synagogue, and only the name field
        if (normalizeRole(user.role) === 'synagogue_admin') {
            if (!user.synagogueId || String(user.synagogueId) !== String(rawId)) {
                return res.status(403).json({ error: 'אין הרשאה לעדכן בית כנסת זה' });
            }
            // Allow only the name field to be changed by synagogue_admin
            const { name } = req.body;
            if (!name || String(name).trim() === '') {
                return res.status(400).json({ error: 'שם בית כנסת לא יכול להיות ריק' });
            }
            const updated = await updateSynagogue(rawId, { name: String(name).trim() });
            if (!updated) return res.status(404).json({ error: 'Synagogue not found' });
            return res.json(updated);
        }

        // super_admin – full update
        const updated = await updateSynagogue(rawId, req.body);
        if (!updated) return res.status(404).json({ error: 'Synagogue not found' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update synagogue' });
    }
});

app.delete('/api/synagogues/:id', requireAdmin, async (req, res) => {
    try {
        const ok = await deleteSynagogue(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Synagogue not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete synagogue' });
    }
});

// === User Management APIs (Admin & Synagogue Admin) ===
app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const { filterUsersByAccess } = await import('./accessControl.js');
        const allUsers = await getUsers();
        // synagogue_admin sees only users of their own synagogue
        const filtered = filterUsersByAccess(allUsers, req.currentUser);
        res.json(filtered);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', requireAdmin, async (req, res) => {
    try {
        const userRole = normalizeRole(req.currentUser?.role);
        if (userRole === 'synagogue_admin') {
            if (!req.currentUser.synagogueId) {
                return res.status(400).json({ error: 'מנהל בית כנסת חייב להיות משויך לבית כנסת' });
            }
            // Enforce synagogueId to match synagogue_admin's synagogue
            req.body.synagogueId = req.currentUser.synagogueId;
            // Prevent synagogue_admin from creating super_admin users
            if (normalizeRole(req.body.role) === 'super_admin') {
                req.body.role = 'synagogue_admin';
            }
        }
        const newUser = await addUser(req.body);
        res.json(newUser);
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(400).json({ error: error.message || 'Failed to add user' });
    }
});

app.put('/api/users/:username', requireAdmin, async (req, res) => {
    try {
        const userRole = normalizeRole(req.currentUser?.role);
        if (userRole === 'synagogue_admin') {
            const allUsers = await getUsers();
            const targetUser = allUsers.find(u => u.username === req.params.username);
            if (!targetUser || targetUser.synagogueId !== req.currentUser.synagogueId) {
                return res.status(403).json({ error: 'אין הרשאה לערוך משתמש זה' });
            }
            req.body.synagogueId = req.currentUser.synagogueId;
            if (normalizeRole(req.body.role) === 'super_admin') {
                delete req.body.role;
            }
        }
        const updated = await updateUser(req.params.username, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updated);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:username', requireAdmin, async (req, res) => {
    try {
        const userRole = normalizeRole(req.currentUser?.role);
        if (userRole === 'synagogue_admin') {
            const allUsers = await getUsers();
            const targetUser = allUsers.find(u => u.username === req.params.username);
            if (!targetUser || targetUser.synagogueId !== req.currentUser.synagogueId) {
                return res.status(403).json({ error: 'אין הרשאה למחוק משתמש זה' });
            }
        }
        const success = await deleteUser(req.params.username);
        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(400).json({ error: error.message || 'Failed to delete user' });
    }
});

// === Ping / Health Keep-Alive APIs ===
app.get('/api/ping', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        serverUptime: Math.floor(process.uptime())
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage().rss
    });
});

// === Guest / App Access Logs APIs ===
app.post('/api/logs/guest', async (req, res) => {
    try {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const now = new Date();
        const hebrewDateStr = new HDate(now).renderGematriya(true);

        const logEntry = {
            sessionVisitId: req.body.sessionVisitId || null,
            platform: req.body.platform || 'web',
            synagogueId: req.body.synagogueId || null,
            synagogueName: req.body.synagogueName || null,
            screen: req.body.screen || null,
            userAgent: userAgent,
            ip: clientIp,
            hebrewDate: hebrewDateStr,
            clientTimestamp: req.body.timestamp || now.toISOString(),
            userRole: req.body.userRole || 'guest',
            username: req.body.username || 'אורח'
        };

        const saved = await addGuestLog(logEntry);
        res.json({ success: true, log: saved });
    } catch (error) {
        console.error('Error logging guest visit:', error);
        res.status(500).json({ error: 'Failed to record log' });
    }
});

app.get('/api/logs/guest', requireSuperAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const logs = await getGuestLogs(limit);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching guest logs:', error);
        res.status(500).json({ error: 'Failed to fetch guest logs' });
    }
});

app.delete('/api/logs/guest', requireSuperAdmin, async (req, res) => {
    try {
        const success = await clearGuestLogs();
        res.json({ success });
    } catch (error) {
        console.error('Error clearing guest logs:', error);
        res.status(500).json({ error: 'Failed to clear guest logs' });
    }
});

// Get all members
app.get('/api/members', requireAuthenticatedUser, async (req, res) => {
    try {
        const requestedSynagogueId = req.query.viewSynagogueId ? String(req.query.viewSynagogueId) : null;
        const role = normalizeRole(req.currentUser?.role);
        let effectiveUser = req.currentUser;
        
        console.log('GET /api/members - requestedSynagogueId:', requestedSynagogueId, 'role:', role, 'currentUser:', req.currentUser);
        
        // For worshippers (viewers with synagogue association), ensure they see their synagogue's data
        if (role === 'viewer' && req.currentUser?.synagogueId && !requestedSynagogueId) {
            // Viewer with synagogue association sees their synagogue by default
            effectiveUser = { ...req.currentUser };
            console.log('Viewer with synagogue association sees their synagogue:', req.currentUser.synagogueId);
        }
        
        if (requestedSynagogueId) {
            if (role === 'super_admin') {
                effectiveUser = { ...req.currentUser, viewSynagogueId: requestedSynagogueId };
            } else if (role === 'viewer') {
                // Guest viewer can browse a selected synagogue - ALWAYS set synagogueId
                effectiveUser = { ...req.currentUser, synagogueId: requestedSynagogueId };
                console.log('Setting guest viewer synagogueId to:', requestedSynagogueId);
            }
        }
        
        const members = await getMembers(effectiveUser);
        console.log('Returning members count:', members.length);
        res.json(members);
    } catch (error) {
        console.error('Error reading members:', error);
        res.status(500).json({ error: 'Failed to read members' });
    }
});

// Add new member
app.post('/api/members', requireAdmin, async (req, res) => {
    try {
        const effectiveSynagogueId = resolveEffectiveSynagogueId(req.currentUser, req.body.synagogueId, null);
        const newMember = { ...req.body, id: Date.now(), synagogueId: effectiveSynagogueId }; // Add simple ID
        const saved = await addMember(newMember);
        res.json(saved);
    } catch (error) {
        console.error('Error saving member:', error);
        res.status(500).json({ error: 'Failed to save member' });
    }
});

// Guest self-registration endpoint (allows guests to register themselves once if enabled by admin)
app.post('/api/members/self-register', async (req, res) => {
    try {
        const prefPath = path.join(DATA_DIR, 'preferences.json');
        let prefs = {};
        if (fsSync.existsSync(prefPath)) {
            try {
                prefs = JSON.parse(fsSync.readFileSync(prefPath, 'utf8'));
            } catch (e) {}
        }

        const allowGuest = prefs.allowGuestSelfRegistration !== false;
        const expiresAt = prefs.guestSelfRegistrationExpiresAt;

        if (!allowGuest) {
            return res.status(403).json({ success: false, error: 'ההרשמה העצמית סגורה כעת על ידי מנהל המערכת' });
        }

        if (expiresAt && new Date() > new Date(expiresAt)) {
            return res.status(403).json({ success: false, error: 'זמן ההרשמה העצמית תם והיא סגורה כעת' });
        }

        const synagogueId = req.body.synagogueId;
        const firstName = req.body.firstName ? String(req.body.firstName).trim() : '';
        const lastName = req.body.lastName ? String(req.body.lastName).trim() : '';

        if (!synagogueId || !firstName || !lastName) {
            return res.status(400).json({ success: false, error: 'יש להזין שם פרטי, שם משפחה ובית כנסת' });
        }

        const newMember = {
            ...req.body,
            id: Date.now(),
            synagogueId: synagogueId,
            letter: req.body.letter || ['א'],
            isSelfRegistered: true,
            registeredAt: new Date().toISOString()
        };

        const saved = await addMember(newMember);
        res.json({ success: true, member: saved });
    } catch (error) {
        console.error('Error in guest self-register:', error);
        res.status(500).json({ success: false, error: 'נכשלה הרשמת מתפלל עצמית' });
    }
});

// Update existing member
app.put('/api/members/:id', requireAdmin, async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        const members = await getMembers(req.currentUser);
        const oldMember = members.find(m => m.id === memberId);

        if (!oldMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const updatedMember = { ...req.body, id: memberId };
        
        const letterVal = updatedMember.letter;
        const isNiftar = Array.isArray(letterVal)
            ? letterVal.includes('נפ')
            : String(letterVal || '').includes('נפ');

        if (isNiftar) {
            try {
                console.log('Member marked as נפ - adding to niftarim archive:', memberId);
                const niftarim = await getNiftarim(req.currentUser);
                const alreadyExists = niftarim.some(n => n.originalMemberId === memberId);
                if (!alreadyExists) {
                    const niftarRecord = {
                        id: Date.now(),
                        originalMemberId: memberId,
                        status: updatedMember.status || '',
                        title: updatedMember.title || '',
                        lastName: updatedMember.lastName || '',
                        firstName: updatedMember.firstName || '',
                        fatherName: updatedMember.fatherName || '',
                        death_date: '',           // לא ידוע - ימולא ידנית
                        father_death_date: updatedMember.father_death_date || '',
                        mother_death_date: updatedMember.mother_death_date || '',
                        barMitzvahParasha: updatedMember.barMitzvahParasha || '',
                        notes: updatedMember.notes || '',
                        addedFromMember: new Date().toISOString()
                    };
                    await addNiftar(niftarRecord);
                    console.log('Successfully added to niftarim archive.');

                    // Remove from active members list
                    await deleteMember(memberId);
                    console.log('Successfully removed member from active members list.');
                } else {
                    console.log('Member already exists in niftarim archive, skipping.');
                }
            } catch (niftarError) {
                console.error('Failed to add member to niftarim archive:', niftarError);
            }
        } else {
            await updateMember(memberId, updatedMember);
        }

        // Archive the change ONLY if aliyah_date changed and is not empty
        if (updatedMember.aliyah_date && oldMember.aliyah_date !== updatedMember.aliyah_date) {
            try {
                console.log('Archiving change for member:', memberId);
                const archivePayload = {
                    ...updatedMember,
                    memberId: memberId,
                    changeDate: new Date().toISOString(),
                    archiveId: Date.now()
                };
                await addArchiveRecord(archivePayload);
                console.log('Successfully archived change.');
            } catch (archiveError) {
                console.error('Failed to archive member update:', archiveError);
            }
        }

        res.json(updatedMember);
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Delete member
app.delete('/api/members/:id', requireAdmin, async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        const success = await deleteMember(memberId);
        if (!success) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json({ success: true, id: memberId });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// Get archive list
app.get('/api/archive', requireAuthenticatedUser, async (req, res) => {
    try {
        const requestedSynagogueId = req.query.viewSynagogueId ? String(req.query.viewSynagogueId) : null;
        const role = normalizeRole(req.currentUser?.role);
        let effectiveUser = req.currentUser;
        
        // For worshippers (viewers with synagogue association), ensure they see their synagogue's data
        if (role === 'viewer' && req.currentUser?.synagogueId && !requestedSynagogueId) {
            // Viewer with synagogue association sees their synagogue by default
            effectiveUser = { ...req.currentUser };
            console.log('Viewer with synagogue association sees their synagogue archive:', req.currentUser.synagogueId);
        }
        
        if (requestedSynagogueId) {
            if (role === 'super_admin') {
                effectiveUser = { ...req.currentUser, viewSynagogueId: requestedSynagogueId };
            } else if (role === 'viewer') {
                // Guest viewer can browse a selected synagogue - ALWAYS set synagogueId
                effectiveUser = { ...req.currentUser, synagogueId: requestedSynagogueId };
            }
        }
        
        const archives = await getArchive(effectiveUser);
        res.json(archives);
    } catch (error) {
        console.error('Error reading archive:', error);
        res.status(500).json({ error: 'Failed to read archive' });
    }
});

// Get archive for specific member
app.get('/api/archive/:memberId', requireAuthenticatedUser, async (req, res) => {
    try {
        const memberId = parseInt(req.params.memberId);
        const memberHistory = await getArchiveForMember(memberId);
        res.json(memberHistory);
    } catch (error) {
        console.error('Error reading archive for member:', error);
        res.status(500).json({ error: 'Failed to read member history' });
    }
});

// === Geocoding API (Server-side cache with data.gov.il official data) ===
app.get('/api/osm/cities', async (req, res) => {
    try {
        // Check cache first
        const cachedCities = getCachedCities();
        if (cachedCities.length > 0) {
            return res.json({ cities: cachedCities, cached: true });
        }
        
        // Use official data.gov.il API for all Israeli settlements (1,300+ settlements)
        const response = await fetch('https://data.gov.il/api/3/action/datastore_search?resource_id=8f714b6f-c35c-4b40-a0e7-547b675eee0e&limit=2000');
        const data = await response.json();
        if (data.success && data.result.records) {
            const cityNames = [...new Set(data.result.records.map(record => record.city_name_he))]
                .filter(name => name && name.trim())
                .sort((a, b) => a.localeCompare(b, 'he'));
            
            // Cache the cities
            cacheCities(cityNames);
            
            res.json({ cities: cityNames, cached: false });
        } else {
            res.json({ cities: [] });
        }
    } catch (error) {
        console.error('Failed to fetch cities from data.gov.il:', error);
        res.json({ cities: ['ירושלים', 'תל אביב-יפו', 'חיפה', 'ראשון לציון', 'אשדוד', 'באר שבע', 'נתניה', 'חולון', 'בני ברק', 'רמת גן'] });
    }
});

app.get('/api/osm/streets', async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) {
            return res.json({ streets: [] });
        }
        
        // Check cache first
        const cachedStreets = getCachedStreets(city);
        if (cachedStreets.length > 0) {
            return res.json({ streets: cachedStreets, cached: true });
        }
        
        // Use official data.gov.il API for streets (63,000+ streets in 1,300+ settlements)
        const response = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=bf185c7f-1a4e-4662-88c5-fa118a244bda&q=${encodeURIComponent(city)}&limit=5000`);
        const data = await response.json();
        if (data.success && data.result.records) {
            const streetNames = [...new Set(data.result.records
                .filter(record => record.city_name === city && record.street_name)
                .map(record => record.street_name))]
                .filter(name => name && name.trim())
                .sort((a, b) => a.localeCompare(b, 'he'));
            
            // Cache the streets for this city
            cacheStreets(city, streetNames);
            
            res.json({ streets: streetNames, cached: false });
        } else {
            res.json({ streets: [] });
        }
    } catch (error) {
        console.error('Failed to fetch streets from data.gov.il:', error);
        res.json({ streets: [] });
    }
});

// Update archive record
app.put('/api/archive/:archiveId', requireAdmin, async (req, res) => {
    try {
        const archiveId = parseInt(req.params.archiveId);
        const updated = await updateArchiveRecord(archiveId, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Archive record not found' });
        }
        res.json(updated);
    } catch (error) {
        console.error('Error updating archive:', error);
        res.status(500).json({ error: 'Failed to update archive record' });
    }
});

// Delete archive record
app.delete('/api/archive/:archiveId', requireAdmin, async (req, res) => {
    try {
        const archiveId = parseInt(req.params.archiveId);
        const success = await deleteArchiveRecord(archiveId);
        if (!success) {
            return res.status(404).json({ error: 'Archive record not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting archive:', error);
        res.status(500).json({ error: 'Failed to delete archive record' });
    }
});

// Import Members (Restore/Replace)
app.post('/api/members/import', requireAdmin, async (req, res) => {
    try {
        const newMembers = req.body;
        if (!Array.isArray(newMembers)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array of members.' });
        }
        await importMembers(newMembers);
        res.json({ success: true, count: newMembers.length });
    } catch (error) {
        console.error('Error importing members:', error);
        res.status(500).json({ error: 'Failed to import members' });
    }
});

// Import Archive (Restore/Replace)
app.post('/api/archive/import', requireAdmin, async (req, res) => {
    try {
        const newArchive = req.body;
        if (!Array.isArray(newArchive)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array of archive records.' });
        }
        await importArchive(newArchive);
        res.json({ success: true, count: newArchive.length });
    } catch (error) {
        console.error('Error importing archive:', error);
        res.status(500).json({ error: 'Failed to import archive' });
    }
});

// ========== NIFTARIM API ==========

// Get all niftarim
app.get('/api/niftarim', requireAuthenticatedUser, async (req, res) => {
    try {
        const requestedSynagogueId = req.query.viewSynagogueId ? String(req.query.viewSynagogueId) : null;
        const role = normalizeRole(req.currentUser?.role);
        let effectiveUser = req.currentUser;
        
        // For worshippers (viewers with synagogue association), ensure they see their synagogue's data
        if (role === 'viewer' && req.currentUser?.synagogueId && !requestedSynagogueId) {
            // Viewer with synagogue association sees their synagogue by default
            effectiveUser = { ...req.currentUser };
            console.log('Viewer with synagogue association sees their synagogue niftarim:', req.currentUser.synagogueId);
        }
        
        if (requestedSynagogueId) {
            if (role === 'super_admin') {
                effectiveUser = { ...req.currentUser, viewSynagogueId: requestedSynagogueId };
            } else if (role === 'viewer') {
                // Guest viewer can browse a selected synagogue - ALWAYS set synagogueId
                effectiveUser = { ...req.currentUser, synagogueId: requestedSynagogueId };
            }
        }
        
        const niftarim = await getNiftarim(effectiveUser);
        res.json(niftarim);
    } catch (error) {
        console.error('Error reading niftarim:', error);
        res.status(500).json({ error: 'Failed to read niftarim' });
    }
});

// Add new niftar
app.post('/api/niftarim', requireAdmin, async (req, res) => {
    try {
        const newNiftar = { ...req.body, id: Date.now() };
        const saved = await addNiftar(newNiftar);
        res.json(saved);
    } catch (error) {
        console.error('Error saving niftar:', error);
        res.status(500).json({ error: 'Failed to save niftar' });
    }
});

// Update existing niftar
app.put('/api/niftarim/:id', requireAdmin, async (req, res) => {
    try {
        const niftarId = parseInt(req.params.id);
        const updated = await updateNiftar(niftarId, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Niftar not found' });
        }
        res.json(updated);
    } catch (error) {
        console.error('Error updating niftar:', error);
        res.status(500).json({ error: 'Failed to update niftar' });
    }
});

// Delete niftar
app.delete('/api/niftarim/:id', requireAdmin, async (req, res) => {
    try {
        const niftarId = parseInt(req.params.id);
        const success = await deleteNiftar(niftarId);
        if (!success) {
            return res.status(404).json({ error: 'Niftar not found' });
        }
        res.json({ success: true, id: niftarId });
    } catch (error) {
        console.error('Error deleting niftar:', error);
        res.status(500).json({ error: 'Failed to delete niftar' });
    }
});

// Import Niftarim (Restore/Replace)
app.post('/api/niftarim/import', requireAdmin, async (req, res) => {
    try {
        const newNiftarim = req.body;
        if (!Array.isArray(newNiftarim)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }
        await importNiftarim(newNiftarim);
        res.json({ success: true, count: newNiftarim.length });
    } catch (error) {
        console.error('Error importing niftarim:', error);
        res.status(500).json({ error: 'Failed to import niftarim' });
    }
});

const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

if (fsSync.existsSync(distPath)) {
    app.use(express.static(distPath));
}
if (fsSync.existsSync(publicPath)) {
    app.use(express.static(publicPath));
}

// Explicit ICO and icon download handlers
app.get(['/favicon.ico', '/synagogue.ico', '/app.ico', '/icon.ico', '/prague_synagogue_icon.ico'], (req, res) => {
    const icoPath = fsSync.existsSync(path.join(distPath, 'favicon.ico')) 
        ? path.join(distPath, 'favicon.ico') 
        : path.join(publicPath, 'favicon.ico');
    if (fsSync.existsSync(icoPath)) {
        res.setHeader('Content-Type', 'image/x-icon');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(icoPath);
    }
    res.status(404).send('Icon not found');
});

const staticPath = fsSync.existsSync(distPath) ? distPath : publicPath;

// Fallback to index.html for SPA - Use app.use at the end to catch all remaining GET requests
app.use((req, res) => {
    if (req.method !== 'GET') {
        return res.status(404).send('Not Found');
    }

    const indexPath = path.join(staticPath, 'index.html');

    if (!fsSync.existsSync(indexPath)) {
        log(`CRITICAL: index.html not found at ${indexPath}`);
        res.status(500).send(`Front-end files missing at ${indexPath}`);
        return;
    }

    res.sendFile(indexPath, (err) => {
        if (err) {
            console.log(`ERROR sending index.html: ${err.message}`);
            res.status(500).send('Error loading frontend');
        }
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Serving static from: ${path.join(__dirname, 'public')}`);

    // Signal parent Electron process that server is ready IMMEDIATELY
    // Don't wait for database connection - it runs in background
    if (process.parentPort) {
        process.parentPort.postMessage('server-ready');
    } else if (process.send) {
        process.send('server-ready');
    }

    // Keep-alive self-ping every 10 minutes (prevents cloud/Render sleep when active)
    const PING_INTERVAL_MS = 10 * 60 * 1000;
    const externalUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

    setInterval(async () => {
        try {
            const pingUrl = `${externalUrl}/api/ping`;
            const res = await fetch(pingUrl);
            if (res.ok) {
                log(`[KEEP-ALIVE] Self-ping successful: ${pingUrl}`);
            } else {
                log(`[KEEP-ALIVE] Self-ping status: ${res.status}`);
            }
        } catch (err) {
            log(`[KEEP-ALIVE] Self-ping failed: ${err.message}`);
        }
    }, PING_INTERVAL_MS);

    log(`[KEEP-ALIVE] Self-ping service started (every 10m to ${externalUrl}/api/ping)`);
});