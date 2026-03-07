import { Router } from 'express';
import { ContactService } from '../../services/ContactService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const contactRouter = Router();

contactRouter.get('/contacts', requireAuth, (req, res, next) => {
    try {
        const contacts = ContactService.getAll();
        res.json(contacts);
    } catch (e) {
        next(e);
    }
});

contactRouter.get('/contacts/:id', requireAuth, (req, res, next) => {
    try {
        const contact = ContactService.getById(Number(req.params.id));
        res.json(contact);
    } catch (e) {
        next(e);
    }
});

contactRouter.post('/contacts', requireAuth, (req, res, next) => {
    try {
        const contact = ContactService.create(req.user!, req.body);
        res.status(201).json(contact);
    } catch (e) {
        next(e);
    }
});

contactRouter.put('/contacts/:id', requireAuth, (req, res, next) => {
    try {
        const contact = ContactService.update(req.user!, Number(req.params.id), req.body);
        res.json(contact);
    } catch (e) {
        next(e);
    }
});

contactRouter.delete('/contacts/:id', requireAuth, (req, res, next) => {
    try {
        ContactService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

// ── Job ↔ Contact linking ──
contactRouter.post('/jobs/:id/contacts', requireAuth, (req, res, next) => {
    try {
        ContactService.linkToJob(Number(req.params.id), req.body.contactId, req.body.role);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

contactRouter.delete('/jobs/:jobId/contacts/:contactId', requireAuth, (req, res, next) => {
    try {
        ContactService.unlinkFromJob(Number(req.params.jobId), Number(req.params.contactId));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
