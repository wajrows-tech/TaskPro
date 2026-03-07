// ── Job List View ───────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Filter } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { JOB_STAGES, type Job, type JobStage } from '../../types.ts';
import { Badge } from '../../shared/Badge';
import { Input } from '../../shared/Input';
import { formatCurrency, timeAgo } from '../../utils.ts';
import { cn } from '../../utils.ts';

export function JobList() {
    const { jobs } = useApp();
    const { navigate } = useUI();
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState<JobStage | 'all'>('all');
    const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'estimatedValue'>('updatedAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const filtered = useMemo(() => {
        let result = [...jobs];
        if (stageFilter !== 'all') result = result.filter(j => j.stage === stageFilter);
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(j =>
                j.name.toLowerCase().includes(q) ||
                j.jobNumber.toLowerCase().includes(q) ||
                j.address?.toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            let cmp = 0;
            if (sortField === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortField === 'estimatedValue') cmp = (a.estimatedValue || 0) - (b.estimatedValue || 0);
            else cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            return sortDir === 'desc' ? -cmp : cmp;
        });
        return result;
    }, [jobs, search, stageFilter, sortField, sortDir]);

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const stageConfig = (stage: string) => JOB_STAGES.find(s => s.key === stage);

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    <FilterPill active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>All</FilterPill>
                    {JOB_STAGES.slice(0, 8).map(s => (
                        <FilterPill key={s.key} active={stageFilter === s.key} onClick={() => setStageFilter(s.key)} color={s.color}>
                            {s.label}
                        </FilterPill>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <SortHeader label="Job" active={sortField === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Stage</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Type</th>
                            <SortHeader label="Value" active={sortField === 'estimatedValue'} dir={sortDir} onClick={() => toggleSort('estimatedValue')} />
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Assigned</th>
                            <SortHeader label="Updated" active={sortField === 'updatedAt'} dir={sortDir} onClick={() => toggleSort('updatedAt')} />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(job => {
                            const stage = stageConfig(job.stage);
                            return (
                                <tr
                                    key={job.id}
                                    onClick={() => navigate('job-detail', { jobId: job.id })}
                                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <div>
                                            <span className="text-sm font-medium text-white">{job.name}</span>
                                            <span className="text-xs text-gray-500 ml-2">{job.jobNumber}</span>
                                        </div>
                                        {job.address && <p className="text-[11px] text-gray-500 mt-0.5">{job.address}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge color={stage?.color}>{stage?.label || job.stage}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-400 capitalize">{job.type}</td>
                                    <td className="px-4 py-3 text-sm text-emerald-400">{job.estimatedValue ? formatCurrency(job.estimatedValue) : '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-400">{job.assignedTo || '—'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(job.updatedAt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No jobs found</div>
                )}
            </div>
        </div>
    );
}

function FilterPill({ children, active, onClick, color }: { children: React.ReactNode; active: boolean; onClick: () => void; color?: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
                active
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
            )}
        >
            {color && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />}
            {children}
        </button>
    );
}

function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: string; onClick: () => void }) {
    return (
        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-300 transition-colors" onClick={onClick}>
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown size={12} className={active ? 'text-blue-400' : 'opacity-30'} />
            </span>
        </th>
    );
}
