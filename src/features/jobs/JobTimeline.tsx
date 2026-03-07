// ── Job Timeline / Activity Feed ────────────────────────────────────────────
import React from 'react';
import { MessageSquare, FileText, ClipboardList, Phone, Mail, Calendar, StickyNote } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Badge } from '../../shared/Badge';
import { timeAgo, truncate } from '../../utils.ts';
import { cn } from '../../utils.ts';

interface JobTimelineProps {
    jobId: number;
}

interface TimelineItem {
    id: string;
    type: 'comm' | 'task' | 'note';
    icon: React.ReactNode;
    color: string;
    title: string;
    detail: string;
    date: string;
}

const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail size={14} />,
    call: <Phone size={14} />,
    meeting: <Calendar size={14} />,
    text: <MessageSquare size={14} />,
    note: <StickyNote size={14} />,
    letter: <FileText size={14} />,
};

export function JobTimeline({ jobId }: JobTimelineProps) {
    const { communications, tasks, notes } = useApp();

    const items: TimelineItem[] = [
        ...communications.filter(c => c.jobId === jobId).map(c => ({
            id: `comm-${c.id}`,
            type: 'comm' as const,
            icon: channelIcons[c.channel] || <MessageSquare size={14} />,
            color: '#74B9FF',
            title: c.subject || `${c.channel} — ${c.direction}`,
            detail: truncate(c.body, 120),
            date: c.createdAt,
        })),
        ...tasks.filter(t => t.jobId === jobId).map(t => ({
            id: `task-${t.id}`,
            type: 'task' as const,
            icon: <ClipboardList size={14} />,
            color: '#A29BFE',
            title: t.title,
            detail: t.status === 'done' ? 'Completed' : `Status: ${t.status}`,
            date: t.updatedAt || t.createdAt,
        })),
        ...notes.filter(n => n.jobId === jobId).map(n => ({
            id: `note-${n.id}`,
            type: 'note' as const,
            icon: <StickyNote size={14} />,
            color: '#FDCB6E',
            title: 'Note',
            detail: truncate(n.content, 120),
            date: n.createdAt,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (items.length === 0) {
        return <p className="text-sm text-gray-500 py-8 text-center">No activity yet</p>;
    }

    return (
        <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/10" />
            <div className="flex flex-col gap-4">
                {items.map(item => (
                    <div key={item.id} className="flex gap-3 relative">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border border-white/10"
                            style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                            {item.icon}
                        </div>
                        <div className="flex-1 pt-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{item.title}</span>
                                <Badge color={item.color} size="sm">{item.type}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{timeAgo(item.date)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
