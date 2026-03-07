// ── Task Board (Kanban by status) ───────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, User, Briefcase, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import type { Task, TaskStatus as TStatus } from '../../types.ts';
import { Badge } from '../../shared/Badge';
import { cn, truncate, timeAgo } from '../../utils.ts';

const STATUS_COLS: { key: TStatus; label: string; color: string }[] = [
    { key: 'todo', label: 'To Do', color: '#74B9FF' },
    { key: 'in_progress', label: 'In Progress', color: '#A29BFE' },
    { key: 'waiting_on', label: 'Waiting On', color: '#FDCB6E' },
    { key: 'done', label: 'Done', color: '#2ED573' },
];

const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#FF6B6B',
    high: '#E17055',
    medium: '#FDCB6E',
    low: '#74B9FF',
};

export function TaskBoard({ onTaskClick }: { onTaskClick?: (task: Task) => void }) {
    const { tasks, refreshTasks } = useApp();
    const { addToast } = useUI();
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

    const tasksByStatus = useMemo(() => {
        const map: Record<string, Task[]> = {};
        STATUS_COLS.forEach(s => { map[s.key] = []; });
        tasks.forEach(t => {
            if (map[t.status]) map[t.status].push(t);
            else map['todo'].push(t);
        });
        return map;
    }, [tasks]);

    const handleDrop = async (e: React.DragEvent, status: TStatus) => {
        e.preventDefault();
        setDragOverStatus(null);
        if (!draggedTask || draggedTask.status === status) return;
        try {
            await api.updateTask(draggedTask.id, { status });
            await refreshTasks();
            addToast(`Task moved to ${STATUS_COLS.find(s => s.key === status)?.label}`, 'success');
        } catch { addToast('Failed to move task', 'error'); }
        setDraggedTask(null);
    };

    const handleDelete = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.deleteTask(taskId);
            addToast('Task deleted successfully', 'success');
            await refreshTasks();
        } catch { addToast('Failed to delete task', 'error'); }
    };

    return (
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-0 flex-1">
            {STATUS_COLS.map(col => {
                const colTasks = tasksByStatus[col.key] || [];
                return (
                    <div
                        key={col.key}
                        className={cn(
                            'flex flex-col shrink-0 w-[300px] bg-white/[0.02] rounded-xl border border-white/5 transition-all',
                            dragOverStatus === col.key && 'border-blue-500/40 bg-blue-500/5'
                        )}
                        onDragOver={e => { e.preventDefault(); setDragOverStatus(col.key); }}
                        onDragLeave={() => setDragOverStatus(null)}
                        onDrop={e => handleDrop(e, col.key)}
                    >
                        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                            <span className="text-sm font-medium text-white">{col.label}</span>
                            <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto">{colTasks.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-[80px]">
                            {colTasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    layout
                                    draggable
                                    onDragStart={() => setDraggedTask(task)}
                                    onDragEnd={() => setDraggedTask(null)}
                                    onClick={() => onTaskClick && onTaskClick(task)}
                                    className={cn(
                                        'bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all group relative',
                                        draggedTask?.id === task.id && 'opacity-40'
                                    )}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete Task"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex items-start justify-between gap-2 pr-6">
                                        <p className="text-sm font-medium text-white">{truncate(task.title, 40)}</p>
                                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium }} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-gray-500">
                                        {task.jobName && <span className="flex items-center gap-1"><Briefcase size={10} />{truncate(task.jobName, 15)}</span>}
                                        {task.assignedTo && <span className="flex items-center gap-1"><User size={10} />{task.assignedTo}</span>}
                                        {task.scheduledDate && <span className="flex items-center gap-1"><Calendar size={10} />{task.scheduledDate}</span>}
                                        {task.priority === 'urgent' && <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10} />Urgent</span>}
                                    </div>
                                    {task.action && task.action !== 'other' && (
                                        <Badge color={col.color} size="sm" className="mt-2 capitalize">{task.action}</Badge>
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
