import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.APP_DATA_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');
const NIFTARIM_FILE = path.join(DATA_DIR, 'niftarim.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

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

const PRIMARY_MONGODB_URI = 'mongodb+srv://Alumim:alumim99@cluster0.i8jyvvd.mongodb.net/?appName=Cluster0';
const DIRECT_SEEDLIST_URI = 'mongodb://Alumim:alumim99@ac-4k3phjs-shard-00-00.i8jyvvd.mongodb.net:27017,ac-4k3phjs-shard-00-01.i8jyvvd.mongodb.net:27017,ac-4k3phjs-shard-00-02.i8jyvvd.mongodb.net:27017/Alumim?ssl=true&replicaSet=atlas-ala4zb-shard-0&authSource=admin';
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
        mongoUri: rawUri.replace(/:([^@]+)@/, ':****@'),
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

// Initialize default admin user if none exist
export async function initializeUsers() {
    const defaultAdmin = {
        username: 'admin',
        password: hashPassword('1234'),
        role: 'admin'
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

    // Build ordered list of candidate URIs to try
    const candidates = [];
    if (envUri && !candidates.includes(envUri)) candidates.push(envUri);
    if (savedUri && !candidates.includes(savedUri)) candidates.push(savedUri);
    if (!candidates.includes(PRIMARY_MONGODB_URI)) candidates.push(PRIMARY_MONGODB_URI);
    if (!candidates.includes(DIRECT_SEEDLIST_URI)) candidates.push(DIRECT_SEEDLIST_URI);
    if (!candidates.includes(DIRECT_SHARD0_URI)) candidates.push(DIRECT_SHARD0_URI);
    if (!candidates.includes(DIRECT_SHARD1_URI)) candidates.push(DIRECT_SHARD1_URI);
    if (!candidates.includes(DIRECT_SHARD2_URI)) candidates.push(DIRECT_SHARD2_URI);

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const mongoOptions = { 
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true
    };

    let lastErr = null;

    for (const uri of candidates) {
        try {
            log(`Attempting connection to MongoDB Atlas with URI: ${uri.replace(/:([^@]+)@/, ':****@')}`);
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
            log(`Connected successfully to MongoDB Atlas database! Working URI: ${uri.replace(/:([^@]+)@/, ':****@')}`);
            await initializeUsers();
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
        }, 30000);
    }

    isConnecting = false;
    return false;
}

export function isUsingMongoDB() {
    return useMongoDB;
}

// === Users API ===
export async function authenticateUser(username, password) {
    const hashed = hashPassword(password);
    if (useMongoDB) {
        const user = await db.collection('users').findOne({ username: username });
        if (user && user.password === hashed) {
            return { username: user.username, role: user.role };
        }
    } else {
        const users = await readLocalFile(USERS_FILE);
        const user = users.find(u => u.username === username);
        if (user && user.password === hashed) {
            return { username: user.username, role: user.role };
        }
    }
    return null;
}

export async function getUsers() {
    if (useMongoDB) {
        return await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    } else {
        const users = await readLocalFile(USERS_FILE);
        return users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
    }
}

export async function addUser(user) {
    const doc = {
        username: user.username,
        password: hashPassword(user.password),
        role: user.role || 'viewer'
    };

    if (useMongoDB) {
        const existing = await db.collection('users').findOne({ username: doc.username });
        if (existing) throw new Error('User already exists');
        
        await db.collection('users').insertOne(doc);
        delete doc.password;
        delete doc._id;
        return doc;
    } else {
        const users = await readLocalFile(USERS_FILE);
        const existing = users.some(u => u.username === doc.username);
        if (existing) throw new Error('User already exists');
        
        users.push(doc);
        await writeLocalFile(USERS_FILE, users);
        delete doc.password;
        return doc;
    }
}

export async function updateUser(username, userData) {
    const updateDoc = {};
    if (userData.role) updateDoc.role = userData.role;
    if (userData.password) updateDoc.password = hashPassword(userData.password);

    if (useMongoDB) {
        const result = await db.collection('users').findOneAndUpdate(
            { username: username },
            { $set: updateDoc },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        const updated = result && result.value ? result.value : result;
        if (updated && updated._id) delete updated._id;
        return updated;
    } else {
        const users = await readLocalFile(USERS_FILE);
        const index = users.findIndex(u => u.username === username);
        if (index === -1) return null;
        
        users[index] = { ...users[index], ...updateDoc };
        await writeLocalFile(USERS_FILE, users);
        
        const { password, ...rest } = users[index];
        return rest;
    }
}

export async function deleteUser(username) {
    if (username === 'admin') {
        throw new Error('Cannot delete primary admin user');
    }
    
    if (useMongoDB) {
        const result = await db.collection('users').deleteOne({ username: username });
        return result.deletedCount > 0;
    } else {
        const users = await readLocalFile(USERS_FILE);
        const index = users.findIndex(u => u.username === username);
        if (index === -1) return false;
        
        users.splice(index, 1);
        await writeLocalFile(USERS_FILE, users);
        return true;
    }
}


// === Members API ===
export async function getMembers() {
    if (useMongoDB) {
        return await db.collection('members').find({}, { projection: { _id: 0 } }).toArray();
    } else {
        return await readLocalFile(DATA_FILE);
    }
}

export async function addMember(member) {
    if (useMongoDB) {
        const doc = { ...member };
        await db.collection('members').insertOne(doc);
        delete doc._id;
        return doc;
    } else {
        const members = await readLocalFile(DATA_FILE);
        members.push(member);
        await writeLocalFile(DATA_FILE, members);
        return member;
    }
}

export async function updateMember(id, memberData) {
    if (useMongoDB) {
        const result = await db.collection('members').findOneAndUpdate(
            { id: id },
            { $set: memberData },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        return result && result.value ? result.value : result;
    } else {
        const members = await readLocalFile(DATA_FILE);
        const index = members.findIndex(m => m.id === id);
        if (index === -1) return null;
        const updated = { ...memberData, id: id };
        members[index] = updated;
        await writeLocalFile(DATA_FILE, members);
        return updated;
    }
}

export async function deleteMember(id) {
    if (useMongoDB) {
        const result = await db.collection('members').deleteOne({ id: id });
        return result.deletedCount > 0;
    } else {
        const members = await readLocalFile(DATA_FILE);
        const index = members.findIndex(m => m.id === id);
        if (index === -1) return false;
        members.splice(index, 1);
        await writeLocalFile(DATA_FILE, members);
        return true;
    }
}

export async function importMembers(membersList) {
    if (useMongoDB) {
        await db.collection('members').deleteMany({});
        if (membersList.length > 0) {
            await db.collection('members').insertMany(membersList.map(m => ({ ...m })));
        }
    } else {
        await writeLocalFile(DATA_FILE, membersList);
    }
}

// === Archive API ===
export async function getArchive() {
    if (useMongoDB) {
        return await db.collection('archive').find({}, { projection: { _id: 0 } }).toArray();
    } else {
        return await readLocalFile(ARCHIVE_FILE);
    }
}

export async function getArchiveForMember(memberId) {
    if (useMongoDB) {
        return await db.collection('archive').find({ memberId: memberId }, { projection: { _id: 0 } }).toArray();
    } else {
        const archives = await readLocalFile(ARCHIVE_FILE);
        return archives.filter(a => a.memberId === memberId);
    }
}

export async function addArchiveRecord(record) {
    if (useMongoDB) {
        const doc = { ...record };
        await db.collection('archive').insertOne(doc);
        delete doc._id;
        return doc;
    } else {
        const archives = await readLocalFile(ARCHIVE_FILE);
        archives.push(record);
        await writeLocalFile(ARCHIVE_FILE, archives);
        return record;
    }
}

export async function updateArchiveRecord(archiveId, archiveData) {
    if (useMongoDB) {
        const result = await db.collection('archive').findOneAndUpdate(
            { archiveId: archiveId },
            { $set: archiveData },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        return result && result.value ? result.value : result;
    } else {
        const archives = await readLocalFile(ARCHIVE_FILE);
        const index = archives.findIndex(a => a.archiveId === archiveId);
        if (index === -1) return null;
        const updated = { ...archiveData, archiveId: archiveId };
        archives[index] = updated;
        await writeLocalFile(ARCHIVE_FILE, archives);
        return updated;
    }
}

export async function deleteArchiveRecord(archiveId) {
    if (useMongoDB) {
        const result = await db.collection('archive').deleteOne({ archiveId: archiveId });
        return result.deletedCount > 0;
    } else {
        const archives = await readLocalFile(ARCHIVE_FILE);
        const index = archives.findIndex(a => a.archiveId === archiveId);
        if (index === -1) return false;
        archives.splice(index, 1);
        await writeLocalFile(ARCHIVE_FILE, archives);
        return true;
    }
}

export async function importArchive(archiveList) {
    if (useMongoDB) {
        await db.collection('archive').deleteMany({});
        if (archiveList.length > 0) {
            await db.collection('archive').insertMany(archiveList.map(a => ({ ...a })));
        }
    } else {
        await writeLocalFile(ARCHIVE_FILE, archiveList);
    }
}

// === Niftarim API ===
export async function getNiftarim() {
    if (useMongoDB) {
        return await db.collection('niftarim').find({}, { projection: { _id: 0 } }).toArray();
    } else {
        return await readLocalFile(NIFTARIM_FILE);
    }
}

export async function addNiftar(niftar) {
    if (useMongoDB) {
        const doc = { ...niftar };
        await db.collection('niftarim').insertOne(doc);
        delete doc._id;
        return doc;
    } else {
        const niftarim = await readLocalFile(NIFTARIM_FILE);
        niftarim.push(niftar);
        await writeLocalFile(NIFTARIM_FILE, niftarim);
        return niftar;
    }
}

export async function updateNiftar(id, niftarData) {
    if (useMongoDB) {
        const result = await db.collection('niftarim').findOneAndUpdate(
            { id: id },
            { $set: niftarData },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        return result && result.value ? result.value : result;
    } else {
        const niftarim = await readLocalFile(NIFTARIM_FILE);
        const index = niftarim.findIndex(n => n.id === id);
        if (index === -1) return null;
        const updated = { ...niftarData, id: id };
        niftarim[index] = updated;
        await writeLocalFile(NIFTARIM_FILE, niftarim);
        return updated;
    }
}

export async function deleteNiftar(id) {
    if (useMongoDB) {
        const result = await db.collection('niftarim').deleteOne({ id: id });
        return result.deletedCount > 0;
    } else {
        const niftarim = await readLocalFile(NIFTARIM_FILE);
        const index = niftarim.findIndex(n => n.id === id);
        if (index === -1) return false;
        niftarim.splice(index, 1);
        await writeLocalFile(NIFTARIM_FILE, niftarim);
        return true;
    }
}

export async function importNiftarim(niftarimList) {
    if (useMongoDB) {
        await db.collection('niftarim').deleteMany({});
        if (niftarimList.length > 0) {
            await db.collection('niftarim').insertMany(niftarimList.map(n => ({ ...n })));
        }
    } else {
        await writeLocalFile(NIFTARIM_FILE, niftarimList);
    }
}
