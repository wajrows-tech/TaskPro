import { Router } from 'express';
import { registry } from './registry.ts';
import { db } from '../db/index.ts';

export const integrationRouter = Router();

// ── GET /api/integrations ──
// List all integration modules and their current config status
integrationRouter.get('/integrations', (req, res) => {
    try {
        const modules = registry.getAllModules();
        const response = modules.map(mod => {
            const config = registry.getConfig(mod.id, false);
            return {
                id: mod.id,
                name: mod.name,
                description: mod.description,
                category: mod.category,
                icon: mod.icon,
                brandColor: mod.brandColor,
                capabilities: mod.capabilities,
                credentialFields: mod.credentialFields.map(cf => ({ ...cf, value: '' })), // don't send real values
                settingsFields: mod.settingsFields,
                config: config ? {
                    enabled: config.enabled,
                    settings: config.settings,
                    lastSyncAt: config.lastSyncAt,
                    lastError: config.lastError,
                    updatedAt: config.updatedAt,
                    hasCredentials: config.credentials && Object.keys(config.credentials).length > 0
                } : null
            };
        });
        res.json(response);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/integrations/:id ──
integrationRouter.get('/integrations/:id', (req, res) => {
    try {
        const id = req.params.id as any;
        const mod = registry.getModule(id);
        if (!mod) return res.status(404).json({ error: 'Integration not found' });

        const config = registry.getConfig(id, false);
        res.json({
            module: mod,
            config: config
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/integrations/:id ──
// Update credentials and settings, and toggle enabled state
integrationRouter.put('/integrations/:id', async (req, res) => {
    try {
        const id = req.params.id as any;
        const { credentials, settings, enabled } = req.body;

        const result = await registry.updateConfig(id, credentials || {}, settings || {}, Boolean(enabled));

        // Log to audit
        db.prepare(`
            INSERT INTO integration_events 
            (integrationId, eventType, direction, payload, status, errorMessage)
            VALUES (?, 'config.updated', 'outbound', ?, ?, ?)
        `).run(id, JSON.stringify({ enabled }), result.success ? 'success' : 'failed', result.message || null);

        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/integrations/:id/disconnect ──
integrationRouter.post('/integrations/:id/disconnect', async (req, res) => {
    try {
        const id = req.params.id as any;
        await registry.disconnect(id);

        db.prepare(`
            INSERT INTO integration_events 
            (integrationId, eventType, direction, status)
            VALUES (?, 'config.disconnected', 'outbound', 'success')
        `).run(id);

        res.json({ success: true, message: 'Disconnected successfully' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/integrations/:id/events ──
integrationRouter.get('/integrations/:id/events', (req, res) => {
    try {
        const id = req.params.id;
        const limit = parseInt(req.query.limit as string) || 50;

        const events = db.prepare(`
            SELECT * FROM integration_events 
            WHERE integrationId = ? 
            ORDER BY createdAt DESC LIMIT ?
        `).all(id, limit).map((r: any) => ({
            ...r,
            payload: JSON.parse(r.payload || '{}')
        }));

        res.json(events);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/integration-events ──
integrationRouter.get('/integration-events', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;

        const events = db.prepare(`
            SELECT * FROM integration_events 
            ORDER BY createdAt DESC LIMIT ?
        `).all(limit).map((r: any) => ({
            ...r,
            payload: JSON.parse(r.payload || '{}')
        }));

        res.json(events);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
