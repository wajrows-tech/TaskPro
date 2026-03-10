import { runMigrations } from '../src/db/migrations.js';
import { db } from '../src/db/connection.js';
import { syncAccuLynxData } from '../src/services/acculynx/index.js';

async function testPhase11() {
    console.log('[Test 11] Running Migrations...');
    runMigrations(); // This will apply v19

    console.log('[Test 11] Seeding Integration Endpoints Registry...');

    const seedStmt = db.prepare(`
        INSERT INTO integration_endpoints 
        (provider, category, method, pathTemplate, isReadWrite, riskLevel, authMode, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Clean first for idempotency
    db.exec('DELETE FROM integration_endpoints');

    seedStmt.run('acculynx', 'jobs', 'GET', '/api/joblist', 'read', 1, 'session', 'Filtered primary discovery list');
    seedStmt.run('acculynx', 'jobs', 'GET', '/api/jobs/{uuid}/GetJobBootstrap', 'read', 1, 'session', 'Core unified JSON dump for job details');
    seedStmt.run('acculynx', 'financials', 'GET', '/api/jobs/{uuid}/GetBalanceDueAndARAge', 'read', 1, 'session', 'Invoices and aging');
    seedStmt.run('acculynx', 'media', 'GET', '/api/v3/media/job/{uuid}/view-media', 'read', 1, 'session', 'Photo and Document metadata feed');
    seedStmt.run('acculynx', 'communications', 'POST', '/api/jobs/{uuid}/Messages', 'write', 1, 'session', 'Add an activity note timeline item');

    const count = db.prepare('SELECT COUNT(*) as c FROM integration_endpoints').get() as { c: number };
    console.log(`[Test 11] Registry seeded with ${count.c} strategic endpoints.`);

    console.log('\n[Test 11] Forcing a fresh AccuLynx Sync run...');
    // Drop sync state so it actually fetches data
    db.exec('DELETE FROM integration_sync_state');

    try {
        const metrics = await syncAccuLynxData('dummy_key');
        console.log('[Test 11] Sync Completed.', metrics);

        console.log('\n[Test 11] Verifying Data Model...');

        // 1. Raw Payload test
        const sampleJob = db.prepare('SELECT name, acculynxId, JSON_VALID(rawPayload) as validPayload, JSON_VALID(financialSummary) as validFinance FROM jobs WHERE rawPayload IS NOT NULL AND rawPayload != \'{}\' LIMIT 1').get();
        console.log('Sample Job Payload Check:', sampleJob);

        // 2. Contact payload test
        const sampleContact = db.prepare('SELECT firstName, acculynxId, JSON_VALID(rawPayload) as validPayload FROM contacts WHERE rawPayload IS NOT NULL AND rawPayload != \'{}\' LIMIT 1').get();
        console.log('Sample Contact Payload Check:', sampleContact);

        // 3. Media Queue Policy test
        const mediaCheck = db.prepare('SELECT status, count(*) as count FROM media_queue GROUP BY status').all();
        console.log('Media Queue Policy Check:', mediaCheck);

        // 4. Print outbox schema
        const outboxCols = db.prepare("PRAGMA table_info(claimsync_outbox)").all();
        console.log('ClaimSync Outbox Columns:', outboxCols.map((c: any) => c.name));

    } catch (e: any) {
        console.error('[Test 11] ❌ Sync Failed:', e.message);
    }
}

testPhase11().catch(console.error);
