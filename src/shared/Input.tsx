// ── Shared Input Component ──────────────────────────────────────────────────
import React from 'react';
import { cn } from '../utils.ts';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>}
                <input
                    id={inputId}
                    className={cn(
                        'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white',
                        'placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30',
                        'transition-all duration-200',
                        icon && 'pl-10',
                        error && 'border-red-500/50',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
    );
}

// ── Textarea ──
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <textarea
                id={inputId}
                className={cn(
                    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white',
                    'placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30',
                    'transition-all duration-200 resize-none min-h-[80px]',
                    className
                )}
                {...props}
            />
        </div>
    );
}
 
 
