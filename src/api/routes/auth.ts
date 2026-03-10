import { Router } from 'express';
import { AuthService } from '../../services/AuthService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const authRouter = Router();

authRouter.post('/login', (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = AuthService.login(email, password);
        res.json(result);
    } catch (e) {
        next(e);
    }
});

authRouter.post('/logout', requireAuth, (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            AuthService.logout(token);
        }
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});

authRouter.get('/me', requireAuth, (req, res, next) => {
    try {
        // req.user is populated by requireAuth
        res.json(req.user);
    } catch (e) {
        next(e);
    }
});
 
