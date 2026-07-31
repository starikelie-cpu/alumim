import 'dotenv/config';
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

async function readJsonFile(filePath) {
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

async function runMigration() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('Error: MONGODB_URI is not set in the environment or .env file.');
        process.exit(1);
    }

    console.log('--- Database Migration to MongoDB Atlas ---');
    console.log(`Connecting to: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`); // log URI with hidden password

    let client;
    try {
        client = new MongoClient(mongoUri);
        await client.connect();
        const db = client.db('Alumim');
        console.log('Connected successfully to MongoDB Atlas.');

        // 1. Migrate members
        console.log('\nMigrating members...');
        const members = await readJsonFile(DATA_FILE);
        console.log(`Found ${members.length} members in local JSON.`);
        if (members.length > 0) {
            await db.collection('members').deleteMany({});
            const result = await db.collection('members').insertMany(members);
            console.log(`Successfully migrated ${result.insertedCount} members to MongoDB.`);
        } else {
            console.log('No members to migrate.');
        }

        // 2. Migrate archive
        console.log('\nMigrating archive...');
        const archive = await readJsonFile(ARCHIVE_FILE);
        console.log(`Found ${archive.length} archive entries in local JSON.`);
        if (archive.length > 0) {
            await db.collection('archive').deleteMany({});
            // Insert in chunks of 1000 if it's large to prevent BSON size limits
            const chunkSize = 1000;
            for (let i = 0; i < archive.length; i += chunkSize) {
                const chunk = archive.slice(i, i + chunkSize);
                const result = await db.collection('archive').insertMany(chunk);
                console.log(`Successfully migrated archive chunk (${i} to ${i + chunk.length}) - inserted ${result.insertedCount}.`);
            }
            console.log('Successfully completed archive migration.');
        } else {
            console.log('No archive entries to migrate.');
        }

        // 3. Migrate niftarim
        console.log('\nMigrating niftarim...');
        const niftarim = await readJsonFile(NIFTARIM_FILE);
        console.log(`Found ${niftarim.length} niftarim in local JSON.`);
        if (niftarim.length > 0) {
            await db.collection('niftarim').deleteMany({});
            const result = await db.collection('niftarim').insertMany(niftarim);
            console.log(`Successfully migrated ${result.insertedCount} niftarim to MongoDB.`);
        } else {
            console.log('No niftarim to migrate.');
        }

        console.log('\nMigration successfully finished!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

runMigration();
