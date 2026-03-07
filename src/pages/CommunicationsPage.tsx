// ── Communications Page ─────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ThreadedInbox } from '../features/communications/ThreadedInbox';
import { CommForm } from '../features/communications/CommForm';
import { Button } from '../shared/Button';

export function CommunicationsPage() {
    const [showForm, setShowForm] = useState(false);

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Activity</h1>
                    <p className="text-sm text-gray-500 mt-0.5">All communications and interactions</p>
                </div>
                <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Log Communication</Button>
            </div>
            <ThreadedInbox />
            <CommForm open={showForm} onClose={() => setShowForm(false)} />
        </div>
    );
}
