import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    format, startOfToday, addDays, subDays, parseISO, isSameDay,
    startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek
} from 'date-fns';
import {
    Clock, CalendarDays,
    ChevronLeft, ChevronRight,
    CheckCircle2, GripVertical, Hourglass, Globe,
    RefreshCw, ZoomIn, ZoomOut, CalendarRange, X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Job, TaskPriority } from '../types.ts';
import { cn } from '../utils.ts';

// â”€â”€ constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const START_HOUR = 7;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

const ZOOM_LEVELS = [36, 72, 96, 128, 160]; // px per hour â€“ index 1 is default
const ZOOM_LABELS = ['Compact', 'Normal', 'Expanded', 'Large', 'Max'];

const PRIORITY_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
    high: { bg: 'bg-red-500/10', border: 'border-l-red-500', dot: 'bg-red-500', text: 'text-red-700' },
    medium: { bg: 'bg-amber-500/10', border: 'border-l-amber-400', dot: 'bg-amber-400', text: 'text-amber-700' },
    low: { bg: 'bg-emerald-500/10', border: 'border-l-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-700' },
};

const TASK_EMOJIS = ['ðŸ“‹', 'ðŸ“ž', 'ðŸ“§', 'ðŸ”', 'ðŸ’°', 'ðŸ—ï¸', 'âœï¸', 'ðŸ“Š', 'ðŸ¤', 'âš¡', 'ðŸ ', 'ðŸ”‘', 'ðŸ“·', 'ðŸ“', 'ðŸ’¡', 'ðŸš€'];

// â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DayPlannerProps {
    tasks: Task[];
    jobs: Job[];
    onUpdateTaskField: (id: number, field: string, value: any) => Promise<void>;
    onBatchUpdateTask: (id: number, fields: Record<string, any>) => Promise<void>;
    onOpenTaskDetails: (task: Task) => void;
}

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getCurrentTimePosition(hourHeight: number): number {
    const now = new Date();
    return ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * hourHeight;
}

