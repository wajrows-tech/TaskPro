import { request } from './request.ts';
import type { Job } from '../../types.ts';

export const getJobs = () => request<Job[]>('/jobs');
export const getJob = (id: number) => request<Job>(`/jobs/${id}`);
export const createJob = (data: Partial<Job>) => request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) });
export const updateJob = (id: number, data: Partial<Job>) => request<Job>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteJob = (id: number) => request<{ success: boolean }>(`/jobs/${id}`, { method: 'DELETE' });

export const linkJobContact = (jobId: number, contactId: number, role?: string) =>
    request<{ success: boolean }>(`/jobs/${jobId}/contacts`, { method: 'POST', body: JSON.stringify({ contactId, role }) });
export const unlinkJobContact = (jobId: number, contactId: number) =>
    request<{ success: boolean }>(`/jobs/${jobId}/contacts/${contactId}`, { method: 'DELETE' });
