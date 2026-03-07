// ── Job Kanban Board ────────────────────────────────────────────────────────
// Drag-and-drop pipeline board inspired by AccuLynx
import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, GripVertical, DollarSign, MapPin, User } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { JOB_STAGES, type Job, type JobStage } from '../../types.ts';
import { api } from '../../services/api.ts';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { formatCurrency, truncate } from '../../utils.ts';
import { cn } from '../../utils.ts';

export function JobKanban() {
    const { jobs, refreshJobs, refreshStats } = useApp();
    const { navigate, addToast } = useUI();
    const [draggedJob, setDraggedJob] = useState<Job | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);

    const jobsByStage = JOB_STAGES.reduce((acc, stage) => {
        acc[stage.key] = jobs.filter(j => j.stage === stage.key);
        return acc;
    }, {} as Record<string, Job[]>);

    const handleDragStart = useCallback((e: React.DragEvent, job: Job) => {
        setDraggedJob(job);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
        e.preventDefault();
        setDragOverStage(stage);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, stage: JobStage) => {
        e.preventDefault();
        setDragOverStage(null);
        if (!draggedJob || draggedJob.stage === stage) return;
        try {
            await api.updateJob(draggedJob.id, { stage });
            await Promise.all([refreshJobs(), refreshStats()]);
            addToast(`Moved "${truncate(draggedJob.name, 20)}" to ${JOB_STAGES.find(s => s.key === stage)?.label}`, 'success');
        } catch (err) {
            addToast('Failed to move job', 'error');
        }
        setDraggedJob(null);
    }, [draggedJob, refreshJobs, refreshStats, addToast]);

    // Show only active pipeline stages (exclude closed/canceled/archived for the board)
    const visibleStages = JOB_STAGES.filter(s => !['closed', 'canceled'].includes(s.key));

    return (
        <div className="flex gap-3 overflow-x-auto pb-4 px-1 min-h-0 flex-1">
            {visibleStages.map(stage => {
                const stageJobs = jobsByStage[stage.key] || [];
                const stageValue = stageJobs.reduce((sum, j) => sum + (j.estimatedValue || 0), 0);
                return (
                    <div
                        key={stage.key}
                        className={cn(
                            'flex flex-col shrink-0 w-[280px] bg-white/[0.02] rounded-xl border border-white/5',
                            'transition-all duration-200',
                            dragOverStage === stage.key && 'border-blue-500/40 bg-blue-500/5'
                        )}
                        onDragOver={e => handleDragOver(e, stage.key)}
                        onDragLeave={() => setDragOverStage(null)}
                        onDrop={e => handleDrop(e, stage.key)}
                    >
                        {/* Column header */}
                        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            <span className="text-sm font-medium text-white truncate">{stage.label}</span>
                            <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto">
                                {stageJobs.length}
                            </span>
                        </div>
                        {stageValue > 0 && (
                            <div className="px-3 py-1.5 text-[10px] text-gray-500 border-b border-white/5">
                                {formatCurrency(stageValue)}
                            </div>
                        )}

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-[100px]">
                            {stageJobs.map(job => (
                                <motion.div
                                    key={job.id}
                                    layout
                                    draggable
                                    onDragStart={e => handleDragStart(e as unknown as React.DragEvent, job)}
                                    onDragEnd={() => setDraggedJob(null)}
                                    onClick={() => navigate('job-detail', { jobId: job.id })}
                                    className={cn(
                                        'bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg p-3 cursor-grab active:cursor-grabbing',
                                        'transition-all duration-150 group',
                                        draggedJob?.id === job.id && 'opacity-40'
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <GripVertical size={14} className="text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{job.name}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{job.jobNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {job.estimatedValue > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                                                <DollarSign size={10} />{formatCurrency(job.estimatedValue)}
                                            </span>
                                        )}
                                        {job.address && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 truncate">
                                                <MapPin size={10} />{truncate(job.address, 18)}
                                            </span>
                                        )}
                                        {job.assignedTo && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                                                <User size={10} />{job.assignedTo}
                                            </span>
                                        )}
                                    </div>
                                    {job.type && job.type !== 'residential' && (
                                        <Badge color={stage.color} size="sm" className="mt-2">{job.type}</Badge>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
