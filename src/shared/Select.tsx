// ── Shared Select Component ─────────────────────────────────────────────────
import React from 'react';
import { cn } from '../utils.ts';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: SelectOption[];
    onChange: (value: string) => void;
}

export function Select({ label, options, onChange, className, value, id, ...props }: SelectProps) {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-');
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={selectId} className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <select
                id={selectId}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={cn(
                    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white',
                    'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30',
                    'transition-all duration-200 cursor-pointer appearance-none',
                    className
                )}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
