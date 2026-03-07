import { Router } from 'express';
import { JobService } from '../../services/JobService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const jobRouter = Router();

jobRouter.get('/jobs', requireAuth, (req, res, next) => {
    try {
        const jobs = JobService.getAll();
        res.json(jobs);
    } catch (e) {
        next(e);
    }
});

jobRouter.get('/jobs/:id', requireAuth, (req, res, next) => {
    try {
        const job = JobService.getById(Number(req.params.id));
        res.json(job);
    } catch (e) {
        next(e);
    }
});

jobRouter.post('/jobs', requireAuth, (req, res, next) => {
    try {
        const job = JobService.create(req.user!, req.body);
        res.status(201).json(job);
    } catch (e) {
        next(e);
    }
});

jobRouter.put('/jobs/:id', requireAuth, (req, res, next) => {
    try {
        const job = JobService.update(req.user!, Number(req.params.id), req.body);
        res.json(job);
    } catch (e) {
        next(e);
    }
});

jobRouter.delete('/jobs/:id', requireAuth, (req, res, next) => {
    try {
        JobService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
