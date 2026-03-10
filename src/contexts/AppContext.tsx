// ── AppContext: Central CRM data provider ──────────────────────────────────
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Job, Contact, Task, Communication, Estimate, Note } from '../types.ts';
import { api, DashboardStats } from '../services/api.ts';

interface AppState {
    jobs: Job[];
    contacts: Contact[];
    tasks: Task[];
    communications: Communication[];
    notes: Note[];
    stats: DashboardStats | null;
    isLoading: boolean;
}

interface AppActions {
    refreshAll: () => Promise<void>;
    refreshJobs: () => Promise<void>;
    refreshContacts: () => Promise<void>;
    refreshTasks: () => Promise<void>;
    refreshCommunications: () => Promise<void>;
    refreshNotes: () => Promise<void>;
    refreshStats: () => Promise<void>;
}

type AppContextValue = AppState & AppActions;

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshJobs = useCallback(async () => {
        try { setJobs(await api.getJobs()); } catch (e) { console.error('Failed to load jobs:', e); }
    }, []);

    const refreshContacts = useCallback(async () => {
        try { setContacts(await api.getContacts()); } catch (e) { console.error('Failed to load contacts:', e); }
    }, []);

    const refreshTasks = useCallback(async () => {
        try { setTasks(await api.getTasks()); } catch (e) { console.error('Failed to load tasks:', e); }
    }, []);

    const refreshCommunications = useCallback(async () => {
        try { setCommunications(await api.getCommunications()); } catch (e) { console.error('Failed to load comms:', e); }
    }, []);

    const refreshNotes = useCallback(async () => {
        try { setNotes(await api.getNotes()); } catch (e) { console.error('Failed to load notes:', e); }
    }, []);

    const refreshStats = useCallback(async () => {
        try { setStats(await api.getStats()); } catch (e) { console.error('Failed to load stats:', e); }
    }, []);

    const refreshAll = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([refreshJobs(), refreshContacts(), refreshTasks(), refreshCommunications(), refreshNotes(), refreshStats()]);
        setIsLoading(false);
    }, [refreshJobs, refreshContacts, refreshTasks, refreshCommunications, refreshNotes, refreshStats]);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    return (
        <AppContext.Provider value={{
            jobs, contacts, tasks, communications, notes, stats, isLoading,
            refreshAll, refreshJobs, refreshContacts, refreshTasks, refreshCommunications, refreshNotes, refreshStats,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within <AppProvider>');
    return ctx;
}
 
 
