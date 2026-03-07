import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors.ts';
import { getCorrelationId } from './requestContext.ts';

import { logger } from '../../services/LoggerService.ts';

/**
 * Centralized Error Handling Middleware
 * Captures all next(err) calls and formats a uniform JSON response.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`[Error] ${req.method} ${req.path} - ${err.message}`, { stack: err.stack, method: req.method, path: req.path });

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            requestId: getCorrelationId(),
        });
    }

    // SQLite / Database constraint errors
    if (err.message.includes('NOT NULL constraint') || err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({
            status: 'error',
            message: 'Database constraint failed: ' + err.message,
        });
    }

    // Default to 500
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        requestId: getCorrelationId(),
        ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
    });
};
