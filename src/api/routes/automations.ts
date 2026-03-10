import { Router } from 'express';
import { AutomationService } from '../../services/AutomationService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const automationRouter = Router();

automationRouter.get('/automations', requireAuth, (req, res, next) => {
    try {
        const rules = AutomationService.getRules();
        res.json(rules);
    } catch (e) {
        next(e);
    }
});

automationRouter.get('/automations/:id', requireAuth, (req, res, next) => {
    try {
        const rule = AutomationService.getRule(Number(req.params.id));
        if (!rule) {
            return res.status(404).json({ error: 'Automation rule not found' });
        }
        res.json(rule);
    } catch (e) {
        next(e);
    }
});

automationRouter.post('/automations', requireAuth, (req, res, next) => {
    try {
        const rule = AutomationService.createRule(req.user!, req.body);
        res.status(201).json(rule);
    } catch (e) {
        next(e);
    }
});

automationRouter.put('/automations/:id', requireAuth, (req, res, next) => {
    try {
        const rule = AutomationService.updateRule(Number(req.params.id), req.body);
        res.json(rule);
    } catch (e) {
        next(e);
    }
});

automationRouter.delete('/automations/:id', requireAuth, (req, res, next) => {
    try {
        AutomationService.deleteRule(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

// Helper route to get recent audit logs
import { db } from '../../db/index.ts';
automationRouter.get('/audit-logs', requireAuth, (req, res, next) => {
    try {
        const logs = db.prepare(`
            SELECT a.*, u.firstName, u.lastName, u.email 
            FROM audit_logs a 
            LEFT JOIN users u ON a.actorId = u.id 
            ORDER BY a.createdAt DESC LIMIT 100
        `).all();
        res.json(logs);
    } catch (e) {
        next(e);
    }
});

// Helper route to get automation runs
automationRouter.get('/automation-runs', requireAuth, (req, res, next) => {
    try {
        const runs = db.prepare(`
            SELECT r.*, a.name as ruleName 
            FROM automation_runs r 
            JOIN automation_rules a ON r.ruleId = a.id 
            ORDER BY r.executedAt DESC LIMIT 100
        `).all();
        res.json(runs);
    } catch (e) {
        next(e);
    }
});
 
 
