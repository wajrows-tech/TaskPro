// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Link2, Unlink, Trophy, MousePointer2, Hourglass, Ban, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Task, Job } from '../types.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export interface Dep { taskId: number; dependsOnTaskId: number; type?: 'progress' | 'waiting_on' | 'blocked_by'; }

interface NodePos { id: number; x: number; y: number; vx: number; vy: number; pinned?: boolean; }

const PRIORITY_R: Record<string, number> = { high: 52, medium: 42, low: 34 };

// â”€â”€â”€ Job color generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CLIENT_HUES = [210, 340, 160, 30, 270, 50, 190, 310, 130, 70];
function getClientColor(jobId: number | null | undefined, idx: number) {
    if (!jobId) return { fill: '#f1f5f9', stroke: '#94a3b8', glow: '#94a3b822', textColor: '#475569', bg: '#94a3b810' };
    const hue = CLIENT_HUES[idx % CLIENT_HUES.length];
    return {
        fill: `hsl(${hue}, 55%, 92%)`,
        stroke: `hsl(${hue}, 60%, 55%)`,
        glow: `hsla(${hue}, 60%, 55%, 0.15)`,
        textColor: `hsl(${hue}, 50%, 25%)`,
        bg: `hsla(${hue}, 50%, 80%, 0.12)`,
    };
}

// â”€â”€â”€ Edge type visuals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EDGE_TYPES = ['progress', 'waiting_on', 'blocked_by'] as const;
type EdgeType = typeof EDGE_TYPES[number];
const EDGE_STYLE: Record<EdgeType, { color: string; dash?: string; icon: string }> = {
    progress: { color: '#10b981', icon: 'â†’' },
    waiting_on: { color: '#f59e0b', dash: '6 4', icon: 'â³' },
    blocked_by: { color: '#ef4444', dash: '6 3', icon: 'ðŸ›‘' },
};

