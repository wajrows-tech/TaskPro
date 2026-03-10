import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/AuthService.ts';
import { AppError } from '../../utils/errors.ts';
import { db } from '../../db/connection.ts';
import { User } from '../../services/UserService.ts';

// Extend Express Request object
declare module 'express-serve-static-core' {
    interface Request {
        user?: User;
    }
}

/**
 * Validates the Bearer token and attaches the authenticated user to the request.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log(`[AUTH CHECK] ${req.method} ${req.originalUrl}`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // We will return 401 instead of throwing to be handled naturally by express next()
        // if inside async context, but standard express middleware doesn't catch sync throws without express-async-errors
        return next(new AppError('Missing or invalid authorization header', 401));
    }

    const token = authHeader.split(' ')[1];
    const user = AuthService.validateSession(token);

    if (!user) {
        return next(new AppError('Invalid or expired session', 401));
    }

    req.user = user;
    next();
};

/**
 * Middleware factory to guard routes by specific role.
 */
export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            return next(new AppError('Authentication required', 401));
        }

        if (!roles.includes(user.role) && user.role !== 'admin') {
            return next(new AppError('Forbidden: Insufficient role permissions', 403));
        }

        next();
    };
};

/**
 * Middleware factory to guard routes by specific feature permissions.
 */
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            return next(new AppError('Authentication required', 401));
        }

        // Admins automatically have all permissions
        if (user.role === 'admin') {
            return next();
        }

        // Check the role_permissions mapping table
        const row = db.prepare(`
            SELECT 1 FROM role_permissions
            WHERE roleName = ? AND permissionName = ?
        `).get(user.role, permission);

        if (!row) {
            return next(new AppError(`Forbidden: Missing "${permission}" permission`, 403));
        }

        next();
    };
};
 
