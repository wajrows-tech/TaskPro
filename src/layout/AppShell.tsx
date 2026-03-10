// ── App Shell: Sidebar + Content ────────────────────────────────────────────
import React, { useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../shared/Toast';
import { DashboardPage } from '../pages/DashboardPage';
import { JobsPage } from '../pages/JobsPage';
import { JobDetailPage } from '../pages/JobDetailPage';
import { ContactsPage } from '../pages/ContactsPage';
import { ContactDetailPage } from '../pages/ContactDetailPage';
import { TasksPage } from '../pages/TasksPage';
import { CommunicationsPage } from '../pages/CommunicationsPage';
import { EstimatesPage } from '../pages/EstimatesPage';
import { AIPage } from '../pages/AIPage';
import { SettingsPage } from '../pages/SettingsPage';
import { IntegrationsPage } from '../pages/IntegrationsPage';
import { EventLogPage } from '../pages/EventLogPage';
import { AutomationsPage } from '../pages/AutomationsPage';
import { VoiceAgent } from '../components/VoiceAgent';
import { CommandCenter } from '../features/search/CommandCenter';
import { useUI, type Page } from '../contexts/UIContext';
import { useApp } from '../contexts/AppContext';

// Map AI agent tab names → Page types
const TAB_TO_PAGE: Record<string, Page> = {
    dashboard: 'dashboard',
    jobs: 'jobs',
    pipeline: 'jobs',
    contacts: 'contacts',
    tasks: 'tasks',
    planner: 'tasks',
    calendar: 'tasks',
    comms: 'communications',
    communications: 'communications',
    estimates: 'estimates',
    assistant: 'ai',
    ai: 'ai',
    history: 'dashboard',
    map: 'tasks',
    settings: 'settings',
};

export function AppShell() {
    const { currentPage, pageParams, navigate, setAIPanelOpen } = useUI();
    const { jobs, tasks, refreshAll } = useApp();

    const handleAgentNavigate = useCallback((tab: string, entityId?: number, entityType?: string) => {
        const page = TAB_TO_PAGE[tab] || 'dashboard';
        if (entityType === 'job' && entityId) {
            navigate('job-detail', { jobId: entityId });
        } else if (entityType === 'contact' && entityId) {
            navigate('contact-detail', { contactId: entityId });
        } else {
            navigate(page);
        }
    }, [navigate]);

    const getJobs = useCallback(() => jobs, [jobs]);
    const getTasksList = useCallback(() => tasks, [tasks]);

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardPage />;
            case 'jobs': return <JobsPage />;
            case 'job-detail': return <JobDetailPage jobId={pageParams.jobId!} />;
            case 'contacts': return <ContactsPage />;
            case 'contact-detail': return <ContactDetailPage contactId={pageParams.contactId!} />;
            case 'tasks': return <TasksPage />;
            case 'communications': return <CommunicationsPage />;
            case 'estimates': return <EstimatesPage />;
            case 'ai': return <AIPage />;
            case 'settings': return <SettingsPage />;
            case 'integrations': return <IntegrationsPage />;
            case 'event-log': return <EventLogPage />;
            case 'automations': return <AutomationsPage />;
            default: return <DashboardPage />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {renderPage()}
            </main>
            <ToastContainer />
            <CommandCenter />
            <VoiceAgent
                onNavigate={handleAgentNavigate}
                onRefreshData={refreshAll}
                getJobs={getJobs}
                getTasks={getTasksList}
                onClose={() => setAIPanelOpen(false)}
            />
        </div>
    );
}
 
 
