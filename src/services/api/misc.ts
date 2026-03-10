import { request } from './request.ts';
import type { Note } from '../../types.ts';

export const getNotes = () => request<Note[]>('/notes');
export const createNote = (content: string, type?: string, jobId?: number, contactId?: number) => request<Note>('/notes', { method: 'POST', body: JSON.stringify({ content, type: type || 'general', jobId, contactId }) });
export const deleteNote = (id: number) => request<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' });

export interface DashboardStats {
    totalJobs: number;
    activeJobs: number;
    totalTasks: number;
    openTasks: number;
    totalContacts: number;
    pipelineValue: number;
    revenueCollected: number;
    recentComms: number;
    jobsByStage: { stage: string; count: number; value: number }[];
    repPerformance: { repName: string; jobCount: number; pipelineValue: number }[];
}

export const getStats = () => request<DashboardStats>('/stats');

export interface SearchResults {
    jobs: any[];
    contacts: any[];
    tasks: any[];
    communications: any[];
}

export const search = (query: string) => request<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
 
 
