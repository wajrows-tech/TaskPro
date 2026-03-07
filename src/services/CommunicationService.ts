import { db, queries } from '../db/index.ts';
import { validate, VALID_CHANNELS, VALID_DIRECTIONS } from '../api/utils.ts';
import { NotFoundError, ValidationError } from '../utils/errors.ts';
import type { CommChannel, CommDirection } from '../types.ts';

export class CommunicationService {

    static getAll() {
        return queries.allComms.all();
    }

    static create(data: any) {
        const channel = validate(data.channel, VALID_CHANNELS, 'channel', 'note') as CommChannel;
        const direction = validate(data.direction, VALID_DIRECTIONS, 'direction', 'outbound') as CommDirection;

        const result = db.prepare(`
            INSERT INTO communications (jobId, contactId, channel, direction, subject, body, scheduledAt, sentAt, tags, attachments, isPinned, threadId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.jobId || null,
            data.contactId || null,
            channel,
            direction,
            data.subject || '',
            data.body || '',
            data.scheduledAt || null,
            direction === 'outbound' ? (data.sentAt || new Date().toISOString()) : null,
            data.tags || '[]',
            data.attachments || '[]',
            data.isPinned ? 1 : 0,
            data.threadId || null
        );

        console.log(`[CommunicationService] Logged communication: ${channel} - ${data.subject || '(no subject)'}`);
        return db.prepare('SELECT * FROM communications WHERE id = ?').get(result.lastInsertRowid);
    }

    static update(id: number, data: any) {
        const comm = db.prepare('SELECT * FROM communications WHERE id = ?').get(id);
        if (!comm) throw new NotFoundError(`Communication with ID ${id} not found`);

        const keys = Object.keys(data).filter(k => ['isPinned', 'tags', 'subject', 'body', 'channel'].includes(k));
        if (keys.length === 0) return comm;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => k === 'isPinned' ? (data[k] ? 1 : 0) : data[k]);

        db.prepare(`UPDATE communications SET ${sets} WHERE id = ?`).run(...values, id);
        return db.prepare('SELECT * FROM communications WHERE id = ?').get(id);
    }

    static delete(id: number) {
        const result = db.prepare('DELETE FROM communications WHERE id = ?').run(id);
        if (result.changes === 0) {
            throw new NotFoundError(`Communication with ID ${id} not found`);
        }
        return true;
    }
}
