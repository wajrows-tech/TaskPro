// ── AI Page ─────────────────────────────────────────────────────────────────
import React from 'react';
import { AIChatPanel } from '../features/ai/AIChatPanel';
import { AgentApprovalsPanel } from '../features/ai/AgentApprovalsPanel';

export function AIPage() {
    return (
        <div className="h-full flex">
            <div className="flex-1 min-w-0">
                <AIChatPanel />
            </div>
            <AgentApprovalsPanel />
        </div>
    );
}
