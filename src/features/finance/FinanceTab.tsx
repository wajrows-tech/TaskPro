import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Plus, FileSignature, CreditCard } from 'lucide-react';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';
import { type Contract, type Invoice, type Payment } from '../../types.ts';
import { timeAgo, formatCurrency } from '../../utils.ts';

interface FinanceTabProps {
    jobId: number;
}

export function FinanceTab({ jobId }: FinanceTabProps) {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [jobId]);

    const loadData = async () => {
        try {
            const token = localStorage.getItem('taskpro_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [cRes, iRes] = await Promise.all([
                fetch(`/api/jobs/${jobId}/contracts`, { headers }),
                fetch(`/api/jobs/${jobId}/invoices`, { headers })
            ]);

            if (cRes.ok) setContracts(await cRes.json());
            if (iRes.ok) setInvoices(await iRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading financials...</div>;

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => {
        const paid = inv.payments?.filter(p => p.status === 'completed').reduce((pSum, p) => pSum + p.amount, 0) || 0;
        return sum + paid;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md" className="bg-gray-900 shadow-sm border-gray-800">
                    <p className="text-sm text-gray-400 mb-1">Contract Total</p>
                    <p className="text-2xl font-semibold text-white">
                        {formatCurrency(contracts.reduce((sum, c) => sum + c.totalAmount, 0))}
                    </p>
                </Card>
                <Card padding="md" className="bg-gray-900 shadow-sm border-gray-800">
                    <p className="text-sm text-gray-400 mb-1">Total Invoiced</p>
                    <p className="text-2xl font-semibold text-white">{formatCurrency(totalInvoiced)}</p>
                </Card>
                <Card padding="md" className="bg-gray-900 shadow-sm border-gray-800">
                    <p className="text-sm text-gray-400 mb-1">Amount Paid</p>
                    <p className="text-2xl font-semibold text-emerald-400">{formatCurrency(totalPaid)}</p>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <FileSignature size={18} className="text-blue-400" />
                        Contracts
                    </h3>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />}>New Contract</Button>
                </div>
                {contracts.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 text-sm">No contracts generated yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {contracts.map(contract => (
                            <Card key={contract.id} padding="sm" className="flex items-center justify-between bg-gray-900/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color={contract.status === 'signed' ? '#2ED573' : '#FdcB6E'}>{contract.status}</Badge>
                                        <span className="text-white font-medium">{formatCurrency(contract.totalAmount)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Created {timeAgo(contract.createdAt)}</div>
                                </div>
                                <Button size="sm" variant="ghost">View PDF</Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <FileText size={18} className="text-emerald-400" />
                        Invoices & Payments
                    </h3>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />}>New Invoice</Button>
                </div>
                {invoices.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 text-sm">No invoices sent yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {invoices.map(invoice => (
                            <Card key={invoice.id} padding="md" className="bg-gray-900/50">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-medium">Invoice #{invoice.id.toString().padStart(4, '0')}</span>
                                            <Badge color={
                                                invoice.status === 'paid' ? '#2ED573' :
                                                    invoice.status === 'overdue' ? '#FF6B6B' : '#74B9FF'
                                            }>{invoice.status}</Badge>
                                        </div>
                                        <div className="text-xs text-gray-500 flex gap-3">
                                            <span>Amount: {formatCurrency(invoice.amount)}</span>
                                            {invoice.dueDate && <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <Button size="sm" variant="primary" icon={<CreditCard size={14} />}>Record Payment</Button>
                                </div>

                                {invoice.payments && invoice.payments.length > 0 && (
                                    <div className="pl-4 border-l-2 border-gray-800 space-y-2">
                                        {invoice.payments.map(payment => (
                                            <div key={payment.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={12} className="text-gray-500" />
                                                    <span className="text-gray-300 capitalize">{payment.method.replace('_', ' ')}</span>
                                                    <span className="text-gray-500 text-xs">({timeAgo(payment.createdAt)})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-emerald-400">{formatCurrency(payment.amount)}</span>
                                                    <Badge size="sm" color={payment.status === 'completed' ? '#2ED573' : '#FDCB6E'}>{payment.status}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
 
 
