// ── Contacts Page ───────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ContactList } from '../features/contacts/ContactList';
import { ContactForm } from '../features/contacts/ContactForm';
import { Button } from '../shared/Button';
import { useApp } from '../contexts/AppContext';
import { TableSkeleton } from '../components/ui/Skeleton';

export function ContactsPage() {
    const { isLoading } = useApp();
    const [showForm, setShowForm] = useState(false);

    if (isLoading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Contacts</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Your network of homeowners, adjusters, and subs</p>
                </div>
                <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>New Contact</Button>
            </div>
            <ContactList />
            <ContactForm open={showForm} onClose={() => setShowForm(false)} />
        </div>
    );
}
 
