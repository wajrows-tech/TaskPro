// ── Estimates Page ──────────────────────────────────────────────────────────
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useUI } from '../contexts/UIContext';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { EmptyState } from '../shared/EmptyState';
import { formatCurrency, timeAgo } from '../utils.ts';
import { FileText } from 'lucide-react';

export function EstimatesPage() {
    const { jobs } = useApp();
    const { navigate } = useUI();

    // Estimates are loaded per-job, so show jobs that have them
    return (
        <div className="p-6 flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white">Estimates</h1>
                <p className="text-sm text-gray-500 mt-0.5">Create and manage job estimates</p>
            </div>

            <p className="text-sm text-gray-400">
                Estimates are created from individual job detail pages. Select a job below to create or view estimates.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {jobs.filter(j => j.estimatedValue > 0).map(job => (
                    <Card key={job.id} hover onClick={() => navigate('job-detail', { jobId: job.id })} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <FileText size={18} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{job.name}</p>
                            <p className="text-xs text-gray-500">{job.jobNumber}</p>
                        </div>
                        <span className="text-sm font-medium text-emerald-400">{formatCurrency(job.estimatedValue)}</span>
                    </Card>
                ))}
            </div>

            {jobs.filter(j => j.estimatedValue > 0).length === 0 && (
                <EmptyState title="No estimates yet" description="Create estimates from job detail pages" icon={<FileText size={32} />} />
            )}
        </div>
    );
}
 
 
