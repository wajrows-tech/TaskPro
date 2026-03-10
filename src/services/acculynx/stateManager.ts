import { db } from '../../db/index.js';

export class StateManager {
    private integrationId = 'acculynx';

    // Attempt to acquire an exclusive sync lock
    acquireSyncLock(): boolean {
        db.exec(`INSERT OR IGNORE INTO integrations (integrationId, enabled, settings) VALUES ('acculynx', 1, '{}')`);

        // This fails to update if isSyncing is already true, preventing overlapping crons.
        const res = db.prepare(`
            UPDATE integrations 
            SET settings = json_set(settings, '$.isSyncing', true, '$.syncStartTime', CURRENT_TIMESTAMP)
            WHERE integrationId = ? AND json_extract(settings, '$.isSyncing') IS NOT true
        `).run(this.integrationId);

        return res.changes > 0;
    }

    releaseSyncLock() {
        db.prepare(`
            UPDATE integrations 
            SET settings = json_set(settings, '$.isSyncing', false)
            WHERE integrationId = ?
        `).run(this.integrationId);
    }

    getJobStateHashes(): Record<string, string> {
        db.exec(`INSERT OR IGNORE INTO integration_sync_state (integrationId, entityType) VALUES ('acculynx', 'jobs')`);
        const row = db.prepare(`SELECT lastExternalCursor FROM integration_sync_state WHERE integrationId = ? AND entityType = 'jobs'`).get(this.integrationId) as any;
        if (!row || !row.lastExternalCursor) return {};
        try {
            return JSON.parse(row.lastExternalCursor);
        } catch {
            return {};
        }
    }

    saveJobStateHashes(hashes: Record<string, string>) {
        db.prepare(`
            UPDATE integration_sync_state 
            SET lastExternalCursor = ?, lastSyncAt = CURRENT_TIMESTAMP
            WHERE integrationId = ? AND entityType = 'jobs'
        `).run(JSON.stringify(hashes), this.integrationId);
    }

    // Creates a simple deterministic hash of the high-level list payload
    // to detect if a job was modified (via ModifiedDate footprint or milestone shift).
    hashJobPayload(job: any): string {
        const shape = {
            id: job.Id,
            milestone: job.CurrentMilestone,
            modified: job.ModifiedDate || '',
            amount: job.ContractTotal || 0,
            address: job.FullAddress || ''
        };
        return Buffer.from(JSON.stringify(shape)).toString('base64');
    }
}
