import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import fs from 'fs/promises';
import fsSync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

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

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading members:', error);
            res.status(500).json({ error: 'Failed to read members' });
        }
    }
});

// Add new member
app.post('/api/members', async (req, res) => {
    try {
        let members = [];
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            members = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        const newMember = { ...req.body, id: Date.now() }; // Add simple ID
        members.push(newMember);

        await fs.writeFile(DATA_FILE, JSON.stringify(members, null, 2));

        // Archive creation removed as per user request (only updates should be archived)


        res.json(newMember);
    } catch (error) {
        console.error('Error saving member:', error);
        res.status(500).json({ error: 'Failed to save member' });
    }
});

// Update existing member
app.put('/api/members/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        let members = JSON.parse(data);

        const memberId = parseInt(req.params.id);
        const memberIndex = members.findIndex(m => m.id === memberId);

        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const oldMember = members[memberIndex];

        // Update member while preserving ID
        const updatedMember = { ...req.body, id: memberId };
        members[memberIndex] = updatedMember;

        await fs.writeFile(DATA_FILE, JSON.stringify(members, null, 2));

        // Archive the change ONLY if aliyah_date changed and is not empty
        if (updatedMember.aliyah_date && oldMember.aliyah_date !== updatedMember.aliyah_date) {
            try {
                console.log('Archiving change for member:', memberId);
                let archives = [];
                try {
                    const archiveData = await fs.readFile(ARCHIVE_FILE, 'utf8');
                    archives = JSON.parse(archiveData);
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error;
                    console.log('Archive file not found, creating new one.');
                }
                archives.push({
                    ...updatedMember,
                    memberId: memberId,
                    changeDate: new Date().toISOString(),
                    archiveId: Date.now()
                });
                await fs.writeFile(ARCHIVE_FILE, JSON.stringify(archives, null, 2));
                console.log('Successfully archived change.');
            } catch (archiveError) {
                console.error('Failed to archive member update:', archiveError);
            }
        }

        // If letter field was set to "נפ", automatically add to niftarim archive
        const letterVal = updatedMember.letter;
        const isNiftar = Array.isArray(letterVal)
            ? letterVal.includes('נפ')
            : String(letterVal || '').includes('נפ');

        if (isNiftar) {
            try {
                console.log('Member marked as נפ - adding to niftarim archive:', memberId);
                let niftarim = [];
                try {
                    const niftarimData = await fs.readFile(NIFTARIM_FILE, 'utf8');
                    niftarim = JSON.parse(niftarimData);
                } catch (err) {
                    if (err.code !== 'ENOENT') throw err;
                }

                // Check if this member is already in the niftarim list (by originalMemberId)
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
                    niftarim.push(niftarRecord);
                    await fs.writeFile(NIFTARIM_FILE, JSON.stringify(niftarim, null, 2));
                    console.log('Successfully added to niftarim archive.');

                    // Remove from active members list
                    members.splice(memberIndex, 1);
                    await fs.writeFile(DATA_FILE, JSON.stringify(members, null, 2));
                    console.log('Successfully removed member from active members list.');
                } else {
                    console.log('Member already exists in niftarim archive, skipping.');
                }
            } catch (niftarError) {
                console.error('Failed to add member to niftarim archive:', niftarError);
            }
        }

        res.json(updatedMember);
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        let members = JSON.parse(data);

        const memberId = parseInt(req.params.id);
        const memberIndex = members.findIndex(m => m.id === memberId);

        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Member not found' });
        }

        members.splice(memberIndex, 1);

        await fs.writeFile(DATA_FILE, JSON.stringify(members, null, 2));
        res.json({ success: true, id: memberId });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// Get archive list
app.get('/api/archive', async (req, res) => {
    try {
        const data = await fs.readFile(ARCHIVE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading archive:', error);
            res.status(500).json({ error: 'Failed to read archive' });
        }
    }
});

// Get archive for specific member
app.get('/api/archive/:memberId', async (req, res) => {
    try {
        const data = await fs.readFile(ARCHIVE_FILE, 'utf8');
        const archives = JSON.parse(data);
        const memberId = parseInt(req.params.memberId);
        const memberHistory = archives.filter(a => a.memberId === memberId);
        res.json(memberHistory);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading archive for member:', error);
            res.status(500).json({ error: 'Failed to read member history' });
        }
    }
});

// Update archive record
app.put('/api/archive/:archiveId', async (req, res) => {
    try {
        const data = await fs.readFile(ARCHIVE_FILE, 'utf8');
        let archives = JSON.parse(data);
        const archiveId = parseInt(req.params.archiveId);
        const index = archives.findIndex(a => a.archiveId === archiveId);

        if (index === -1) {
            return res.status(404).json({ error: 'Archive record not found' });
        }

        // Update preserving original IDs and other fields
        archives[index] = { ...archives[index], ...req.body, archiveId: archiveId };
        await fs.writeFile(ARCHIVE_FILE, JSON.stringify(archives, null, 2));
        res.json(archives[index]);
    } catch (error) {
        console.error('Error updating archive:', error);
        res.status(500).json({ error: 'Failed to update archive record' });
    }
});

