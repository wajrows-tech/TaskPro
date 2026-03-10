import { db, queries } from '../db/index.ts';
import { eventBus } from '../agents/index.ts';
import { NotFoundError } from '../utils/errors.ts';

export class DocumentService {
    static getByJobId(jobId: number) {
        return queries.jobDocs.all(jobId);
    }

    static create(data: { jobId: number, name: string, type: string, filePath: string, fileSize: number }) {
        const result = db.prepare(`
            INSERT INTO documents (jobId, name, type, filePath, fileSize) 
            VALUES (?, ?, ?, ?, ?)
        `).run(data.jobId, data.name, data.type || 'other', data.filePath || '', data.fileSize || 0);

        const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);

        eventBus.emit('document.uploaded', { document: doc, jobId: data.jobId });

        return doc;
    }

    static delete(id: number) {
        const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
        if (result.changes === 0) {
            throw new NotFoundError(`Document with ID ${id} not found`);
        }
        return true;
    }

    // ── Phase 13: Remote Media Integration ──
    static getMediaMetadataByJobId(jobId: number) {
        return db.prepare('SELECT * FROM media_metadata WHERE jobId = ? ORDER BY createdAt DESC').all(jobId);
    }

    static queueMediaFetch(mediaId: number) {
        const metadata: any = db.prepare('SELECT * FROM media_metadata WHERE id = ?').get(mediaId);
        if (!metadata) {
            throw new NotFoundError(`Media metadata with ID ${mediaId} not found`);
        }

        db.prepare(`
            INSERT INTO media_queue (jobId, sourceExternalId, url, fileName, status)
            VALUES (?, ?, ?, ?, 'queued')
            ON CONFLICT(sourceExternalId) DO UPDATE SET status = 'queued'
        `).run(metadata.jobId, metadata.sourceExternalId, metadata.url, metadata.fileName);

        return { success: true, message: 'Added to download queue' };
    }
}


