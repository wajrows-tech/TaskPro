import { db, queries } from '../db/index.ts';
import { NotFoundError, ValidationError } from '../utils/errors.ts';

export class NoteService {

    static getAll() {
        return queries.allNotes.all();
    }

    static create(data: { content: string, type?: string, jobId?: number, contactId?: number }) {
        if (!data.content || !data.content.trim()) {
            throw new ValidationError('Note content is required');
        }

        const result = db.prepare('INSERT INTO notes (content, type, jobId, contactId) VALUES (?, ?, ?, ?)').run(
            data.content,
            data.type || 'general',
            data.jobId || null,
            data.contactId || null
        );

        return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
    }

    static delete(id: number) {
        const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
        if (result.changes === 0) {
            throw new NotFoundError(`Note with ID ${id} not found`);
        }
        return true;
    }
}
