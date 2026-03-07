// ── Jobs Page ───────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { JobKanban } from '../features/jobs/JobKanban';
import { JobList } from '../features/jobs/JobList';
import { JobForm } from '../features/jobs/JobForm';
import { Button } from '../shared/Button';
import { cn } from '../utils.ts';
import { useApp } from '../contexts/AppContext';
import { TableSkeleton } from '../components/ui/Skeleton';

export function JobsPage() {
    const { isLoading } = useApp();
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [showForm, setShowForm] = useState(false);

    if (isLoading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Jobs</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your pipeline from lead to completion</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setView('kanban')}
                            className={cn('p-2 rounded-md transition-colors cursor-pointer', view === 'kanban' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white')}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={cn('p-2 rounded-md transition-colors cursor-pointer', view === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white')}
                        >
                            <List size={16} />
                        </button>
                    </div>
                    <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>New Job</Button>
                </div>
            </div>

            {/* View */}
            {view === 'kanban' ? <JobKanban /> : <JobList />}

            {/* Form modal */}
            <JobForm open={showForm} onClose={() => setShowForm(false)} />
        </div>
    );
}
