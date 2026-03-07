import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, CheckCircle2, Clock, ArrowRight, Sun, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '../utils.ts';

interface CheckInModalProps {
    type: 'daily' | 'weekly';
    onClose: () => void;
    onSubmit: (answers: { focus: string; urgentClients: string; waitingOn: string; notes: string }) => void;
}

const QUICK_FOCUSES = [
    'Job Follow-ups', 'Field Inspections', 'Invoicing & Finance',
    'Document Preparation', 'Supplement Writing', 'Production Oversight',
];

export function CheckInModal({ type, onClose, onSubmit }: CheckInModalProps) {
    const [step, setStep] = useState(0);
    const [focus, setFocus] = useState('');
    const [urgentClients, setUrgentClients] = useState('');
    const [waitingOn, setWaitingOn] = useState('');
    const [notes, setNotes] = useState('');

    const isWeekly = type === 'weekly';
    const totalSteps = isWeekly ? 4 : 3;

    const handlePrev = () => setStep(s => Math.max(0, s - 1));
    const handleNext = () => {
        if (step < totalSteps - 1) setStep(s => s + 1);
        else onSubmit({ focus, urgentClients, waitingOn, notes });
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-8"
            onClick={onClose}
        >
            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-[#F8F7F4] border border-[#1A1A2E] w-full max-w-lg shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-[#1A1A2E] text-[#F8F7F4] p-6 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {isWeekly ? <Calendar size={20} className="text-violet-400" /> : <Sun size={20} className="text-amber-400" />}
                            <h2 className="text-xl font-bold tracking-tight uppercase">
                                {isWeekly ? 'Weekly Pipeline Scan' : 'Daily Check-In'}
                            </h2>
                        </div>
                        <p className="font-mono text-[10px] uppercase opacity-40 tracking-widest">
                            {isWeekly ? 'Review your pipeline Â· Prepare for the week ahead' : 'Set your focus Â· Stay on target'}
                        </p>
                    </div>
                    <button onClick={onClose} className="hover:opacity-50 transition-opacity mt-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Progress dots (Removed for single step) */}

                {/* Steps */}
                <div className="p-6 pt-5 min-h-[280px] flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col flex-1 gap-4"
                        >
                            <div>
                                <label className="font-mono text-[11px] uppercase opacity-50 tracking-widest block mb-3">
                                    ðŸŽ¯ What's your main focus today?
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={focus}
                                    onChange={e => setFocus(e.target.value)}
                                    placeholder="e.g. Close the Smith estimate..."
                                    className="w-full p-3 bg-white border border-[#1A1A2E]/20 focus:border-[#1A1A2E] focus:outline-none font-mono text-sm transition-colors"
                                />
                            </div>
                            <div>
                                <p className="font-mono text-[9px] uppercase opacity-30 mb-2 tracking-widest">Quick select:</p>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_FOCUSES.map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFocus(f)}
                                            className={cn(
                                                "px-3 py-1.5 text-[10px] font-mono uppercase border transition-all",
                                                focus === f
                                                    ? "bg-[#1A1A2E] text-[#F8F7F4] border-[#1A1A2E]"
                                                    : "border-[#1A1A2E]/20 hover:border-[#1A1A2E]"
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-end">
                    <button
                        onClick={() => onSubmit({ focus, urgentClients: '', waitingOn: '', notes: '' })}
                        className="bg-emerald-600 text-white px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                        <Sparkles size={14} /> Let AI Process
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
