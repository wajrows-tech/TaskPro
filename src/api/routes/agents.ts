import { Router } from 'express';
import { orchestrator, eventBus, AGENT_MANIFESTS } from '../../agents/index.ts';
import { AgentService } from '../../services/AgentService.ts';

export const agentRouter = Router();

// Get all agents and their status
agentRouter.get('/agents', (req, res, next) => {
    try {
        res.json(orchestrator.getSystemStatus());
    } catch (e) { next(e); }
});

// Get agent manifests (for UI rendering)
agentRouter.get('/agents/manifests', (req, res) => {
    res.json(AGENT_MANIFESTS);
});

// Send a request to a specific agent
agentRouter.post('/agents/:agentId/request', async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const { action, params } = req.body;
        if (!action) return res.status(400).json({ error: 'action is required' });

        const request = {
            id: `api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            fromAgent: 'orchestrator' as const,
            toAgent: agentId as any,
            action,
            params: params || {},
            priority: 'normal' as const,
            createdAt: new Date().toISOString(),
        };

        const response = await orchestrator.route(request);
        res.json(response);
    } catch (e) { next(e); }
});

// Smart routing — interpret intent and pick the best agent
agentRouter.post('/agents/smart', async (req, res, next) => {
    try {
        const { intent, params } = req.body;
        if (!intent) return res.status(400).json({ error: 'intent is required' });
        const response = await orchestrator.smartRoute(intent, params || {});
        res.json(response);
    } catch (e) { next(e); }
});

// Get agent memory
agentRouter.get('/agents/:agentId/memory', (req, res, next) => {
    try {
        const rows = AgentService.getMemory(req.params.agentId);
        res.json(rows);
    } catch (e) { next(e); }
});

// Get agent audit log
agentRouter.get('/agents/:agentId/audit', (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const rows = AgentService.getAuditLog(req.params.agentId, limit);
        res.json(rows);
    } catch (e) { next(e); }
});

// Get pending manual approvals
agentRouter.get('/agents/pending', (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const rows = AgentService.getPendingApprovals(limit);
        res.json(rows);
    } catch (e) { next(e); }
});

// Approve a pending action
agentRouter.post('/agents/approve/:id', async (req, res, next) => {
    try {
        const auditId = Number(req.params.id);
        const entry = AgentService.getAuditEntry(auditId);
        if (!entry) return res.status(404).json({ error: 'Audit entry not found' });
        if (entry.approved === 1) return res.status(400).json({ error: 'Action already approved or did not require approval' });

        // Mark as approved in DB
        AgentService.markApproved(auditId);

        // Parse intercepted parameters
        const params = JSON.parse(entry.params || '{}');
        params.__isApproved = true; // Security flag bypassing agent capability limits

        // Resubmit original intention to the assigned agent
        const request = {
            id: `approve_${Date.now()}`,
            fromAgent: 'orchestrator' as const,
            toAgent: entry.agentId,
            action: entry.action,
            params,
            priority: 'urgent' as const,
            createdAt: new Date().toISOString(),
        };

        const response = await orchestrator.route(request);
        res.json(response);
    } catch (e) { next(e); }
});

// Get recent events from the event bus
agentRouter.get('/agents/events/recent', (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 20;
        res.json(eventBus.getRecentEvents(limit));
    } catch (e) { next(e); }
});
 
