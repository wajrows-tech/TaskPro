import { db } from '../db/index.ts';

export class AgentService {
    static getMemory(agentId: string) {
        return db.prepare('SELECT * FROM agent_memory WHERE agentId = ? ORDER BY confidence DESC, accessCount DESC').all(agentId);
    }

    static getAuditLog(agentId: string, limit: number = 50) {
        return db.prepare('SELECT * FROM agent_audit_log WHERE agentId = ? ORDER BY createdAt DESC LIMIT ?').all(agentId, limit);
    }

    static getPendingApprovals(limit: number = 50) {
        return db.prepare('SELECT * FROM agent_audit_log WHERE approved = 0 ORDER BY createdAt ASC LIMIT ?').all(limit);
    }

    static getAuditEntry(id: number) {
        return db.prepare('SELECT * FROM agent_audit_log WHERE id = ?').get(id) as any;
    }

    static markApproved(id: number) {
        db.prepare('UPDATE agent_audit_log SET approved = 1 WHERE id = ?').run(id);
    }
}
