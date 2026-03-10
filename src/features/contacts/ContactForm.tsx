// ── Contact Create/Edit Form ────────────────────────────────────────────────
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import { CONTACT_ROLES, type Contact, type ContactRole } from '../../types.ts';
import { Modal } from '../../shared/Modal';
import { Input, Textarea } from '../../shared/Input';
import { Select } from '../../shared/Select';
import { Button } from '../../shared/Button';

interface ContactFormProps {
    open: boolean;
    onClose: () => void;
    editContact?: Contact | null;
}

export function ContactForm({ open, onClose, editContact }: ContactFormProps) {
    const { refreshContacts } = useApp();
    const { addToast, navigate } = useUI();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        firstName: editContact?.firstName || '',
        lastName: editContact?.lastName || '',
        role: editContact?.role || 'homeowner' as ContactRole,
        company: editContact?.company || '',
        email: editContact?.email || '',
        phone: editContact?.phone || '',
        address: editContact?.address || '',
        notes: editContact?.notes || '',
    });

    const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.firstName.trim()) return addToast('First name is required', 'error');
        setSaving(true);
        try {
            if (editContact) {
                await api.updateContact(editContact.id, form);
                addToast('Contact updated', 'success');
            } else {
                const newContact = await api.createContact(form);
                addToast('Contact created', 'success');
                navigate('contact-detail', { contactId: newContact.id });
            }
            await refreshContacts();
            onClose();
        } catch (err) {
            addToast('Failed to save contact', 'error');
        }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={onClose} title={editContact ? 'Edit Contact' : 'New Contact'} size="md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name *" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
                    <Input label="Last Name" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select label="Role" options={CONTACT_ROLES.map(r => ({ value: r.key, label: r.label }))} value={form.role} onChange={v => update('role', v)} />
                    <Input label="Company" value={form.company} onChange={e => update('company', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
                    <Input label="Phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>

                <Input label="Address" value={form.address} onChange={e => update('address', e.target.value)} />
                <Textarea label="Notes" value={form.notes} onChange={e => update('notes', e.target.value)} />

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editContact ? 'Update' : 'Create Contact'}</Button>
                </div>
            </form>
        </Modal>
    );
}
 