// â”€â”€â”€ Force Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useForceLayout(nodes: number[], edges: Dep[], width: number, height: number, unassignedIds: Set<number> = new Set()) {
    const [positions, setPositions] = useState<Map<number, NodePos>>(() => {
        const m = new Map<number, NodePos>();
        nodes.forEach((id, i) => {
            const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
            const r = Math.min(width, height) * 0.32;
            m.set(id, { id, x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle), vx: 0, vy: 0 });
        });
        return m;
    });

    const animRef = useRef<number | null>(null);
    const posRef = useRef(positions);
    posRef.current = positions;

    const tick = useCallback(() => {
        const next = new Map<number, NodePos>();
        const pos = posRef.current;
        const arr = [...pos.values()];

        arr.forEach(n => {
            if (n.pinned) { next.set(n.id, { ...n, vx: 0, vy: 0 }); return; }
            let fx = 0, fy = 0;
            arr.forEach(m => {
                if (m.id === n.id) return;
                const dx = n.x - m.x;
                const dy = n.y - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = 7000 / (dist * dist);
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            });
            edges.forEach(e => {
                const isConnected = e.taskId === n.id || e.dependsOnTaskId === n.id;
                if (!isConnected) return;
                const otherId = e.taskId === n.id ? e.dependsOnTaskId : e.taskId;
                const other = pos.get(otherId);
                if (!other) return;
                const dx = other.x - n.x;
                const dy = other.y - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const target = 160;
                const force = (dist - target) * 0.04;
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            });
            fx += (width / 2 - n.x) * 0.012;
            fy += (height / 2 - n.y) * 0.012;
            // Cluster unassigned tasks toward a shared corner
            if (unassignedIds.has(n.id)) {
                const uCx = width * 0.15;
                const uCy = height * 0.85;
                fx += (uCx - n.x) * 0.02;
                fy += (uCy - n.y) * 0.02;
            }
            const damping = 0.82;
            const vx = (n.vx + fx) * damping;
            const vy = (n.vy + fy) * damping;
            next.set(n.id, {
                id: n.id,
                x: Math.max(60, Math.min(width - 60, n.x + vx)),
                y: Math.max(60, Math.min(height - 60, n.y + vy)),
                vx, vy
            });
        });
        setPositions(next);
        animRef.current = requestAnimationFrame(tick);
    }, [edges, width, height, nodes.join(','), [...unassignedIds].sort().join(',')]);

    useEffect(() => {
        const m = new Map<number, NodePos>();
        nodes.forEach((id, i) => {
            const existing = posRef.current.get(id);
            if (existing) { m.set(id, existing); return; }
            const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
            const r = Math.min(width, height) * 0.32;
            m.set(id, { id, x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle), vx: 0, vy: 0 });
        });
        setPositions(m);
    }, [nodes.join(',')]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(tick);
        const timer = setTimeout(() => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        }, 6000);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            clearTimeout(timer);
        };
    }, [tick]);

    // Expose a way to pin a node at a specific position
    const pinNode = useCallback((id: number, x: number, y: number) => {
        setPositions(prev => {
            const m = new Map(prev);
            const n = m.get(id);
            if (n) m.set(id, { ...n, x, y, vx: 0, vy: 0, pinned: true });
            return m;
        });
    }, []);

    return { positions, pinNode };
}

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ProjectMapProps {
    tasks: Task[];
    jobs: Job[];
    dependencies: Dep[];
    onTaskClick: (task: Task) => void;
    onAddDependency?: (taskId: number, dependsOnTaskId: number) => void;
    onRemoveDependency?: (taskId: number, dependsOnTaskId: number) => void;
    onLoadData?: () => void;
    onAddTask?: (jobId?: number | null) => void;
    onAddClient?: () => void;
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ProjectMap({ tasks, jobs, dependencies, onTaskClick, onAddDependency, onRemoveDependency, onLoadData, onAddTask, onAddClient }: ProjectMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 900, h: 560 });
    const [selectedClient, setSelectedClient] = useState<number | 'all'>('all');
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
    const [celebrated, setCelebrated] = useState(false);

    // Zoom & Pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

    // Link mode state
    const [linkMode, setLinkMode] = useState(false);
    const [linkSource, setLinkSource] = useState<number | null>(null);

    // Edge types (local state, keyed by "taskId-depId")
    const [edgeTypes, setEdgeTypes] = useState<Record<string, EdgeType>>({});

    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            for (const e of entries) {
                setDims({ w: e.contentRect.width, h: e.contentRect.height });
            }
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // Build Job index for coloring
    const clientIndex = useMemo(() => {
        const map = new Map<number, number>();
        jobs.forEach((c, i) => map.set(c.id, i));
        return map;
    }, [jobs]);

    // Filter tasks
    const visibleTasks = useMemo(() =>
        selectedClient === 'all' ? tasks : tasks.filter(t => t.jobId === selectedClient),
        [tasks, selectedClient]
    );
    const visibleIds = useMemo(() => new Set(visibleTasks.map(t => t.id)), [visibleTasks]);
    const visibleDeps = useMemo(() =>
        dependencies.filter(d => visibleIds.has(d.taskId) && visibleIds.has(d.dependsOnTaskId)),
        [dependencies, visibleIds]
    );

    const nodeIds = useMemo(() => visibleTasks.map(t => t.id), [visibleTasks]);
    const unassignedIds = useMemo(() => new Set(visibleTasks.filter(t => !t.jobId).map(t => t.id)), [visibleTasks]);
    const { positions, pinNode } = useForceLayout(nodeIds, visibleDeps, dims.w, dims.h, unassignedIds);

    // Completion stats
    const total = visibleTasks.length;
    const done = visibleTasks.filter(t => t.status === 'done').length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    useEffect(() => {
        if (total > 0 && done === total && !celebrated) setCelebrated(true);
        if (done < total) setCelebrated(false);
    }, [done, total]);

    // â”€â”€â”€ Drag-to-reposition (with drag/click separation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dragging = useRef<{ id: number; ox: number; oy: number; startX: number; startY: number; didDrag: boolean } | null>(null);
    const lastDragDidDrag = useRef(false);

    const onMouseDown = (e: React.MouseEvent, id: number) => {
        if (linkMode) return;
        e.stopPropagation();
        const svgEl = (e.currentTarget as SVGElement).closest('svg');
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const pos = positions.get(id);
        if (!pos) return;
        const mx = (e.clientX - rect.left - pan.x) / zoom;
        const my = (e.clientY - rect.top - pan.y) / zoom;
        dragging.current = { id, ox: mx - pos.x, oy: my - pos.y, startX: e.clientX, startY: e.clientY, didDrag: false };
    };

    const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        // Handle pan
        if (isPanning.current) {
            setPan({ x: e.clientX - panStart.current.x + panStart.current.px, y: e.clientY - panStart.current.y + panStart.current.py });
            return;
        }
        if (!dragging.current) return;
        const dx = e.clientX - dragging.current.startX;
        const dy = e.clientY - dragging.current.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragging.current.didDrag = true;
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = (e.clientX - rect.left - pan.x) / zoom;
        const my = (e.clientY - rect.top - pan.y) / zoom;
        const x = Math.max(60, Math.min(dims.w / zoom + 200, mx - dragging.current.ox));
        const y = Math.max(60, Math.min(dims.h / zoom + 200, my - dragging.current.oy));
        pinNode(dragging.current.id, x, y);
    }, [dims, pinNode, zoom, pan]);

    const onMouseUp = useCallback(() => {
        if (dragging.current) {
            lastDragDidDrag.current = dragging.current.didDrag;
            setTimeout(() => { lastDragDidDrag.current = false; }, 100);
        }
        dragging.current = null;
        isPanning.current = false;
    }, []);

    // â”€â”€â”€ Wheel zoom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.max(0.3, Math.min(3, z * delta)));
    }, []);

    // â”€â”€â”€ Canvas pan (any click on empty space) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        // Allow pan with left-click on empty canvas, middle click, or shift+click
        if (e.button === 0 || e.button === 1) {
            isPanning.current = true;
            panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.preventDefault();
        }
    }, [pan]);

    // â”€â”€â”€ Link mode click handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleNodeClick = (task: Task) => {
        // If user just dragged, don't open the card
        if (lastDragDidDrag.current || dragging.current?.didDrag) return;
        if (!linkMode) { onTaskClick(task); return; }
        if (linkSource === null) {
            setLinkSource(task.id);
        } else {
            if (linkSource !== task.id && onAddDependency) {
                onAddDependency(task.id, linkSource);
            }
            setLinkSource(null);
        }
    };

    // â”€â”€â”€ Edge click: cycle type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const cycleEdgeType = (dep: Dep) => {
        const key = `${dep.taskId}-${dep.dependsOnTaskId}`;
        const current = edgeTypes[key] || 'progress';
        const idx = EDGE_TYPES.indexOf(current);
        const next = EDGE_TYPES[(idx + 1) % EDGE_TYPES.length];
        setEdgeTypes(prev => ({ ...prev, [key]: next }));
    };

    // â”€â”€â”€ Group backgrounds (bounding boxes per Job) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const clientGroups = useMemo(() => {
        const groups: { jobId: number; jobName: string; minX: number; minY: number; maxX: number; maxY: number; color: ReturnType<typeof getClientColor> }[] = [];
        const byClient = new Map<number, { xs: number[]; ys: number[]; name: string }>();
        visibleTasks.forEach(t => {
            if (!t.jobId) return;
            const pos = positions.get(t.id);
            if (!pos) return;
            const entry = byClient.get(t.jobId) || { xs: [], ys: [], name: t.jobName || '' };
            entry.xs.push(pos.x);
            entry.ys.push(pos.y);
            byClient.set(t.jobId, entry);
        });
        byClient.forEach((val, cid) => {
            if (val.xs.length < 1) return;
            const pad = 70;
            groups.push({
                jobId: cid,
                jobName: val.name,
                minX: Math.min(...val.xs) - pad,
                minY: Math.min(...val.ys) - pad,
                maxX: Math.max(...val.xs) + pad,
                maxY: Math.max(...val.ys) + pad,
                color: getClientColor(cid, clientIndex.get(cid) ?? 0),
            });
        });
        return groups;
    }, [visibleTasks, positions, clientIndex]);

    // â”€â”€â”€ Mouse cursor for link source preview line â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    return (
        <div className="flex h-full overflow-hidden bg-[#f8f7f4]">
            {/* Compact left sidebar */}
            <div className="w-44 flex-shrink-0 border-r border-[#1A1A2E]/10 bg-white px-3 py-2 flex flex-col gap-2 overflow-y-auto text-[9px]">
                <div>
                    <h2 className="font-mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Filter</h2>
                    <select
                        className="w-full bg-[#f8f7f4] border border-[#1A1A2E]/10 rounded-lg px-2 py-1 font-mono text-[10px] focus:outline-none"
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">All ({tasks.length})</option>
                        {jobs.map(c => {
                            const n = tasks.filter(t => t.jobId === c.id).length;
                            return <option key={c.id} value={c.id}>{c.name} ({n})</option>;
                        })}
                    </select>
                </div>

                {/* Compact completion ring */}
                <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                            <circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke={pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#94a3b8'}
                                strokeWidth="10"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold">{pct}%</span>
                        </div>
                    </div>
                    <span className="text-[9px] font-mono opacity-50">{done}/{total}</span>
                </div>

                {/* Link Mode Toggle */}
                <div className="border-t border-[#1A1A2E]/10 pt-2">
                    <button
                        onClick={() => { setLinkMode(!linkMode); setLinkSource(null); }}
                        className={cn(
                            "w-full px-2 py-1.5 flex items-center gap-2 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all",
                            linkMode
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                                : "bg-[#f8f7f4] border border-[#1A1A2E]/10 text-[#1A1A2E] hover:bg-violet-50"
                        )}
                    >
                        {linkMode ? <Unlink size={12} /> : <Link2 size={12} />}
                        <span>{linkMode ? 'Exit Links' : 'Link Mode'}</span>
                    </button>
                    {linkMode && (
                        <p className="text-[9px] font-mono text-violet-600 mt-2 px-1 leading-relaxed">
                            {linkSource !== null
                                ? `Source selected â€” now click target node`
                                : `Click source node first, then target`}
                        </p>
                    )}
                </div>

                {/* Legend */}
                <div className="space-y-1.5 border-t border-[#1A1A2E]/10 pt-3">
                    <p className="font-mono text-[9px] uppercase opacity-40 tracking-widest mb-1">Edge Types (click to cycle)</p>
                    {EDGE_TYPES.map(t => (
                        <div key={t} className="flex items-center gap-2">
                            <div className="w-5 h-0.5 rounded" style={{ background: EDGE_STYLE[t].color, ...(EDGE_STYLE[t].dash ? { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, ' + EDGE_STYLE[t].color + ' 3px, ' + EDGE_STYLE[t].color + ' 6px)' } : {}) }} />
                            <span className="text-[9px]">{EDGE_STYLE[t].action}</span>
                            <span className="text-[10px] font-mono opacity-60 capitalize">{t.replace('_', ' ')}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400" />
                        <span className="text-[10px] font-mono opacity-60">Unassigned</span>
                    </div>
                </div>

                {/* Zoom controls */}
                <div className="border-t border-[#1A1A2E]/10 pt-3 flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1.5 border border-[#1A1A2E]/10 rounded hover:bg-[#1A1A2E]/5 transition-colors"><ZoomIn size={14} /></button>
                    <button onClick={() => setZoom(z => Math.max(0.3, z * 0.8))} className="p-1.5 border border-[#1A1A2E]/10 rounded hover:bg-[#1A1A2E]/5 transition-colors"><ZoomOut size={14} /></button>
                    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="flex-1 py-1.5 text-[9px] font-mono uppercase border border-[#1A1A2E]/10 rounded hover:bg-[#1A1A2E]/5 transition-colors">Reset</button>
                    <span className="text-[9px] font-mono opacity-40">{Math.round(zoom * 100)}%</span>
                </div>

                {/* Creation buttons */}
                {(onAddTask || onAddClient) && (
                    <div className="border-t border-[#1A1A2E]/10 pt-2 space-y-1">
                        {onAddTask && <button onClick={() => onAddTask(selectedClient === 'all' ? null : selectedClient)} className="w-full px-2 py-1.5 flex items-center gap-2 rounded-lg text-[9px] font-mono uppercase tracking-widest bg-[#1A1A2E] text-white hover:opacity-80 transition-colors"><Plus size={10} /> New Task</button>}
                        {onAddClient && <button onClick={onAddClient} className="w-full px-2 py-1.5 flex items-center gap-2 rounded-lg text-[9px] font-mono uppercase tracking-widest border border-[#1A1A2E]/10 hover:bg-[#1A1A2E]/5 transition-colors"><Plus size={10} /> New Job</button>}
                    </div>
                )}

                <div className="mt-auto">
                    <p className="text-[8px] font-mono opacity-30 text-center">
                        {linkMode ? 'ðŸ”— Link mode active' : 'Drag on canvas to pan'}
                    </p>
                </div>
            </div>

            {/* Map canvas */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {total === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-30">
                        <GitBranch size={48} />
                        <p className="font-mono text-sm uppercase tracking-widest">No tasks to map</p>
                    </div>
                ) : (
                    <svg
                        width={dims.w}
                        height={dims.h}
                        onMouseMove={(e) => {
                            onMouseMove(e);
                            if (linkMode && linkSource !== null) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMousePos({ x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom });
                            }
                        }}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onWheel={handleWheel}
                        onMouseDown={handleCanvasMouseDown}
                        className="select-none"
                        style={{ cursor: isPanning.current ? 'grabbing' : linkMode ? 'crosshair' : dragging.current ? 'grabbing' : 'default' }}
                    >
                        <defs>
                            {EDGE_TYPES.map(t => (
                                <marker key={t} id={`arrow-${t}`} markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
                                    <path d="M0,0 L0,8 L10,4 z" fill={EDGE_STYLE[t].color} />
                                </marker>
                            ))}
                            {visibleTasks.map(t => (
                                <filter key={t.id} id={`glow-${t.id}`}>
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            ))}
                        </defs>

                        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                            {/* Job group backgrounds */}
                            {clientGroups.map(g => (
                                <g key={g.jobId}>
                                    <rect
                                        x={g.minX} y={g.minY}
                                        width={Math.max(g.maxX - g.minX, 140)}
                                        height={Math.max(g.maxY - g.minY, 140)}
                                        rx="20" ry="20"
                                        fill={g.color.bg}
                                        stroke={g.color.stroke}
                                        strokeWidth="1"
                                        opacity="0.4"
                                    />
                                    <text
                                        x={g.minX + 10} y={g.minY + 16}
                                        fontSize="9" fontFamily="monospace" fill={g.color.stroke}
                                        opacity="0.7" fontWeight="600"
                                    >
                                        {g.jobName}
                                    </text>
                                </g>
                            ))}

                            {/* Edges */}
                            {visibleDeps.map(dep => {
                                const from = positions.get(dep.dependsOnTaskId);
                                const to = positions.get(dep.taskId);
                                if (!from || !to) return null;

                                const key = `${dep.taskId}-${dep.dependsOnTaskId}`;
                                const edgeType: EdgeType = edgeTypes[key] || dep.type || 'progress';
                                const style = EDGE_STYLE[edgeType];

                                const dx = to.x - from.x;
                                const dy = to.y - from.y;
                                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                                const fromR = PRIORITY_R[tasks.find(t => t.id === dep.dependsOnTaskId)?.priority ?? 'medium'] + 4;
                                const toR = PRIORITY_R[tasks.find(t => t.id === dep.taskId)?.priority ?? 'medium'] + 4;
                                const x1 = from.x + (dx / dist) * fromR;
                                const y1 = from.y + (dy / dist) * fromR;
                                const x2 = to.x - (dx / dist) * toR;
                                const y2 = to.y - (dy / dist) * toR;
                                const mx = (x1 + x2) / 2;
                                const my = (y1 + y2) / 2;

                                return (
                                    <g key={key} style={{ cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredEdge(key)}
                                        onMouseLeave={() => setHoveredEdge(null)}
                                        onClick={(e) => { e.stopPropagation(); cycleEdgeType(dep); }}
                                    >
                                        {/* Invisible fat hit area */}
                                        <line x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke="transparent" strokeWidth="16" />
                                        {/* Visible edge */}
                                        <line x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={style.color} strokeWidth="2.5" opacity="0.7"
                                            strokeDasharray={style.dash}
                                            markerEnd={`url(#arrow-${edgeType})`}
                                        />
                                        {/* Edge type icon at midpoint */}
                                        {edgeType !== 'progress' && (
                                            <text x={mx} y={my + 4} textAnchor="middle" fontSize="12"
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {style.action}
                                            </text>
                                        )}
                                        {/* Delete button on hover */}
                                        {hoveredEdge === key && onRemoveDependency && (
                                            <g onClick={(e) => { e.stopPropagation(); onRemoveDependency(dep.taskId, dep.dependsOnTaskId); }}
                                                style={{ cursor: 'pointer' }}>
                                                <circle cx={mx + 12} cy={my - 12} r="8" fill="#ef4444" opacity="0.9" />
                                                <text x={mx + 12} y={my - 8} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">Ã—</text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Link mode: preview line from source to mouse */}
                            {linkMode && linkSource !== null && (() => {
                                const src = positions.get(linkSource);
                                if (!src) return null;
                                return (
                                    <line
                                        x1={src.x} y1={src.y}
                                        x2={mousePos.x} y2={mousePos.y}
                                        stroke="#8b5cf6" strokeWidth="2"
                                        strokeDasharray="4 4" opacity="0.6"
                                    />
                                );
                            })()}

                            {/* Nodes */}
                            {visibleTasks.map(task => {
                                const pos = positions.get(task.id);
                                if (!pos) return null;
                                const cidx = task.jobId ? (clientIndex.get(task.jobId) ?? 0) : -1;
                                const color = task.jobId ? getClientColor(task.jobId, cidx) : getClientColor(null, 0);
                                const r = PRIORITY_R[task.priority] ?? 42;
                                const isDone = task.status === 'done';
                                const isHovered = hoveredId === task.id;
                                const isLinkSource = linkSource === task.id;
                                const isInProgress = task.status === 'in_progress';

                                return (
                                    <g key={task.id}
                                        style={{
                                            cursor: linkMode ? 'crosshair' : 'grab',
                                            opacity: isDone ? 0.4 : 1,
                                            transition: 'opacity 0.4s ease'
                                        }}
                                        onMouseDown={e => onMouseDown(e, task.id)}
                                        onMouseEnter={() => setHoveredId(task.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        onClick={() => handleNodeClick(task)}
                                    >
                                        {/* Glow ring */}
                                        {(isHovered || isLinkSource) && (
                                            <circle cx={pos.x} cy={pos.y} r={r + 10}
                                                fill="none"
                                                stroke={isLinkSource ? '#8b5cf6' : color.stroke}
                                                strokeWidth="2"
                                                strokeDasharray={isLinkSource ? '4 4' : undefined}
                                                opacity="0.6"
                                            >
                                                {isLinkSource && (
                                                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
                                                )}
                                            </circle>
                                        )}

                                        {/* Main circle */}
                                        <circle
                                            cx={pos.x} cy={pos.y} r={r}
                                            fill={color.fill}
                                            stroke={isDone ? '#10b981' : isInProgress ? '#f59e0b' : color.stroke}
                                            strokeWidth={isHovered ? 3 : 2}
                                            style={{ transition: 'stroke-width 0.2s' }}
                                        />

                                        {/* Done checkmark */}
                                        {isDone && (
                                            <text x={pos.x} y={pos.y - r * 0.15} textAnchor="middle" fontSize="16" fill="#10b981">âœ“</text>
                                        )}

                                        {/* Blocked lock */}
                                        {task.isBlocked && !isDone && (
                                            <text x={pos.x + r - 10} y={pos.y - r + 10} fontSize="12">ðŸ”’</text>
                                        )}

                                        {/* Title */}
                                        {(() => {
                                            const words = task.title.split(' ');
                                            const lines: string[] = [];
                                            let cur = '';
                                            const maxChars = Math.floor(r * 0.6);
                                            words.forEach(w => {
                                                if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; }
                                                else cur = (cur + ' ' + w).trim();
                                            });
                                            if (cur) lines.push(cur);
                                            const startY = pos.y - ((lines.length - 1) * 7);
                                            return lines.slice(0, 3).map((ln, i) => (
                                                <text key={i} x={pos.x} y={startY + i * 13}
                                                    textAnchor="middle" fontSize="10" fontFamily="monospace"
                                                    fill={color.textColor} fontWeight="600"
                                                >
                                                    {ln}
                                                </text>
                                            ));
                                        })()}

                                        {/* Job label */}
                                        {task.jobName && (
                                            <text x={pos.x} y={pos.y + r + 12} textAnchor="middle" fontSize="9"
                                                fontFamily="monospace" fill={color.stroke} opacity="0.8"
                                            >
                                                {task.jobName}
                                            </text>
                                        )}

                                        {/* Hover tooltip */}
                                        {isHovered && !linkMode && (
                                            <g>
                                                <rect x={pos.x + r + 4} y={pos.y - 22} width={140} height={44} rx="6"
                                                    fill="#1A1A2E" opacity="0.92" />
                                                <text x={pos.x + r + 10} y={pos.y - 8} fontSize="9" fontFamily="monospace" fill="white">
                                                    {task.title.slice(0, 20)}{task.title.length > 20 ? 'â€¦' : ''}
                                                </text>
                                                <text x={pos.x + r + 10} y={pos.y + 4} fontSize="8" fontFamily="monospace" fill="#94a3b8">
                                                    {task.status} Â· {task.priority}
                                                </text>
                                                <text x={pos.x + r + 10} y={pos.y + 16} fontSize="8" fontFamily="monospace" fill="#94a3b8">
                                                    {task.isBlocked ? 'ðŸ”’ blocked' : isDone ? 'âœ“ done' : 'click to open'}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                )}

                {/* Celebration overlay */}
                <AnimatePresence>
                    {celebrated && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/10 backdrop-blur-sm"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.07, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-4"
                            >
                                <Trophy size={56} className="text-emerald-500" />
                                <h2 className="text-3xl font-bold text-[#1A1A2E]">Project Closed!</h2>
                                <p className="text-sm font-mono opacity-50 uppercase tracking-widest">All tasks complete</p>
                                <button
                                    onClick={() => setCelebrated(false)}
                                    className="mt-2 px-6 py-2 bg-[#1A1A2E] text-white font-mono text-xs uppercase rounded-xl hover:opacity-80 transition"
                                >
                                    Dismiss
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
 