// Delete archive record
app.delete('/api/archive/:archiveId', async (req, res) => {
    try {
        const data = await fs.readFile(ARCHIVE_FILE, 'utf8');
        let archives = JSON.parse(data);
        const archiveId = parseInt(req.params.archiveId);
        const index = archives.findIndex(a => a.archiveId === archiveId);

        if (index === -1) {
            return res.status(404).json({ error: 'Archive record not found' });
        }

        archives.splice(index, 1);
        await fs.writeFile(ARCHIVE_FILE, JSON.stringify(archives, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting archive:', error);
        res.status(500).json({ error: 'Failed to delete archive record' });
    }
});

// Import Members (Restore/Replace)
app.post('/api/members/import', async (req, res) => {
    try {
        const newMembers = req.body;
        if (!Array.isArray(newMembers)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array of members.' });
        }

        // Backup current before replacing? (Optional, skipping for now as per plan)

        await fs.writeFile(DATA_FILE, JSON.stringify(newMembers, null, 2));
        res.json({ success: true, count: newMembers.length });
    } catch (error) {
        console.error('Error importing members:', error);
        res.status(500).json({ error: 'Failed to import members' });
    }
});

// Import Archive (Restore/Replace)
app.post('/api/archive/import', async (req, res) => {
    try {
        const newArchive = req.body;
        if (!Array.isArray(newArchive)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array of archive records.' });
        }

        await fs.writeFile(ARCHIVE_FILE, JSON.stringify(newArchive, null, 2));
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
        const data = await fs.readFile(NIFTARIM_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading niftarim:', error);
            res.status(500).json({ error: 'Failed to read niftarim' });
        }
    }
});

// Add new niftar
app.post('/api/niftarim', async (req, res) => {
    try {
        let niftarim = [];
        try {
            const data = await fs.readFile(NIFTARIM_FILE, 'utf8');
            niftarim = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        const newNiftar = { ...req.body, id: Date.now() };
        niftarim.push(newNiftar);
        await fs.writeFile(NIFTARIM_FILE, JSON.stringify(niftarim, null, 2));
        res.json(newNiftar);
    } catch (error) {
        console.error('Error saving niftar:', error);
        res.status(500).json({ error: 'Failed to save niftar' });
    }
});

// Update existing niftar
app.put('/api/niftarim/:id', async (req, res) => {
    try {
        const data = await fs.readFile(NIFTARIM_FILE, 'utf8');
        let niftarim = JSON.parse(data);
        const niftarId = parseInt(req.params.id);
        const index = niftarim.findIndex(n => n.id === niftarId);
        if (index === -1) {
            return res.status(404).json({ error: 'Niftar not found' });
        }
        niftarim[index] = { ...req.body, id: niftarId };
        await fs.writeFile(NIFTARIM_FILE, JSON.stringify(niftarim, null, 2));
        res.json(niftarim[index]);
    } catch (error) {
        console.error('Error updating niftar:', error);
        res.status(500).json({ error: 'Failed to update niftar' });
    }
});

// Delete niftar
app.delete('/api/niftarim/:id', async (req, res) => {
    try {
        const data = await fs.readFile(NIFTARIM_FILE, 'utf8');
        let niftarim = JSON.parse(data);
        const niftarId = parseInt(req.params.id);
        const index = niftarim.findIndex(n => n.id === niftarId);
        if (index === -1) {
            return res.status(404).json({ error: 'Niftar not found' });
        }
        niftarim.splice(index, 1);
        await fs.writeFile(NIFTARIM_FILE, JSON.stringify(niftarim, null, 2));
        res.json({ success: true, id: niftarId });
    } catch (error) {
        console.error('Error deleting niftar:', error);
        res.status(500).json({ error: 'Failed to delete niftar' });
    }
});

// Import Niftarim (Restore/Replace)
app.post('/api/niftarim/import', async (req, res) => {
    try {
        const newNiftarim = req.body;
        if (!Array.isArray(newNiftarim)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }
        await fs.writeFile(NIFTARIM_FILE, JSON.stringify(newNiftarim, null, 2));
        res.json({ success: true, count: newNiftarim.length });
    } catch (error) {
        console.error('Error importing niftarim:', error);
        res.status(500).json({ error: 'Failed to import niftarim' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA - Use app.use at the end to catch all remaining GET requests
app.use((req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');

    // Log if file exists - but only for GET requests to avoid catching failed POSTs etc.
    if (req.method !== 'GET') {
        return res.status(404).send('Not Found');
    }

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