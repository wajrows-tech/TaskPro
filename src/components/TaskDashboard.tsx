// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus, Layers, Zap, Trash2, CheckCircle2, Circle, Clock,
    Leaf, TreePine, Bird, Flame, Wind, Sun, Flower2, Sprout,
    AlertTriangle, Target, Sparkles, X, Hourglass, Archive,
    ArrowDownAZ, ArrowUpAZ, SortAsc, ChevronDown, ChevronUp
} from 'lucide-react';
import { FrogHunterPanel, generateFrogName } from './FrogHunterPanel';
import { DictationButton } from './DictationButton';
import { Task, Job, TaskStatus, TaskPriority, TaskAction, JobStage, Estimate } from '../types.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const ACTIONS: TaskAction[] = ['inspect', 'invoice', 'email', 'meeting', 'call', 'other'];
const STAGES: JobStage[] = ['inspection', 'claim_estimate', 'scope_approval', 'contract', 'production', 'supplement', 'invoice'];

// â”€â”€â”€ ACTION ICONS & COLORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACTION_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
    inspect: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    invoice: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    email: { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
    consult: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    call: { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    other: { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
};

const PRIORITY_CONFIG: Record<string, { stripe: string; dot: string; text: string; bg: string }> = {
    high: { stripe: 'bg-red-500', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
    medium: { stripe: 'bg-amber-400', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
    low: { stripe: 'bg-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    todo: { label: 'To Do', color: 'text-red-600', bg: 'bg-red-50' },
    in_progress: { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-50' },
    waiting_on: { label: 'Waiting On', color: 'text-orange-600', bg: 'bg-orange-50' },
    done: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

// â”€â”€â”€ ZEN DIAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ZenDial({ score }: { score: number }) {
    const radius = 80;
    const stroke = 10;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    // Color based on score
    const dialColor = score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444';
    const glowColor = score > 70 ? 'rgba(34,197,94,0.3)' : score > 40 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.3)';
    const moodLabel = score > 70 ? 'Zen Mode' : score > 40 ? 'Work Mode' : 'Crunch Mode';
    const moodIcon = score > 70 ? 'ðŸŒ¿' : score > 40 ? 'âš¡' : 'ðŸ”¥';

    return (
        <div className="relative flex items-center justify-center" style={{ width: radius * 2 + 20, height: radius * 2 + 20 }}>
            {/* Glow effect */}
            <div
                className="absolute rounded-full animate-pulse"
                style={{
                    width: radius * 2 - 10,
                    height: radius * 2 - 10,
                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                }}
            />

            {/* Nature particles when zen */}
            <AnimatePresence>
                {score > 70 && (
                    <>
                        {[Leaf, Sprout, Flower2, Bird, TreePine, Sun].map((Icon, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 0.6, 0],
                                    scale: [0.5, 1, 0.5],
                                    x: [0, Math.cos(i * 60 * Math.PI / 180) * 110],
                                    y: [0, Math.sin(i * 60 * Math.PI / 180) * 110],
                                }}
                                transition={{ duration: 4, delay: i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute text-emerald-400/60"
                            >
                                <Icon size={16} />
                            </motion.div>
                        ))}
                    </>
                )}

                {/* Fire particles when crunch */}
                {score <= 40 && (
                    <>
                        {[0, 1, 2, 3, 4].map(i => (
                            <motion.div
                                key={`fire-${i}`}
                                initial={{ opacity: 0, y: 0 }}
                                animate={{
                                    opacity: [0, 0.8, 0],
                                    y: [10, -30],
                                    x: [(i - 2) * 20, (i - 2) * 25],
                                }}
                                transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                                className="absolute text-red-400/50"
                                style={{ bottom: '20%' }}
                            >
                                <Flame size={14} />
                            </motion.div>
                        ))}
                    </>
                )}

                {/* Wind particles for work mode */}
                {score > 40 && score <= 70 && (
                    <>
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={`wind-${i}`}
                                initial={{ opacity: 0, x: -60 }}
                                animate={{
                                    opacity: [0, 0.5, 0],
                                    x: [-60, 60],
                                }}
                                transition={{ duration: 3, delay: i * 1, repeat: Infinity }}
                                className="absolute text-amber-300/40"
                            >
                                <Wind size={16} />
                            </motion.div>
                        ))}
                    </>
                )}
            </AnimatePresence>

            {/* SVG Dial */}
            <svg width={radius * 2 + 20} height={radius * 2 + 20} className="transform -rotate-90 relative z-10">
                {/* Background ring */}
                <circle
                    cx={radius + 10}
                    cy={radius + 10}
                    r={normalizedRadius}
                    fill="transparent"
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth={stroke}
                />
                {/* Progress arc */}
                <motion.circle
                    cx={radius + 10}
                    cy={radius + 10}
                    r={normalizedRadius}
                    fill="transparent"
                    stroke={dialColor}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                />
            </svg>

            {/* Center content */}
            <div className="absolute flex flex-col items-center z-20">
                <span className="text-3xl mb-1">{moodIcon}</span>
                <span className="text-2xl font-black text-[#1A1A2E] tracking-tighter">{Math.round(score)}%</span>
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 mt-0.5">{moodLabel}</span>
            </div>
        </div>
    );
}

// â”€â”€â”€ STAT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: number; icon: any; color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
                    <Icon size={18} className="text-white" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{label}</span>
            </div>
            <div className="text-3xl font-black text-[#1A1A2E] tracking-tighter">{value}</div>
        </motion.div>
    );
}

