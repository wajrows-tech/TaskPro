// ── Communication Form ──────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import type { CommChannel, CommDirection } from '../../types.ts';
import { Modal } from '../../shared/Modal';
import { Input, Textarea } from '../../shared/Input';
import { Select } from '../../shared/Select';
import { Button } from '../../shared/Button';

const CHANNELS: { value: CommChannel; label: string }[] = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text Message' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'note', label: 'Note' },
    { value: 'letter', label: 'Letter' },
];

const DIRECTIONS: { value: CommDirection; label: string }[] = [
    { value: 'outbound', label: 'Outbound' },
    { value: 'inbound', label: 'Inbound' },
];

interface CommFormProps {
    open: boolean;
    onClose: () => void;
    defaultJobId?: number;
    defaultContactId?: number;
}

export function CommForm({ open, onClose, defaultJobId, defaultContactId }: CommFormProps) {
    const { jobs, contacts, refreshCommunications } = useApp();
    const { addToast } = useUI();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        channel: 'call' as CommChannel,
        direction: 'outbound' as CommDirection,
        subject: '',
        body: '',
        jobId: defaultJobId || null as number | null,
        contactId: defaultContactId || null as number | null,
    });

    const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.body.trim()) return addToast('Details are required', 'error');
        setSaving(true);
        try {
            await api.createCommunication(form);
            addToast('Communication logged', 'success');
            await refreshCommunications();
            onClose();
        } catch (err) {
            addToast('Failed to log communication', 'error');
        }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={onClose} title="Log Communication" size="md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Channel" options={CHANNELS} value={form.channel} onChange={v => update('channel', v)} />
                    <Select label="Direction" options={DIRECTIONS} value={form.direction} onChange={v => update('direction', v)} />
                </div>

                <Input label="Subject" value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="Brief summary" />

                <Select
                    label="Job"
                    options={[{ value: '', label: 'None' }, ...jobs.map(j => ({ value: String(j.id), label: `${j.jobNumber} — ${j.name}` }))]}
                    value={form.jobId ? String(form.jobId) : ''}
                    onChange={v => update('jobId', v ? Number(v) : null)}
                />

                <Select
                    label="Contact"
                    options={[{ value: '', label: 'None' }, ...contacts.map(c => ({ value: String(c.id), label: `${c.firstName} ${c.lastName}` }))]}
                    value={form.contactId ? String(form.contactId) : ''}
                    onChange={v => update('contactId', v ? Number(v) : null)}
                />

                <Textarea label="Details *" value={form.body} onChange={e => update('body', e.target.value)} placeholder="What happened?" />

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log Communication'}</Button>
                </div>
            </form>
        </Modal>
    );
}
 
 
