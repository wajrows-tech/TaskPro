// ── Dashboard Page ──────────────────────────────────────────────────────────
import React from 'react';
import { Briefcase, Users, ClipboardList, DollarSign, MessageSquare, TrendingUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useUI } from '../contexts/UIContext';
import { StatCard } from '../shared/Card';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { JOB_STAGES } from '../types.ts';
import { formatCurrency, timeAgo, truncate } from '../utils.ts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SuggestionsPanel } from '../features/ai/SuggestionsPanel.tsx';
import { DashboardSkeleton } from '../components/ui/Skeleton';

export function DashboardPage() {
    const { stats, jobs, tasks, communications, isLoading } = useApp();
    const { navigate } = useUI();

    const recentJobs = [...jobs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
    const urgentTasks = tasks.filter(t => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')).slice(0, 5);
    const recentComms = [...communications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    const stageData = stats?.jobsByStage?.map(s => {
        const config = JOB_STAGES.find(j => j.key === s.stage);
        return { name: config?.label || s.stage, count: s.count, color: config?.color || '#636E72' };
    }) || [];

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="p-6 flex flex-col gap-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Overview of your CRM pipeline</p>
            </div>

            <SuggestionsPanel />

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Active Jobs" value={stats?.activeJobs || 0} icon={<Briefcase size={20} />} color="#6C5CE7" />
                <StatCard label="Pipeline Value" value={formatCurrency(stats?.pipelineValue || 0)} icon={<DollarSign size={20} />} color="#00B894" />
                <StatCard label="Revenue Collected" value={formatCurrency(stats?.revenueCollected || 0)} icon={<TrendingUp size={20} />} color="#2ED573" />
                <StatCard label="Open Tasks" value={stats?.openTasks || 0} icon={<ClipboardList size={20} />} color="#E17055" />
                <StatCard label="Contacts" value={stats?.totalContacts || 0} icon={<Users size={20} />} color="#74B9FF" />
            </div>

            {/* Pipeline chart & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Pipeline by Stage</h2>
                    {stageData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stageData}>
                                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {stageData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No pipeline data</div>
                    )}
                </Card>

                <Card>
                    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Sales Performance</h2>
                    <div className="flex flex-col gap-3 h-[200px] overflow-y-auto pr-2">
                        {stats?.repPerformance && stats.repPerformance.length > 0 ? (
                            stats.repPerformance.map((rep, idx) => (
                                <div key={idx} className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-white">{rep.repName}</span>
                                        <span className="text-sm font-semibold text-emerald-400">{formatCurrency(rep.pipelineValue)}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500">{rep.jobCount} Jobs</span>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center">
                                No rep data available.<br />Assign jobs to sales reps.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Three-column details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent jobs */}
                <Card>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent Jobs</h3>
                        <button onClick={() => navigate('jobs')} className="text-xs text-blue-400 hover:underline cursor-pointer">View all</button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {recentJobs.map(job => {
                            const stage = JOB_STAGES.find(s => s.key === job.stage);
                            return (
                                <div key={job.id} onClick={() => navigate('job-detail', { jobId: job.id })} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage?.color }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{job.name}</p>
                                        <p className="text-[10px] text-gray-500">{timeAgo(job.updatedAt)}</p>
                                    </div>
                                    <Badge color={stage?.color} size="sm">{stage?.label}</Badge>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Urgent tasks */}
                <Card>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Priority Tasks</h3>
                        <button onClick={() => navigate('tasks')} className="text-xs text-blue-400 hover:underline cursor-pointer">View all</button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {urgentTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.priority === 'urgent' ? '#FF6B6B' : '#E17055' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{task.title}</p>
                                    <p className="text-[10px] text-gray-500">{task.jobName || 'No job'}</p>
                                </div>
                                <Badge color={task.priority === 'urgent' ? '#FF6B6B' : '#E17055'} size="sm">{task.priority}</Badge>
                            </div>
                        ))}
                        {urgentTasks.length === 0 && <p className="text-xs text-gray-600 py-4 text-center">No urgent tasks</p>}
                    </div>
                </Card>

                {/* Recent activity */}
                <Card>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent Activity</h3>
                        <button onClick={() => navigate('communications')} className="text-xs text-blue-400 hover:underline cursor-pointer">View all</button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {recentComms.map(comm => (
                            <div key={comm.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <MessageSquare size={14} className="text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{comm.subject || comm.channel}</p>
                                    <p className="text-[10px] text-gray-500">{truncate(comm.body, 40)}</p>
                                </div>
                                <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(comm.createdAt)}</span>
                            </div>
                        ))}
                        {recentComms.length === 0 && <p className="text-xs text-gray-600 py-4 text-center">No activity yet</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
}
