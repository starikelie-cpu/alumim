import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.APP_DATA_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');
const NIFTARIM_FILE = path.join(DATA_DIR, 'niftarim.json');

let useMongoDB = false;
let client = null;
let db = null;

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

export async function connectDB() {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        try {
            const configPath = path.join(DATA_DIR, 'db_config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            mongoUri = config.MONGODB_URI;
        } catch (e) {
            // config file doesn't exist
        }
    }

    if (!mongoUri) {
        console.warn('[DB] MONGODB_URI not found. Using local JSON database.');
        useMongoDB = false;
        return false;
    }

    try {
        console.log('[DB] Connecting to MongoDB Atlas...');
        client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        db = client.db('Alumim');
        // Ping database to confirm connection
        await db.command({ ping: 1 });
        useMongoDB = true;
        console.log('[DB] Connected successfully to MongoDB Atlas database: Alumim');
        return true;
    } catch (error) {
        console.error('[DB] Failed to connect to MongoDB. Falling back to local JSON database.', error.message);
        useMongoDB = false;
        return false;
    }
}

export function isUsingMongoDB() {
    return useMongoDB;
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
