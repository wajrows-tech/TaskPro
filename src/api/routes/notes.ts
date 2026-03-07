import { Router } from 'express';
import { NoteService } from '../../services/NoteService.ts';

export const noteRouter = Router();

noteRouter.get('/notes', (req, res, next) => {
    try {
        const notes = NoteService.getAll();
        res.json(notes);
    } catch (e) {
        next(e);
    }
});

noteRouter.post('/notes', (req, res, next) => {
    try {
        const note = NoteService.create(req.body);
        res.status(201).json(note);
    } catch (e) {
        next(e);
    }
});

noteRouter.delete('/notes/:id', (req, res, next) => {
    try {
        NoteService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
