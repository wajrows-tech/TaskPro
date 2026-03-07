import { db } from '../db/index.ts';
import type { User } from './UserService.ts';

export class AuditService {
    static log(user: User | null, entityType: string, entityId: number, action: string, changes: any = {}) {
        try {
            db.prepare(`
                INSERT INTO audit_logs (entityType, entityId, action, actorId, changes)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                entityType,
                entityId,
                action,
                user ? user.id : null,
                JSON.stringify(changes)
            );
        } catch (e) {
            console.error('[AuditService] Failed to log audit event:', e);
        }
    }
}
