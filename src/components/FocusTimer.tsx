// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, X, Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, ChevronDown, Minimize2 } from 'lucide-react';
import { Task } from '../types.ts';
import { cn } from '../utils.ts';

interface FocusTimerProps {
    tasks: Task[];
    onComplete: (taskId: number, actualMinutes: number) => void;
    onClose: () => void;
}

const SOUNDS = [
    { label: 'Silent', value: 'silent', emoji: 'ðŸ”•' },
    { label: 'Rain', value: 'rain', emoji: 'ðŸŒ§ï¸' },
    { label: 'CafÃ©', value: 'cafe', emoji: 'â˜•' },
    { label: 'Forest', value: 'forest', emoji: 'ðŸŒ²' },
    { label: 'Ocean', value: 'ocean', emoji: 'ðŸŒŠ' },
];

const PRESETS = [
    { label: '25/5', work: 25, rest: 5 },
    { label: '50/10', work: 50, rest: 10 },
    { label: '90/20', work: 90, rest: 20 },
    { label: 'Custom', work: 0, rest: 0 },
];

function createNoise(ctx: AudioContext, type: string): AudioBufferSourceNode | null {
    if (type === 'silent') return null;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    if (type === 'rain') { filter.type = 'highpass'; filter.frequency.value = 800; }
    else if (type === 'cafe') { filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 0.5; }
    else if (type === 'forest') { filter.type = 'lowpass'; filter.frequency.value = 600; }
    else if (type === 'ocean') { filter.type = 'lowpass'; filter.frequency.value = 300; }
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
    return source;
}

