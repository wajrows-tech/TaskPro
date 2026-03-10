import { request } from './request.ts';
import type { Contact } from '../../types.ts';

export const getContacts = () => request<Contact[]>('/contacts');
export const getContact = (id: number) => request<Contact>(`/contacts/${id}`);
export const createContact = (data: Partial<Contact>) => request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) });
export const updateContact = (id: number, data: Partial<Contact>) => request<Contact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteContact = (id: number) => request<{ success: boolean }>(`/contacts/${id}`, { method: 'DELETE' });
 
