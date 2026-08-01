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
    getConnectionStatus
} from './db.js';

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

app.use(express.json({ limit: '50mb' }));
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
await connectDB();

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
    if (!session || session.role !== 'admin') {
        console.warn(`[AUTH] Unauthorized write attempt: ${req.method} ${req.path} - Invalid session or not admin`);
        return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
    }
    req.currentUser = session;
    next();
}

// === Authentication APIs ===
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions.set(token, user);
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

// === Database Status and Logs APIs ===
app.get('/api/db-status', (req, res) => {
    res.json(getConnectionStatus());
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

// === User Management APIs (Admin Only) ===
app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const users = await getUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', requireAdmin, async (req, res) => {
    try {
        const newUser = await addUser(req.body);
        res.json(newUser);
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(400).json({ error: error.message || 'Failed to add user' });
    }
});

app.put('/api/users/:username', requireAdmin, async (req, res) => {
    try {
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

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const members = await getMembers();
        res.json(members);
    } catch (error) {
        console.error('Error reading members:', error);
        res.status(500).json({ error: 'Failed to read members' });
    }
});

// Add new member
app.post('/api/members', requireAdmin, async (req, res) => {
    try {
        const newMember = { ...req.body, id: Date.now() }; // Add simple ID
        const saved = await addMember(newMember);
        res.json(saved);
    } catch (error) {
        console.error('Error saving member:', error);
        res.status(500).json({ error: 'Failed to save member' });
    }
});

// Update existing member
app.put('/api/members/:id', requireAdmin, async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        const members = await getMembers();
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
                const niftarim = await getNiftarim();
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
app.get('/api/archive', async (req, res) => {
    try {
        const archives = await getArchive();
        res.json(archives);
    } catch (error) {
        console.error('Error reading archive:', error);
        res.status(500).json({ error: 'Failed to read archive' });
    }
});

// Get archive for specific member
app.get('/api/archive/:memberId', async (req, res) => {
    try {
        const memberId = parseInt(req.params.memberId);
        const memberHistory = await getArchiveForMember(memberId);
        res.json(memberHistory);
    } catch (error) {
        console.error('Error reading archive for member:', error);
        res.status(500).json({ error: 'Failed to read member history' });
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
app.get('/api/niftarim', async (req, res) => {
    try {
        const niftarim = await getNiftarim();
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

const staticPath = fsSync.existsSync(path.join(__dirname, 'dist')) 
    ? path.join(__dirname, 'dist') 
    : path.join(__dirname, 'public');

app.use(express.static(staticPath));

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

    if (process.parentPort) {
        process.parentPort.postMessage('server-ready');
    } else if (process.send) {
        process.send('server-ready');
    }
});