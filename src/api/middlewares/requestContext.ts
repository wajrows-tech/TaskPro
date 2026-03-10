import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Define what lives in our global request context
export interface RequestContextData {
    requestId: string;
    userId?: number;
    userRole?: string;
    timestamp: number;
}

// Instantiate the localized storage
const contextStorage = new AsyncLocalStorage<RequestContextData>();

/**
 * Express middleware that initializes a unique context for every HTTP request.
 * Any downstream service/DB call made during this request can read this context.
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    // Attach to response headers so client can track errors
    res.setHeader('X-Request-Id', requestId);

    // Default context block
    const context: RequestContextData = {
        requestId,
        timestamp: Date.now()
    };

    // Run the rest of the Express pipeline inside this context
    contextStorage.run(context, () => {
        next();
    });
};

/**
 * Safely retrieves the current request context from anywhere in the Node event loop.
 */
export const getRequestContext = (): RequestContextData | undefined => {
    return contextStorage.getStore();
};

/**
 * Retrieve just the current Correlation/Request ID, or 'system' if running locally
 */
export const getCorrelationId = (): string => {
    const ctx = getRequestContext();
    return ctx?.requestId || 'system';
};
 
 
