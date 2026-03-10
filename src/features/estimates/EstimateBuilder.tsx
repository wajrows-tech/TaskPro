// ── Estimate Builder ────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import { Modal } from '../../shared/Modal';
import { Input, Textarea } from '../../shared/Input';
import { Button } from '../../shared/Button';
import { formatCurrency } from '../../utils.ts';

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface EstimateBuilderProps {
    open: boolean;
    onClose: () => void;
    jobId: number;
}

export function EstimateBuilder({ open, onClose, jobId }: EstimateBuilderProps) {
    const { refreshJobs } = useApp();
    const { addToast } = useUI();
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [taxRate, setTaxRate] = useState(8.5);
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);

    const updateItem = (index: number, field: keyof LineItem, value: any) => {
        setLineItems(prev => {
            const items = [...prev];
            items[index] = { ...items[index], [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
                items[index].total = items[index].quantity * items[index].unitPrice;
            }
            return items;
        });
    };

    const addItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const removeItem = (index: number) => setLineItems(prev => prev.filter((_, i) => i !== index));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const handleSubmit = async () => {
        const validItems = lineItems.filter(i => i.description.trim());
        if (validItems.length === 0) return addToast('Add at least one line item', 'error');
        setSaving(true);
        try {
            await api.createEstimate(jobId, {
                lineItems: JSON.stringify(validItems),
                subtotal,
                tax,
                total,
                notes,
                status: 'draft',
            });
            addToast('Estimate created', 'success');
            await refreshJobs();
            onClose();
        } catch (err) {
            addToast('Failed to create estimate', 'error');
        }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={onClose} title="New Estimate" size="xl">
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                    <span>Description</span><span>Qty</span><span>Unit Price</span><span>Total</span><span />
                </div>

                {/* Line items */}
                {lineItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 items-center">
                        <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" />
                        <Input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                        <Input type="number" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} placeholder="0.00" />
                        <span className="text-sm text-emerald-400 px-2">{formatCurrency(item.total)}</span>
                        <button onClick={() => removeItem(i)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors cursor-pointer" disabled={lineItems.length <= 1}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addItem} className="self-start">Add Line Item</Button>

                {/* Totals */}
                <div className="border-t border-white/10 pt-4 mt-2">
                    <div className="flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-8 text-sm">
                            <span className="text-gray-400">Subtotal</span>
                            <span className="text-white font-medium w-28 text-right">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">Tax</span>
                            <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-16 text-right !py-1 !px-2 text-xs" />
                            <span className="text-gray-400">%</span>
                            <span className="text-white font-medium w-28 text-right">{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex items-center gap-8 text-base font-bold border-t border-white/10 pt-2 mt-1">
                            <span className="text-white">Total</span>
                            <span className="text-emerald-400 w-28 text-right">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Terms, conditions, or notes..." />

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button icon={<DollarSign size={16} />} onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Creating...' : 'Create Estimate'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
 
 
