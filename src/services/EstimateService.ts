import { db, queries } from '../db/index.ts';
import { eventBus } from '../agents/index.ts';
import { validate, buildUpdate, VALID_ESTIMATE_STATUSES } from '../api/utils.ts';
import { NotFoundError, ValidationError } from '../utils/errors.ts';
import type { EstimateStatus } from '../types.ts';

export class EstimateService {

    static getAll() {
        return db.prepare('SELECT e.*, j.name as jobName FROM estimates e LEFT JOIN jobs j ON e.jobId = j.id ORDER BY e.createdAt DESC').all();
    }

    static getByJobId(jobId: number) {
        return queries.jobEstimates.all(jobId);
    }

    static create(data: any, overrideJobId?: number) {
        const jobId = overrideJobId ?? data.jobId;
        const status = validate(data.status, VALID_ESTIMATE_STATUSES, 'status', 'draft') as EstimateStatus;
        const lineItems = typeof data.lineItems === 'string' ? data.lineItems : JSON.stringify(data.lineItems || []);

        const result = db.prepare(`
            INSERT INTO estimates (jobId, lineItems, subtotal, tax, total, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(jobId || null, lineItems, data.subtotal || 0, data.tax || 0, data.total || 0, status, data.notes || '');

        const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(result.lastInsertRowid);

        eventBus.emit('estimate.created', { estimate, jobId });

        return estimate;
    }

    static update(id: number, data: any) {
        const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
        if (!estimate) throw new NotFoundError(`Estimate with ID ${id} not found`);

        if (data.lineItems !== undefined) {
            data.lineItems = typeof data.lineItems === 'string' ? data.lineItems : JSON.stringify(data.lineItems);
        }
        if (data.status) {
            data.status = validate(data.status, VALID_ESTIMATE_STATUSES, 'status') as EstimateStatus;
        }

        const updated = buildUpdate('estimates', id, data, ['lineItems', 'subtotal', 'tax', 'total', 'notes', 'status']);
        if (!updated) throw new ValidationError('No valid fields to update');

        const updatedEstimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);

        eventBus.emit('estimate.updated', { estimate: updatedEstimate });

        return updatedEstimate;
    }

    static delete(id: number) {
        const result = db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
        if (result.changes === 0) {
            throw new NotFoundError(`Estimate with ID ${id} not found`);
        }
        return true;
    }
}
 
 