// â”€â”€â”€ Job CHIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ClientChip({ Job, taskCount, isActive, onClick, onNameClick }: {
    Job: Job; taskCount: number; isActive: boolean;
    onClick: () => void; onNameClick: (e: React.MouseEvent) => void;
}) {
    const urgencyDot = Job.stage === 'high' ? 'bg-red-500' : Job.stage === 'medium' ? 'bg-amber-400' : 'bg-emerald-400';

    return (
        <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap",
                isActive
                    ? "bg-[#1A1A2E] text-white border-[#1A1A2E] shadow-lg"
                    : "bg-white text-[#1A1A2E] border-gray-200 hover:border-gray-300 hover:shadow-sm"
            )}
        >
            {/* Avatar circle */}
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase",
                isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            )}>
                {Job.name.substring(0, 2)}
            </div>

            {/* Name â€” clickable for details */}
            <span
                className="text-sm font-medium cursor-pointer hover:underline"
                onClick={onNameClick}
            >
                {Job.name}
            </span>

            {/* Task count + urgency dot */}
            <div className="flex items-center gap-1.5 ml-1">
                <span className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                    isActive ? "bg-white/20" : "bg-gray-100"
                )}>
                    {taskCount}
                </span>
                <div className={cn("w-2 h-2 rounded-full", urgencyDot)} />
            </div>
        </motion.button>
    );
}

