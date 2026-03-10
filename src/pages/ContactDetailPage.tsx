// ── Contact Detail Page ─────────────────────────────────────────────────────
import React, { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Building } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useUI } from '../contexts/UIContext';
import { api } from '../services/api.ts';
import { CONTACT_ROLES } from '../types.ts';
import { ContactForm } from '../features/contacts/ContactForm';
import { ClientMessagesTab } from '../features/communications/ClientMessagesTab';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';

interface ContactDetailPageProps {
    contactId: number;
}

export function ContactDetailPage({ contactId }: ContactDetailPageProps) {
    const { contacts, refreshAll } = useApp();
    const { navigate, addToast } = useUI();
    const [showEdit, setShowEdit] = useState(false);

    const contact = contacts.find(c => c.id === contactId);
    const role = CONTACT_ROLES.find(r => r.key === contact?.role);

    if (!contact) {
        return (
            <div className="p-6">
                <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('contacts')}>Back</Button>
                <p className="text-gray-500 mt-4">Contact not found</p>
            </div>
        );
    }

    const handleDelete = async () => {
        if (!confirm('Delete this contact?')) return;
        try {
            await api.deleteContact(contact.id);
            addToast('Contact deleted', 'success');
            await refreshAll();
            navigate('contacts');
        } catch { addToast('Failed to delete', 'error'); }
    };

    return (
        <div className="p-6 flex flex-col gap-6 max-w-[900px] mx-auto">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('contacts')} className="self-start -ml-2">
                Contacts
            </Button>

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{contact.firstName} {contact.lastName}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge color={role?.color} size="md" className="font-semibold">{role?.label || contact.role}</Badge>
                            {contact.company && <span className="text-sm text-gray-500 flex items-center gap-1 font-medium"><Building size={12} className="text-amber-500" />{contact.company}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" icon={<Edit size={14} />} onClick={() => setShowEdit(true)}>Edit Client</Button>
                    <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={handleDelete}>Delete Contact</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contact.phone && (
                    <Card padding="sm" className="flex items-center gap-4 border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                            <Phone size={18} />
                        </div>
                        <div><p className="text-[10px] font-bold text-gray-500 tracking-wider">PRIMARY PHONE</p><p className="text-sm font-medium text-white">{contact.phone}</p></div>
                    </Card>
                )}
                {contact.email && (
                    <Card padding="sm" className="flex items-center gap-4 border-white/10 hover:border-blue-500/30 transition-colors">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                            <Mail size={18} />
                        </div>
                        <div><p className="text-[10px] font-bold text-gray-500 tracking-wider">EMAIL ADDRESS</p><p className="text-sm font-medium text-white">{contact.email}</p></div>
                    </Card>
                )}
                {contact.address && (
                    <Card padding="sm" className="flex items-center gap-4 border-white/10 hover:border-amber-500/30 transition-colors">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
                            <MapPin size={18} />
                        </div>
                        <div><p className="text-[10px] font-bold text-gray-500 tracking-wider">MAILING ADDRESS</p><p className="text-sm font-medium text-white">{contact.address}</p></div>
                    </Card>
                )}
            </div>

            {contact.notes && (
                <Card className="border-white/10">
                    <h3 className="text-xs font-bold text-amber-500/80 uppercase mb-2 flex items-center gap-2"><Edit size={12} /> File Notes</h3>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
                </Card>
            )}

            <div className="mt-4">
                <ClientMessagesTab contactId={contactId} />
            </div>

            <ContactForm open={showEdit} onClose={() => setShowEdit(false)} editContact={contact} />
        </div>
    );
}
 
 
