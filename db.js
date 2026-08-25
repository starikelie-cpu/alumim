import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { normalizeRole, isSuperAdmin, isAdminRole, filterRecordsBySynagogue, filterUsersByAccess } from './accessControl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.APP_DATA_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');
const NIFTARIM_FILE = path.join(DATA_DIR, 'niftarim.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SYNAGOGUES_FILE = path.join(DATA_DIR, 'synagogues.json');

const logPath = process.env.APP_DATA_PATH ? path.join(path.dirname(process.env.APP_DATA_PATH), 'app.log') : null;
function log(msg) {
    const entry = `[${new Date().toISOString()}] [DB] ${msg}\n`;
    console.log(entry.trim());
    if (logPath) {
        try {
            fsSync.appendFileSync(logPath, entry);
        } catch (e) { }
    }
}

// Primary SRV URI - Cluster1 (hardcoded, does not depend on .env)
const PRIMARY_MONGODB_URI = 'mongodb+srv://Alumim:alumim99@cluster1.i8jyvvd.mongodb.net/Alumim?retryWrites=true&w=majority&appName=Cluster1';
// Direct seedlist fallback (bypasses DNS SRV lookup)
const DIRECT_SEEDLIST_URI = 'mongodb://Alumim:alumim99@ac-4k3phjs-shard-00-00.i8jyvvd.mongodb.net:27017,ac-4k3phjs-shard-00-01.i8jyvvd.mongodb.net:27017,ac-4k3phjs-shard-00-02.i8jyvvd.mongodb.net:27017/Alumim?ssl=true&replicaSet=atlas-ala4zb-shard-0&authSource=admin&retryWrites=true&w=majority';
const DIRECT_SHARD0_URI = 'mongodb://Alumim:alumim99@ac-4k3phjs-shard-00-00.i8jyvvd.mongodb.net:27017/Alumim?ssl=true&authSource=admin&directConnection=true';
const DIRECT_SHARD1_URI = 'mongodb://Alumim:alumim99@ac-4k3phjs-shard-00-01.i8jyvvd.mongodb.net:27017/Alumim?ssl=true&authSource=admin&directConnection=true';
const DIRECT_SHARD2_URI = 'mongodb://Alumim:alumim99@ac-4k3phjs-shard-00-02.i8jyvvd.mongodb.net:27017/Alumim?ssl=true&authSource=admin&directConnection=true';
const DEFAULT_MONGODB_URI = PRIMARY_MONGODB_URI;

let useMongoDB = false;
let client = null;
let db = null;
let lastConnectionError = null;
let currentMongoUri = DEFAULT_MONGODB_URI;
let isConnecting = false;
let autoReconnectTimer = null;

export function getConnectionStatus() {
    const rawUri = currentMongoUri || DEFAULT_MONGODB_URI;
    return {
        useMongoDB,
        isConnecting,
        error: lastConnectionError ? lastConnectionError.message : null,
        mongoUri: rawUri,
        rawMongoUri: rawUri
    };
}

export async function saveMongoConfig(newUri) {
    if (client) {
        try { await client.close(); } catch (e) {}
        client = null;
    }
    const configPath = path.join(DATA_DIR, 'db_config.json');
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({ MONGODB_URI: newUri }, null, 2));
    process.env.MONGODB_URI = newUri;
    currentMongoUri = newUri;
    return await connectDB();
}

// Helpers to read/write local files
async function readLocalFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeLocalFile(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function hashPassword(password) {
    if (!password) return '';
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function readJsonFile(filePath, fallback = []) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return fallback;
        }
        throw error;
    }
}