export function FocusTimer({ tasks, onComplete, onClose }: FocusTimerProps) {
    const [phase, setPhase] = useState<'work' | 'rest'>('work');
    const [workMins, setWorkMins] = useState(25);
    const [restMins, setRestMins] = useState(5);
    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [running, setRunning] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [sound, setSound] = useState('rain');
    const [muted, setMuted] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [customWork, setCustomWork] = useState('');
    const [customRest, setCustomRest] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [showTaskPicker, setShowTaskPicker] = useState(false);
    const [minimized, setMinimized] = useState(false); // â† mini pill mode

    const audioRef = useRef<AudioContext | null>(null);
    const noiseRef = useRef<any>(null);
    const intervalRef = useRef<number | null>(null);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    const totalSeconds = (phase === 'work' ? workMins : restMins) * 60;
    const progress = 1 - secondsLeft / totalSeconds;
    const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const secs = (secondsLeft % 60).toString().padStart(2, '0');

    useEffect(() => {
        if (running && !muted && sound !== 'silent') {
            if (!audioRef.current) audioRef.current = new AudioContext();
            if (noiseRef.current) { try { noiseRef.current.stop(); } catch { } }
            noiseRef.current = createNoise(audioRef.current, sound);
        } else {
            if (noiseRef.current) { try { noiseRef.current.stop(); noiseRef.current = null; } catch { } }
        }
        return () => { if (noiseRef.current) { try { noiseRef.current.stop(); } catch { } } };
    }, [running, muted, sound]);

    useEffect(() => {
        if (running) {
            intervalRef.current = window.setInterval(() => {
                setSecondsLeft(s => {
                    if (s <= 1) {
                        clearInterval(intervalRef.current!);
                        setRunning(false);
                        if (phase === 'work') {
                            setElapsed(e => e + workMins * 60);
                            setPhase('rest');
                            setSecondsLeft(restMins * 60);
                        } else {
                            setPhase('work');
                            setSecondsLeft(workMins * 60);
                        }
                        return 0;
                    }
                    return s - 1;
                });
                if (phase === 'work') setElapsed(e => e + 1);
            }, 1000);
        }
        return () => clearInterval(intervalRef.current!);
    }, [running, phase, workMins, restMins]);

    const applyPreset = (preset: typeof PRESETS[0]) => {
        if (preset.work === 0) { setShowCustom(true); return; }
        setShowCustom(false);
        setWorkMins(preset.work);
        setRestMins(preset.rest);
        setSecondsLeft(preset.work * 60);
        setRunning(false);
        setPhase('work');
    };

    const handleComplete = () => {
        if (selectedTaskId) onComplete(selectedTaskId, Math.ceil(elapsed / 60));
        onClose();
    };

    const circumference = 2 * Math.PI * 54;
    const miniCircumference = 2 * Math.PI * 16;

    // â”€â”€ MINI PILL MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (minimized) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed top-14 right-4 z-[200] flex items-center gap-2 bg-[#1A1A2E] text-[#F8F7F4] rounded-full px-3 py-2 shadow-2xl cursor-pointer select-none"
                onClick={() => setMinimized(false)}
                title="Click to expand"
            >
                {/* Mini ring */}
                <svg width="38" height="38" className="-rotate-90">
                    <circle cx="19" cy="19" r="16" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <motion.circle cx="19" cy="19" r="16" fill="transparent"
                        stroke={phase === 'work' ? '#f59e0b' : '#22c55e'}
                        strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={miniCircumference}
                        strokeDashoffset={miniCircumference * (1 - progress)}
                    />
                    {/* Play/pause dot */}
                </svg>
                <div className="flex flex-col leading-tight">
                    <span className="font-black text-sm tabular-nums">{mins}:{secs}</span>
                    {selectedTask && (
                        <span className="text-[8px] font-mono opacity-50 max-w-[120px] truncate">{selectedTask.title}</span>
                    )}
                </div>
                <button
                    onClick={e => { e.stopPropagation(); setRunning(r => !r); }}
                    className="ml-1 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center"
                >
                    {running ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
                </button>
                <button
                    onClick={e => { e.stopPropagation(); onClose(); }}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center opacity-60 hover:opacity-100"
                    title="Close timer"
                >
                    <X size={9} />
                </button>
            </motion.div>
        );
    }

    // â”€â”€ FULL PANEL MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-12 right-4 z-[200] w-80 bg-[#1A1A2E] text-[#F8F7F4] rounded-2xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Timer size={14} className="text-amber-400" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Deep Focus</span>
                    {running && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <div className="flex items-center gap-1">
                    {/* Minimize to pill â€” keeps timer running */}
                    <button
                        onClick={() => setMinimized(true)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center opacity-60 hover:opacity-100"
                        title="Minimize (timer keeps running)"
                    >
                        <Minimize2 size={11} />
                    </button>
                    {/* Close fully â€” stops timer */}
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center opacity-60 hover:opacity-100"
                        title="Close and stop timer"
                    >
                        <X size={11} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Timer ring */}
                <div className="flex justify-center relative">
                    <svg width="128" height="128" className="-rotate-90">
                        <circle cx="64" cy="64" r="54" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                        <motion.circle
                            cx="64" cy="64" r="54" fill="transparent"
                            stroke={phase === 'work' ? '#f59e0b' : '#22c55e'}
                            strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress)}
                            animate={{ strokeDashoffset: circumference * (1 - progress) }}
                            transition={{ duration: 0.5 }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black tabular-nums tracking-tighter">{mins}:{secs}</span>
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                            {phase === 'work' ? 'ðŸŽ¯ Focus' : 'â˜• Rest'}
                        </span>
                        {selectedTask && (
                            <span className="text-[8px] font-mono opacity-30 max-w-[90px] text-center truncate mt-0.5">
                                {selectedTask.isFrog && 'ðŸ¸ '}{selectedTask.title}
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => { setSecondsLeft(workMins * 60); setRunning(false); setPhase('work'); setElapsed(0); }}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                        <RotateCcw size={13} />
                    </button>
                    <button
                        onClick={() => setRunning(r => !r)}
                        className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center shadow-lg"
                    >
                        {running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </button>
                    <button
                        onClick={() => setMuted(m => !m)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                </div>

                {/* Presets */}
                <div className="flex gap-1">
                    {PRESETS.map(p => (
                        <button key={p.label} onClick={() => applyPreset(p)}
                            className={cn('flex-1 py-1 text-[9px] font-mono uppercase rounded-lg transition-colors',
                                workMins === p.work && restMins === p.rest && p.work !== 0 ? 'bg-amber-500 text-black' : 'bg-white/8 hover:bg-white/15'
                            )}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {showCustom && (
                    <div className="flex gap-2">
                        <input value={customWork} onChange={e => setCustomWork(e.target.value)} placeholder="Work min"
                            className="flex-1 bg-white/10 text-xs font-mono rounded-lg px-2 py-1.5 outline-none text-center" />
                        <input value={customRest} onChange={e => setCustomRest(e.target.value)} placeholder="Rest min"
                            className="flex-1 bg-white/10 text-xs font-mono rounded-lg px-2 py-1.5 outline-none text-center" />
                        <button onClick={() => {
                            const w = parseInt(customWork) || 25;
                            const r = parseInt(customRest) || 5;
                            setWorkMins(w); setRestMins(r); setSecondsLeft(w * 60); setShowCustom(false);
                        }} className="px-2 py-1 bg-amber-500 text-black text-[9px] font-mono rounded-lg">Set</button>
                    </div>
                )}

                {/* Sound picker */}
                <div className="flex gap-1">
                    {SOUNDS.map(s => (
                        <button key={s.value} onClick={() => setSound(s.value)} title={s.label}
                            className={cn('flex-1 py-1.5 rounded-lg text-base transition-colors',
                                sound === s.value ? 'bg-white/20' : 'bg-white/5 hover:bg-white/12'
                            )}>
                            {s.emoji}
                        </button>
                    ))}
                </div>

                {/* Task picker */}
                <div className="relative">
                    <button onClick={() => setShowTaskPicker(p => !p)}
                        className="w-full flex items-center justify-between bg-white/8 hover:bg-white/15 rounded-xl px-3 py-2 text-left">
                        <span className="text-xs truncate">{selectedTask ? (selectedTask.isFrog ? 'ðŸ¸ ' : '') + selectedTask.title : 'No task linked'}</span>
                        <ChevronDown size={12} className={cn('shrink-0 opacity-40 transition-transform', showTaskPicker && 'rotate-180')} />
                    </button>
                    {showTaskPicker && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] rounded-xl border border-white/10 shadow-xl z-10 max-h-36 overflow-y-auto">
                            <button onClick={() => { setSelectedTaskId(null); setShowTaskPicker(false); }}
                                className="w-full text-left px-3 py-2 text-xs opacity-40 hover:opacity-70 font-mono">Clear</button>
                            {tasks.filter(t => t.status !== 'done').map(t => (
                                <button key={t.id} onClick={() => { setSelectedTaskId(t.id); setShowTaskPicker(false); }}
                                    className={cn('w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10',
                                        selectedTaskId === t.id && 'bg-white/10'
                                    )}>
                                    {t.isFrog && <span>ðŸ¸</span>}
                                    <span className="truncate">{t.title}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Complete button */}
                {selectedTaskId && elapsed > 30 && (
                    <button onClick={handleComplete}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-mono font-bold transition-colors">
                        <CheckCircle2 size={14} /> Log {Math.ceil(elapsed / 60)}m &amp; Complete
                    </button>
                )}
            </div>
        </motion.div>
    );
}