// â”€â”€â”€ TASK CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TaskCard({ task, onClick, onToggleStatus, onUpdateField, onDelete, onGetAdvice }: {
    task: Task;
    onClick: () => void;
    onToggleStatus: (e: React.MouseEvent) => void;
    onUpdateField: (field: keyof Task, value: any) => void;
    onDelete: (e: React.MouseEvent) => void;
    onGetAdvice: (e: React.MouseEvent) => void;
}) {
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const action = ACTION_CONFIG[task.action] || ACTION_CONFIG.other;
    const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
            className={`bg-white rounded-2xl border overflow-hidden cursor-pointer group relative border-gray-100`}
            onClick={onClick}
        >
            {/* Priority stripe */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", priority.stripe)} />

            <div className="p-5 pl-6">
                {/* Top row: status + action badge */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {/* Status toggle */}
                        <button
                            onClick={onToggleStatus}
                            className="transition-transform hover:scale-110"
                        >
                            {task.status === 'done' ? (
                                <CheckCircle2 size={20} className="text-emerald-500" />
                            ) : task.status === 'in_progress' ? (
                                <Clock size={18} className="text-amber-500" />
                            ) : (
                                <Circle size={18} className="text-gray-300 hover:text-gray-400" />
                            )}
                        </button>
                        <span className={cn("text-[10px] font-mono uppercase font-medium px-2 py-0.5 rounded-full border", status.color, status.bg)}>
                            {status.label}
                        </span>
                    </div>

                    {/* Action badge */}
                    <span className={cn("text-[10px] font-mono uppercase font-medium px-2.5 py-1 rounded-full border", action.color, action.bg, action.border)}>
                        {task.action}
                    </span>
                </div>

                {/* Title */}
                <h3 className={cn(
                    "text-base font-semibold text-[#1A1A2E] tracking-tight mb-1 leading-tight",
                    task.status === 'done' && "line-through opacity-40"
                )}>
                    {task.title}
                </h3>

                {/* Job name */}
                <p className="text-xs text-gray-400 font-mono uppercase tracking-wider mb-4">
                    {task.jobName || 'Unassigned'}
                </p>

                {/* Description preview */}
                {task.description && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                        {task.description}
                    </p>
                )}

                {/* Waiting On Indicator */}
                {task.waitingOn && (
                    <div className="flex items-start gap-1.5 mb-4 p-2 bg-amber-50 rounded-lg border border-amber-100/50">
                        <Hourglass size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[10px] text-amber-700 leading-tight">
                            <span className="font-bold uppercase mr-1">Waiting on:</span>
                            {task.waitingOn}
                        </span>
                    </div>
                )}

                {/* Blocked by prerequisite tasks */}
                {task.isBlocked && (
                    <div className="flex items-center gap-1.5 mb-4 p-2 bg-red-50 rounded-lg border border-red-200/60">
                        <span className="text-xs leading-none">ðŸ”’</span>
                        <span className="text-[10px] text-red-700 font-bold uppercase tracking-wide">Blocked</span>
                        <span className="text-[10px] text-red-500 opacity-70">â€” prereq not done</span>
                    </div>
                )}


                {/* Bottom: priority + actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", priority.dot)} />
                        <select
                            className="text-[10px] font-mono uppercase bg-transparent border-none focus:ring-0 cursor-pointer text-gray-400 hover:text-gray-600 -ml-1"
                            value={task.priority}
                            onClick={e => e.stopPropagation()}
                            onChange={e => onUpdateField('priority', e.target.value)}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={onGetAdvice} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors" title="AI Advice">
                            <Zap size={14} />
                        </button>
                        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// â”€â”€â”€ MAIN DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TaskDashboardProps {
    tasks: Task[];
    jobs: Job[];
    Estimates: Estimate[];
    isAiLoading: boolean;
    searchQuery: string;
    onAddTask: (e: React.FormEvent) => void;
    onBulkCreateTasks: (e: React.FormEvent) => void;
    onAddClient: (e: React.FormEvent) => void;
    onOpenClientDetails: (Job: Job) => void;
    onOpenTaskDetails: (task: Task) => void;
    onToggleTaskStatus: (task: Task) => void;
    onGetAdvice: (task: Task) => void;
    onUpdateTaskField: (taskId: number, field: keyof Task, value: any) => void;
    onDeleteTask: (task: Task) => void;
    onArchiveTask?: (task: Task) => void;
    onToggleFrog: (task: Task) => void;
    hallOfFame?: Array<{ id: number; taskTitle: string; frogName: string; jobName?: string; completedAt: string }>;
    // Form state
    newTask: any;
    setNewTask: (t: any) => void;
    newClient: any;
    setNewClient: (c: any) => void;
    bulkTaskInput: string;
    setBulkTaskInput: (v: string) => void;
    pendingClientId?: number | null;
    isAddingTask?: boolean;
}

type SortKey = 'priority' | 'created' | 'updated' | 'title' | 'Job' | 'status' | 'scheduled';

export function TaskDashboard({
    tasks, jobs, Estimates, isAiLoading, searchQuery,
    onAddTask, onBulkCreateTasks, onAddClient,
    onOpenClientDetails, onOpenTaskDetails, onToggleTaskStatus,
    onGetAdvice, onUpdateTaskField, onDeleteTask, onArchiveTask,
    onToggleFrog, hallOfFame = [],
    newTask, setNewTask, newClient, setNewClient,
    bulkTaskInput, setBulkTaskInput,
    pendingClientId, isAddingTask: externalIsAddingTask,
}: TaskDashboardProps) {
    const [filterClient, setFilterClient] = useState<number | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
    const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
    const [filterAction, setFilterAction] = useState<TaskAction | 'all'>('all');
    const [sortKey, setSortKey] = useState<SortKey>(
        () => (localStorage.getItem('taskpro_defaultSort') as SortKey) || 'priority'
    );
    const [sortDir, setSortDir] = useState<1 | -1>(-1);
    const [showArchived, setShowArchived] = useState(false);
    const [showNewTask, setShowNewTask] = useState(false);
    const [showBulkCreate, setShowBulkCreate] = useState(false);

    // Auto-open task form when triggered from Pipeline
    React.useEffect(() => {
        if (externalIsAddingTask || pendingClientId) {
            setShowNewTask(true);
            if (pendingClientId) {
                setNewTask((prev: any) => ({ ...prev, jobId: pendingClientId }));
            }
        }
    }, [externalIsAddingTask, pendingClientId]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 1 ? -1 : 1);
        else { setSortKey(key); setSortDir(-1); }
    };

    // â”€â”€ Computed stats â”€â”€
    const stats = useMemo(() => {
        const activeTasks = tasks.filter(t => t.status !== 'done');
        const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
        const completedToday = tasks.filter(t => {
            if (t.status !== 'done') return false;
            const updated = new Date(t.updatedAt || t.createdAt);
            const today = new Date();
            return updated.toDateString() === today.toDateString();
        });
        const overdue = tasks.filter(t => {
            if (t.status === 'done') return false;
            const lastUpdate = new Date(t.updatedAt || t.createdAt);
            const diffDays = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
            return diffDays > 3;
        });

        return { active: activeTasks.length, highPriority: highPriority.length, completed: completedToday.length, overdue: overdue.length };
    }, [tasks]);

    // â”€â”€ Zen score: higher = more zen â”€â”€
    const zenScore = useMemo(() => {
        if (tasks.length === 0) return 100;
        const doneRatio = tasks.filter(t => t.status === 'done').length / tasks.length;
        const highPenalty = stats.highPriority * 8;
        const overduePenalty = stats.overdue * 12;
        let score = Math.round(doneRatio * 100 - highPenalty - overduePenalty);
        return Math.max(0, Math.min(100, score));
    }, [tasks, stats]);

    // â”€â”€ Filtered + sorted tasks â”€â”€
    const filteredTasks = useMemo(() => {
        const showDoneBottom = localStorage.getItem('taskpro_showDoneAtBottom') !== 'false';
        let list = tasks.filter(task => {
            if ((task as any).archived && !showArchived) return false;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                task.title.toLowerCase().includes(searchLower) ||
                (task.jobName || '').toLowerCase().includes(searchLower) ||
                (task.description || '').toLowerCase().includes(searchLower) ||
                task.action.toLowerCase().includes(searchLower)
            );
            const matchesClient = filterClient === 'all' || task.jobId === filterClient;
            const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
            const matchesAction = filterAction === 'all' || task.action === filterAction;
            return matchesSearch && matchesClient && matchesStatus && matchesPriority && matchesAction;
        });

        // Sort
        list = [...list].sort((a, b) => {
            // Done always at bottom if setting on
            if (showDoneBottom) {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (b.status === 'done' && a.status !== 'done') return -1;
            }
            let av: any, bv: any;
            const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
            const STATUS_ORDER: Record<string, number> = { todo: 0, in_progress: 1, waiting_on: 2, done: 3 };
            switch (sortKey) {
                case 'priority': av = PRIORITY_ORDER[a.priority] ?? 1; bv = PRIORITY_ORDER[b.priority] ?? 1; break;
                case 'created': av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); break;
                case 'updated': av = new Date(a.updatedAt || a.createdAt).getTime(); bv = new Date(b.updatedAt || b.createdAt).getTime(); break;
                case 'title': av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break;
                case 'Job': av = (a.jobName || '').toLowerCase(); bv = (b.jobName || '').toLowerCase(); break;
                case 'status': av = STATUS_ORDER[a.status] ?? 0; bv = STATUS_ORDER[b.status] ?? 0; break;
                case 'scheduled': av = a.scheduledDate || 'zzzz'; bv = b.scheduledDate || 'zzzz'; break;
                default: av = 0; bv = 0;
            }
            return typeof av === 'string' ? av.localeCompare(bv) * sortDir : (av - bv) * sortDir;
        });

        return list;
    }, [tasks, searchQuery, filterClient, filterStatus, filterPriority, filterAction, sortKey, sortDir, showArchived]);

    // â”€â”€ Job task counts â”€â”€
    const clientTaskCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        tasks.forEach(t => {
            if (t.jobId) {
                counts[t.jobId] = (counts[t.jobId] || 0) + (t.status !== 'done' ? 1 : 0);
            }
        });
        return counts;
    }, [tasks]);

    const archivedCount = tasks.filter(t => (t as any).archived).length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* â”€â”€ HEADER â”€â”€ */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-serif italic tracking-tight text-[#1A1A2E]">Task Board</h2>
                    <p className="font-mono text-[10px] uppercase opacity-40 mt-1 tracking-widest">Your mission control center</p>
                </div>
                <div className="flex gap-2">
                    {archivedCount > 0 && (
                        <button
                            onClick={() => setShowArchived(v => !v)}
                            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors',
                                showArchived ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400')}
                        >
                            <Archive size={15} /> {showArchived ? 'Hide' : 'Archived'} ({archivedCount})
                        </button>
                    )}
                    <button
                        onClick={() => setShowNewTask(v => !v)}
                        className="flex items-center gap-2 bg-[#1A1A2E] text-white px-4 py-2.5 rounded-xl hover:bg-black transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} /> {showNewTask ? 'Cancel' : 'New Task'}
                    </button>
                    <button
                        onClick={() => setShowBulkCreate(true)}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Layers size={16} /> Bulk
                    </button>
                </div>
            </div>

            {/* â”€â”€ ZEN DIAL + STATS + FROG HUNTER ROW â”€â”€ */}
            <div className="flex items-stretch gap-4">
                {/* Left: ZenDial + small vertical StatCards */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <ZenDial score={zenScore} />
                    <div className="flex flex-col gap-2 min-w-[100px]">
                        {[
                            { label: 'Active', value: stats.active, icon: Target, color: 'bg-blue-500' },
                            { label: 'High Pri', value: stats.highPriority, icon: AlertTriangle, color: 'bg-red-500' },
                            { label: 'Done Today', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-500' },
                            { label: 'Overdue', value: stats.overdue, icon: Clock, color: 'bg-amber-500' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-1.5 shadow-sm">
                                <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center shrink-0', color)}>
                                    <Icon size={11} className="text-white" />
                                </div>
                                <div className="flex items-baseline gap-1.5 min-w-0">
                                    <span className="text-sm font-black text-[#1A1A2E] tabular-nums">{value}</span>
                                    <span className="text-[9px] font-mono uppercase opacity-40 truncate">{label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Most Wanted Hit List (4 slots) */}
                <div className="flex-1 bg-[#1A1A2E] rounded-2xl p-4 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                            ðŸŽ¯ Most Wanted
                        </span>
                        <span className="font-mono text-[8px] text-white/30 uppercase">Hit list</span>
                    </div>
                    <div className="space-y-2">
                        {tasks
                            .filter(t => t.status !== 'done')
                            .sort((a, b) => {
                                const p = { high: 0, medium: 1, low: 2 };
                                return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
                            })
                            .slice(0, 4)
                            .map((task, idx) => (
                                <div key={task.id}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 transition-colors group cursor-pointer"
                                    onClick={() => onOpenTaskDetails(task)}
                                >
                                    <span className="font-black text-white/20 text-xs tabular-nums w-4 shrink-0">#{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white leading-tight">{task.title}</p>
                                        {task.jobName && <p className="text-[9px] font-mono text-white/30">{task.jobName}</p>}
                                    </div>
                                    <span className={cn('text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full shrink-0',
                                        task.priority === 'high' ? 'bg-red-500/30 text-red-300' :
                                            task.priority === 'medium' ? 'bg-amber-500/30 text-amber-300' :
                                                'bg-emerald-500/30 text-emerald-300'
                                    )}>{task.priority}</span>
                                </div>
                            ))}
                        {tasks.filter(t => t.status !== 'done').length === 0 && (
                            <p className="text-center text-[9px] font-mono text-white/20 uppercase py-4">All Clear â€” No targets</p>
                        )}
                    </div>
                </div>

                {/* Right: Quick Stats Summary */}
                <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center">
                    <h4 className="font-mono text-[10px] uppercase tracking-widest opacity-40 mb-3">Task Breakdown</h4>
                    {ACTIONS.map(action => {
                        const count = tasks.filter(t => t.action === action && t.status !== 'done').length;
                        if (count === 0) return null;
                        const ac = ACTION_CONFIG[action];
                        return (
                            <button key={action}
                                onClick={() => setFilterAction(filterAction === action ? 'all' : action)}
                                className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors mb-0.5',
                                    filterAction === action ? 'bg-[#1A1A2E] text-white' : 'hover:bg-gray-50')}
                            >
                                <span className={cn('text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full', filterAction === action ? 'bg-white/20' : `${ac.bg} ${ac.color}`)}>
                                    {action}
                                </span>
                                <span className="ml-auto text-xs font-bold tabular-nums">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* â”€â”€ Job QUICK-FILTER BAR â”€â”€ */}
            {jobs.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-medium">Filter by Job</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFilterClient('all')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap text-sm font-medium",
                                filterClient === 'all'
                                    ? "bg-[#1A1A2E] text-white border-[#1A1A2E]"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            All jobs
                            <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md", filterClient === 'all' ? "bg-white/20" : "bg-gray-100")}>
                                {tasks.filter(t => t.status !== 'done').length}
                            </span>
                        </motion.button>

                        {jobs.map(Job => (
                            <ClientChip
                                key={Job.id}
                                Job={Job}
                                taskCount={clientTaskCounts[Job.id] || 0}
                                isActive={filterClient === Job.id}
                                onClick={() => setFilterClient(filterClient === Job.id ? 'all' : Job.id)}
                                onNameClick={(e) => {
                                    e.stopPropagation();
                                    onOpenClientDetails(Job);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* â”€â”€ FILTER + SORT ROW â”€â”€ */}
            <div className="flex gap-2 flex-wrap items-center">
                <select
                    className="text-xs font-mono uppercase bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
                    value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
                >
                    <option value="all">All Status</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on">Waiting On</option>
                    <option value="done">Done</option>
                </select>
                <select
                    className="text-xs font-mono uppercase bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
                    value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}
                >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] font-mono uppercase opacity-40 mr-1">Sort:</span>
                    {(['priority', 'status', 'created', 'updated', 'title', 'Job', 'scheduled'] as SortKey[]).map(k => (
                        <button key={k} onClick={() => toggleSort(k)}
                            className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase border transition-colors flex items-center gap-1',
                                sortKey === k ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400')}
                        >
                            {k}{sortKey === k && (sortDir === -1 ? ' â†“' : ' â†‘')}
                        </button>
                    ))}
                </div>
            </div>

            {/* â”€â”€ NEW TASK FORM (MODAL-STYLE SLIDE DOWN) â”€â”€ */}
            <AnimatePresence>
                {showNewTask && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
                        onSubmit={(e) => { onAddTask(e); setShowNewTask(false); }}
                    >
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-[#1A1A2E]">Create New Task</h3>
                                    <DictationButton
                                        type="task"
                                        onTranscriptFill={(data) => setNewTask({ ...newTask, ...data })}
                                    />
                                </div>
                                <button type="button" onClick={() => setShowNewTask(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                                    <input
                                        autoFocus
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                        value={newTask.title}
                                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                        placeholder="What needs to be done?"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Job</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                        value={newTask.jobId || ''}
                                        onChange={e => setNewTask({ ...newTask, jobId: e.target.value ? Number(e.target.value) : null })}
                                    >
                                        <option value="">No Job</option>
                                        {jobs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Action</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                        value={newTask.action}
                                        onChange={e => setNewTask({ ...newTask, action: e.target.value as TaskAction })}
                                    >
                                        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            {Estimates.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Template</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                        value={newTask.templateId || ''}
                                        onChange={e => setNewTask({ ...newTask, templateId: e.target.value ? Number(e.target.value) : null })}
                                    >
                                        <option value="">No Template (AI Suggested)</option>
                                        {Estimates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:border-black transition-all min-h-[80px]"
                                    value={newTask.description}
                                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                    placeholder="Describe the task..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowNewTask(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={!newTask.title}
                                    className="px-6 py-2.5 bg-[#1A1A2E] text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-black transition-colors"
                                >
                                    {isAiLoading && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Sparkles size={14} /></motion.div>}
                                    Create Task
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>



            {/* â”€â”€ BULK CREATE FORM â”€â”€ */}
            <AnimatePresence>
                {showBulkCreate && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white rounded-2xl border border-purple-200 shadow-lg overflow-hidden"
                        onSubmit={(e) => { onBulkCreateTasks(e); setShowBulkCreate(false); }}
                    >
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-[#1A1A2E]">Bulk Create Tasks</h3>
                                <button type="button" onClick={() => setShowBulkCreate(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase">Task Titles (one per line or comma-separated)</label>
                                <textarea
                                    autoFocus
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400 transition-all min-h-[100px] font-mono"
                                    value={bulkTaskInput}
                                    onChange={e => setBulkTaskInput(e.target.value)}
                                    placeholder={"Inspect roof damage\nSend initial estimate\nSchedule follow-up call"}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Job</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                        value={newTask.jobId || ''}
                                        onChange={e => setNewTask({ ...newTask, jobId: e.target.value ? Number(e.target.value) : null })}
                                    >
                                        <option value="">No Job</option>
                                        {jobs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowBulkCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isAiLoading || !bulkTaskInput.trim()}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-purple-700 transition-colors"
                                >
                                    {isAiLoading && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Sparkles size={14} /></motion.div>}
                                    Create All
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* â”€â”€ TASK CARDS GRID â”€â”€ */}
            <div>
                {filteredTasks.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"
                    >
                        <div className="text-4xl mb-4">ðŸŒ±</div>
                        <p className="text-lg font-serif italic text-gray-400 mb-2">All clear â€” nothing to do!</p>
                        <p className="text-sm text-gray-300">Create a new task to get started.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTasks.map(task => (
                            <div key={task.id} className="relative group/taskwrap">
                                <TaskCard
                                    task={task}
                                    onClick={() => {
                                        const Job = jobs.find(c => c.id === task.jobId);
                                        if (Job) onOpenClientDetails(Job);
                                        else onOpenTaskDetails(task);
                                    }}
                                    onToggleStatus={(e) => { e.stopPropagation(); onToggleTaskStatus(task); }}
                                    onGetAdvice={(e) => { e.stopPropagation(); onGetAdvice(task); }}
                                    onUpdateField={(field, value) => onUpdateTaskField(task.id, field, value)}
                                    onDelete={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                                />
                                {/* Archive button for done tasks */}
                                {task.status === 'done' && onArchiveTask && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onArchiveTask(task); }}
                                        title="Archive this task"
                                        className="absolute top-2 right-10 opacity-0 group-hover/taskwrap:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                    >
                                        <Archive size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
 
 
