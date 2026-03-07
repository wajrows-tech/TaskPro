import { Router } from 'express';
import { PortalAuthService } from '../../services/PortalAuthService.ts';
import { AppError } from '../../utils/errors.ts';
import { db } from '../../db/index.ts';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taskpro-offline-dev-secret';

export const portalRouter = Router();

// ── Authentication ──

// Create an invite (internal API only, used by staff)
portalRouter.post('/invites', (req, res) => {
    try {
        const { contactId, jobId, expiresInDays } = req.body;
        if (!contactId) throw new AppError('contactId is required', 400);
        const invite = PortalAuthService.createInvite(Number(contactId), jobId ? Number(jobId) : undefined, expiresInDays ? Number(expiresInDays) : undefined);
        res.status(201).json(invite);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

// Verify a token (external API)
portalRouter.get('/invites/:token', (req, res) => {
    try {
        const invite = PortalAuthService.getInviteByToken(req.params.token);
        res.json(invite);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

// Accept invite / register password (external API)
portalRouter.post('/invites/:token/accept', (req, res) => {
    try {
        const { password } = req.body;
        const result = PortalAuthService.acceptInvite(req.params.token, password);
        res.json(result);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

// ── Customer Data Retrieval ──
// These routes simulate what a React portal application would call.
// They DO NOT use the standard CRM routes. They are tightly scoped to the contactId.

// Mock authentication middleware for the portal
const requirePortalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Portal access token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        const contactId = payload.contactId;

        const user = PortalAuthService.getPortalUserByContactId(Number(contactId));
        if (!user || (!user.hasAccess)) {
            return res.status(403).json({ error: 'Forbidden: Portal access revoked or invalid' });
        }

        req.portalUser = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid portal token' });
    }
};

// Get jobs for the logged-in portal user
portalRouter.get('/jobs', requirePortalAuth, (req: any, res) => {
    try {
        const contactId = req.portalUser.contactId;

        // Find jobs associated with this contact
        const jobs = db.prepare(`
            SELECT j.* 
            FROM jobs j
            JOIN job_contacts jc ON j.id = jc.jobId
            WHERE jc.contactId = ?
        `).all(contactId);

        // Sanitize the jobs to remove sensitive internal data before sending to portal
        const sanitizedJobs = jobs.map((job: any) => ({
            id: job.id,
            jobNumber: job.jobNumber,
            name: job.name,
            address: job.address,
            stage: job.stage,
            description: job.description,
            // Only send the fields we want the customer to see
            scheduledStartDate: job.scheduledStartDate,
            completionDate: job.completionDate
        }));

        res.json(sanitizedJobs);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

// Get documents for a specific job (that the portal user has access to)
portalRouter.get('/jobs/:jobId/documents', requirePortalAuth, (req: any, res) => {
    try {
        const contactId = req.portalUser.contactId;
        const jobId = Number(req.params.jobId);

        // Verify the user has access to this job
        const hasAccess = db.prepare('SELECT 1 FROM job_contacts WHERE jobId = ? AND contactId = ?').get(jobId, contactId);
        if (!hasAccess) throw new AppError('Forbidden: You do not have access to this job', 403);

        // Fetch documents
        const docs = db.prepare('SELECT id, name, type, fileSize, createdAt FROM documents WHERE jobId = ? ORDER BY createdAt DESC').all(jobId);
        res.json(docs);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});
