import React from 'react';
import { DollarSign, ClipboardList, MapPin } from 'lucide-react';
import { Card } from '../../../shared/Card';
import { type Job } from '../../../types.ts';
import { formatCurrency, cn } from '../../../utils.ts';

interface JobInfoPanelsProps {
    job: Job;
}

export function JobInfoPanels({ job }: JobInfoPanelsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Financials & Dates */}
            <Card className="border-white/10" padding="none">
                <div className="px-4 py-3 border-b border-white/5 bg-emerald-500/5">
                    <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2"><DollarSign size={16} /> Financials</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    <InfoCard label="Est. / Contract" value={job.contractAmount ? formatCurrency(job.contractAmount) : (job.estimatedValue ? formatCurrency(job.estimatedValue) : '—')} />
                    <InfoCard label="Amount Paid" value={job.amountPaid ? formatCurrency(job.amountPaid) : '—'} />
                    <InfoCard label="Balance Due" value={formatCurrency((job.contractAmount || job.estimatedValue || 0) - (job.amountPaid || 0))} className="text-rose-400" />
                    <InfoCard label="Actual Cost" value={job.actualCost ? formatCurrency(job.actualCost) : '—'} />
                </div>
            </Card>

            {/* Project Specifics */}
            <Card className="border-white/10" padding="none">
                <div className="px-4 py-3 border-b border-white/5 bg-blue-500/5">
                    <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2"><ClipboardList size={16} /> Specifics</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    <InfoCard label="Job Type" value={job.type} />
                    <InfoCard label="Trades" value={job.trades || job.roofType || 'Roofing'} />
                    <InfoCard label="Specs" value={job.squareFootage ? `${job.squareFootage} SQ` : '—'} />
                    <InfoCard label="Sales Rep" value={job.assignedTo || 'Unassigned'} />
                </div>
            </Card>

            {/* Logistics */}
            <Card className="border-white/10" padding="none">
                <div className="px-4 py-3 border-b border-white/5 bg-amber-500/5">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><MapPin size={16} /> Logistics</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    <InfoCard label="Insurance Claim" value={job.insuranceClaim || '—'} />
                    <InfoCard label="Permit #" value={job.permitNumber || '—'} />
                    <InfoCard label="Gate Code" value={job.gateCode || '—'} />
                    <InfoCard label="Lockbox" value={job.lockboxCode || '—'} />
                </div>
            </Card>
        </div>
    );
}

function InfoCard({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={cn("text-sm text-white mt-0.5 capitalize font-medium", className)}>{value}</p>
        </div>
    );
}
 
