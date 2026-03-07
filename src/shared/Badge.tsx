// ── Shared Badge Component ──────────────────────────────────────────────────
import React from 'react';
import { cn } from '../utils.ts';

interface BadgeProps {
    children: React.ReactNode;
    color?: string;
    variant?: 'filled' | 'outline';
    size?: 'sm' | 'md';
    className?: string;
}

export function Badge({ children, color = '#6C5CE7', variant = 'filled', size = 'sm', className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-full whitespace-nowrap',
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
                variant === 'filled'
                    ? 'text-white'
                    : 'bg-transparent border',
                className
            )}
            style={variant === 'filled'
                ? { backgroundColor: `${color}30`, color }
                : { borderColor: `${color}50`, color }
            }
        >
            {children}
        </span>
    );
}

// ── Status dot badge ──
interface StatusDotProps {
    status: 'active' | 'warning' | 'danger' | 'success' | 'neutral';
    label?: string;
}

const dotColors = {
    active: 'bg-blue-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    success: 'bg-emerald-500',
    neutral: 'bg-gray-500',
};

export function StatusDot({ status, label }: StatusDotProps) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <span className={cn('w-2 h-2 rounded-full', dotColors[status])} />
            {label}
        </span>
    );
}
