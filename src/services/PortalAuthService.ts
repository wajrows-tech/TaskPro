import { db } from '../db/index.ts';
import { NotFoundError, AppError } from '../utils/errors.ts';
import type { PortalUser, PortalInvite } from '../types.ts';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taskpro-offline-dev-secret';

export class PortalAuthService {

    // ── Invites ──

    static createInvite(contactId: number, jobId?: number, expiresInDays = 7): PortalInvite {
        const contactExists = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contactId);
        if (!contactExists) throw new NotFoundError('Contact not found');

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const result = db.prepare(`
            INSERT INTO portal_invites (contactId, jobId, token, expiresAt)
            VALUES (?, ?, ?, ?)
        `).run(contactId, jobId || null, expiresAt.toISOString());

        return this.getInvite(result.lastInsertRowid as number);
    }

    static getInvite(id: number): PortalInvite {
        const invite = db.prepare('SELECT * FROM portal_invites WHERE id = ?').get(id) as PortalInvite | undefined;
        if (!invite) throw new NotFoundError('PortalInvite not found');
        return invite;
    }

    static getInviteByToken(token: string): PortalInvite {
        const invite = db.prepare('SELECT * FROM portal_invites WHERE token = ?').get(token) as PortalInvite | undefined;
        if (!invite) throw new AppError('Invalid or expired invite token', 400);

        if (invite.status !== 'pending') {
            throw new AppError(`Invite already ${invite.status}`, 400);
        }

        if (new Date(invite.expiresAt) < new Date()) {
            db.prepare("UPDATE portal_invites SET status = 'expired' WHERE id = ?").run(invite.id);
            throw new AppError('Invite has expired', 400);
        }

        return invite;
    }

    // ── Users ──

    static getPortalUserByContactId(contactId: number): PortalUser | undefined {
        return db.prepare('SELECT * FROM portal_users WHERE contactId = ?').get(contactId) as PortalUser | undefined;
    }

    static acceptInvite(token: string, passwordHash?: string): { user: PortalUser; token: string } {
        const invite = this.getInviteByToken(token);

        let portalUser = this.getPortalUserByContactId(invite.contactId);

        const transaction = db.transaction(() => {
            if (!portalUser) {
                const res = db.prepare(`
                    INSERT INTO portal_users (contactId, passwordHash)
                    VALUES (?, ?)
                `).run(invite.contactId, passwordHash || null);

                portalUser = db.prepare('SELECT * FROM portal_users WHERE id = ?').get(res.lastInsertRowid) as PortalUser;
            } else if (passwordHash) {
                db.prepare('UPDATE portal_users SET passwordHash = ? WHERE id = ?').run(passwordHash, portalUser.id);
            }

            db.prepare("UPDATE portal_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
        });

        transaction();

        // Log them in immediately.
        db.prepare('UPDATE portal_users SET lastLoginAt = CURRENT_TIMESTAMP WHERE contactId = ?').run(portalUser!.contactId);

        // Generate JWT
        const jwtToken = jwt.sign(
            { contactId: portalUser!.contactId, role: 'customer' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { user: portalUser!, token: jwtToken };
    }
}
 
 
