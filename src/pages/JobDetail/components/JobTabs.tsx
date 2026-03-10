import React from 'react';
import { ClipboardList, Mail, Users, DollarSign, Clock, Plus } from 'lucide-react';
import { Card } from '../../../shared/Card';
import { Badge } from '../../../shared/Badge';
import { Button } from '../../../shared/Button';
import { JobTimeline } from '../../../features/jobs/JobTimeline';
import { ClientMessagesTab } from '../../../features/communications/ClientMessagesTab';
import { JobDocumentsTab } from '../../../features/documents/JobDocumentsTab';
import { FinanceTab } from '../../../features/finance/FinanceTab';
import { ProductionTab } from '../../../features/production/ProductionTab';
import { cn } from '../../../utils.ts';
import { type Task, type JobContact } from '../../../types.ts';

export type JobTabType = 'timeline' | 'tasks' | 'messages' | 'contacts' | 'documents' | 'estimates' | 'financials' | 'production';

interface JobTabsProps {
    jobId: number;
    activeTab: JobTabType;
    onTabChange: (tab: JobTabType) => void;
    jobTasks: Task[];
    jobContacts?: JobContact[];
    onAddTask: () => void;
    onAddComm: () => void;
    onAddEstimate: () => void;
    onLinkContact: () => void;
}

export function JobTabs({
    jobId,
    activeTab,
    onTabChange,
    jobTasks,
    jobContacts = [],
    onAddTask,
    onAddComm,
    onAddEstimate,
    onLinkContact
}: JobTabsProps) {
    const tabs: { key: JobTabType; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
        { key: 'tasks', label: 'Tasks', icon: <ClipboardList size={14} />, count: jobTasks.length },
        { key: 'messages', label: 'Messages', icon: <Mail size={14} /> },
        { key: 'contacts', label: 'Contacts', icon: <Users size={14} />, count: jobContacts.length },
        { key: 'documents', label: 'Documents', icon: <ClipboardList size={14} /> },
        { key: 'estimates', label: 'Estimates', icon: <DollarSign size={14} /> },
        { key: 'financials', label: 'Financials', icon: <DollarSign size={14} /> },
        { key: 'production', label: 'Production', icon: <ClipboardList size={14} /> },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-6 border-b border-white/10 mt-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={cn(
                            'flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer',
                            activeTab === tab.key ? 'text-blue-400 border-blue-400' : 'text-gray-500 hover:text-white border-transparent'
                        )}
                    >
                        {tab.icon}{tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                        )}
                    </button>
                ))}
                <div className="ml-auto flex gap-2 pb-3">
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={onAddTask}>Task</Button>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={onAddComm}>Comm</Button>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={onAddEstimate}>Estimate</Button>
                    <Button size="sm" variant="secondary" icon={<Users size={14} />} onClick={onLinkContact}>Contact</Button>
                </div>
            </div>

            <div className="min-h-[300px]">
                {activeTab === 'timeline' && <JobTimeline jobId={jobId} />}
                {activeTab === 'messages' && <ClientMessagesTab jobId={jobId} />}
                {activeTab === 'tasks' && (
                    <div className="flex flex-col gap-2">
                        {jobTasks.map(task => (
                            <Card key={task.id} padding="sm" className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.status === 'done' ? '#2ED573' : '#FDCB6E' }} />
                                <span className="text-sm text-white flex-1">{task.title}</span>
                                <Badge color={task.priority === 'urgent' ? '#FF6B6B' : '#A29BFE'} size="sm">{task.priority}</Badge>
                                <Badge color={task.status === 'done' ? '#2ED573' : '#74B9FF'} size="sm">{task.status}</Badge>
                            </Card>
                        ))}
                        {jobTasks.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">No tasks for this job</p>}
                    </div>
                )}
                {activeTab === 'contacts' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {jobContacts.map(jc => (
                            <Card key={jc.id} padding="sm" className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
                                    <Users size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">{jc.contact?.firstName} {jc.contact?.lastName}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{jc.role || jc.contact?.role || 'Stakeholder'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <p className="text-[10px] text-gray-400">{jc.contact?.phone}</p>
                                    <p className="text-[10px] text-gray-400">{jc.contact?.email}</p>
                                </div>
                            </Card>
                        ))}
                        {jobContacts.length === 0 && (
                            <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl">
                                <p className="text-sm text-gray-500 mb-4">No contacts linked to this project</p>
                                <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={onLinkContact}>Link First Contact</Button>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'documents' && <JobDocumentsTab jobId={jobId} />}
                {activeTab === 'estimates' && <p className="text-sm text-gray-500 py-8 text-center">Estimates appear here after creation</p>}
                {activeTab === 'financials' && <FinanceTab jobId={jobId} />}
                {activeTab === 'production' && <ProductionTab jobId={jobId} />}
            </div>
        </div>
    );
}
 
 
