// ── Shared Card Component ───────────────────────────────────────────────────
import React from 'react';
import { cn } from '../utils.ts';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

export function Card({ children, className, onClick, hover = false, padding = 'md' }: CardProps) {
    return (
        <div
            className={cn(
                'bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm',
                hover && 'hover:bg-white/8 hover:border-white/15 transition-all duration-200 cursor-pointer',
                onClick && 'cursor-pointer',
                paddings[padding],
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

// ── Stat card for dashboard ──
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: { value: number; label: string };
    color?: string;
}

export function StatCard({ label, value, icon, trend, color = '#6C5CE7' }: StatCardProps) {
    return (
        <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ background: color, filter: 'blur(30px)' }} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                    {trend && (
                        <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="p-2.5 rounded-xl bg-white/5" style={{ color }}>
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
}
