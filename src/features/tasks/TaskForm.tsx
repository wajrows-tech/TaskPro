// ── Task Create/Edit Form ───────────────────────────────────────────────────
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import type { Task, TaskStatus, TaskPriority, TaskAction } from '../../types.ts';
import { Modal } from '../../shared/Modal';
import { Input, Textarea } from '../../shared/Input';
import { Select } from '../../shared/Select';
import { Button } from '../../shared/Button';

const STATUSES: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting_on', label: 'Waiting On' },
    { value: 'done', label: 'Done' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

const ACTIONS: { value: TaskAction; label: string }[] = [
    { value: 'inspect', label: 'Inspect' },
    { value: 'call', label: 'Call' },
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'order', label: 'Order' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'document', label: 'Document' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'other', label: 'Other' },
];

interface TaskFormProps {
    open: boolean;
    onClose: () => void;
    editTask?: Task | null;
    defaultJobId?: number;
}

export function TaskForm({ open, onClose, editTask, defaultJobId }: TaskFormProps) {
    const { jobs, refreshTasks } = useApp();
    const { addToast } = useUI();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: editTask?.title || '',
        description: editTask?.description || '',
        status: editTask?.status || 'todo' as TaskStatus,
        priority: editTask?.priority || 'medium' as TaskPriority,
        action: editTask?.action || 'other' as TaskAction,
        jobId: editTask?.jobId || defaultJobId || null,
        assignedTo: editTask?.assignedTo || '',
        scheduledDate: editTask?.scheduledDate || '',
        startTime: editTask?.startTime || '',
        duration: editTask?.duration || 60,
    });

    const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return addToast('Task title is required', 'error');
        setSaving(true);
        try {
            if (editTask) {
                await api.updateTask(editTask.id, form);
                addToast('Task updated', 'success');
            } else {
                await api.createTask(form);
                addToast('Task created', 'success');
            }
            await refreshTasks();
            onClose();
        } catch (err) {
            addToast('Failed to save task', 'error');
        }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={onClose} title={editTask ? 'Edit Task' : 'New Task'} size="md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Title *" value={form.title} onChange={e => update('title', e.target.value)} placeholder="What needs to be done?" />

                <div className="grid grid-cols-3 gap-4">
                    <Select label="Status" options={STATUSES} value={form.status} onChange={v => update('status', v)} />
                    <Select label="Priority" options={PRIORITIES} value={form.priority} onChange={v => update('priority', v)} />
                    <Select label="Action" options={ACTIONS} value={form.action} onChange={v => update('action', v)} />
                </div>

                <Select
                    label="Job"
                    options={[{ value: '', label: 'No job' }, ...jobs.map(j => ({ value: String(j.id), label: `${j.jobNumber} — ${j.name}` }))]}
                    value={form.jobId ? String(form.jobId) : ''}
                    onChange={v => update('jobId', v ? Number(v) : null)}
                />

                <div className="grid grid-cols-3 gap-4">
                    <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={e => update('scheduledDate', e.target.value)} />
                    <Input label="Start Time" type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
                    <Input label="Duration (min)" type="number" value={form.duration} onChange={e => update('duration', Number(e.target.value))} />
                </div>

                <Input label="Assigned To" value={form.assignedTo} onChange={e => update('assignedTo', e.target.value)} />
                <Textarea label="Description" value={form.description} onChange={e => update('description', e.target.value)} />

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editTask ? 'Update' : 'Create Task'}</Button>
                </div>
            </form>
        </Modal>
    );
}
