import { request } from './request.ts';

export const getAiThreads = () => request<any[]>('/ai-threads');
export const createAiThread = (title?: string) => request<any>('/ai-threads', { method: 'POST', body: JSON.stringify({ title }) });
export const getAiMessages = (threadId: number) => request<any[]>(`/ai-threads/${threadId}/messages`);
export const saveAiMessage = (data: { role: string; content: string; functionCalls?: any[]; threadId?: number }) => request<any>('/ai-conversations', { method: 'POST', body: JSON.stringify(data) });
export const aiQuery = (sql: string) => request<any[]>('/ai-query', { method: 'POST', body: JSON.stringify({ sql }) });
export const deleteAiThread = (id: number) => request<{ success: boolean }>(`/ai-threads/${id}`, { method: 'DELETE' });
export const updateAiThread = (id: number, data: any) => request<any>(`/ai-threads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const clearAiConversations = () => Promise.resolve({ success: true });
export const getThreadMessages = (id: number) => getAiMessages(id);
export const getAiSuggestions = () => request<any[]>('/ai/suggestions');

// Agent Governance
export const getPendingApprovals = () => request<any[]>('/agents/pending');
export const approveAgentAction = (id: number) => request<any>(`/agents/approve/${id}`, { method: 'POST' });
 
