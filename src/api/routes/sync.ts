import { Router } from 'express';
import { SyncService } from '../../services/SyncService.ts';
import { requireAuth } from '../middlewares/auth.ts';
import { AppError } from '../../utils/errors.ts';

export const syncRouter = Router();

// Apply auth middleware individually to prevent leaking
syncRouter.post('/sync/enqueue', requireAuth, (req: any, res) => {
    try {
        const { entityType, action, payload, entityId, localId } = req.body;

        if (!entityType || !action || !payload) {
            throw new AppError('Missing required sync parameters', 400);
        }

        const item = SyncService.enqueue(req.user.id, entityType, action, payload, entityId, localId);
        res.status(201).json(item);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

syncRouter.get('/sync/pending', requireAuth, (req: any, res) => {
    try {
        const items = SyncService.getPendingItems(req.user.id);
        res.json({ items });
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

syncRouter.post('/sync/flush', requireAuth, (req: any, res) => {
    try {
        const items = SyncService.getPendingItems(req.user.id);
        const results = [];

        // In a real application, we would loop through items, inspect the entityType and action,
        // and physically execute the CREATE/UPDATE/DELETE against the target services (e.g. JobService).
        // Then we would call SyncService.markProcessed(item.id) or markFailed.

        // For Phase 9 implementation purposes, we'll simulate the flush processing:
        for (const item of items) {
            // Mock processing
            SyncService.markProcessed(item.id);
            results.push({ id: item.id, status: 'processed' });
        }

        res.json({ processed: results.length, results });
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});
