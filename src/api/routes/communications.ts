import { Router } from 'express';
import { CommunicationService } from '../../services/CommunicationService.ts';

export const communicationRouter = Router();

communicationRouter.get('/communications', (req, res, next) => {
    try {
        const comms = CommunicationService.getAll();
        res.json(comms);
    } catch (e) {
        next(e);
    }
});

communicationRouter.post('/communications', (req, res, next) => {
    try {
        const comm = CommunicationService.create(req.body);
        res.status(201).json(comm);
    } catch (e) {
        next(e);
    }
});

communicationRouter.put('/communications/:id', (req, res, next) => {
    try {
        const comm = CommunicationService.update(Number(req.params.id), req.body);
        res.json(comm);
    } catch (e) {
        next(e);
    }
});

communicationRouter.delete('/communications/:id', (req, res, next) => {
    try {
        CommunicationService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
