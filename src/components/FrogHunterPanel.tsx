// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Crown, Star } from 'lucide-react';
import { Task } from '../types.ts';
import { cn } from '../utils.ts';
import { format, parseISO } from 'date-fns';

interface FrogHunterPanelProps {
    frogs: Task[];          // all tasks with isFrog=true
    hunted: Task[];         // completed frog tasks (isFrog+status=done)
    hallOfFame: Array<{ id: number; taskTitle: string; frogName: string; clientName?: string; completedAt: string }>;
    latestHunt?: number;    // id of most recently hunted task (triggers soul anim)
    zenScore: number;
}

// Generates a funny title based on task + client context
export function generateFrogName(taskTitle: string, clientName?: string): string {
    const titleWords = taskTitle.split(' ').filter(w => w.length > 3);
    const keyWord = titleWords[0] ?? 'Task';
    const verbs = ['Slayer', 'Vanquisher', 'Destroyer', 'Obliterator', 'Conqueror', 'Crusher', 'Annihilator', 'Terminator'];
    const prefixes = ['The Great', 'The Mighty', 'The Legendary', 'The Formidable', 'The Epic', 'The Grand', 'The Unstoppable'];
    const verb = verbs[Math.abs(taskTitle.charCodeAt(0) * 3 + taskTitle.length) % verbs.length];
    const prefix = prefixes[Math.abs(taskTitle.charCodeAt(1) * 7) % prefixes.length];
    const clientSuffix = clientName ? ` of ${clientName}` : '';
    return `${prefix} ${keyWord} ${verb}${clientSuffix}`;
}

export function FrogHunterPanel({ frogs, hunted, hallOfFame, latestHunt, zenScore }: FrogHunterPanelProps) {
    const [showHoF, setShowHoF] = useState(false);
    const [soulPos, setSoulPos] = useState<{ x: number; y: number } | null>(null);
    const [animating, setAnimating] = useState(false);
    const frogRingRef = useRef<HTMLDivElement>(null);
    const zenRingRef = useRef<HTMLDivElement>(null);
    const prevHuntedCount = useRef(hunted.length);

    const total = frogs.length + hunted.length;
    const huntedCount = hunted.length;
    const progress = total > 0 ? huntedCount / total : 0;
    const circumference = 2 * Math.PI * 40;

    // Soul animation when a new frog is hunted
    useEffect(() => {
        if (hunted.length > prevHuntedCount.current && frogRingRef.current && zenRingRef.current) {
            const frogRect = frogRingRef.current.getBoundingClientRect();
            const zenRect = zenRingRef.current.getBoundingClientRect();
            setSoulPos({ x: frogRect.left + frogRect.width / 2, y: frogRect.top + frogRect.height / 2 });
            setAnimating(true);
            setTimeout(() => { setAnimating(false); setSoulPos(null); }, 1600);
        }
        prevHuntedCount.current = hunted.length;
    }, [hunted.length]);

    const dialColor = progress > 0.75 ? '#22c55e' : progress > 0.4 ? '#f59e0b' : '#6b7280';

    return (
        <div className="bg-[#1A1A2E] text-[#F8F7F4] rounded-2xl p-4 space-y-3 relative overflow-hidden">
            {/* Decorative frog bg */}
            <div className="absolute top-2 right-3 text-5xl opacity-5 select-none pointer-events-none">ðŸ¸</div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-black text-sm tracking-tight">ðŸ¸ Frog Hunter</h3>
                    <p className="font-mono text-[9px] uppercase opacity-40">{huntedCount}/{total} frogs hunted</p>
                </div>
                <button onClick={() => setShowHoF(v => !v)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors">
                    <Trophy size={14} />
                    <span className="font-mono text-[9px] uppercase">Hall of Fame</span>
                </button>
            </div>

            {/* Progress ring */}
            <div className="flex justify-center" ref={frogRingRef}>
                <div className="relative">
                    <svg width="100" height="100" className="-rotate-90">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                        <motion.circle cx="50" cy="50" r="40" fill="transparent"
                            stroke={dialColor} strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress)}
                            animate={{ strokeDashoffset: circumference * (1 - progress) }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl">ðŸ¸</span>
                        <span className="font-black text-xs">{Math.round(progress * 100)}%</span>
                    </div>
                </div>
            </div>

            {/* Remaining frogs */}
            <div className="space-y-1 max-h-24 overflow-y-auto">
                {frogs.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs opacity-60">
                        <span>ðŸ¸</span>
                        <span className="truncate">{t.title}</span>
                    </div>
                ))}
                {frogs.length === 0 && huntedCount > 0 && (
                    <p className="text-center text-xs text-emerald-400 font-mono">All frogs hunted! ðŸ†</p>
                )}
                {total === 0 && (
                    <p className="text-center text-xs opacity-30 font-mono">Mark tasks as ðŸ¸ to start hunting</p>
                )}
            </div>

            {/* Hall of Fame */}
            <AnimatePresence>
                {showHoF && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/10 pt-3 space-y-2">
                        <div className="flex items-center gap-1 mb-2">
                            <Crown size={12} className="text-amber-400" />
                            <span className="font-mono text-[9px] uppercase text-amber-400 tracking-widest">Hall of Fame</span>
                        </div>
                        {hallOfFame.length === 0 && (
                            <p className="text-xs opacity-30 font-mono text-center">Complete frog tasks to fill the Hall of Fame</p>
                        )}
                        {hallOfFame.slice(0, 6).map((entry, i) => (
                            <div key={entry.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                                <span className="text-amber-400 text-xs shrink-0">{i === 0 ? 'ðŸ¥‡' : i === 1 ? 'ðŸ¥ˆ' : i === 2 ? 'ðŸ¥‰' : `#${i + 1}`}</span>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-amber-300 leading-tight">{entry.frogName}</p>
                                    <p className="text-[9px] opacity-40 truncate">{entry.taskTitle}</p>
                                    {entry.clientName && <p className="text-[9px] text-violet-400 opacity-70">{entry.clientName}</p>}
                                    <p className="text-[8px] opacity-20">{format(parseISO(entry.completedAt), 'MMM d')}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Soul fly animation */}
            <AnimatePresence>
                {animating && soulPos && (
                    <motion.div
                        key="soul"
                        className="fixed z-[999] pointer-events-none text-2xl"
                        initial={{ x: soulPos.x - 12, y: soulPos.y - 12, opacity: 1, scale: 1 }}
                        animate={{ x: soulPos.x + 80, y: soulPos.y - 120, opacity: 0, scale: 0.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                    >
                        âœ¨
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
