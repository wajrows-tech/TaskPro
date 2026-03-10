// ── Shared Toast Container ──────────────────────────────────────────────────
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { cn } from '../utils.ts';

const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    error: <AlertCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
};

const borders = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
};

export function ToastContainer() {
    const { toasts, removeToast } = useUI();
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.95 }}
                        className={cn(
                            'pointer-events-auto flex items-center gap-3 bg-gray-900/95 backdrop-blur-xl border rounded-xl px-4 py-3 shadow-2xl min-w-[280px]',
                            borders[toast.type]
                        )}
                    >
                        {icons[toast.type]}
                        <span className="text-sm text-gray-200 flex-1">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer">
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
 
 
