import { request } from './request.ts';
import type { Communication } from '../../types.ts';

export const getCommunications = () => request<Communication[]>('/communications');
export const createCommunication = (data: Partial<Communication>) => request<Communication>('/communications', { method: 'POST', body: JSON.stringify(data) });
export const updateCommunication = (id: number, data: Partial<Communication>) => request<Communication>(`/communications/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCommunication = (id: number) => request<{ success: boolean }>(`/communications/${id}`, { method: 'DELETE' });
export const getJobCommunications = (jobId: number) => request<Communication[]>('/communications').then(comms => comms.filter(c => c.jobId === jobId));