async function writeJsonFile(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function getSynagogues() {
    if (useMongoDB && db) {
        try {
            const mongoResult = await db.collection('synagogues').find({}, { projection: { _id: 0 } }).toArray();
            if (mongoResult) {
                log(`MongoDB getSynagogues returned ${mongoResult.length} synagogues`);
                await writeJsonFile(SYNAGOGUES_FILE, mongoResult);
                return mongoResult;
            }
        } catch (error) {
            log(`MongoDB error in getSynagogues: ${error.message}, falling back to local JSON`);
        }
    }

    const localResult = await readJsonFile(SYNAGOGUES_FILE, []);
    log(`Local JSON getSynagogues returned ${localResult.length} synagogues`);
    return localResult;
}

export async function addSynagogue(synagogue) {
    const doc = {
        id: synagogue.id || `syn-${Date.now()}`,
        name: synagogue.name ? synagogue.name : 'בית כנסת חדש',
        city: synagogue.city || '',
        street: synagogue.street || '',
        houseNumber: synagogue.houseNumber || '',
        address: synagogue.address || (synagogue.city || synagogue.street ? `${synagogue.city || ''} ${synagogue.street || ''} ${synagogue.houseNumber || ''}`.trim() : ''),
        createdAt: new Date().toISOString()
    };

    log(`addSynagogue received: name=${doc.name}, city=${doc.city}, street=${doc.street}, houseNumber=${doc.houseNumber}`);

    if (useMongoDB && db) {
        await db.collection('synagogues').insertOne(doc);
        if (doc._id) delete doc._id;
        log(`Synagogue saved directly to MongoDB: ${doc.name}`);

        // Mirror to local JSON backup
        const synagogues = await readJsonFile(SYNAGOGUES_FILE, []);
        synagogues.push(doc);
        await writeJsonFile(SYNAGOGUES_FILE, synagogues);
        return doc;
    }

    const synagogues = await readJsonFile(SYNAGOGUES_FILE, []);
    synagogues.push(doc);
    await writeJsonFile(SYNAGOGUES_FILE, synagogues);
    log(`Synagogue saved to local JSON: ${doc.name}`);
    return doc;
}

export async function updateSynagogue(id, data) {
    const update = {};
    
    if (data.name !== undefined && data.name.trim() !== '') update.name = data.name;
    if (data.address !== undefined) update.address = data.address;
    if (data.city !== undefined) update.city = data.city;
    if (data.street !== undefined) update.street = data.street;
    if (data.houseNumber !== undefined) update.houseNumber = data.houseNumber;
    if (data.phone !== undefined) update.phone = data.phone;

    if (useMongoDB && db) {
        const result = await db.collection('synagogues').findOneAndUpdate(
            { id },
            { $set: update },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        const updated = result && result.value ? result.value : result;
        if (updated) {
            if (updated._id) delete updated._id;
            const synagogues = await readJsonFile(SYNAGOGUES_FILE, []);
            const idx = synagogues.findIndex(s => s.id === id);
            if (idx !== -1) {
                synagogues[idx] = updated;
                await writeJsonFile(SYNAGOGUES_FILE, synagogues);
            }
        }
        return updated;
    }

    const synagogues = await readJsonFile(SYNAGOGUES_FILE, []);
    const idx = synagogues.findIndex(s => s.id === id);
    if (idx === -1) return null;
    synagogues[idx] = { ...synagogues[idx], ...update };
    await writeJsonFile(SYNAGOGUES_FILE, synagogues);
    return synagogues[idx];
}

export async function deleteSynagogue(id) {
    if (useMongoDB && db) {
        const result = await db.collection('synagogues').deleteOne({ id });
        if (result.deletedCount > 0) {
            const synagogues = await readJsonFile(SYNAGOGUES_FILE, []);
            const idx = synagogues.findIndex(s => s.id === id);
            if (idx !== -1) {
                synagogues.splice(idx, 1);
                await writeJsonFile(SYNAGOGUES_FILE, synagogues);
            }
            return true;
        }
        return false;
    }

    const synagogues = await readJsonFile(SYNAGOGUES_FILE, []);
    const idx = synagogues.findIndex(s => s.id === id);
    if (idx === -1) return false;
    synagogues.splice(idx, 1);
    await writeJsonFile(SYNAGOGUES_FILE, synagogues);
    return true;
}

export async function initializeUsers() {
    const defaultAdmin = {
        username: 'admin',
        password: hashPassword('1234'),
        role: 'super_admin',
        synagogueId: null
    };

    if (useMongoDB) {
        try {
            const count = await db.collection('users').countDocuments();
            if (count === 0) {
                await db.collection('users').insertOne(defaultAdmin);
                log('Created default admin user in MongoDB.');
            }
        } catch (error) {
            log(`Failed to initialize users in MongoDB: ${error.message}`);
        }
    } else {
        try {
            const users = await readLocalFile(USERS_FILE);
            if (users.length === 0) {
                await writeLocalFile(USERS_FILE, [defaultAdmin]);
                log('Created default admin user in local JSON database.');
            }
        } catch (error) {
            log(`Failed to initialize local users: ${error.message}`);
        }
    }
}

// CRITICAL: Ensure local admin always exists immediately on startup,
// regardless of MongoDB connection status. This allows login during
// the 15-20 seconds MongoDB is still connecting in the background.
export async function ensureLocalAdmin() {
    const defaultAdmin = {
        username: 'admin',
        password: hashPassword('1234'),
        role: 'super_admin',
        synagogueId: null
    };
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        let users = [];
        try {
            const data = await fs.readFile(USERS_FILE, 'utf8');
            users = JSON.parse(data);
        } catch (e) {
            // File doesn't exist yet — that's ok
        }
        const adminExists = users.some(u => isAdminRole(u.role));
        if (!adminExists) {
            users.unshift(defaultAdmin);
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
            log('ensureLocalAdmin: Created local admin user in users.json');
        } else {
            log('ensureLocalAdmin: Local admin already exists');
        }
    } catch (error) {
        log(`ensureLocalAdmin failed: ${error.message}`);
    }
}

export async function connectDB() {
    isConnecting = true;
    let savedUri = null;
    try {
        const configPath = path.join(DATA_DIR, 'db_config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        savedUri = config.MONGODB_URI;
    } catch (e) {
        // config file doesn't exist
    }

    const envUri = process.env.MONGODB_URI;

    log(`MONGODB_URI from env: ${envUri ? 'SET' : 'NOT SET'}`);
    log(`Saved URI from config: ${savedUri ? 'SET' : 'NOT SET'}`);

    // Build ordered list of candidate URIs to try (Replica Set URIs only)
    const candidates = [];
    if (!candidates.includes(PRIMARY_MONGODB_URI)) candidates.push(PRIMARY_MONGODB_URI);
    if (envUri && !candidates.includes(envUri)) candidates.push(envUri);
    if (savedUri && !candidates.includes(savedUri)) candidates.push(savedUri);
    if (!candidates.includes(DIRECT_SEEDLIST_URI)) candidates.push(DIRECT_SEEDLIST_URI);
    log(`Will try ${candidates.length} connection candidates...`);

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        maxPoolSize: 20,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
        readPreference: 'primary'
    };

    let lastErr = null;

    for (const uri of candidates) {
        try {
            log(`Attempting connection to MongoDB Atlas with URI: ${uri}`);
            if (client) {
                try { await client.close(); } catch (e) {}
                client = null;
            }
            client = new MongoClient(uri, mongoOptions);
            await client.connect();
            db = client.db('Alumim');
            await db.command({ ping: 1 });
            useMongoDB = true;
            lastConnectionError = null;
            currentMongoUri = uri;
            process.env.MONGODB_URI = uri;

            // Save working URI to db_config.json
            try {
                const configPath = path.join(DATA_DIR, 'db_config.json');
                await fs.mkdir(DATA_DIR, { recursive: true });
                await fs.writeFile(configPath, JSON.stringify({ MONGODB_URI: uri }, null, 2));
            } catch (e) {}

            if (autoReconnectTimer) {
                clearTimeout(autoReconnectTimer);
                autoReconnectTimer = null;
            }
            log(`Connected successfully to MongoDB Atlas database! Working URI: ${uri}`);
            await initializeUsers();
            await loadGeocodingCacheAfterConnection();
            isConnecting = false;
            return true;
        } catch (err) {
            log(`Connection attempt failed for candidate: ${err.message}`);
            lastErr = err;
        }
    }

    log(`Failed to connect to MongoDB with all candidates. Falling back to local JSON database. Last Error: ${lastErr ? lastErr.message : 'Unknown'}`);
    useMongoDB = false;
    lastConnectionError = lastErr;
    await initializeUsers();

    if (!autoReconnectTimer) {
        autoReconnectTimer = setTimeout(() => {
            autoReconnectTimer = null;
            log('Attempting automatic background reconnection to MongoDB Atlas...');
            connectDB().catch(e => log(`Auto-reconnect error: ${e.message}`));
        }, 15000);
    }

    isConnecting = false;
    return false;
}

export function isUsingMongoDB() {
    return useMongoDB;
}

// === Users API ===
export async function authenticateUser(username, password) {
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();
    const hashed = hashPassword(cleanPassword);
    
    const escapedUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usernameRegex = new RegExp(`^${escapedUsername}$`, 'i');

    // Use MongoDB if available, otherwise fall back to local JSON
    if (useMongoDB && db) {
        try {
            const user = await db.collection('users').findOne({ username: { $regex: usernameRegex } });
            if (user && user.password === hashed) {
                const role = normalizeRole(user.role);
                return { username: user.username, role, synagogueId: user.synagogueId || null };
            }
        } catch (error) {
            log(`MongoDB error in authenticateUser: ${error.message}, falling back to local JSON`);
        }
    }

    // Fallback to local JSON if MongoDB is not available or failed
    const users = await readLocalFile(USERS_FILE);
    const user = users.find(u => (u.username || '').toLowerCase() === cleanUsername.toLowerCase());
    if (user && user.password === hashed) {
        const role = normalizeRole(user.role);
        return { username: user.username, role, synagogueId: user.synagogueId || null };
    }
    return null;
}

export async function getUsers() {
    if (useMongoDB && db) {
        try {
            const mongoUsers = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
            if (mongoUsers) {
                log(`MongoDB getUsers returned ${mongoUsers.length} users`);
                await writeLocalFile(USERS_FILE, mongoUsers);
                return mongoUsers.map(u => ({ ...u, role: normalizeRole(u.role) }));
            }
        } catch (error) {
            log(`MongoDB error in getUsers: ${error.message}, falling back to local JSON`);
        }
    }

    const users = await readLocalFile(USERS_FILE);
    const result = users.map(u => {
        const { password, ...rest } = u;
        return { ...rest, role: normalizeRole(rest.role) };
    });
    log(`Local JSON getUsers returned ${result.length} users`);
    return result;
}

export async function addUser(user) {
    const doc = {
        username: user.username,
        password: hashPassword(user.password),
        role: normalizeRole(user.role || 'viewer'),
        synagogueId: user.synagogueId || null
    };

    if (useMongoDB && db) {
        const existingMongo = await db.collection('users').findOne({ username: doc.username });
        if (existingMongo) throw new Error('User already exists');

        await db.collection('users').insertOne(doc);
        log(`User saved directly to MongoDB: ${doc.username}`);

        // Mirror to local JSON backup
        const users = await readLocalFile(USERS_FILE);
        users.push(doc);
        await writeLocalFile(USERS_FILE, users);

        delete doc.password;
        if (doc._id) delete doc._id;
        return doc;
    }

    const users = await readLocalFile(USERS_FILE);
    const existingLocal = users.some(u => u.username === doc.username);
    if (existingLocal) throw new Error('User already exists');

    users.push(doc);
    await writeLocalFile(USERS_FILE, users);
    log(`User saved to local JSON: ${doc.username}`);

    delete doc.password;
    return doc;
}

export async function updateUser(username, userData) {
    const updateDoc = {};
    if (userData.role) updateDoc.role = normalizeRole(userData.role);
    if (userData.synagogueId !== undefined) updateDoc.synagogueId = userData.synagogueId || null;
    if (userData.password) updateDoc.password = hashPassword(userData.password);
    const requestedUsername = userData.username ? String(userData.username).trim() : '';
    if (requestedUsername) {
        updateDoc.username = requestedUsername;
    }

    // Use MongoDB if available, otherwise fall back to local JSON
    if (useMongoDB && db) {
        if (updateDoc.username && updateDoc.username !== username) {
            const existing = await db.collection('users').findOne({ username: updateDoc.username });
            if (existing) {
                throw new Error('Username already exists');
            }
        }
        const result = await db.collection('users').findOneAndUpdate(
            { username: username },
            { $set: updateDoc },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        const updated = result && result.value ? result.value : result;
        if (updated && updated._id) delete updated._id;
        
        // Sync to local JSON for backup
        if (updated) {
            const users = await readLocalFile(USERS_FILE);
            const index = users.findIndex(u => u.username === (updated.username || username));
            if (index !== -1) {
                users[index] = { ...users[index], ...updateDoc };
                await writeLocalFile(USERS_FILE, users);
            }
        }
        return updated;
    }

    // Fallback to local JSON if MongoDB is not available
    const users = await readLocalFile(USERS_FILE);
    const index = users.findIndex(u => u.username === username);
    if (index === -1) return null;

    if (updateDoc.username && updateDoc.username !== username) {
        const exists = users.some(u => u.username === updateDoc.username);
        if (exists) {
            throw new Error('Username already exists');
        }
    }
    
    users[index] = { ...users[index], ...updateDoc };
    await writeLocalFile(USERS_FILE, users);
    
    const { password, ...rest } = users[index];
    return rest;
}

export async function deleteUser(username) {
    // Use MongoDB if available, otherwise fall back to local JSON
    if (useMongoDB && db) {
        const userToDelete = await db.collection('users').findOne({ username: username });
        if (!userToDelete) return false;
        if (isAdminRole(userToDelete.role)) {
            const allUsers = await db.collection('users').find({}).toArray();
            const adminsCount = allUsers.filter(u => isAdminRole(u.role)).length;
            if (adminsCount <= 1) {
                throw new Error('Cannot delete the last admin user');
            }
        }
        const result = await db.collection('users').deleteOne({ username: username });
        if (result.deletedCount > 0) {
            // Sync deletion to local JSON for backup
            const users = await readLocalFile(USERS_FILE);
            const index = users.findIndex(u => u.username === username);
            if (index !== -1) {
                users.splice(index, 1);
                await writeLocalFile(USERS_FILE, users);
            }
            return true;
        }
        return false;
    }

    // Fallback to local JSON if MongoDB is not available
    const users = await readLocalFile(USERS_FILE);
    const index = users.findIndex(u => u.username === username);
    if (index === -1) return false;

    if (isAdminRole(users[index].role)) {
        const adminsCount = users.filter(u => isAdminRole(u.role)).length;
        if (adminsCount <= 1) {
            throw new Error('Cannot delete the last admin user');
        }
    }
    
    users.splice(index, 1);
    await writeLocalFile(USERS_FILE, users);
    return true;
}


// === Members API ===
export async function getMembers(user = null) {
    if (useMongoDB && db) {
        try {
            const mongoRecords = await db.collection('members').find({}, { projection: { _id: 0 } }).toArray();
            if (mongoRecords) {
                log(`MongoDB getMembers returned ${mongoRecords.length} members`);
                await writeLocalFile(DATA_FILE, mongoRecords);
                return filterRecordsBySynagogue(mongoRecords, user);
            }
        } catch (error) {
            log(`MongoDB error in getMembers: ${error.message}, falling back to local JSON`);
        }
    }

    const records = await readLocalFile(DATA_FILE);
    log(`Local JSON getMembers returned ${records.length} members`);
    return filterRecordsBySynagogue(records, user);
}

export async function addMember(member) {
    const doc = { ...member, synagogueId: member.synagogueId || null };

    if (useMongoDB && db) {
        await db.collection('members').insertOne(doc);
        if (doc._id) delete doc._id;
        log(`Member saved directly to MongoDB: ${doc.name || doc.firstName || 'Unknown'}`);

        // Mirror to local JSON backup
        const members = await readLocalFile(DATA_FILE);
        members.push(doc);
        await writeLocalFile(DATA_FILE, members);
        return doc;
    }

    const members = await readLocalFile(DATA_FILE);
    members.push(doc);
    await writeLocalFile(DATA_FILE, members);
    log(`Member saved to local JSON: ${doc.name || doc.firstName || 'Unknown'}`);
    return doc;
}

export async function updateMember(id, memberData) {
    if (useMongoDB && db) {
        const result = await db.collection('members').findOneAndUpdate(
            { id: id },
            { $set: memberData },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        const updated = result && result.value ? result.value : result;
        if (updated) {
            if (updated._id) delete updated._id;
            const members = await readLocalFile(DATA_FILE);
            const index = members.findIndex(m => m.id === id);
            if (index !== -1) {
                members[index] = updated;
                await writeLocalFile(DATA_FILE, members);
            }
        }
        return updated;
    }

    const members = await readLocalFile(DATA_FILE);
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;
    const updated = { ...memberData, id: id };
    members[index] = updated;
    await writeLocalFile(DATA_FILE, members);
    return updated;
}

export async function deleteMember(id) {
    if (useMongoDB && db) {
        const result = await db.collection('members').deleteOne({ id: id });
        if (result.deletedCount > 0) {
            const members = await readLocalFile(DATA_FILE);
            const index = members.findIndex(m => m.id === id);
            if (index !== -1) {
                members.splice(index, 1);
                await writeLocalFile(DATA_FILE, members);
            }
            return true;
        }
        return false;
    }

    const members = await readLocalFile(DATA_FILE);
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return false;
    members.splice(index, 1);
    await writeLocalFile(DATA_FILE, members);
    return true;
}

export async function importMembers(membersList) {
    if (useMongoDB && db) {
        await db.collection('members').deleteMany({});
        if (membersList.length > 0) {
            await db.collection('members').insertMany(membersList.map(m => ({ ...m })));
        }
        await writeLocalFile(DATA_FILE, membersList);
    } else {
        await writeLocalFile(DATA_FILE, membersList);
    }
}

// === Archive API ===
export async function getArchive(user = null) {
    if (useMongoDB && db) {
        try {
            const mongoRecords = await db.collection('archive').find({}, { projection: { _id: 0 } }).toArray();
            if (mongoRecords) {
                log(`MongoDB getArchive returned ${mongoRecords.length} archive records`);
                await writeLocalFile(ARCHIVE_FILE, mongoRecords);
                return filterRecordsBySynagogue(mongoRecords, user);
            }
        } catch (error) {
            log(`MongoDB error in getArchive: ${error.message}, falling back to local JSON`);
        }
    }

    const records = await readLocalFile(ARCHIVE_FILE);
    log(`Local JSON getArchive returned ${records.length} archive records`);
    return filterRecordsBySynagogue(records, user);
}

export async function getArchiveForMember(memberId) {
    if (useMongoDB && db) {
        try {
            return await db.collection('archive').find({ memberId: memberId }, { projection: { _id: 0 } }).toArray();
        } catch (error) {
            log(`MongoDB error in getArchiveForMember: ${error.message}, falling back to local JSON`);
        }
    }

    const archives = await readLocalFile(ARCHIVE_FILE);
    return archives.filter(a => a.memberId === memberId);
}

export async function addArchiveRecord(record) {
    const doc = { ...record };

    if (useMongoDB && db) {
        await db.collection('archive').insertOne(doc);
        if (doc._id) delete doc._id;
        log(`Archive record saved directly to MongoDB`);

        const archives = await readLocalFile(ARCHIVE_FILE);
        archives.push(doc);
        await writeLocalFile(ARCHIVE_FILE, archives);
        return doc;
    }

    const archives = await readLocalFile(ARCHIVE_FILE);
    archives.push(record);
    await writeLocalFile(ARCHIVE_FILE, archives);
    log(`Archive record saved to local JSON`);
    return doc;
}

export async function updateArchiveRecord(archiveId, archiveData) {
    if (useMongoDB && db) {
        const result = await db.collection('archive').findOneAndUpdate(
            { archiveId: archiveId },
            { $set: archiveData },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        const updated = result && result.value ? result.value : result;
        if (updated) {
            if (updated._id) delete updated._id;
            const archives = await readLocalFile(ARCHIVE_FILE);
            const index = archives.findIndex(a => a.archiveId === archiveId);
            if (index !== -1) {
                archives[index] = updated;
                await writeLocalFile(ARCHIVE_FILE, archives);
            }
        }
        return updated;
    }

    const archives = await readLocalFile(ARCHIVE_FILE);
    const index = archives.findIndex(a => a.archiveId === archiveId);
    if (index === -1) return null;
    const updated = { ...archiveData, archiveId: archiveId };
    archives[index] = updated;
    await writeLocalFile(ARCHIVE_FILE, archives);
    return updated;
}

export async function deleteArchiveRecord(archiveId) {
    if (useMongoDB && db) {
        const result = await db.collection('archive').deleteOne({ archiveId: archiveId });
        if (result.deletedCount > 0) {
            const archives = await readLocalFile(ARCHIVE_FILE);
            const index = archives.findIndex(a => a.archiveId === archiveId);
            if (index !== -1) {
                archives.splice(index, 1);
                await writeLocalFile(ARCHIVE_FILE, archives);
            }
            return true;
        }
        return false;
    }

    const archives = await readLocalFile(ARCHIVE_FILE);
    const index = archives.findIndex(a => a.archiveId === archiveId);
    if (index === -1) return false;
    archives.splice(index, 1);
    await writeLocalFile(ARCHIVE_FILE, archives);
    return true;
}

export async function importArchive(archiveList) {
    if (useMongoDB && db) {
        await db.collection('archive').deleteMany({});
        if (archiveList.length > 0) {
            await db.collection('archive').insertMany(archiveList.map(a => ({ ...a })));
        }
        await writeLocalFile(ARCHIVE_FILE, archiveList);
    } else {
        await writeLocalFile(ARCHIVE_FILE, archiveList);
    }
}

// === Niftarim API ===
export async function getNiftarim(user = null) {
    if (useMongoDB && db) {
        try {
            const mongoRecords = await db.collection('niftarim').find({}, { projection: { _id: 0 } }).toArray();
            if (mongoRecords) {
                log(`MongoDB getNiftarim returned ${mongoRecords.length} niftarim`);
                await writeLocalFile(NIFTARIM_FILE, mongoRecords);
                return filterRecordsBySynagogue(mongoRecords, user);
            }
        } catch (error) {
            log(`MongoDB error in getNiftarim: ${error.message}, falling back to local JSON`);
        }
    }

    const records = await readLocalFile(NIFTARIM_FILE);
    log(`Local JSON getNiftarim returned ${records.length} niftarim`);
    return filterRecordsBySynagogue(records, user);
}

export async function addNiftar(niftar) {
    const doc = { ...niftar };

    if (useMongoDB && db) {
        await db.collection('niftarim').insertOne(doc);
        if (doc._id) delete doc._id;
        log(`Niftar saved directly to MongoDB: ${doc.name || 'Unknown'}`);

        const niftarim = await readLocalFile(NIFTARIM_FILE);
        niftarim.push(doc);
        await writeLocalFile(NIFTARIM_FILE, niftarim);
        return doc;
    }

    const niftarim = await readLocalFile(NIFTARIM_FILE);
    niftarim.push(doc);
    await writeLocalFile(NIFTARIM_FILE, niftarim);
    log(`Niftar saved to local JSON: ${doc.name || 'Unknown'}`);
    return doc;
}

export async function updateNiftar(id, niftarData) {
    if (useMongoDB && db) {
        const result = await db.collection('niftarim').findOneAndUpdate(
            { id: id },
            { $set: niftarData },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        const updated = result && result.value ? result.value : result;
        if (updated) {
            if (updated._id) delete updated._id;
            const niftarim = await readLocalFile(NIFTARIM_FILE);
            const index = niftarim.findIndex(n => n.id === id);
            if (index !== -1) {
                niftarim[index] = updated;
                await writeLocalFile(NIFTARIM_FILE, niftarim);
            }
        }
        return updated;
    }

    const niftarim = await readLocalFile(NIFTARIM_FILE);
    const index = niftarim.findIndex(n => n.id === id);
    if (index === -1) return null;
    const updated = { ...niftarData, id: id };
    niftarim[index] = updated;
    await writeLocalFile(NIFTARIM_FILE, niftarim);
    return updated;
}

export async function deleteNiftar(id) {
    if (useMongoDB && db) {
        const result = await db.collection('niftarim').deleteOne({ id: id });
        if (result.deletedCount > 0) {
            const niftarim = await readLocalFile(NIFTARIM_FILE);
            const index = niftarim.findIndex(n => n.id === id);
            if (index !== -1) {
                niftarim.splice(index, 1);
                await writeLocalFile(NIFTARIM_FILE, niftarim);
            }
            return true;
        }
        return false;
    }

    const niftarim = await readLocalFile(NIFTARIM_FILE);
    const index = niftarim.findIndex(n => n.id === id);
    if (index === -1) return false;
    niftarim.splice(index, 1);
    await writeLocalFile(NIFTARIM_FILE, niftarim);
    return true;
}

export async function importNiftarim(niftarimList) {
    if (useMongoDB && db) {
        await db.collection('niftarim').deleteMany({});
        if (niftarimList.length > 0) {
            await db.collection('niftarim').insertMany(niftarimList.map(n => ({ ...n })));
        }
        await writeLocalFile(NIFTARIM_FILE, niftarimList);
    } else {
        await writeLocalFile(NIFTARIM_FILE, niftarimList);
    }
}

// === Geocoding Cache (Saved to MongoDB Only - Server Side) ===
let geocodingCache = {
    cities: new Map(),
    streets: new Map() // city -> Set of streets
};

// Load geocoding cache from MongoDB
async function loadGeocodingCacheFromMongo() {
    if (!useMongoDB || !db) return;
    try {
        const cacheDoc = await db.collection('geocoding_cache').findOne({ _id: 'main' });
        if (cacheDoc) {
            if (cacheDoc.cities) {
                cacheDoc.cities.forEach(city => geocodingCache.cities.set(city, true));
            }
            if (cacheDoc.streets) {
                Object.entries(cacheDoc.streets).forEach(([city, streets]) => {
                    geocodingCache.streets.set(city, new Set(streets));
                });
            }
            log('Geocoding cache loaded from MongoDB');
        }
    } catch (e) {
        log(`Error loading geocoding cache from MongoDB: ${e.message}`);
    }
}

// Save geocoding cache to MongoDB
async function saveGeocodingCacheToMongo() {
    if (!useMongoDB || !db) return;
    try {
        const cacheData = {
            cities: Array.from(geocodingCache.cities.keys()),
            streets: Object.fromEntries(
                Array.from(geocodingCache.streets.entries()).map(([city, streets]) => [city, Array.from(streets)])
            )
        };
        await db.collection('geocoding_cache').updateOne(
            { _id: 'main' },
            { $set: cacheData },
            { upsert: true }
        );
        log('Geocoding cache saved to MongoDB');
    } catch (e) {
        log(`Error saving geocoding cache to MongoDB: ${e.message}`);
    }
}

// Load from MongoDB after connection
export async function loadGeocodingCacheAfterConnection() {
    await loadGeocodingCacheFromMongo();
}

export function getCachedCities() {
    return Array.from(geocodingCache.cities.keys());
}

export function getCachedStreets(city) {
    return geocodingCache.streets.has(city) 
        ? Array.from(geocodingCache.streets.get(city)) 
        : [];
}

export function cacheCities(cities) {
    if (Array.isArray(cities)) {
        cities.forEach(city => geocodingCache.cities.set(city, true));
        saveGeocodingCacheToMongo().catch(e => log(`Error saving cities cache to MongoDB: ${e.message}`));
    }
}

export function cacheStreets(city, streets) {
    if (city && Array.isArray(streets)) {
        geocodingCache.streets.set(city, new Set(streets));
        saveGeocodingCacheToMongo().catch(e => log(`Error saving streets cache to MongoDB: ${e.message}`));
    }
}
