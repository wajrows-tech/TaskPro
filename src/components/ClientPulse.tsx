// @ts-nocheck
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Heart, Flame, Snowflake, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';
import { Job, Task } from '../types.ts';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '../utils.ts';

interface ClientPulseProps {
    jobs: Job[];
    tasks: Task[];
    onClientClick: (c: Job) => void;
    onDraftCheckIn: (c: Job) => void;
}

type PulseStatus = 'hot' | 'warm' | 'cold' | 'risk';

interface PulseScore {
    Job: Job;
    score: number;
    status: PulseStatus;
    openTasks: number;
    daysSinceCreated: number;
    label: string;
    emoji: string;
    color: string;
    bg: string;
}

const STATUS_MAP: Record<PulseStatus, { label: string; emoji: string; color: string; bg: string; icon: any }> = {
    hot: { label: 'Hot', emoji: 'ðŸ”¥', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: Flame },
    warm: { label: 'Active', emoji: 'âœ…', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    cold: { label: 'Cold', emoji: 'ðŸ§Š', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Snowflake },
    risk: { label: 'At Risk', emoji: 'âš ï¸', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertTriangle },
};

function computePulse(Job: Job, tasks: Task[]): PulseScore {
    const clientTasks = tasks.filter(t => t.jobId === Job.id);
    const openTasks = clientTasks.filter(t => t.status !== 'done').length;
    const doneTasks = clientTasks.filter(t => t.status === 'done').length;
    const totalTasks = clientTasks.length;
    const completionRate = totalTasks > 0 ? doneTasks / totalTasks : 0;
    const daysSinceCreated = differenceInDays(new Date(), parseISO(Job.createdAt));
    const hasPromises = !!(Job.promises && Job.promises.trim());
    const hasDeliverables = !!(Job.deliverables && Job.deliverables.trim());

    // Score 0-100: higher = more engaged / healthier
    let score = 50;
    score -= Math.min(daysSinceCreated * 0.5, 30); // activity decay
    score += completionRate * 30;
    score += openTasks > 0 ? 10 : -10; // active work = good
    if (hasPromises) score += 5;
    if (hasDeliverables) score += 5;
    if (Job.stage === 'high') score -= 15; // high urgency & delayed = risk
    score = Math.max(0, Math.min(100, score));

    let status: PulseStatus;
    if (score >= 70) status = 'hot';
    else if (score >= 45) status = 'warm';
    else if (openTasks === 0 && daysSinceCreated > 14) status = 'cold';
    else status = 'risk';

    const cfg = STATUS_MAP[status];
    return { Job, score, status, openTasks, daysSinceCreated, ...cfg };
}

export function ClientPulse({ jobs, tasks, onClientClick, onDraftCheckIn }: ClientPulseProps) {
    const scores = useMemo(() =>
        jobs.map(c => computePulse(c, tasks))
            .sort((a, b) => {
                const order: PulseStatus[] = ['risk', 'cold', 'hot', 'warm'];
                return order.indexOf(a.status) - order.indexOf(b.status);
            }),
        [jobs, tasks]
    );

    if (jobs.length === 0) {
        return (
            <div className="text-center py-6 text-gray-300 font-serif italic text-sm">
                No jobs yet â€” add one to track relationship health
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {scores.slice(0, 5).map(({ Job, score, status, openTasks, daysSinceCreated, emoji, label, color, bg }, i) => {
                const cfg = STATUS_MAP[status];
                const Icon = cfg.action;
                return (
                    <motion.div key={Job.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn('flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer hover:shadow-sm transition-all', bg)}
                        onClick={() => onClientClick(Job)}
                    >
                        {/* Status badge */}
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base')}>
                            <span>{emoji}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs truncate text-[#1A1A2E]">{Job.name}</div>
                            <div className={cn('text-[9px] font-mono', color)}>
                                {label} Â· {openTasks} open task{openTasks !== 1 ? 's' : ''} Â· {daysSinceCreated}d
                            </div>
                        </div>

                        {/* Score ring */}
                        <div className="relative shrink-0 w-7 h-7">
                            <svg width="28" height="28" className="-rotate-90">
                                <circle cx="14" cy="14" r="11" fill="transparent" stroke="rgba(0,0,0,0.08)" strokeWidth="3" />
                                <circle cx="14" cy="14" r="11" fill="transparent"
                                    stroke={status === 'hot' ? '#f97316' : status === 'warm' ? '#22c55e' : status === 'cold' ? '#3b82f6' : '#ef4444'}
                                    strokeWidth="3" strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 11}
                                    strokeDashoffset={2 * Math.PI * 11 * (1 - score / 100)}
                                />
                            </svg>
                        </div>

                        {/* Check-in button */}
                        <button onClick={e => { e.stopPropagation(); onDraftCheckIn(Job); }}
                            className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors"
                            title="Draft AI check-in">
                            <MessageSquare size={11} className="opacity-50" />
                        </button>
                    </motion.div>
                );
            })}
            {scores.length > 5 && (
                <p className="text-[9px] font-mono opacity-30 text-center">+{scores.length - 5} more jobs</p>
            )}
        </div>
    );
}
