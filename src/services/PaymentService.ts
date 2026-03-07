import { db } from '../db/index.ts';
import { NotFoundError } from '../utils/errors.ts';
import type { Payment } from '../types.ts';
import { type User } from './UserService.ts';
import { AuditService } from './AuditService.ts';
import { InvoiceService } from './InvoiceService.ts';

export class PaymentService {
    static createPayment(user: User, data: Partial<Payment>) {
        if (!data.invoiceId) throw new Error("Payment 'invoiceId' is required");
        if (!data.amount || data.amount <= 0) throw new Error("Payment 'amount' must be positive");

        const invoice = InvoiceService.getInvoice(data.invoiceId);

        const result = db.prepare(`
            INSERT INTO payments (invoiceId, amount, method, status, transactionId, paymentDate)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            data.invoiceId,
            data.amount,
            data.method || 'credit_card',
            data.status || 'pending',
            data.transactionId || null,
            data.paymentDate || new Date().toISOString()
        );

        const paymentId = Number(result.lastInsertRowid);
        const newPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as Payment;

        AuditService.log(user, 'payment', paymentId, 'created', { invoiceId: data.invoiceId, amount: data.amount });

        // Auto-update invoice status based on total payments
        InvoiceService.reconcileInvoiceStatus(user, invoice.id);

        return newPayment;
    }

    static updatePayment(user: User, id: number, data: Partial<Payment>) {
        const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined;
        if (!payment) throw new NotFoundError(`Payment ${id} not found`);

        const keys = Object.keys(data).filter(k => ['status', 'transactionId', 'paymentDate'].includes(k));
        if (keys.length === 0) return payment;

        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => data[k as keyof Payment]);

        db.prepare(`UPDATE payments SET ${sets}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

        AuditService.log(user, 'payment', id, 'updated', { previousStatus: payment.status, newStatus: data.status });

        // If status changed to/from completed, reconcile invoice
        if (data.status && data.status !== payment.status) {
            InvoiceService.reconcileInvoiceStatus(user, payment.invoiceId);
        }

        return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment;
    }
}
