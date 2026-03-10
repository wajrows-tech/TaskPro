import morgan from 'morgan';
import { Request } from 'express';
import { getCorrelationId } from './requestContext.ts';

// Add the correlation ID to the morgan tokens
morgan.token('id', (req: Request) => getCorrelationId());

// Define a structured log format
const jsonFormat = (tokens: any, req: any, res: any) => {
    return JSON.stringify({
        requestId: tokens.id(req, res),
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        content_length: tokens.res(req, res, 'content-length'),
        response_time: tokens['response-time'](req, res) + ' ms',
        timestamp: new Date().toISOString()
    });
};

export const requestLogger = morgan(jsonFormat);
 