/** snap y â†’ time string (15-min grid) */
function yToTime(y: number, hourHeight: number): string {
    const rawMinutes = (y / hourHeight) * 60;
    const snapped = Math.round(rawMinutes / 15) * 15;
    const h = Math.floor(snapped / 60) + START_HOUR;
    const m = snapped % 60;
    const ch = Math.max(START_HOUR, Math.min(END_HOUR - 1, h));
    return `${String(ch).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToY(time: string, hourHeight: number): number {
    const [h, m] = time.split(':').map(Number);
    return ((h - START_HOUR) + m / 60) * hourHeight;
}

function getTaskTop(task: Task, hourHeight: number): number {
    if (!task.startTime) return 0;
    return timeToY(task.startTime, hourHeight);
}

function getTaskHeight(task: Task, hourHeight: number): number {
    return Math.max(((task.duration ?? 60) / 60) * hourHeight, 28);
}

// â”€â”€ EmojiPicker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmojiPickerInline({ current, onSelect, onClose }: { current?: string; onSelect: (e: string) => void; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute z-30 top-full left-0 mt-1 bg-white border border-[#1A1A2E] p-2 shadow-xl grid grid-cols-8 gap-1"
            onClick={e => e.stopPropagation()}
        >
            <button onClick={() => { onSelect(''); onClose(); }} className="col-span-8 text-[9px] font-mono uppercase opacity-40 hover:opacity-80 mb-1 text-left">Clear Icon</button>
            {TASK_EMOJIS.map(e => (
                <button key={e} onClick={() => { onSelect(e); onClose(); }}
                    className={cn('w-7 h-7 flex items-center justify-center text-base rounded hover:bg-gray-100 transition-colors', current === e && 'bg-gray-100 ring-1 ring-[#1A1A2E]')}
                >{e}</button>
            ))}
        </motion.div>
    );
}

// â”€â”€ TaskBlock (resizable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TaskBlockProps {
    task: Task;
    hourHeight: number;
    dayDate: string; // 'yyyy-MM-dd'
    onOpenTaskDetails: (t: Task) => void;
    onUpdateTaskField: (id: number, field: string, value: any) => Promise<void>;
    onUnschedule: (t: Task) => void;
}

function TaskBlock({ task, hourHeight, dayDate, onOpenTaskDetails, onUpdateTaskField, onUnschedule }: TaskBlockProps) {
    const pCfg = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
    const top = getTaskTop(task, hourHeight);
    const height = getTaskHeight(task, hourHeight);

    // â”€â”€ resize handle drag â”€â”€
    const resizingRef = useRef(false);
    const startYRef = useRef(0);
    const startDurRef = useRef(task.duration ?? 60);

    const onResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = true;
        startYRef.current = e.clientY;
        startDurRef.current = task.duration ?? 60;

        const onMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const dy = ev.clientY - startYRef.current;
            const addMin = Math.round((dy / hourHeight) * 60 / 15) * 15;
            const newDur = Math.max(15, startDurRef.current + addMin);
            // Live visual via CSS variable â€“ actual save on mouseup
            (document.querySelector(`[data-task-block="${task.id}"]`) as HTMLElement | null)
                ?.style.setProperty('height', `${Math.max(((newDur) / 60) * hourHeight, 28)}px`);
        };

        const onUp = async (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            resizingRef.current = false;
            const dy = ev.clientY - startYRef.current;
            const addMin = Math.round((dy / hourHeight) * 60 / 15) * 15;
            const newDur = Math.max(15, startDurRef.current + addMin);
            await onUpdateTaskField(task.id, 'duration', newDur);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // â”€â”€ drag-to-move â”€â”€
    const draggingRef = useRef(false);
    const moveStartY = useRef(0);
    const moveStartTime = useRef(task.startTime ?? '09:00');
    const didDragRef = useRef(false);

    const onMoveMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).dataset.resizeHandle) return;
        // Don't prevent default immediately, or HTML5 drag won't fire for cross-column drag
        draggingRef.current = true;
        didDragRef.current = false;
        moveStartY.current = e.clientY;
        moveStartTime.current = task.startTime ?? '09:00';
        const el = document.querySelector(`[data-task-block="${task.id}"]`) as HTMLElement | null;
        let origTop = parseFloat(el?.style.top ?? '0');

        const onMove = (ev: MouseEvent) => {
            if (!draggingRef.current) return;
            const dy = ev.clientY - moveStartY.current;
            if (Math.abs(dy) > 5) {
                didDragRef.current = true;
                // If we are actually dragging vertically within the column, grab the correct element starting position
                if (origTop === 0 && el) {
                    origTop = parseFloat(el.style.top ?? '0');
                }
            }
            if (didDragRef.current && el) {
                el.style.top = `${Math.max(0, origTop + dy)}px`;
            }
        };

        const onUp = async (ev: MouseEvent) => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            const dy = ev.clientY - moveStartY.current;
            const newTop = Math.max(0, origTop + dy);
            const newTime = yToTime(newTop, hourHeight);
            if (didDragRef.current) {
                await onUpdateTaskField(task.id, 'startTime', newTime);
            }
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleClick = () => {
        if (didDragRef.current) { didDragRef.current = false; return; }
        onOpenTaskDetails(task);
    };

    return (
        <div
            data-task-block={task.id}
            style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: 4, right: 4 }}
            className={cn(
                'border-l-4 rounded-r-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-move group select-none',
                pCfg.bg, pCfg.border
            )}
            draggable
            onDragStart={e => e.dataTransfer.setData('taskId', String(task.id))}
            onMouseDown={onMoveMouseDown}
            onClick={handleClick}
        >
            <div className="flex items-start justify-between h-full p-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        {task.action && <span className="text-sm leading-none">{task.action}</span>}
                        <span className={cn('font-bold text-xs uppercase tracking-tight leading-tight truncate', task.status === 'done' && 'line-through opacity-50')}>
                            {task.title}
                        </span>
                    </div>
                    {task.startTime && (
                        <p className="font-mono text-[9px] opacity-50 flex items-center gap-1">
                            <Clock size={9} /> {task.startTime} Â· {task.duration ?? 60}m
                        </p>
                    )}
                    {task.jobName && <p className="font-mono text-[9px] opacity-40 mt-0.5 truncate">{task.jobName}</p>}
                    {task.waitingOn && (
                        <p className="font-mono text-[9px] text-amber-600 flex items-center gap-0.5 mt-0.5">
                            <Hourglass size={8} /> {task.waitingOn}
                        </p>
                    )}
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); onUpdateTaskField(task.id, 'status', task.status === 'done' ? 'todo' : 'done'); }}
                        className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded-sm"
                    ><CheckCircle2 size={14} /></button>
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); onUnschedule(task); }}
                        className="p-0.5 text-red-500 hover:bg-red-100 rounded-sm"
                    ><X size={14} /></button>
                </div>
            </div>

            {/* Resize handle */}
            <div
                data-resize-handle="true"
                onMouseDown={onResizeMouseDown}
                className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-8 h-1 rounded-full bg-current opacity-30" />
            </div>
        </div>
    );
}

// â”€â”€ DayColumn â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DayColumnProps {
    date: Date;
    tasks: Task[];
    hourHeight: number;
    currentTimePos: number;
    onUpdateTaskField: (id: number, field: string, value: any) => Promise<void>;
    onOpenTaskDetails: (task: Task) => void;
    onDropToTime: (taskId: number, date: Date, time: string) => Promise<void>;
}

function DayColumn({ date, tasks, hourHeight, currentTimePos, onUpdateTaskField, onOpenTaskDetails, onDropToTime }: DayColumnProps) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isToday = isSameDay(date, new Date());
    const dayTasks = tasks.filter(t => t.scheduledDate === dateStr && t.startTime);

    // Native drag-over drop zone (allows precise time placement)
    const colRef = useRef<HTMLDivElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
        if (!taskId || !colRef.current) return;

        // Calculate the drop time based on the Y position within the grid
        const rect = colRef.current.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;

        // Ensure offsetY is not negative (e.g., dragging above the grid)
        const validOffsetY = Math.max(0, offsetY);

        // Convert the Y offset to a time string
        const time = yToTime(validOffsetY, hourHeight);

        // Update the task with the new date and time
        await onDropToTime(taskId, date, time);
    };

    return (
        <div className="flex-1 min-w-0 relative border-r border-[#1A1A2E]/10 last:border-r-0">
            {/* Column header â€” compact */}
            <div className={cn(
                'sticky top-0 z-10 border-b border-[#1A1A2E]/10 px-2 py-1 text-center backdrop-blur-sm flex items-center justify-center gap-2',
                isToday ? 'bg-[#1A1A2E] text-[#F8F7F4]' : 'bg-white/80'
            )}>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">{format(date, 'EEE')}</span>
                <span className={cn('text-sm font-black tabular-nums', isToday && 'text-[#F8F7F4]')}>{format(date, 'd')}</span>
                {isToday && <span className="font-mono text-[8px] uppercase opacity-50">{format(date, 'MMM')}</span>}
            </div>

            {/* Drop zone grid */}
            <div
                ref={colRef}
                className="relative"
                style={{ height: `${HOURS.length * hourHeight}px` }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Hour rows */}
                {HOURS.map((hour, i) => (
                    <div key={hour} className="absolute w-full pointer-events-none" style={{ top: `${i * hourHeight}px`, height: `${hourHeight}px` }}>
                        <div className="h-full border-t border-[#1A1A2E]/8 relative">
                            <div className="absolute w-full border-t border-[#1A1A2E]/4" style={{ top: '50%' }} />
                        </div>
                    </div>
                ))}

                {/* Task blocks */}
                {dayTasks.map(task => (
                    <TaskBlock
                        key={task.id}
                        task={task}
                        hourHeight={hourHeight}
                        dayDate={dateStr}
                        onOpenTaskDetails={onOpenTaskDetails}
                        onUpdateTaskField={onUpdateTaskField}
                        onUnschedule={async (t) => {
                            await onUpdateTaskField(t.id, 'scheduledDate', '');
                            await onUpdateTaskField(t.id, 'startTime', '');
                        }}
                    />
                ))}

                {/* Current time bar */}
                {isToday && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${currentTimePos}px` }}>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.2)] shrink-0 ml-px" />
                            <div className="flex-1 h-0.5 bg-red-500/70" />
                        </div>
                        <span className="absolute left-4 -top-3 font-mono text-[8px] text-red-600 font-bold">{format(new Date(), 'h:mm a')}</span>
                    </div>
                )}
            </div>

            {/* Completed tasks that were finished on this day */}
            {(() => {
                const completedToday = tasks.filter(t =>
                    t.status === 'done' && t.updatedAt &&
                    t.updatedAt.startsWith(dateStr)
                );
                if (completedToday.length === 0) return null;
                return (
                    <div className="border-t border-emerald-200 bg-emerald-50/50 px-1 py-1">
                        <p className="font-mono text-[7px] uppercase tracking-widest text-emerald-600 opacity-60 mb-0.5 px-1">Completed</p>
                        {completedToday.map(t => (
                            <div key={t.id} className="flex items-center gap-1 px-1 py-0.5 text-[9px] font-mono text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer" onClick={() => onOpenTaskDetails(t)}>
                                <span>âœ“</span>
                                <span className="truncate">{t.title}</span>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}

// â”€â”€ PriorityLane â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PriorityLane({ label, items, color, onSchedule }: { label: string; items: Task[]; color: string; onSchedule: (t: Task) => void }) {
    const [emojiTask, setEmojiTask] = useState<number | null>(null);

    return (
        <div className={cn('flex flex-col', color)}>
            <div className="font-mono text-[9px] uppercase tracking-widest opacity-60 px-2 py-1.5 border-b border-[#1A1A2E]/10 flex items-center justify-between sticky top-0 bg-inherit z-10">
                <span>{label}</span>
                <span className="opacity-50">{items.length}</span>
            </div>
            <Droppable droppableId={`priority-${label.toLowerCase()}`} type="PLANITEM">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn('flex-1 space-y-1.5 p-2 min-h-[80px] transition-colors', snapshot.isDraggingOver && 'bg-white/20')}
                    >
                        {items.map((task, index) => (
                            <Draggable key={task.id} draggableId={`plan-task-${task.id}`} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={provided.draggableProps.style}
                                        draggable
                                        onDragStart={e => e.dataTransfer.setData('taskId', String(task.id))}
                                        className={cn(
                                            'p-2 border border-[#1A1A2E]/10 bg-white/90 hover:bg-white group flex items-start gap-2 cursor-grab transition-all shadow-sm',
                                            snapshot.isDragging && 'shadow-xl rotate-1 z-50 opacity-95'
                                        )}
                                    >
                                        <div {...provided.dragHandleProps} className="mt-0.5 opacity-30 group-hover:opacity-70 shrink-0">
                                            <GripVertical size={12} />
                                        </div>

                                        {/* Emoji */}
                                        <div className="relative">
                                            <button
                                                onClick={e => { e.stopPropagation(); setEmojiTask(emojiTask === task.id ? null : task.id); }}
                                                className="text-base w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-sm transition-colors"
                                            >{task.action || 'ðŸ“‹'}</button>
                                            <AnimatePresence>
                                                {emojiTask === task.id && (
                                                    <EmojiPickerInline
                                                        current={task.action}
                                                        onSelect={async (emoji) => { /* handled by parent */ setEmojiTask(null); }}
                                                        onClose={() => setEmojiTask(null)}
                                                    />
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-tight leading-tight truncate">{task.title}</p>
                                            {task.jobName && <p className="text-[9px] opacity-40 font-mono truncate">{task.jobName}</p>}
                                        </div>

                                        <button
                                            onClick={e => { e.stopPropagation(); onSchedule(task); }}
                                            className="text-[9px] font-mono uppercase opacity-0 group-hover:opacity-80 hover:opacity-100 bg-[#1A1A2E] text-white px-1.5 py-0.5 whitespace-nowrap shrink-0 transition-all"
                                        >+</button>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && <p className="text-center text-[9px] font-mono uppercase opacity-20 py-4">Empty</p>}
                    </div>
                )}
            </Droppable>
        </div>
    );
}

// â”€â”€ ScheduleModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScheduleModal({ task, timeInput, setTimeInput, durationInput, setDurationInput, selectedDate, onConfirm, onClose, dateInput, setDateInput }: {
    task: Task; timeInput: string; setTimeInput: (v: string) => void;
    durationInput: string; setDurationInput: (v: string) => void;
    selectedDate: Date; onConfirm: (e: React.FormEvent) => void; onClose: () => void;
    dateInput: string; setDateInput: (v: string) => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#F8F7F4] border border-[#1A1A2E] w-full max-w-sm shadow-2xl"
            >
                <div className="p-4 border-b border-[#1A1A2E] flex justify-between items-start bg-[#1A1A2E] text-[#F8F7F4]">
                    <div>
                        <h3 className="font-bold tracking-tight uppercase text-sm">Schedule Task</h3>
                        <p className="font-mono text-[9px] uppercase opacity-50 mt-1 truncate max-w-[220px]">{task.title}</p>
                    </div>
                    <button onClick={onClose} className="hover:opacity-50 transition-opacity mt-0.5"><X size={16} /></button>
                </div>
                <form onSubmit={onConfirm} className="p-6 space-y-4">
                    <div>
                        <label className="block font-mono text-[10px] uppercase opacity-50 mb-2">Date</label>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full bg-white border border-[#1A1A2E] p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-mono text-[10px] uppercase opacity-50 mb-2">Start Time</label>
                        <input
                            type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)} required
                            className="w-full bg-white border border-[#1A1A2E] p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]"
                        />
                    </div>
                    <div>
                        <label className="block font-mono text-[10px] uppercase opacity-50 mb-2">Duration</label>
                        <select
                            value={durationInput} onChange={e => setDurationInput(e.target.value)}
                            className="w-full bg-white border border-[#1A1A2E] p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]"
                        >
                            <option value="15">15 min</option><option value="30">30 min</option>
                            <option value="45">45 min</option><option value="60">1 hour</option>
                            <option value="90">1.5 hours</option><option value="120">2 hours</option>
                            <option value="180">3 hours</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-[#1A1A2E] text-[#F8F7F4] py-3 font-mono text-xs uppercase tracking-widest hover:bg-black transition-colors">
                        Block Time â†’
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// â”€â”€ Main DayPlanner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function DayPlanner({ tasks, jobs, onUpdateTaskField, onBatchUpdateTask, onOpenTaskDetails }: DayPlannerProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [viewMode, setViewMode] = useState<'1day' | '3day' | '5day' | '2week' | 'month' | 'timeline'>('3day');
    const [zoomIndex, setZoomIndex] = useState(1); // default = Normal 72px/hr
    const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
    const [timeInput, setTimeInput] = useState('09:00');
    const [dateInput, setDateInput] = useState(() => format(startOfToday(), 'yyyy-MM-dd'));
    const [durationInput, setDurationInput] = useState('60');
    const [currentTimePos, setCurrentTimePos] = useState(0);
    const [gcalStatus, setGcalStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
    const timelineRef = useRef<HTMLDivElement>(null);

    const hourHeight = ZOOM_LEVELS[zoomIndex];

    const todayStr = format(selectedDate, 'yyyy-MM-dd');
    const isToday = isSameDay(selectedDate, new Date());

    // Build visible date columns
    const visibleDates =
        viewMode === '3day' ? [selectedDate, addDays(selectedDate, 1), addDays(selectedDate, 2)]
            : viewMode === '5day' ? Array.from({ length: 5 }, (_, i) => addDays(selectedDate, i))
                : viewMode === '2week' ? Array.from({ length: 14 }, (_, i) => addDays(selectedDate, i))
                    : [selectedDate]; // 1day and month use single base date

    useEffect(() => {
        setCurrentTimePos(getCurrentTimePosition(hourHeight));
        if (!isToday) return;
        const interval = setInterval(() => setCurrentTimePos(getCurrentTimePosition(hourHeight)), 60_000);
        return () => clearInterval(interval);
    }, [isToday, hourHeight]);

    // Scroll to current time
    useEffect(() => {
        if (!isToday || !timelineRef.current) return;
        setTimeout(() => {
            if (timelineRef.current) timelineRef.current.scrollTop = Math.max(0, currentTimePos - 160);
        }, 300);
    }, [isToday, hourHeight]);

    const unscheduledTasks = tasks.filter(t => t.status !== 'done' && !visibleDates.some(d => t.scheduledDate === format(d, 'yyyy-MM-dd') && t.startTime));
    const highTasks = unscheduledTasks.filter(t => t.priority === 'high');
    const medTasks = unscheduledTasks.filter(t => t.priority === 'medium');
    const lowTasks = unscheduledTasks.filter(t => t.priority === 'low');
    const scheduledCount = tasks.filter(t => t.scheduledDate === todayStr && t.startTime).length;

    /** Called when a task is dropped on a specific time slot */
    const handleDropToTime = useCallback(async (taskId: number, date: Date, time: string) => {
        const fields: Record<string, any> = {
            scheduledDate: format(date, 'yyyy-MM-dd'),
            startTime: time,
        };
        if (!tasks.find(t => t.id === taskId)?.duration) {
            fields.duration = 60;
        }
        await onBatchUpdateTask(taskId, fields);
    }, [tasks, onBatchUpdateTask]);

    /** @hello-pangea/dnd fallback (drag from priority lane â†’ priority lane or timeline) */
    const handleDragEnd = useCallback(async (result: DropResult) => {
        if (!result.destination) return;
        const taskId = parseInt(result.draggableId.replace('plan-task-', ''), 10);
        const dest = result.destination.droppableId;

        if (dest.startsWith('priority-')) {
            const priority = dest.replace('priority-', '') as TaskPriority;
            await onBatchUpdateTask(taskId, { priority, scheduledDate: '', startTime: '' });
        } else if (dest === 'unscheduled') {
            await onBatchUpdateTask(taskId, { scheduledDate: '', startTime: '' });
        } else if (dest === 'timeline') {
            setSchedulingTask(tasks.find(t => t.id === taskId) || null);
            setTimeInput('09:00');
        }
    }, [tasks, onBatchUpdateTask]);

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schedulingTask) return;
        await onUpdateTaskField(schedulingTask.id, 'scheduledDate', dateInput);
        await onUpdateTaskField(schedulingTask.id, 'startTime', timeInput);
        await onUpdateTaskField(schedulingTask.id, 'duration', parseInt(durationInput, 10));
        // Navigate the view to the newly scheduled date
        try { setSelectedDate(parseISO(dateInput)); } catch { }
        setSchedulingTask(null);
    };

    const handleGcalSync = () => {
        setGcalStatus('syncing');
        setTimeout(() => setGcalStatus('synced'), 1500);
        setTimeout(() => setGcalStatus('idle'), 4000);
    };

    const openScheduleModal = (task: Task, time = '09:00') => {
        setSchedulingTask(task);
        setTimeInput(time);
        setDurationInput(String(task.duration ?? 60));
        setDateInput(format(selectedDate, 'yyyy-MM-dd'));
    };

    // Out-of-range tasks (e.g. scheduled at midnight / outside START-END window)
    const outOfRangeTasks = tasks.filter(t => {
        if (!t.startTime || !t.scheduledDate) return false;
        const [h] = t.startTime.split(':').map(Number);
        return h < START_HOUR || h >= END_HOUR;
    });

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full flex flex-col bg-[#F8F7F4]">

                {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[#1A1A2E] bg-[#F8F7F4] z-20 gap-4 shrink-0">
                    {/* Title */}
                    <div className="flex items-center gap-3">
                        <CalendarDays size={22} />
                        <div>
                            <h2 className="text-xl font-serif italic tracking-tight leading-none">Day Planner</h2>
                            <p className="font-mono text-[9px] uppercase opacity-40 tracking-widest">
                                {scheduledCount} scheduled Â· {unscheduledTasks.length} pending
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* View toggle */}
                        <div className="flex border border-[#1A1A2E] overflow-hidden">
                            {([
                                { key: '1day', label: '1D', icon: 'â–¬' },
                                { key: '3day', label: '3D', icon: 'â–¬â–¬â–¬' },
                                { key: '5day', label: '5D', icon: 'â¬›â¬›â¬›â¬›â¬›' },
                                { key: '2week', label: '2W', icon: null },
                                { key: 'month', label: 'Mo', icon: null },
                                { key: 'timeline', label: 'TL', icon: null },
                            ] as { key: typeof viewMode; label: string; icon: string | null }[]).map((v, i) => (
                                <button key={v.key}
                                    onClick={() => setViewMode(v.key)}
                                    className={cn(
                                        'px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors',
                                        i > 0 && 'border-l border-[#1A1A2E]',
                                        viewMode === v.key ? 'bg-[#1A1A2E] text-[#F8F7F4]' : 'hover:bg-[#1A1A2E]/5'
                                    )}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>

                        {/* Zoom */}
                        <div className="flex items-center border border-[#1A1A2E] overflow-hidden">
                            <button
                                onClick={() => setZoomIndex(i => Math.max(0, i - 1))}
                                disabled={zoomIndex === 0}
                                className="p-1.5 hover:bg-[#1A1A2E] hover:text-[#F8F7F4] transition-colors disabled:opacity-30"
                                title="Zoom out"
                            ><ZoomOut size={14} /></button>
                            <span className="font-mono text-[9px] uppercase px-2 border-x border-[#1A1A2E] whitespace-nowrap opacity-60">
                                {ZOOM_LABELS[zoomIndex]}
                            </span>
                            <button
                                onClick={() => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
                                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                                className="p-1.5 hover:bg-[#1A1A2E] hover:text-[#F8F7F4] transition-colors disabled:opacity-30"
                                title="Zoom in"
                            ><ZoomIn size={14} /></button>
                        </div>

                        {/* GCal */}
                        <button
                            onClick={handleGcalSync}
                            className={cn('flex items-center gap-2 border border-[#1A1A2E] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all',
                                gcalStatus === 'synced' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                    gcalStatus === 'syncing' ? 'opacity-50' : 'hover:bg-[#1A1A2E] hover:text-[#F8F7F4]')}
                        >
                            {gcalStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> :
                                gcalStatus === 'synced' ? <CheckCircle2 size={12} /> : <Globe size={12} />}
                            {gcalStatus === 'synced' ? 'Synced!' : gcalStatus === 'syncing' ? 'Syncingâ€¦' : 'GCal Sync'}
                        </button>

                        {/* Date nav */}
                        <div className="flex items-center gap-0 bg-white border border-[#1A1A2E]">
                            <button onClick={() => setSelectedDate(d => subDays(d, viewMode === '3day' ? 3 : 1))} className="p-2 hover:bg-[#1A1A2E] hover:text-[#F8F7F4] transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setSelectedDate(startOfToday())} className="font-mono text-[11px] uppercase font-bold tracking-widest px-3 whitespace-nowrap hover:bg-gray-50 min-w-[90px] text-center">
                                {isToday ? 'Today' : format(selectedDate, 'MMM d')}
                            </button>
                            <button onClick={() => setSelectedDate(d => addDays(d, viewMode === '3day' ? 3 : 1))} className="p-2 hover:bg-[#1A1A2E] hover:text-[#F8F7F4] transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* â”€â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Priority lanes sidebar */}
                    <div className="w-56 shrink-0 border-r border-[#1A1A2E] flex flex-col overflow-hidden bg-[#F8F7F4]">
                        <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 p-2 border-b border-[#1A1A2E] text-center">
                            Drag â†’ Timeline
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-[#1A1A2E]/10">
                            <div className="flex-1 bg-red-50/40">
                                <PriorityLane label="High" items={highTasks} color="bg-red-50/40"
                                    onSchedule={t => { setSchedulingTask(t); setTimeInput('09:00'); setDurationInput('60'); }} />
                            </div>
                            <div className="flex-1 bg-amber-50/40">
                                <PriorityLane label="Medium" items={medTasks} color="bg-amber-50/40"
                                    onSchedule={t => { setSchedulingTask(t); setTimeInput('09:00'); setDurationInput('60'); }} />
                            </div>
                            <div className="flex-1 bg-emerald-50/40">
                                <PriorityLane label="Low" items={lowTasks} color="bg-emerald-50/40"
                                    onSchedule={t => { setSchedulingTask(t); setTimeInput('09:00'); setDurationInput('60'); }} />
                            </div>
                        </div>
                    </div>

                    {/* Timeline area â€” Timeline, Monthly grid, or day columns */}
                    {viewMode === 'timeline' ? (
                        /* â”€â”€ Horizontal timeline â”€â”€ */
                        <div className="flex-1 overflow-x-auto bg-white/30 px-4 py-2">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="font-serif italic text-lg">{format(selectedDate, 'EEEE, MMM d')}</span>
                                <span className="font-mono text-[9px] uppercase opacity-40 tracking-widest">Timeline View</span>
                            </div>
                            <div className="relative" style={{ width: `${HOURS.length * 120}px`, minHeight: '200px' }}>
                                {/* Hour markers */}
                                <div className="flex border-b border-[#1A1A2E]/10">
                                    {HOURS.map(hour => (
                                        <div key={hour} className="border-r border-[#1A1A2E]/8 text-center" style={{ width: '120px' }}>
                                            <span className="font-mono text-[9px] opacity-40">
                                                {hour > 12 ? `${hour - 12}` : hour}{hour >= 12 ? 'pm' : 'am'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {/* Background grid */}
                                <div className="absolute top-6 left-0 flex" style={{ height: 'calc(100% - 24px)' }}>
                                    {HOURS.map(hour => (
                                        <div key={hour} className="border-r border-[#1A1A2E]/5" style={{ width: '120px', height: '100%' }} />
                                    ))}
                                </div>
                                {/* Tasks */}
                                {(() => {
                                    const ds = format(selectedDate, 'yyyy-MM-dd');
                                    const dayTasks = tasks.filter(t => t.scheduledDate === ds && t.startTime);
                                    return dayTasks.map((task, i) => {
                                        const [h, m] = (task.startTime || '9:00').split(':').map(Number);
                                        const left = ((h - START_HOUR) + m / 60) * 120;
                                        const width = Math.max(60, ((task.duration || 60) / 60) * 120);
                                        const pColor = task.priority === 'high' ? 'bg-red-100 border-red-400 text-red-800' :
                                            task.priority === 'medium' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-emerald-100 border-emerald-400 text-emerald-800';
                                        return (
                                            <div key={task.id}
                                                className={`absolute border-l-2 ${pColor} rounded-r px-2 py-1 cursor-pointer hover:shadow-md transition-shadow`}
                                                style={{ left: `${Math.max(0, left)}px`, top: `${28 + i * 36}px`, width: `${width}px` }}
                                                onClick={() => onOpenTaskDetails(task)}
                                            >
                                                <p className="font-mono text-[10px] font-bold truncate">{task.title}</p>
                                                <p className="font-mono text-[8px] opacity-60">{task.startTime} Â· {task.duration || 60}m</p>
                                            </div>
                                        );
                                    });
                                })()}
                                {/* Current time marker */}
                                {isSameDay(selectedDate, new Date()) && (() => {
                                    const now = new Date();
                                    const left = ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * 120;
                                    if (left < 0) return null;
                                    return <div className="absolute top-6 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${left}px` }} />;
                                })()}
                            </div>
                        </div>
                    ) : viewMode === 'month' ? (
                        /* â”€â”€ Monthly grid â”€â”€ */
                        <div className="flex-1 overflow-y-auto bg-white/30 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setSelectedDate(d => subMonths(d, 1))} className="p-1.5 hover:bg-[#1A1A2E] hover:text-white rounded transition-colors"><ChevronLeft size={16} /></button>
                                <span className="font-serif italic text-lg">{format(selectedDate, 'MMMM yyyy')}</span>
                                <button onClick={() => setSelectedDate(d => addMonths(d, 1))} className="p-1.5 hover:bg-[#1A1A2E] hover:text-white rounded transition-colors"><ChevronRight size={16} /></button>
                            </div>
                            {/* Day-of-week headers */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="text-center font-mono text-[9px] uppercase opacity-40 py-1">{d}</div>
                                ))}
                            </div>
                            {/* Calendar cells */}
                            <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                    const monthStart = startOfMonth(selectedDate);
                                    const monthEnd = endOfMonth(selectedDate);
                                    const gridStart = startOfWeek(monthStart);
                                    const gridEnd = endOfWeek(monthEnd);
                                    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
                                    return days.map(day => {
                                        const ds = format(day, 'yyyy-MM-dd');
                                        const dayTasks = tasks.filter(t => t.scheduledDate === ds);
                                        const isCurrentMonth = day >= monthStart && day <= monthEnd;
                                        const isToday = isSameDay(day, new Date());
                                        return (
                                            <button key={ds}
                                                onClick={() => { setSelectedDate(day); setViewMode('1day'); }}
                                                className={cn(
                                                    'min-h-[64px] p-1.5 rounded-lg border text-left transition-all hover:border-[#1A1A2E] hover:shadow-sm',
                                                    isToday ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' :
                                                        isCurrentMonth ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-40'
                                                )}
                                            >
                                                <span className={cn('text-xs font-black tabular-nums block', isToday && 'text-white')}>{format(day, 'd')}</span>
                                                <div className="flex flex-wrap gap-0.5 mt-1">
                                                    {dayTasks.slice(0, 6).map(t => (
                                                        <div key={t.id} className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                                                            t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                                                        )} title={t.title} />
                                                    ))}
                                                </div>
                                                {dayTasks.length > 0 && (
                                                    <span className={cn('text-[8px] font-mono opacity-50', isToday && 'opacity-70')}>{dayTasks.length} task{dayTasks.length > 1 && 's'}</span>
                                                )}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div ref={timelineRef} className="flex-1 overflow-y-auto overflow-x-auto bg-white/30">
                            <div className="flex h-full" style={{ minWidth: viewMode === '2week' ? '1200px' : undefined }}>
                                {/* Hour labels (fixed left of all columns) */}
                                <div className="w-14 shrink-0 relative" style={{ height: `${HOURS.length * hourHeight}px` }}>
                                    {/* Column day headers placeholder */}
                                    <div className="sticky top-0 z-10 bg-[#F8F7F4] border-b border-[#1A1A2E]/10 h-[36px]" />
                                    {HOURS.map((hour, i) => (
                                        <div key={hour} className="absolute w-full text-right pr-2.5" style={{ top: `${36 + i * hourHeight}px`, height: `${hourHeight}px` }}>
                                            <span className="font-mono text-[9px] opacity-40 -translate-y-2 inline-block whitespace-nowrap">
                                                {hour > 12 ? `${hour - 12}` : hour}{hour >= 12 ? 'p' : 'a'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Day columns */}
                                <div className="flex-1 flex" style={{ minHeight: `${36 + HOURS.length * hourHeight}px` }}>
                                    {visibleDates.map(date => (
                                        <DayColumn
                                            key={format(date, 'yyyy-MM-dd')}
                                            date={date}
                                            tasks={tasks}
                                            hourHeight={hourHeight}
                                            currentTimePos={currentTimePos}
                                            onUpdateTaskField={onUpdateTaskField}
                                            onOpenTaskDetails={onOpenTaskDetails}
                                            onDropToTime={handleDropToTime}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )} {/* end month ternary */}
                </div>

                {/* â”€â”€â”€ Out of Range Task Rescue Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {outOfRangeTasks.length > 0 && (
                    <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-300 rounded-lg flex flex-col gap-2">
                        <div className="font-mono text-[9px] uppercase font-bold text-amber-700 flex items-center gap-1.5">
                            âš  {outOfRangeTasks.length} task{outOfRangeTasks.length > 1 ? 's' : ''} scheduled outside view (e.g. midnight)
                        </div>
                        {outOfRangeTasks.map(t => (
                            <div key={t.id} className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-amber-800 truncate">{t.title}</span>
                                <span className="font-mono text-[9px] text-amber-600">{t.startTime}</span>
                                <button
                                    onClick={() => openScheduleModal(t)}
                                    className="shrink-0 px-2.5 py-1 bg-amber-700 text-white font-mono text-[8px] uppercase rounded hover:bg-amber-800 transition-colors"
                                >
                                    Reschedule
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Schedule Modal */}
                <AnimatePresence>
                    {schedulingTask && (
                        <ScheduleModal
                            task={schedulingTask}
                            timeInput={timeInput} setTimeInput={setTimeInput}
                            durationInput={durationInput} setDurationInput={setDurationInput}
                            dateInput={dateInput} setDateInput={setDateInput}
                            selectedDate={selectedDate}
                            onConfirm={handleSchedule}
                            onClose={() => setSchedulingTask(null)}
                        />
                    )}
                </AnimatePresence>
            </div> {/* end h-full flex flex-col */}
        </DragDropContext>
    );
}
 
