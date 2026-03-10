// ── Contact List ────────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import { Search, Plus, Phone, Mail, Building } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { CONTACT_ROLES, type Contact } from '../../types.ts';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Input } from '../../shared/Input';
import { EmptyState } from '../../shared/EmptyState';

export function ContactList() {
    const { contacts } = useApp();
    const { navigate } = useUI();
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search) return contacts;
        const q = search.toLowerCase();
        return contacts.filter(c =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q) ||
            c.phone?.includes(q)
        );
    }, [contacts, search]);

    const roleConfig = (role: string) => CONTACT_ROLES.find(r => r.key === role);

    if (contacts.length === 0) {
        return <EmptyState title="No contacts yet" description="Add your first contact to get started" />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(contact => {
                    const role = roleConfig(contact.role);
                    return (
                        <Card
                            key={contact.id}
                            hover
                            onClick={() => navigate('contact-detail', { contactId: contact.id })}
                            className="flex flex-col gap-2"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-white">
                                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{contact.firstName} {contact.lastName}</p>
                                        {contact.company && (
                                            <p className="text-[11px] text-gray-500 flex items-center gap-1"><Building size={10} />{contact.company}</p>
                                        )}
                                    </div>
                                </div>
                                <Badge color={role?.color} size="sm">{role?.label || contact.role}</Badge>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                {contact.phone && (
                                    <span className="flex items-center gap-1"><Phone size={11} />{contact.phone}</span>
                                )}
                                {contact.email && (
                                    <span className="flex items-center gap-1 truncate"><Mail size={11} />{contact.email}</span>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
 
 
