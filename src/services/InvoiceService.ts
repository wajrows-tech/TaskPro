import { db } from '../db/index.ts';
import { NotFoundError, AppError } from '../utils/errors.ts';
import type { Invoice, Payment, InvoiceStatus } from '../types.ts';
import { type User } from './UserService.ts';
import { AuditService } from './AuditService.ts';

export class InvoiceService {
    static getInvoicesByJob(jobId: number) {
        const invoices = db.prepare('SELECT * FROM invoices WHERE jobId = ? ORDER BY createdAt DESC').all(jobId) as Invoice[];
        for (const inv of invoices) {
            inv.payments = db.prepare('SELECT * FROM payments WHERE invoiceId = ? ORDER BY createdAt DESC').all(inv.id) as Payment[];
        }
        return invoices;
    }

    static getInvoice(id: number) {
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Invoice | undefined;
        if (!invoice) throw new NotFoundError(`Invoice ${id} not found`);
        invoice.payments = db.prepare('SELECT * FROM payments WHERE invoiceId = ? ORDER BY createdAt DESC').all(id) as Payment[];
        return invoice;
    }

    static createInvoice(user: User, data: Partial<Invoice>) {
        if (!data.jobId) throw new Error("Invoice 'jobId' is required");

        const result = db.prepare(`
            INSERT INTO invoices (jobId, contractId, status, amount, dueDate, sentAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            data.jobId,
            data.contractId || null,
            data.status || 'draft',
            data.amount || 0,
            data.dueDate || null,
            data.sentAt || null
        );

        const newId = Number(result.lastInsertRowid);
        const newInvoice = InvoiceService.getInvoice(newId);
        AuditService.log(user, 'invoice', newId, 'created', { jobId: data.jobId, amount: data.amount });
        return newInvoice;
    }

    static updateInvoice(user: User, id: number, data: Partial<Invoice>) {
        const invoice = InvoiceService.getInvoice(id);

        const keys = Object.keys(data).filter(k => ['status', 'amount', 'dueDate', 'sentAt', 'contractId'].includes(k));
        if (keys.length === 0) return invoice;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof Invoice]);

        db.prepare(`UPDATE invoices SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'invoice', id, 'updated', { previousStatus: invoice.status, newStatus: data.status });
        return InvoiceService.getInvoice(id);
    }

    static deleteInvoice(user: User, id: number) {
        const invoice = InvoiceService.getInvoice(id);
        if (invoice.status === 'paid' || invoice.status === 'partial') {
            throw new AppError('Cannot delete an invoice that has logged payments.', 400);
        }

        const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
        if (result.changes === 0) throw new NotFoundError(`Invoice ${id} not found`);
        AuditService.log(user, 'invoice', id, 'deleted');
        return true;
    }

    static reconcileInvoiceStatus(user: User, invoiceId: number) {
        const invoice = InvoiceService.getInvoice(invoiceId);

        // Sum completed payments
        const paidResult = db.prepare("SELECT SUM(amount) as total FROM payments WHERE invoiceId = ? AND status = 'completed'").get(invoiceId) as any;
        const totalPaid = paidResult?.total || 0;

        let newStatus: InvoiceStatus = invoice.status;

        if (totalPaid >= invoice.amount) {
            newStatus = 'paid';
        } else if (totalPaid > 0) {
            newStatus = 'partial';
        } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
            newStatus = 'overdue';
        }

        if (newStatus !== invoice.status) {
            InvoiceService.updateInvoice(user, invoiceId, { status: newStatus });
        }
    }
}
 
 
