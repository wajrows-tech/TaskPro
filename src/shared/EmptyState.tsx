// ── Shared EmptyState Component ─────────────────────────────────────────────
import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-white/5 text-gray-500 mb-4">
                {icon || <Inbox size={32} />}
            </div>
            <h3 className="text-lg font-medium text-gray-300">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
            {action && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
