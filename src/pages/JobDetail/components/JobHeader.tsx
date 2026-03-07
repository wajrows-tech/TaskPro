import React from 'react';
import { ArrowLeft, Edit, Trash2, MapPin, Clock } from 'lucide-react';
import { Button } from '../../../shared/Button';
import { Badge } from '../../../shared/Badge';
import { type Job, type JobStage, JOB_STAGES } from '../../../types.ts';
import { timeAgo } from '../../../utils.ts';

interface JobHeaderProps {
    job: Job;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function JobHeader({ job, onBack, onEdit, onDelete }: JobHeaderProps) {
    const stage = JOB_STAGES.find(s => s.key === job.stage);

    return (
        <div className="flex flex-col gap-6">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack} className="self-start -ml-2">
                Jobs
            </Button>

            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">{job.name}</h1>
                        <Badge color={stage?.color} size="md" className="px-3 py-1 font-semibold text-sm">{stage?.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <span className="text-gray-400">{job.jobNumber}</span>
                        {job.address && <span className="flex items-center gap-1"><MapPin size={12} />{job.address}{job.city && `, ${job.city}`}</span>}
                        <span className="flex items-center gap-1"><Clock size={12} /> Updated {timeAgo(job.updatedAt)}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" icon={<Edit size={14} />} onClick={onEdit}>Edit Details</Button>
                    <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={onDelete}>Delete Job</Button>
                </div>
            </div>
        </div>
    );
}
