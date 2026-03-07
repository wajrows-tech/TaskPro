import { request } from './request.ts';
import type { Task, Subtask } from '../../types.ts';

export const getTasks = () => request<Task[]>('/tasks');
export const createTask = (data: Partial<Task>) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id: number, data: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id: number) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' });
export const batchUpdateTask = (ids: number[], data: Partial<Task>) => Promise.all(ids.map(id => updateTask(id, data)));
export const getTaskDependencies = () => request<any[]>('/tasks').then(tasks => (tasks as any[]).flatMap(t => (t.dependsOn || []).map((d: number) => ({ taskId: t.id, dependsOnTaskId: d }))));

export const createSubtask = (taskId: number, title: string) => request<Subtask>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) });
export const updateSubtask = (id: number, data: Partial<Subtask>) => request<Subtask>(`/subtasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSubtask = (id: number) => request<{ success: boolean }>(`/subtasks/${id}`, { method: 'DELETE' });
export const getSubtasks = (taskId: number) => request<Subtask[]>(`/tasks/${taskId}/subtasks`);

export const addTaskDependency = (taskId: number, dependsOnTaskId: number) => request<{ success: boolean }>(`/tasks/${taskId}/dependencies`, { method: 'POST', body: JSON.stringify({ dependsOnTaskId }) });
export const removeTaskDependency = (taskId: number, depId: number) => request<{ success: boolean }>(`/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' });
