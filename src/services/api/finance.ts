import { request } from './request.ts';
import type { Estimate } from '../../types.ts';

export const getJobEstimates = (jobId: number) => request<Estimate[]>(`/jobs/${jobId}/estimates`);
export const createEstimate = (jobId: number, data: Partial<Estimate>) => request<Estimate>(`/jobs/${jobId}/estimates`, { method: 'POST', body: JSON.stringify(data) });
export const updateEstimate = (id: number, data: Partial<Estimate>) => request<Estimate>(`/estimates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEstimate = (id: number) => request<{ success: boolean }>(`/estimates/${id}`, { method: 'DELETE' });
