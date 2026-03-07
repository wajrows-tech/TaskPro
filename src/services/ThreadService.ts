import { db } from '../db/index.ts';
import { NotFoundError } from '../utils/errors.ts';
import type { CommunicationThread, Communication } from '../types.ts';
import type { User } from './UserService.ts';
import { eventBus } from '../agents/eventBus.ts';

export class ThreadService {

    static getAllThreads(jobId?: number, contactId?: number) {
        let sql = 'SELECT * FROM communication_threads WHERE 1=1';
        const params: any[] = [];

        if (jobId) {
            sql += ' AND jobId = ?';
            params.push(jobId);
        }
        if (contactId) {
            sql += ' AND contactId = ?';
            params.push(contactId);
        }

        sql += ' ORDER BY updatedAt DESC';

        const threads = db.prepare(sql).all(...params) as CommunicationThread[];
        // Auto-fetch the latest 3 messages per thread
        for (const thread of threads) {
            thread.messages = db.prepare('SELECT * FROM communications WHERE threadId = ? ORDER BY createdAt DESC LIMIT 3').all(thread.id) as Communication[];
        }
        return threads;
    }

    static getThread(id: number) {
        const thread = db.prepare('SELECT * FROM communication_threads WHERE id = ?').get(id) as CommunicationThread | undefined;
        if (!thread) throw new NotFoundError(`Communication Thread ${id} not found`);

        thread.messages = db.prepare('SELECT * FROM communications WHERE threadId = ? ORDER BY createdAt ASC').all(thread.id) as Communication[];
        return thread;
    }

    static createThread(user: User, data: Partial<CommunicationThread>) {
        if (!data.title) throw new Error("Thread 'title' is required");

        const result = db.prepare(`
            INSERT INTO communication_threads (title, jobId, contactId, status)
            VALUES (?, ?, ?, ?)
        `).run(
            data.title,
            data.jobId || null,
            data.contactId || null,
            data.status || 'open'
        );

        const newThread = ThreadService.getThread(Number(result.lastInsertRowid));

        // Fire event
        eventBus.fire('communication.logged', 'thread', newThread.id, newThread, 'user');

        return newThread;
    }

    static updateThread(id: number, data: Partial<CommunicationThread>) {
        const thread = db.prepare('SELECT * FROM communication_threads WHERE id = ?').get(id);
        if (!thread) throw new NotFoundError(`Communication Thread ${id} not found`);

        const keys = Object.keys(data).filter(k => ['title', 'status', 'jobId', 'contactId'].includes(k));
        if (keys.length === 0) return ThreadService.getThread(id);

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof CommunicationThread]);

        db.prepare(`UPDATE communication_threads SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
        return ThreadService.getThread(id);
    }

    static deleteThread(id: number) {
        const result = db.prepare('DELETE FROM communication_threads WHERE id = ?').run(id);
        if (result.changes === 0) throw new NotFoundError(`Communication Thread ${id} not found`);
        return true;
    }
}
