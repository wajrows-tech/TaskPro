import { Router } from 'express';
import { ProductionService } from '../../services/ProductionService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const productionRouter = Router();

// ── Crews ──
productionRouter.get('/crews', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.getCrews()); } catch (e) { next(e); }
});

productionRouter.post('/crews', requireAuth, (req, res, next) => {
    try { res.status(201).json(ProductionService.createCrew(req.user!, req.body)); } catch (e) { next(e); }
});

productionRouter.put('/crews/:id', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.updateCrew(req.user!, Number(req.params.id), req.body)); } catch (e) { next(e); }
});

// ── Work Orders ──
productionRouter.get('/jobs/:jobId/work-orders', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.getWorkOrdersByJob(Number(req.params.jobId))); } catch (e) { next(e); }
});

productionRouter.post('/work-orders', requireAuth, (req, res, next) => {
    try { res.status(201).json(ProductionService.createWorkOrder(req.user!, req.body)); } catch (e) { next(e); }
});

productionRouter.put('/work-orders/:id', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.updateWorkOrder(req.user!, Number(req.params.id), req.body)); } catch (e) { next(e); }
});

productionRouter.delete('/work-orders/:id', requireAuth, (req, res, next) => {
    try { ProductionService.deleteWorkOrder(req.user!, Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); }
});

// ── Material Orders ──
productionRouter.get('/jobs/:jobId/material-orders', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.getMaterialOrdersByJob(Number(req.params.jobId))); } catch (e) { next(e); }
});

productionRouter.post('/material-orders', requireAuth, (req, res, next) => {
    try { res.status(201).json(ProductionService.createMaterialOrder(req.user!, req.body)); } catch (e) { next(e); }
});

productionRouter.put('/material-orders/:id', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.updateMaterialOrder(req.user!, Number(req.params.id), req.body)); } catch (e) { next(e); }
});

// ── Checklists ──
productionRouter.get('/checklists/:entityType/:entityId', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.getChecklistsForEntity(req.params.entityType, Number(req.params.entityId))); } catch (e) { next(e); }
});

productionRouter.post('/checklists', requireAuth, (req, res, next) => {
    try { res.status(201).json(ProductionService.createChecklist(req.user!, req.body)); } catch (e) { next(e); }
});

productionRouter.put('/checklists/:id', requireAuth, (req, res, next) => {
    try { res.json(ProductionService.updateChecklist(req.user!, Number(req.params.id), req.body)); } catch (e) { next(e); }
});

productionRouter.delete('/checklists/:id', requireAuth, (req, res, next) => {
    try { ProductionService.deleteChecklist(req.user!, Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); }
});
 
