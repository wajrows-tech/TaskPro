// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Job, JobStage, Task } from '../types.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LayoutGrid, List, Table2, GitBranch, DollarSign, Plus, ChevronRight, ArrowRight, Archive, Eye, EyeOff } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PipelineVisualizerProps {
  jobs: Job[];
  tasks: Task[];
  onStageChange: (jobId: number, newStage: JobStage) => void;
  onJobClick: (Job: Job) => void;
  onAddTask: (jobId: number) => void;
  onTaskMove: (taskId: number, newJobId: number) => void;
}

const STAGES: JobStage[] = ['inspection', 'estimate', 'scope_approval', 'contract_signed', 'production', 'supplement', 'final_invoice', 'closed', 'canceled', 'closed'];
const ACTIVE_STAGES: JobStage[] = ['inspection', 'estimate', 'scope_approval', 'contract_signed', 'production', 'supplement', 'final_invoice'];
const TERMINAL_STAGES: JobStage[] = ['closed', 'canceled', 'closed'];
const STAGE_LABELS: Record<JobStage, string> = {
  'lead': 'Lead', 'inspection': 'Inspection', 'estimate': 'Claim/Est.', 'scope_approval': 'Scope',
  'contract_signed': 'contract_signed', 'production': 'Production', 'supplement': 'Supplement', 'final_invoice': 'final_invoice',
  'closed': 'Closed', 'canceled': 'Canceled', 'closed': 'closed'
};
const STAGE_LABELS_FULL: Record<JobStage, string> = {
  'lead': 'New Lead', 'inspection': 'Initial Inspection', 'estimate': 'Claim / Estimate', 'scope_approval': 'Scope Approval',
  'contract_signed': 'Contract Signed', 'production': 'Production', 'supplement': 'Supplementation', 'final_invoice': 'Final Invoice',
  'closed': 'Closed / Complete', 'canceled': 'Canceled', 'closed': 'closed'
};
const TERMINAL_COLORS: Record<string, string> = {
  'closed': 'bg-emerald-50 border-emerald-200',
  'canceled': 'bg-red-50 border-red-200',
  'closed': 'bg-gray-100 border-gray-300',
};

type ViewMode = 'board' | 'list' | 'table' | 'path' | 'revenue';

