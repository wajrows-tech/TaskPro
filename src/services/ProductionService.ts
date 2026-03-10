import { db } from '../db/index.ts';
import { NotFoundError, AppError } from '../utils/errors.ts';
import type { Crew, WorkOrder, MaterialOrder, Checklist } from '../types.ts';
import { type User } from './UserService.ts';
import { AuditService } from './AuditService.ts';

export class ProductionService {

    // ── Crews ─────────────────────────────────────────────────────────────────

    static getCrews() {
        return db.prepare('SELECT * FROM crews ORDER BY name ASC').all() as Crew[];
    }

    static getCrew(id: number) {
        const crew = db.prepare('SELECT * FROM crews WHERE id = ?').get(id) as Crew | undefined;
        if (!crew) throw new NotFoundError(`Crew ${id} not found`);
        return crew;
    }

    static createCrew(user: User, data: Partial<Crew>) {
        if (!data.name) throw new Error("Crew 'name' is required");

        const result = db.prepare(`
            INSERT INTO crews (name, leaderId, trade, color, isActive)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            data.name,
            data.leaderId || null,
            data.trade || 'roofing',
            data.color || '#74B9FF',
            data.isActive ?? 1
        );

        const newId = Number(result.lastInsertRowid);
        AuditService.log(user, 'crew', newId, 'created', { name: data.name });
        return ProductionService.getCrew(newId);
    }

    static updateCrew(user: User, id: number, data: Partial<Crew>) {
        const crew = ProductionService.getCrew(id);

        const keys = Object.keys(data).filter(k => ['name', 'leaderId', 'trade', 'color', 'isActive'].includes(k));
        if (keys.length === 0) return crew;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof Crew]);

        db.prepare(`UPDATE crews SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'crew', id, 'updated', data);
        return ProductionService.getCrew(id);
    }

    // ── Work Orders ───────────────────────────────────────────────────────────

    static getWorkOrdersByJob(jobId: number) {
        const orders = db.prepare('SELECT * FROM work_orders WHERE jobId = ? ORDER BY createdAt DESC').all(jobId) as WorkOrder[];
        for (const order of orders) {
            if (order.crewId) {
                order.crew = db.prepare('SELECT * FROM crews WHERE id = ?').get(order.crewId) as Crew;
            }
        }
        return orders;
    }

    static getWorkOrder(id: number) {
        const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as WorkOrder | undefined;
        if (!order) throw new NotFoundError(`WorkOrder ${id} not found`);
        if (order.crewId) {
            order.crew = db.prepare('SELECT * FROM crews WHERE id = ?').get(order.crewId) as Crew;
        }
        return order;
    }

    static createWorkOrder(user: User, data: Partial<WorkOrder>) {
        if (!data.jobId) throw new Error("WorkOrder 'jobId' is required");

        const result = db.prepare(`
            INSERT INTO work_orders (jobId, crewId, status, scheduledDate, instructions)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            data.jobId,
            data.crewId || null,
            data.status || 'draft',
            data.scheduledDate || null,
            data.instructions || ''
        );

        const newId = Number(result.lastInsertRowid);
        AuditService.log(user, 'work_order', newId, 'created', { jobId: data.jobId });
        return ProductionService.getWorkOrder(newId);
    }

    static updateWorkOrder(user: User, id: number, data: Partial<WorkOrder>) {
        const order = ProductionService.getWorkOrder(id);

        const keys = Object.keys(data).filter(k => ['crewId', 'status', 'scheduledDate', 'instructions', 'completedAt'].includes(k));
        if (keys.length === 0) return order;

        if (data.status === 'completed' && order.status !== 'completed') {
            data.completedAt = new Date().toISOString();
        }

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof WorkOrder]);

        db.prepare(`UPDATE work_orders SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'work_order', id, 'updated', { previousStatus: order.status, newStatus: data.status });
        return ProductionService.getWorkOrder(id);
    }

    static deleteWorkOrder(user: User, id: number) {
        const order = ProductionService.getWorkOrder(id);
        if (order.status === 'in_progress' || order.status === 'completed') {
            throw new AppError(`Cannot delete work order in ${order.status} state. Cancel it instead.`, 400);
        }

        const result = db.prepare('DELETE FROM work_orders WHERE id = ?').run(id);
        if (result.changes === 0) throw new NotFoundError(`WorkOrder ${id} not found`);
        AuditService.log(user, 'work_order', id, 'deleted');
        return true;
    }

    // ── Material Orders ───────────────────────────────────────────────────────

    static getMaterialOrdersByJob(jobId: number) {
        return db.prepare('SELECT * FROM material_orders WHERE jobId = ? ORDER BY createdAt DESC').all(jobId) as MaterialOrder[];
    }

    static createMaterialOrder(user: User, data: Partial<MaterialOrder>) {
        if (!data.jobId) throw new Error("MaterialOrder 'jobId' is required");

        const result = db.prepare(`
            INSERT INTO material_orders (jobId, supplierId, status, deliveryDate, materials)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            data.jobId,
            data.supplierId || null,
            data.status || 'draft',
            data.deliveryDate || null,
            data.materials || '[]'
        );

        const newId = Number(result.lastInsertRowid);
        AuditService.log(user, 'material_order', newId, 'created', { jobId: data.jobId });
        return db.prepare('SELECT * FROM material_orders WHERE id = ?').get(newId) as MaterialOrder;
    }

    static updateMaterialOrder(user: User, id: number, data: Partial<MaterialOrder>) {
        const keys = Object.keys(data).filter(k => ['supplierId', 'status', 'deliveryDate', 'materials'].includes(k));
        if (keys.length === 0) return db.prepare('SELECT * FROM material_orders WHERE id = ?').get(id) as MaterialOrder;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof MaterialOrder]);

        db.prepare(`UPDATE material_orders SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'material_order', id, 'updated', data);
        return db.prepare('SELECT * FROM material_orders WHERE id = ?').get(id) as MaterialOrder;
    }

    // ── Checklists ────────────────────────────────────────────────────────────

    static getChecklistsForEntity(entityType: string, entityId: number) {
        return db.prepare('SELECT * FROM checklists WHERE entityType = ? AND entityId = ? ORDER BY createdAt ASC').all(entityType, entityId) as Checklist[];
    }

    static createChecklist(user: User, data: Partial<Checklist>) {
        if (!data.entityType || !data.entityId || !data.name) throw new Error("Checklist requires entityType, entityId, and name");

        const result = db.prepare(`
            INSERT INTO checklists (entityType, entityId, name, items)
            VALUES (?, ?, ?, ?)
        `).run(
            data.entityType,
            data.entityId,
            data.name,
            data.items || '[]'
        );

        const newId = Number(result.lastInsertRowid);
        AuditService.log(user, 'checklist', newId, 'created', { name: data.name });
        return db.prepare('SELECT * FROM checklists WHERE id = ?').get(newId) as Checklist;
    }

    static updateChecklist(user: User, id: number, data: Partial<Checklist>) {
        const keys = Object.keys(data).filter(k => ['name', 'items'].includes(k));
        if (keys.length === 0) return db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as Checklist;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof Checklist]);

        db.prepare(`UPDATE checklists SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'checklist', id, 'updated');
        return db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as Checklist;
    }

    static deleteChecklist(user: User, id: number) {
        db.prepare('DELETE FROM checklists WHERE id = ?').run(id);
        AuditService.log(user, 'checklist', id, 'deleted');
        return true;
    }
}
 
