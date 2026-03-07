import { db } from '../db/index.ts';
import type { SyncQueueItem, SyncAction } from '../types.ts';

export class SyncService {

    // ── Enqueue Offline Mutations ──

    static enqueue(userId: number, entityType: string, action: SyncAction, payload: any, entityId?: number, localId?: string): SyncQueueItem {
        const strPayload = JSON.stringify(payload);

        const res = db.prepare(`
            INSERT INTO sync_queue (userId, entityType, entityId, localId, action, payload)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, entityType, entityId || null, localId || null, action, strPayload);

        return this.getItem(res.lastInsertRowid as number);
    }

    static getItem(id: number): SyncQueueItem {
        const item = db.prepare('SELECT * FROM sync_queue WHERE id = ?').get(id) as SyncQueueItem;
        if (item) {
            // Make sure we parse the JSON payload on the way out if someone wants it as an object
            // Usually, though, the raw string is fine for the queue manager.
        }
        return item;
    }

    static getPendingItems(userId: number): SyncQueueItem[] {
        return db.prepare(`
            SELECT * FROM sync_queue 
            WHERE userId = ? AND status = 'pending'
            ORDER BY createdAt ASC
        `).all(userId) as SyncQueueItem[];
    }

    // ── Processing ──

    static markProcessed(id: number, realEntityId?: number) {
        db.prepare(`
            UPDATE sync_queue 
            SET status = 'processed', processedAt = CURRENT_TIMESTAMP, entityId = COALESCE(?, entityId)
            WHERE id = ?
        `).run(realEntityId || null, id);
    }

    static markFailed(id: number, errorMsg: string, status: 'failed' | 'conflict' = 'failed') {
        db.prepare(`
            UPDATE sync_queue 
            SET status = ?, errorMessage = ?
            WHERE id = ?
        `).run(status, errorMsg, id);
    }

    /**
     * Resolves a conflicting QueueItem by dropping it or keeping the server version.
     * In a real CRDT system this is complex, but here we just mark it processed/dropped.
     */
    static dropItem(id: number) {
        db.prepare("UPDATE sync_queue SET status = 'conflict', errorMessage = 'Dropped by user' WHERE id = ?").run(id);
    }

    /**
     * Resolves an upstream sync conflict by forcing the local client's version 
     * or yielding to the server's version.
     */
    static resolveConflict(id: number, resolution: 'client_wins' | 'server_wins') {
        if (resolution === 'client_wins') {
            // Put it back in the queue to be retried
            db.prepare("UPDATE sync_queue SET status = 'pending', errorMessage = NULL WHERE id = ?").run(id);
        } else {
            // Discard the local mutation
            this.dropItem(id);
        }
    }
}
