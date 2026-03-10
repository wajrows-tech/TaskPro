// ── Job Detail Page ─────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { api } from '../services/api.ts';
import { type JobStage } from '../types.ts';
import { JobForm } from '../features/jobs/JobForm.tsx';
import { TaskForm } from '../features/tasks/TaskForm.tsx';
import { CommForm } from '../features/communications/CommForm.tsx';
import { EstimateBuilder } from '../features/estimates/EstimateBuilder.tsx';
import { LinkContactModal } from '../features/contacts/LinkContactModal.tsx';
import { Button } from '../shared/Button.tsx';

// Extracted Components
import { JobHeader } from './JobDetail/components/JobHeader.tsx';
import { JobPipeline } from './JobDetail/components/JobPipeline.tsx';
import { JobInfoPanels } from './JobDetail/components/JobInfoPanels.tsx';
import { JobTabs, type JobTabType } from './JobDetail/components/JobTabs.tsx';

interface JobDetailPageProps {
    jobId: number;
}

export function JobDetailPage({ jobId }: JobDetailPageProps) {
    const { jobs, tasks, refreshJobs, refreshAll } = useApp();
    const { navigate, addToast } = useUI();
    const [activeTab, setActiveTab] = useState<JobTabType>('timeline');

    // Modal states
    const [showEditForm, setShowEditForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showCommForm, setShowCommForm] = useState(false);
    const [showEstimateForm, setShowEstimateForm] = useState(false);
    const [showLinkContact, setShowLinkContact] = useState(false);

    const job = jobs.find(j => j.id === jobId);
    const jobTasks = tasks.filter(t => t.jobId === jobId);

    if (!job) {
        return (
            <div className="p-6">
                <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('jobs')}>Back to Jobs</Button>
                <p className="text-gray-500 mt-4">Job not found</p>
            </div>
        );
    }

    const handleDelete = async () => {
        if (!confirm('Delete this job?')) return;
        try {
            await api.deleteJob(job.id);
            addToast('Job deleted', 'success');
            await refreshAll();
            navigate('jobs');
        } catch { addToast('Failed to delete job', 'error'); }
    };

    const handleStageChange = async (newStage: JobStage) => {
        try {
            await api.updateJob(job.id, { stage: newStage });
            refreshJobs();
            addToast('Job stage updated', 'success');
        } catch { addToast('Failed to update stage', 'error'); }
    };

    return (
        <div className="p-6 flex flex-col gap-6 max-w-[1200px] mx-auto">
            <JobHeader
                job={job}
                onBack={() => navigate('jobs')}
                onEdit={() => setShowEditForm(true)}
                onDelete={handleDelete}
            />

            <JobPipeline
                job={job}
                onStageChange={handleStageChange}
            />

            <JobInfoPanels job={job} />

            <JobTabs
                job={job}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                jobTasks={jobTasks}
                jobContacts={job.contacts}
                onAddTask={() => setShowTaskForm(true)}
                onAddComm={() => setShowCommForm(true)}
                onAddEstimate={() => setShowEstimateForm(true)}
                onLinkContact={() => setShowLinkContact(true)}
            />

            {/* Modals */}
            <JobForm open={showEditForm} onClose={() => setShowEditForm(false)} editJob={job} />
            <TaskForm open={showTaskForm} onClose={() => setShowTaskForm(false)} defaultJobId={jobId} />
            <CommForm open={showCommForm} onClose={() => setShowCommForm(false)} defaultJobId={jobId} />
            <EstimateBuilder open={showEstimateForm} onClose={() => setShowEstimateForm(false)} jobId={jobId} />
            <LinkContactModal
                open={showLinkContact}
                onClose={() => setShowLinkContact(false)}
                jobId={jobId}
                existingContactIds={job.contacts?.map(c => c.contactId)}
            />
        </div>
    );
}


