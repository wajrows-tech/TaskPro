import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { TaskPriority } from '../types.ts';
import { cn } from '../utils.ts';

interface FloatingQuickTaskProps {
    x: number;
    y: number;
    jobId?: number;
    onClose: () => void;
    onCreate: (title: string, priority: TaskPriority) => void;
}

export function FloatingQuickTask({ x, y, jobId, onClose, onCreate }: FloatingQuickTaskProps) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ left: Math.min(x, window.innerWidth - 320), top: Math.min(y, window.innerHeight - 200) }}
            className="fixed w-80 bg-[#1A1A2E] text-[#F8F7F4] rounded-2xl shadow-2xl border border-white/10 z-[200] p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-mono text-[10px] uppercase tracking-widest">Quick Drop Task</h4>
                <button onClick={onClose} className="hover:opacity-50 transition-opacity">
                    <Plus size={16} className="rotate-45" />
                </button>
            </div>
            <input
                autoFocus
                className="w-full bg-white/10 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-white/30 mb-3 placeholder:opacity-40"
                placeholder="Task title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && title.trim()) {
                        onCreate(title.trim(), priority);
                    }
                }}
            />
            <div className="flex gap-1.5 mb-4">
                {(['low', 'medium', 'high'] as const).map(p => (
                    <button key={p} onClick={() => setPriority(p)}
                        className={cn('flex-1 py-1.5 text-[10px] font-mono uppercase rounded-lg transition-all',
                            priority === p ? (p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-white/10 hover:bg-white/20'
                        )}
                    >{p}</button>
                ))}
            </div>
            <button
                onClick={() => {
                    if (title.trim()) onCreate(title.trim(), priority);
                }}
                className="w-full bg-white text-[#1A1A2E] py-2 rounded-lg font-mono text-[10px] uppercase font-bold hover:bg-white/90 transition-colors"
            >
                + Add Here
            </button>
        </motion.div>
    );
}
 
