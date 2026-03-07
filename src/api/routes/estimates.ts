import { Router } from 'express';
import { EstimateService } from '../../services/EstimateService.ts';

export const estimateRouter = Router();

estimateRouter.get('/estimates', (req, res, next) => {
    try {
        const estimates = EstimateService.getAll();
        res.json(estimates);
    } catch (e) {
        next(e);
    }
});

estimateRouter.get('/jobs/:id/estimates', (req, res, next) => {
    try {
        const estimates = EstimateService.getByJobId(Number(req.params.id));
        res.json(estimates);
    } catch (e) {
        next(e);
    }
});

estimateRouter.post('/jobs/:id/estimates', (req, res, next) => {
    try {
        const estimate = EstimateService.create(req.body, Number(req.params.id));
        res.status(201).json(estimate);
    } catch (e) {
        next(e);
    }
});

estimateRouter.post('/estimates', (req, res, next) => {
    try {
        const estimate = EstimateService.create(req.body);
        res.status(201).json(estimate);
    } catch (e) {
        next(e);
    }
});

estimateRouter.put('/estimates/:id', (req, res, next) => {
    try {
        const estimate = EstimateService.update(Number(req.params.id), req.body);
        res.json(estimate);
    } catch (e) {
        next(e);
    }
});

estimateRouter.delete('/estimates/:id', (req, res, next) => {
    try {
        EstimateService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
