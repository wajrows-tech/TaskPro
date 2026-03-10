import { db } from '../db/index.ts';
import { NotFoundError, AppError } from '../utils/errors.ts';
import type { Contract } from '../types.ts';
import { type User } from './UserService.ts';
import { AuditService } from './AuditService.ts';

export class ContractService {
    static getContractsByJob(jobId: number) {
        return db.prepare('SELECT * FROM contracts WHERE jobId = ? ORDER BY createdAt DESC').all(jobId) as Contract[];
    }

    static getContract(id: number) {
        const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Contract | undefined;
        if (!contract) throw new NotFoundError(`Contract ${id} not found`);
        return contract;
    }

    static createContract(user: User, data: Partial<Contract>) {
        if (!data.jobId) throw new Error("Contract 'jobId' is required");

        const result = db.prepare(`
            INSERT INTO contracts (jobId, status, totalAmount, pdfUrl)
            VALUES (?, ?, ?, ?)
        `).run(
            data.jobId,
            data.status || 'draft',
            data.totalAmount || 0,
            data.pdfUrl || null
        );

        const newId = Number(result.lastInsertRowid);
        const newContract = ContractService.getContract(newId);
        AuditService.log(user, 'contract', newId, 'created', { jobId: data.jobId });
        return newContract;
    }

    static updateContract(user: User, id: number, data: Partial<Contract>) {
        const contract = ContractService.getContract(id);

        const keys = Object.keys(data).filter(k => ['status', 'totalAmount', 'pdfUrl', 'signedAt', 'signedBy'].includes(k));
        if (keys.length === 0) return contract;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof Contract]);

        db.prepare(`UPDATE contracts SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'contract', id, 'updated', { previousStatus: contract.status, newStatus: data.status });
        return ContractService.getContract(id);
    }

    static deleteContract(user: User, id: number) {
        const contract = ContractService.getContract(id);
        if (contract.status === 'signed') {
            throw new AppError('Cannot delete a signed contract. Void it instead.', 400);
        }

        const result = db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
        if (result.changes === 0) throw new NotFoundError(`Contract ${id} not found`);
        AuditService.log(user, 'contract', id, 'deleted');
        return true;
    }
}
 