const URGENCY_COLORS = {
  high: { dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-50 border-red-200 text-red-600' },
  medium: { dot: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-50 border-amber-200 text-amber-600' },
  low: { dot: 'bg-emerald-400', text: 'text-emerald-600', badge: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
};

// â”€â”€ Avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Avatar({ Job, size = 'md' }: { Job: Job; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[9px]' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-[10px]';
  const u = URGENCY_COLORS[Job.urgency] || URGENCY_COLORS.medium;
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold uppercase border-2 bg-white', sizeClass, `border-current`, u.text)}>
      {Job.name.substring(0, 2)}
    </div>
  );
}

// â”€â”€ Board View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BoardView({ jobs, tasks, onStageChange, onJobClick, onAddTask, onTaskMove }: Omit<PipelineVisualizerProps, 'tasks'> & { tasks: Task[] }) {
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination, type } = result;
    if (type === 'Job') {
      const jobId = parseInt(draggableId);
      const newStage = destination.droppableId as JobStage;
      if (STAGES.includes(newStage) && newStage !== jobs.find(c => c.id === jobId)?.stage) {
        onStageChange(jobId, newStage);
      }
    } else if (type === 'TASK') {
      const taskId = parseInt(draggableId.replace('task-', ''));
      const destId = destination.droppableId;
      if (destId.startsWith('tasks-')) {
        const newClientId = parseInt(destId.replace('tasks-', ''));
        const oldClientId = tasks.find(t => t.id === taskId)?.jobId;
        if (newClientId !== oldClientId) onTaskMove(taskId, newClientId);
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto pb-4 px-4">
        {STAGES.map(stage => (
          <Droppable key={stage} droppableId={stage} type="Job">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef} {...provided.droppableProps}
                className={cn('w-[270px] shrink-0 flex flex-col gap-2 rounded-xl p-2 transition-colors', snapshot.isDraggingOver ? 'bg-[#1A1A2E]/5' : 'bg-transparent')}
              >
                <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 border-b border-[#1A1A2E]/10 pb-1.5 mb-1 flex justify-between items-center">
                  <span>{STAGE_LABELS_FULL[stage]}</span>
                  <span className="opacity-50">({jobs.filter(c => c.stage === stage).length})</span>
                </div>
                {jobs.filter(c => c.stage === stage).map((Job, index) => (
                  <Draggable key={`Job-${Job.id}`} draggableId={Job.id.toString()} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                        onClick={() => onJobClick(Job)}
                        style={provided.draggableProps.style}
                        className={cn(
                          'bg-white p-3 border rounded-lg shadow-sm hover:shadow-md transition-all group relative',
                          snapshot.isDragging ? 'rotate-2 scale-105 z-50 shadow-xl border-[#1A1A2E]' : 'border-[#1A1A2E]/5 hover:border-[#1A1A2E]/20'
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-sm leading-tight">{Job.name}</h3>
                          <span className={cn('px-1.5 py-0.5 text-[8px] uppercase font-mono border rounded-full tracking-wider', URGENCY_COLORS[Job.urgency]?.badge)}>
                            {Job.urgency}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono opacity-50 mb-2">${(Job.estimatedValue || 0).toLocaleString()}</div>
                        <Droppable droppableId={`tasks-${Job.id}`} type="TASK">
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                              className={cn('space-y-1 border-t border-[#1A1A2E]/5 pt-2 min-h-[32px]', snapshot.isDraggingOver && 'bg-blue-50/50 rounded')}
                            >
                              {tasks.filter(t => t.jobId === Job.id && t.status !== 'done').slice(0, 3).map((task, ti) => (
                                <Draggable key={`task-${task.id}`} draggableId={`task-${task.id}`} index={ti}>
                                  {(p, s) => (
                                    <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                      className={cn('flex items-center gap-1.5 text-[9px] opacity-60 p-1 rounded hover:bg-gray-50', s.isDragging && 'bg-white shadow-sm opacity-100')}
                                    >
                                      <div className={cn('w-1 h-1 rounded-full shrink-0', task.priority === 'high' ? 'bg-red-400' : 'bg-gray-300')} />
                                      <span className="truncate">{task.title}</span>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              <button onClick={e => { e.stopPropagation(); onAddTask(Job.id); }}
                                className="w-full mt-1 py-0.5 text-[9px] text-center border border-dashed border-[#1A1A2E]/10 hover:border-[#1A1A2E]/30 hover:bg-[#1A1A2E]/5 rounded transition-colors"
                              >+ Task</button>
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

// â”€â”€ List View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ListView({ jobs, tasks, onJobClick }: Pick<PipelineVisualizerProps, 'jobs' | 'tasks' | 'onJobClick'>) {
  return (
    <div className="px-4 space-y-2 overflow-y-auto">
      {STAGES.map(stage => {
        const stageClients = jobs.filter(c => c.stage === stage);
        if (stageClients.length === 0) return null;
        return (
          <div key={stage}>
            <div className="font-mono text-[9px] uppercase tracking-widest opacity-40 px-2 py-1 border-b border-[#1A1A2E]/10 mb-1">
              {STAGE_LABELS_FULL[stage]} Â· {stageClients.length}
            </div>
            {stageClients.map(Job => {
              const clientTasks = tasks.filter(t => t.jobId === Job.id && t.status !== 'done');
              const u = URGENCY_COLORS[Job.urgency] || URGENCY_COLORS.medium;
              return (
                <motion.div key={Job.id} whileHover={{ x: 4 }}
                  onClick={() => onJobClick(Job)}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-[#1A1A2E]/5 rounded-lg cursor-pointer transition-all group mb-1"
                >
                  <Avatar Job={Job} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-tight truncate">{Job.name}</div>
                    <div className="text-[9px] font-mono opacity-40">{clientTasks.length} open tasks</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[10px] opacity-50">${(Job.estimatedValue || 0).toLocaleString()}</span>
                    <span className={cn('px-2 py-0.5 text-[8px] font-mono uppercase border rounded-full', URGENCY_COLORS[Job.urgency]?.badge)}>{Job.urgency}</span>
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })}
      {jobs.length === 0 && <p className="text-center py-16 font-mono text-[10px] uppercase opacity-20">No jobs yet</p>}
    </div>
  );
}

// â”€â”€ Table View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TableView({ jobs, tasks, onJobClick }: Pick<PipelineVisualizerProps, 'jobs' | 'tasks' | 'onJobClick'>) {
  const [sortKey, setSortKey] = useState<'name' | 'stage' | 'urgency' | 'value' | 'tasks'>('urgency');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(key); setSortDir(-1); }
  };

  const sorted = [...jobs].sort((a, b) => {
    let av: any, bv: any;
    if (sortKey === 'name') { av = a.name; bv = b.name; }
    else if (sortKey === 'stage') { av = STAGES.indexOf(a.stage); bv = STAGES.indexOf(b.stage); }
    else if (sortKey === 'urgency') { av = ['high', 'medium', 'low'].indexOf(a.urgency); bv = ['high', 'medium', 'low'].indexOf(b.urgency); }
    else if (sortKey === 'value') { av = a.estimatedValue || 0; bv = b.estimatedValue || 0; }
    else { av = tasks.filter(t => t.jobId === a.id && t.status !== 'done').length; bv = tasks.filter(t => t.jobId === b.id && t.status !== 'done').length; }
    return typeof av === 'string' ? av.localeCompare(bv) * sortDir : (av - bv) * sortDir;
  });

  const SortTh = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <th onClick={() => handleSort(k)} className="text-left py-2 px-3 font-mono text-[9px] uppercase tracking-widest opacity-50 cursor-pointer hover:opacity-80 whitespace-nowrap select-none">
      {label} {sortKey === k ? (sortDir === -1 ? 'â†“' : 'â†‘') : ''}
    </th>
  );

  return (
    <div className="px-4 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-[#F8F7F4] z-10 border-b border-[#1A1A2E]/10">
          <tr>
            <SortTh k="name" label="Job" />
            <SortTh k="stage" label="Stage" />
            <SortTh k="urgency" label="Priority" />
            <SortTh k="value" label="Value" />
            <SortTh k="tasks" label="Tasks" />
            <th className="py-2 px-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1A2E]/5">
          {sorted.map(Job => {
            const clientTasks = tasks.filter(t => t.jobId === Job.id && t.status !== 'done');
            return (
              <tr key={Job.id} onClick={() => onJobClick(Job)}
                className="bg-white hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar Job={Job} size="sm" />
                    <span className="font-semibold text-sm">{Job.name}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="font-mono text-[10px] uppercase bg-[#1A1A2E]/5 px-2 py-1 rounded">
                    {STAGE_LABELS[Job.stage]}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={cn('px-2 py-0.5 text-[9px] font-mono uppercase border rounded-full', URGENCY_COLORS[Job.urgency]?.badge)}>
                    {Job.urgency}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-[11px] opacity-60">${(Job.estimatedValue || 0).toLocaleString()}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A1A2E]/40 rounded-full" style={{ width: `${Math.min(100, clientTasks.length * 20)}%` }} />
                    </div>
                    <span className="font-mono text-[10px] opacity-50">{clientTasks.length}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {jobs.length === 0 && <p className="text-center py-16 font-mono text-[10px] uppercase opacity-20">No jobs yet</p>}
    </div>
  );
}

// â”€â”€ Path View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PathView({ jobs, onJobClick }: Pick<PipelineVisualizerProps, 'jobs' | 'onJobClick'>) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-10 relative">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#1A1A2E]/10 -translate-y-1/2 pointer-events-none" />
      <div className="flex items-center gap-16 h-full min-w-max px-16">
        {STAGES.map((stage, i) => {
          const stageClients = jobs.filter(c => c.stage === stage);
          const isLast = i === STAGES.length - 1;
          return (
            <div key={stage} className="relative flex flex-col items-center gap-3 shrink-0">
              {/* Node */}
              <div className={cn('w-5 h-5 rounded-full border-4 z-10 bg-white shadow-sm',
                stageClients.length > 0 ? 'border-[#1A1A2E] shadow-[0_0_0_6px_rgba(20,20,20,0.08)]' : 'border-[#1A1A2E]/20'
              )} />
              {/* Label */}
              <div className="font-mono text-[9px] uppercase tracking-widest text-center opacity-50 w-24 leading-tight">
                {STAGE_LABELS_FULL[stage]}
              </div>
              {/* Arrow connector */}
              {!isLast && (
                <div className="absolute top-[9px] left-full ml-1 flex items-center pointer-events-none">
                  <ArrowRight size={10} className="opacity-20 ml-[52px]" />
                </div>
              )}
              {/* Job avatars */}
              {stageClients.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 max-w-[120px] mt-1">
                  {stageClients.map(Job => (
                    <motion.button key={Job.id} whileHover={{ scale: 1.15 }} onClick={() => onJobClick(Job)}
                      title={Job.name}
                      className={cn('w-9 h-9 rounded-full border-2 flex items-center justify-center text-[9px] font-bold bg-white shadow-sm hover:shadow-md transition-shadow', URGENCY_COLORS[Job.urgency]?.text, `border-current`)}
                    >
                      {Job.name.substring(0, 2).toUpperCase()}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€ Revenue View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RevenueView({ jobs, onJobClick }: Pick<PipelineVisualizerProps, 'jobs' | 'onJobClick'>) {
  const stageData = STAGES.map(stage => ({
    stage,
    label: STAGE_LABELS[stage],
    jobs: jobs.filter(c => c.stage === stage),
    total: jobs.filter(c => c.stage === stage).reduce((s, c) => s + (c.estimatedValue || 0), 0),
  }));

  const maxTotal = Math.max(...stageData.map(d => d.total), 1);
  const grandTotal = stageData.reduce((s, d) => s + d.total, 0);

  return (
    <div className="px-6 py-4 space-y-3 overflow-y-auto">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-black tracking-tighter">${grandTotal.toLocaleString()}</span>
        <span className="font-mono text-[10px] uppercase opacity-40">total pipeline value</span>
      </div>
      {stageData.map(({ stage, label, jobs: sc, total }) => (
        <div key={stage} className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase">
            <span className="opacity-50">{STAGE_LABELS_FULL[stage]}</span>
            <span className="font-bold">${total.toLocaleString()}</span>
          </div>
          <div className="relative h-8 bg-[#1A1A2E]/5 rounded-lg overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(total / maxTotal) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-[#1A1A2E]/20 rounded-lg flex items-center"
            />
            {/* Job dots inside bar */}
            <div className="absolute inset-0 flex items-center px-2 gap-1.5">
              {sc.map(c => (
                <button key={c.id} onClick={() => onJobClick(c)} title={c.name}
                  className={cn('w-5 h-5 rounded-full border text-[8px] font-bold flex items-center justify-center bg-white shrink-0 hover:scale-110 transition-transform', URGENCY_COLORS[c.urgency]?.text, 'border-current')}
                >
                  {c.name[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[9px] font-mono opacity-30">{sc.length} Job{sc.length !== 1 ? 's' : ''}</div>
        </div>
      ))}
    </div>
  );
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function PipelineVisualizer({ jobs, tasks, onStageChange, onJobClick, onAddTask, onTaskMove }: PipelineVisualizerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isMounted, setIsMounted] = useState(false);
  const [hiddenStages, setHiddenStages] = useState<Set<JobStage>>(() => {
    const saved = localStorage.getItem('pipeline_hidden_stages');
    return saved ? new Set(JSON.parse(saved)) : new Set<JobStage>(['canceled', 'closed']);
  });
  useEffect(() => { setIsMounted(true); }, []);

  const toggleStage = (stage: JobStage) => {
    setHiddenStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      localStorage.setItem('pipeline_hidden_stages', JSON.stringify([...next]));
      return next;
    });
  };

  const visibleClients = jobs.filter(c => !hiddenStages.has(c.stage));
  const visibleStages = STAGES.filter(s => !hiddenStages.has(s));

  // Counts for terminal stages (show even when hidden)
  const terminalCounts = TERMINAL_STAGES.map(s => ({ stage: s, count: jobs.filter(c => c.stage === s).length }));

  const views: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'board', label: 'Board', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: List },
    { id: 'table', label: 'Table', icon: Table2 },
    { id: 'path', label: 'Path', icon: GitBranch },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* View switcher + terminal stage toggles */}
      <div className="flex items-center gap-1 mb-4 px-4 flex-wrap">
        {views.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setViewMode(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border rounded-md transition-colors',
              viewMode === id ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'bg-transparent text-[#1A1A2E] border-[#1A1A2E]/20 hover:border-[#1A1A2E]/50'
            )}
          >
            <Icon size={11} /> {label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          {terminalCounts.map(({ stage, count }) => (
            <button key={stage} onClick={() => toggleStage(stage)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border rounded-md transition-colors',
                hiddenStages.has(stage)
                  ? 'opacity-40 border-[#1A1A2E]/10 hover:opacity-60'
                  : cn('border-current', TERMINAL_COLORS[stage] || 'bg-gray-50')
              )}
              title={hiddenStages.has(stage) ? `Show ${stage}` : `Hide ${stage}`}
            >
              {hiddenStages.has(stage) ? <EyeOff size={9} /> : <Eye size={9} />}
              {STAGE_LABELS[stage]} {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
            {viewMode === 'board' && isMounted && <BoardView jobs={visibleClients} tasks={tasks} onStageChange={onStageChange} onJobClick={onJobClick} onAddTask={onAddTask} onTaskMove={onTaskMove} />}
            {viewMode === 'list' && <ListView jobs={visibleClients} tasks={tasks} onJobClick={onJobClick} />}
            {viewMode === 'table' && <TableView jobs={visibleClients} tasks={tasks} onJobClick={onJobClick} />}
            {viewMode === 'path' && <PathView jobs={visibleClients} onJobClick={onJobClick} />}
            {viewMode === 'revenue' && <RevenueView jobs={visibleClients} onJobClick={onJobClick} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
 
 
