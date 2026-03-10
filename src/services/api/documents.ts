import { request } from './request.ts';
import type { Document } from '../../types.ts';

export const getJobDocuments = (jobId: number) => request<Document[]>(`/jobs/${jobId}/documents`);

export const createDocument = async (jobId: number, file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('taskpro_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/jobs/${jobId}/documents`, { method: 'POST', body: formData, headers });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
};

export const deleteDocument = (id: number) => request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' });
 
