import { syncAccuLynxData } from '../src/services/acculynxImporter';
import { db } from '../src/db/index';
import { runMigrations } from '../src/db/migrations';

async function testSync() {
    console.log('--- Starting Agentic Sync Test ---');
    try {
        console.log('Running Schema Migrations...');
        runMigrations();

        const res = await syncAccuLynxData('dummy_key');
        console.log('\n--- Modular Sync Result ---');
        console.log(JSON.stringify(res, null, 2));

        console.log('\n--- DB stable acculynxId Verification ---');
        const jobs = db.prepare('SELECT id, acculynxId, jobNumber, name FROM jobs ORDER BY id DESC LIMIT 5').all();
        console.log('Top 5 Jobs Inserted/Verified:');
        console.table(jobs);

        const contacts = db.prepare('SELECT id, acculynxId, firstName, lastName, role FROM contacts ORDER BY id DESC LIMIT 5').all();
        console.log('Top 5 Contacts Inserted/Verified:');
        console.table(contacts);

        const messages = db.prepare('SELECT id, sourceExternalId, contactId, channel, subject, SUBSTR(body, 1, 30) as trunc_body, SUBSTR(mediaMetadata, 1, 30) as trunc_media FROM communications WHERE sourceExternalId IS NOT NULL ORDER BY id DESC LIMIT 3').all();
        console.log('Top 3 Media/Message Logs:');
        console.table(messages);

    } catch (e) {
        console.error(e);
    }
}

testSync();
