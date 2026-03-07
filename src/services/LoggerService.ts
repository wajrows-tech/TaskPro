import winston from 'winston';
import { getCorrelationId } from '../api/middlewares/requestContext.ts';

/**
 * Custom formatter that injects the current requestId from the AsyncLocalStorage context
 * into every log payload, ensuring all logs are traceable to a specific HTTP request.
 */
const requestContextFormat = winston.format((info) => {
    const reqId = getCorrelationId();
    if (reqId && reqId !== 'system') {
        info.requestId = reqId;
    }
    return info;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        requestContextFormat(),
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});
