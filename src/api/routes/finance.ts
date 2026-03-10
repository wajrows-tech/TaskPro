import { Router } from 'express';
import { ContractService } from '../../services/ContractService.ts';
import { InvoiceService } from '../../services/InvoiceService.ts';
import { PaymentService } from '../../services/PaymentService.ts';
import { requireAuth } from '../middlewares/auth.ts';

export const financeRouter = Router();

// ── Contracts ──
financeRouter.get('/jobs/:jobId/contracts', requireAuth, (req, res, next) => {
    try {
        res.json(ContractService.getContractsByJob(Number(req.params.jobId)));
    } catch (e) { next(e); }
});

financeRouter.post('/contracts', requireAuth, (req, res, next) => {
    try {
        res.status(201).json(ContractService.createContract(req.user!, req.body));
    } catch (e) { next(e); }
});

financeRouter.get('/contracts/:id', requireAuth, (req, res, next) => {
    try {
        res.json(ContractService.getContract(Number(req.params.id)));
    } catch (e) { next(e); }
});

financeRouter.put('/contracts/:id', requireAuth, (req, res, next) => {
    try {
        res.json(ContractService.updateContract(req.user!, Number(req.params.id), req.body));
    } catch (e) { next(e); }
});

financeRouter.delete('/contracts/:id', requireAuth, (req, res, next) => {
    try {
        ContractService.deleteContract(req.user!, Number(req.params.id));
        res.json({ success: true });
    } catch (e) { next(e); }
});

// ── Invoices ──
financeRouter.get('/jobs/:jobId/invoices', requireAuth, (req, res, next) => {
    try {
        res.json(InvoiceService.getInvoicesByJob(Number(req.params.jobId)));
    } catch (e) { next(e); }
});

financeRouter.post('/invoices', requireAuth, (req, res, next) => {
    try {
        res.status(201).json(InvoiceService.createInvoice(req.user!, req.body));
    } catch (e) { next(e); }
});

financeRouter.get('/invoices/:id', requireAuth, (req, res, next) => {
    try {
        res.json(InvoiceService.getInvoice(Number(req.params.id)));
    } catch (e) { next(e); }
});

financeRouter.put('/invoices/:id', requireAuth, (req, res, next) => {
    try {
        res.json(InvoiceService.updateInvoice(req.user!, Number(req.params.id), req.body));
    } catch (e) { next(e); }
});

financeRouter.delete('/invoices/:id', requireAuth, (req, res, next) => {
    try {
        InvoiceService.deleteInvoice(req.user!, Number(req.params.id));
        res.json({ success: true });
    } catch (e) { next(e); }
});

// ── Payments ──
financeRouter.post('/payments', requireAuth, (req, res, next) => {
    try {
        res.status(201).json(PaymentService.createPayment(req.user!, req.body));
    } catch (e) { next(e); }
});

financeRouter.put('/payments/:id', requireAuth, (req, res, next) => {
    try {
        res.json(PaymentService.updatePayment(req.user!, Number(req.params.id), req.body));
    } catch (e) { next(e); }
});
 
 
