import { expect } from 'chai';
import { db } from '../db/index.ts';
import { JobService } from '../services/JobService.ts';
import { ContractService } from '../services/ContractService.ts';
import { InvoiceService } from '../services/InvoiceService.ts';
import { PaymentService } from '../services/PaymentService.ts';
import { UserService } from '../services/UserService.ts';
import { ContactService } from '../services/ContactService.ts';

describe('End-to-End Pipeline Integration', () => {
    let admin: any;
    let customer: any;
    let job: any;
    let contract: any;
    let invoice: any;

    before(() => {
        db.exec('DELETE FROM users');
        db.exec('DELETE FROM jobs');
        db.exec('DELETE FROM contacts');
        db.exec('DELETE FROM contracts');
        db.exec('DELETE FROM invoices');
        db.exec('DELETE FROM payments');

        admin = UserService.create({ email: 'pipeline@taskpro.local', password: 'password', firstName: 'Admin', lastName: 'User', role: 'admin' });
    });

    it('Step 1: Create a Customer Contact', () => {
        customer = ContactService.create(admin, {
            firstName: 'John',
            lastName: 'Doe',
            type: 'customer',
            email: 'john@example.com'
        });
        expect(customer.id).to.be.greaterThan(0);
    });

    it('Step 2: Create a Job (Lead Stage) and Link Customer', () => {
        job = JobService.create(admin, {
            name: 'Doe Roof Replacement',
            type: 'residential',
            estimatedValue: 15000
        });
        expect(job.stage).to.equal('lead');

        ContactService.linkToJob(job.id, customer.id, 'primary_homeowner');
        const linked = db.prepare('SELECT * FROM job_contacts WHERE jobId = ?').all(job.id);
        expect(linked.length).to.equal(1);
    });

    it('Step 3: Generate and Sign a Contract', () => {
        contract = ContractService.createContract(admin, {
            jobId: job.id,
            totalAmount: 15000,
            status: 'draft'
        });
        expect(contract.status).to.equal('draft');

        contract = ContractService.updateContract(admin, contract.id, { status: 'signed' });
        expect(contract.status).to.equal('signed');

        // Automatically advance job stage
        job = JobService.update(admin, job.id, { stage: 'contract_signed' });
        expect(job.stage).to.equal('contract_signed');
    });

    it('Step 4: Generate an Invoice from Contract', () => {
        invoice = InvoiceService.createInvoice(admin, {
            jobId: job.id,
            contractId: contract.id,
            amount: 15000,
            status: 'sent'
        });
        expect(invoice.id).to.be.greaterThan(0);
        expect(invoice.status).to.equal('sent');

        // Advance job to production
        job = JobService.update(admin, job.id, { stage: 'production' });
    });

    it('Step 5: Log Partial Payment and Verify Invoice Reconciles', () => {
        const payment = PaymentService.createPayment(admin, {
            invoiceId: invoice.id,
            amount: 5000,
            method: 'check',
            status: 'completed'
        });
        expect(payment.id).to.be.greaterThan(0);

        // Fetch invoice to check status
        const updatedInvoice = InvoiceService.getInvoice(invoice.id);
        expect(updatedInvoice.status).to.equal('partial');
    });

    it('Step 6: Log Final Payment and Verify Job Completion', () => {
        PaymentService.createPayment(admin, {
            invoiceId: invoice.id,
            amount: 10000,
            method: 'ach',
            status: 'completed'
        });

        // Invoice should automatically flip to 'paid'
        const finalInvoice = InvoiceService.getInvoice(invoice.id);
        expect(finalInvoice.status).to.equal('paid');

        // Job moves to closed
        job = JobService.update(admin, job.id, { stage: 'closed' });
        expect(job.stage).to.equal('closed');
    });
});
 
 
