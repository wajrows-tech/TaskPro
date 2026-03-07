// ── CRM Event Bus ───────────────────────────────────────────────────────────
// Typed pub/sub for CRM events. Agents subscribe to events they care about.
// Server-side: emitted from Express routes on every CRM mutation.
// The backbone of the autonomous agent system.

import { EventEmitter } from 'events';
import type { CRMEvent, CRMEventType, AgentId } from './protocol.ts';

class CRMEventBus extends EventEmitter {
    private eventLog: CRMEvent[] = [];
    private maxLogSize = 500;

    /**
     * Emit a CRM event. All subscribed agents will be notified.
     */
    emitCRM(event: CRMEvent): void {
        // Store in rolling log
        this.eventLog.push(event);
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog = this.eventLog.slice(-this.maxLogSize);
        }

        console.log(`[EventBus] ${event.type} | entity=${event.entityType}#${event.entityId} | by=${event.triggeredBy}`);
        this.emit(event.type, event);
        this.emit('*', event); // wildcard for agents that listen to everything
    }

    /**
     * Subscribe an agent to specific event types.
     */
    subscribe(agentId: AgentId, eventTypes: (CRMEventType | '*')[], handler: (event: CRMEvent) => void): void {
        for (const eventType of eventTypes) {
            this.on(eventType, (event: CRMEvent) => {
                // Don't let an agent react to its own actions (prevent infinite loops)
                if (event.triggeredBy === agentId) return;
                handler(event);
            });
        }
        console.log(`[EventBus] Agent "${agentId}" subscribed to: [${eventTypes.join(', ')}]`);
    }

    /**
     * Get recent events (for agent context).
     */
    getRecentEvents(limit: number = 20, filter?: { eventType?: CRMEventType; entityType?: string }): CRMEvent[] {
        let events = [...this.eventLog];
        if (filter?.eventType) events = events.filter(e => e.type === filter.eventType);
        if (filter?.entityType) events = events.filter(e => e.entityType === filter.entityType);
        return events.slice(-limit);
    }

    /**
     * Helper to create and emit a CRM event.
     */
    fire(type: CRMEventType, entityType: string, entityId: number | null, data: Record<string, any>, triggeredBy: AgentId | 'user' = 'user'): void {
        this.emitCRM({
            type,
            entityType,
            entityId,
            data,
            triggeredBy,
            timestamp: new Date().toISOString(),
        });
    }
}

/** Singleton event bus instance */
export const eventBus = new CRMEventBus();
