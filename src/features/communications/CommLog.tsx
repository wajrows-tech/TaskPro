// ── Communication Log ───────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { Phone, Mail, MessageSquare, Calendar, StickyNote, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Badge } from '../../shared/Badge';
import { Card } from '../../shared/Card';
import { EmptyState } from '../../shared/EmptyState';
import { timeAgo, truncate } from '../../utils.ts';

const channelConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    email: { icon: <Mail size={14} />, color: '#74B9FF', label: 'Email' },
    call: { icon: <Phone size={14} />, color: '#2ED573', label: 'Call' },
    text: { icon: <MessageSquare size={14} />, color: '#A29BFE', label: 'Text' },
    meeting: { icon: <Calendar size={14} />, color: '#FDCB6E', label: 'Meeting' },
    note: { icon: <StickyNote size={14} />, color: '#FD79A8', label: 'Note' },
    letter: { icon: <FileText size={14} />, color: '#636E72', label: 'Letter' },
};

interface CommLogProps {
    jobId?: number;
    contactId?: number;
}

export function CommLog({ jobId, contactId }: CommLogProps) {
    const { communications } = useApp();

    const filtered = useMemo(() => {
        let result = [...communications];
        if (jobId) result = result.filter(c => c.jobId === jobId);
        if (contactId) result = result.filter(c => c.contactId === contactId);
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [communications, jobId, contactId]);

    if (filtered.length === 0) {
        return <EmptyState title="No communications" description="Log a call, email, or note to start tracking activity" />;
    }

    return (
        <div className="flex flex-col gap-2">
            {filtered.map(comm => {
                const config = channelConfig[comm.channel] || channelConfig.note;
                return (
                    <Card key={comm.id} padding="sm" className="flex items-start gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${config.color}20`, color: config.color }}
                        >
                            {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{comm.subject || config.label}</span>
                                <Badge color={config.color} size="sm">{config.label}</Badge>
                                {comm.direction === 'inbound'
                                    ? <ArrowDownLeft size={12} className="text-emerald-400" />
                                    : <ArrowUpRight size={12} className="text-blue-400" />
                                }
                            </div>
                            {comm.body && <p className="text-xs text-gray-500 mt-0.5">{truncate(comm.body, 150)}</p>}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                                <span>{timeAgo(comm.createdAt)}</span>
                                {comm.jobName && <span>Job: {comm.jobName}</span>}
                                {comm.contactName && <span>Contact: {comm.contactName}</span>}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
 
 
