import { runMigrations } from '../src/db/migrations.js';
import { db } from '../src/db/connection.js';
import { syncAccuLynxData } from '../src/services/acculynx/index.js';

async function testPhase12() {
    console.log('[Test 12] Running Migrations...');
    runMigrations(); // This will apply v20

    console.log('[Test 12] Seeding Action Registry...');
    const seedActionStmt = db.prepare(`
        INSERT OR IGNORE INTO integration_actions 
        (actionKey, provider, type, riskLevel, requiresApproval, expectedPayloadSchema)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    seedActionStmt.run('acculynx.add_job_note', 'acculynx', 'write', 3, 0, JSON.stringify({ note: "string" }));
    seedActionStmt.run('acculynx.post_document', 'acculynx', 'write', 6, 1, JSON.stringify({ fileId: "string" }));
    seedActionStmt.run('claimsync.submit_ai_report', 'acculynx', 'courier', 2, 0, JSON.stringify({ summary: "string" }));

    console.log('\n[Test 12] Forcing a fresh AccuLynx Sync run...');
    db.exec('DELETE FROM integration_sync_state');

    try {
        const metrics = await syncAccuLynxData('dummy_key');
        console.log('[Test 12] Sync Completed.', metrics);

        console.log('\n[Test 12] Verifying Decoupled Media & Source Tracking...');

        // 1. Source Tracking Check
        const sampleJob = db.prepare('SELECT name, acculynxId, sourceSystem, sourceEntityType FROM jobs WHERE sourceSystem = \'acculynx\' LIMIT 1').get();
        console.log('Universal Source Tracking (Job):', sampleJob);

        // 2. Media Metadata Check
        const mediaMetaCount = db.prepare('SELECT count(*) as c FROM media_metadata').get() as { c: number };
        console.log('Media Metadata Inventory Count:', mediaMetaCount.c);

        // 3. Media Queue Check (should be EMPTY)
        const mediaQueueCount = db.prepare('SELECT count(*) as c FROM media_queue').get() as { c: number };
        console.log('Media Queue Strict Metric (Should be 0):', mediaQueueCount.c);

        // 4. Staging a ClaimSync Courier Package
        console.log('\n[Test 12] Simulating Courier Outbox Submission...');
        const stageStmt = db.prepare(`
            INSERT INTO claimsync_outbox (jobId, packageType, payload, courierStatus, externalReferenceId)
            VALUES ((SELECT id FROM jobs LIMIT 1), 'ai_summary', '{"summary": "Roof is severely damaged"}', 'staged', 'csync-req-777')
            RETURNING packageType, courierStatus, retryCount
        `);
        const stagedPackage = stageStmt.get();
        console.log('Staged Typed Courier Package:', stagedPackage);

    } catch (e: any) {
        console.error('[Test 12] ❌ Sync Failed:', e.message);
    }
}

testPhase12().catch(console.error);
