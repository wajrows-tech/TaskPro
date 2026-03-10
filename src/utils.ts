// ── Utility functions ───────────────────────────────────────────────────────
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (deduplicates conflicting utilities) */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Format currency */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

/** Format relative time (e.g. "2 hours ago") */
export function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

/** Truncate string */
export function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max) + '…' : str;
}
 
 
