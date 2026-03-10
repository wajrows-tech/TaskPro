import { Router } from 'express';
import { ThreadService } from '../../services/ThreadService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const threadRouter = Router();

threadRouter.get('/threads', requireAuth, (req, res, next) => {
    try {
        const jobId = req.query.jobId ? Number(req.query.jobId) : undefined;
        const contactId = req.query.contactId ? Number(req.query.contactId) : undefined;

        const threads = ThreadService.getAllThreads(jobId, contactId);
        res.json(threads);
    } catch (e) {
        next(e);
    }
});

threadRouter.get('/threads/:id', requireAuth, (req, res, next) => {
    try {
        const thread = ThreadService.getThread(Number(req.params.id));
        res.json(thread);
    } catch (e) {
        next(e);
    }
});

threadRouter.post('/threads', requireAuth, (req, res, next) => {
    try {
        const thread = ThreadService.createThread(req.user!, req.body);
        res.status(201).json(thread);
    } catch (e) {
        next(e);
    }
});

threadRouter.put('/threads/:id', requireAuth, (req, res, next) => {
    try {
        const thread = ThreadService.updateThread(Number(req.params.id), req.body);
        res.json(thread);
    } catch (e) {
        next(e);
    }
});

threadRouter.delete('/threads/:id', requireAuth, (req, res, next) => {
    try {
        ThreadService.deleteThread(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
 
 
