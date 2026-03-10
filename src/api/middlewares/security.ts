import rateLimit from 'express-rate-limit';
import { AppError } from '../../utils/errors.ts';

// ── Global API Rate Limiter ──
// Helps prevent basic DoS and brute force attacks

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 mins (generous for SPA)
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new AppError('Too many requests, please try again later.', 429));
    }
});

// ── Strict Login Rate Limiter ──
// Specifically targets authentication routes to prevent dictionary attacks

export const loginRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // Start blocking after 10 failed login attempts per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new AppError('Too many login attempts from this IP, please try again after an hour.', 429));
    }
});

// ── Webhook Security Validator ──
// Verifies incoming integrations (e.g. from an estimating system) have the correct HMAC signature

export const requireWebhookSignature = (secretEnvKey: string) => {
    return (req: any, res: any, next: any) => {
        const signature = req.headers['x-webhook-signature'];

        // In a real production system, you would use crypto.createHmac() to verify the payload body
        // using the environment secret. For Phase 10 demo purposes, we do a basic check.
        if (!signature || signature !== process.env[secretEnvKey]) {
            console.warn(`[Security] Rejected webhook simulation lacking valid signature: ${req.path}`);
            return next(new AppError('Unauthorized webhook signature', 401));
        }

        next();
    };
};
 
