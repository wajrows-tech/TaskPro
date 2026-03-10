// ── Base Agent ──────────────────────────────────────────────────────────────
// Abstract base class that all 7 agents extend.
// Provides: memory access, thinking transparency, delegation, audit logging.

import { agentMemory, type MemoryType } from './memory.ts';
import { eventBus } from './eventBus.ts';
import type {
    AgentId, AgentManifest, AgentRequest, AgentResponse,
    ThinkingStep, CRMEvent, CRMEventType, AutonomyLevel,
    AGENT_MANIFESTS,
} from './protocol.ts';
import { getAutonomyLevel } from './protocol.ts';

export abstract class BaseAgent {
    readonly id: AgentId;
    readonly manifest: AgentManifest;

    /** Autonomy override — user can set this in settings (0-1) */
    autonomyOverride: number | null = null;

    /** Accumulated thinking steps for the current request chain */
    private _thinkingSteps: ThinkingStep[] = [];

    /** Callback to push thinking steps to the UI in real-time */
    private _onThinkingStep: ((step: ThinkingStep) => void) | null = null;

    constructor(manifest: AgentManifest) {
        this.id = manifest.id;
        this.manifest = manifest;
    }

    // ── Thinking Transparency ──

    /** Set a callback that fires every time the agent produces a thinking step */
    onThinkingStep(cb: (step: ThinkingStep) => void): void {
        this._onThinkingStep = cb;
    }

    /** Record a thinking step — shown to users in the chat panel */
    protected think(message: string, type: ThinkingStep['type'] = 'reasoning', data?: any): void {
        const step: ThinkingStep = {
            agentId: this.id,
            agentName: this.manifest.name,
            agentIcon: this.manifest.icon,
            message,
            type,
            timestamp: Date.now(),
            data,
        };
        this._thinkingSteps.push(step);
        this._onThinkingStep?.(step);
        console.log(`[${this.manifest.icon} ${this.manifest.name}] ${message}`);
    }

    /** Get and clear thinking steps for the current request */
    flushThinkingSteps(): ThinkingStep[] {
        const steps = [...this._thinkingSteps];
        this._thinkingSteps = [];
        return steps;
    }

    // ── Memory Access ──

    protected remember(type: MemoryType, key: string, value: any, confidence: number = 0.5): void {
        agentMemory.remember(this.id, type, key, value, confidence);
        this.think(`📝 Remembered: [${type}] ${key}`, 'action');
    }

    protected recall(key: string): any | null {
        const entry = agentMemory.recall(this.id, key);
        return entry?.value ?? null;
    }

    protected recallByType(type: MemoryType): any[] {
        return agentMemory.recallByType(this.id, type).map(e => e.value);
    }

    protected topMemories(type: MemoryType, k: number = 10): any[] {
        return agentMemory.topK(this.id, type, k).map(e => ({ key: e.key, value: e.value, confidence: e.confidence }));
    }

    protected searchMemory(query: string): any[] {
        return agentMemory.search(this.id, query).map(e => ({ key: e.key, value: e.value }));
    }

    /** Build a context block for AI prompt injection */
    protected getMemoryContext(maxEntries: number = 15): string {
        return agentMemory.buildContext(this.id, maxEntries);
    }

    // ── Autonomy ──

    /** Get the current effective autonomy level */
    getAutonomy(): number {
        return this.autonomyOverride ?? this.manifest.defaultAutonomy;
    }

    getAutonomyLevel(): AutonomyLevel {
        return getAutonomyLevel(this.getAutonomy());
    }

    /** Check if the agent can act autonomously at a given confidence */
    canAct(confidence: number): boolean {
        const level = getAutonomyLevel(this.getAutonomy());
        return level === 'full_auto' || level === 'act_notify';
    }

    // ── Event Bus ──

    /** Subscribe this agent to CRM events */
    protected subscribe(eventTypes: (CRMEventType | '*')[]): void {
        eventBus.subscribe(this.id, eventTypes, (event) => this.onEvent(event));
    }

    /** Fire a CRM event, attributed to this agent */
    protected fireEvent(type: CRMEventType, entityType: string, entityId: number | null, data: Record<string, any>): void {
        eventBus.fire(type, entityType, entityId, data, this.id);
    }

    // ── Abstract Methods ──

    /** Initialize the agent — subscribe to events, load memory */
    abstract initialize(): void;

    /** Handle a direct request (from the orchestrator or another agent) */
    abstract handleRequest(request: AgentRequest): Promise<AgentResponse>;

    /** React to a CRM event (from the event bus) */
    abstract onEvent(event: CRMEvent): void;

    /** Generate a status summary for the dashboard UI */
    abstract getStatus(): { summary: string; health: 'idle' | 'active' | 'error'; lastAction?: string };
}
 
 
