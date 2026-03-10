import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

interface ToastContextType {
    addToast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: Toast['type'], message: string) => {
        const id = Math.random().toString(36).substring(2);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl border backdrop-blur-md font-mono text-xs ${toast.type === 'success'
                                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                                    : toast.type === 'error'
                                        ? 'bg-red-50/90 border-red-200 text-red-800'
                                        : 'bg-white/90 border-gray-200 text-gray-800'
                                }`}
                        >
                            {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
                            {toast.type === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                            {toast.type === 'info' && <Info size={16} className="text-blue-500" />}
                            <span className="uppercase tracking-wider">{toast.message}</span>
                            <button
                                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="ml-2 opacity-40 hover:opacity-100"
                            >
                                <X size={12} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
 
