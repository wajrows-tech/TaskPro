import React, { useState, useMemo } from 'react';
import { Search, Plus, UserPlus, Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { api } from '../../services/api.ts';
import { Modal } from '../../shared/Modal';
import { Input } from '../../shared/Input';
import { Button } from '../../shared/Button';
import { Badge } from '../../shared/Badge';
import { CONTACT_ROLES, type Contact } from '../../types.ts';

interface LinkContactModalProps {
    open: boolean;
    onClose: () => void;
    jobId: number;
    existingContactIds?: number[];
}

export function LinkContactModal({ open, onClose, jobId, existingContactIds = [] }: LinkContactModalProps) {
    const { contacts, refreshAll } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [linking, setLinking] = useState<number | null>(null);

    const filteredContacts = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return contacts.filter(c =>
            (c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.company.toLowerCase().includes(q))
        );
    }, [contacts, searchQuery]);

    const handleLink = async (contactId: number) => {
        setLinking(contactId);
        try {
            await api.linkJobContact(jobId, contactId);
            await refreshAll();
            // We don't close immediately so they can link multiple if they want, 
            // or we could close. Let's close for simplicity.
            onClose();
        } catch (err) {
            console.error('Failed to link contact:', err);
        }
        setLinking(null);
    };

    return (
        <Modal open={open} onClose={onClose} title="Link Contact to Job" size="md">
            <div className="flex flex-col gap-4">
                <Input
                    placeholder="Search contacts by name, email, or company..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    icon={<Search size={16} />}
                />

                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {filteredContacts.map(contact => {
                        const isLinked = existingContactIds.includes(contact.id);
                        const role = CONTACT_ROLES.find(r => r.key === contact.role);

                        return (
                            <div key={contact.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white">{contact.firstName} {contact.lastName}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge color={role?.color} size="sm">{role?.label}</Badge>
                                        <span className="text-[10px] text-gray-500">{contact.company || 'Private'}</span>
                                    </div>
                                </div>

                                {isLinked ? (
                                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                        <Check size={14} /> Linked
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        icon={<UserPlus size={14} />}
                                        onClick={() => handleLink(contact.id)}
                                        disabled={linking === contact.id}
                                    >
                                        {linking === contact.id ? 'Linking...' : 'Link'}
                                    </Button>
                                )}
                            </div>
                        );
                    })}

                    {filteredContacts.length === 0 && (
                        <div className="py-8 text-center bg-white/[0.02] rounded-lg border border-dashed border-white/10">
                            <p className="text-sm text-gray-500">No contacts found</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => {/* TODO: Open Create Contact */ }}>
                                Create new contact
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
 
