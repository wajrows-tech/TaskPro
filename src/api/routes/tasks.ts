import { Router } from 'express';
import { TaskService } from '../../services/TaskService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const taskRouter = Router();

taskRouter.get('/tasks', requireAuth, (req, res, next) => {
    try {
        const tasks = TaskService.getAll();
        res.json(tasks);
    } catch (e) {
        next(e);
    }
});

taskRouter.post('/tasks', requireAuth, (req, res, next) => {
    try {
        const task = TaskService.create(req.user!, req.body);
        res.status(201).json(task);
    } catch (e) {
        next(e);
    }
});

taskRouter.put('/tasks/:id', requireAuth, (req, res, next) => {
    try {
        const task = TaskService.update(req.user!, Number(req.params.id), req.body);
        res.json(task);
    } catch (e) {
        next(e);
    }
});

taskRouter.delete('/tasks/:id', requireAuth, (req, res, next) => {
    try {
        TaskService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

// ── Subtasks ──

taskRouter.get('/tasks/:id/subtasks', requireAuth, (req, res, next) => {
    try {
        const subtasks = TaskService.getSubtasks(Number(req.params.id));
        res.json(subtasks);
    } catch (e) {
        next(e);
    }
});

taskRouter.post('/tasks/:id/subtasks', requireAuth, (req, res, next) => {
    try {
        const subtask = TaskService.createSubtask(Number(req.params.id), req.body.title);
        res.status(201).json(subtask);
    } catch (e) {
        next(e);
    }
});

taskRouter.put('/subtasks/:id', requireAuth, (req, res, next) => {
    try {
        const subtask = TaskService.updateSubtask(Number(req.params.id), req.body);
        res.json(subtask);
    } catch (e) {
        next(e);
    }
});

taskRouter.delete('/subtasks/:id', requireAuth, (req, res, next) => {
    try {
        TaskService.deleteSubtask(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

// ── Task Dependencies ──

taskRouter.post('/tasks/:id/dependencies', requireAuth, (req, res, next) => {
    try {
        TaskService.addDependency(Number(req.params.id), req.body.dependsOnTaskId);
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

taskRouter.delete('/tasks/:taskId/dependencies/:depId', requireAuth, (req, res, next) => {
    try {
        TaskService.removeDependency(Number(req.params.taskId), Number(req.params.depId));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
 
 
