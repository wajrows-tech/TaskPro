// ── Agent Orchestrator ──────────────────────────────────────────────────────
// The brain of the agentic platform. Routes requests to the right sub-agent,
// manages delegation chains, enforces permissions, and provides thinking
// transparency to the UI layer.
//
// Platform pillars: Rapid Photo Report | ClaimSync | TaskPro Core

import { BaseAgent } from './baseAgent.ts';
import type {
    AgentId, AgentRequest, AgentResponse, ThinkingStep,
    CRMEvent, AGENT_MANIFESTS,
} from './protocol.ts';
import { AGENT_MANIFESTS as manifests } from './protocol.ts';
import { db } from '../db/index.ts';

class AgentOrchestrator {
    private agents: Map<AgentId, BaseAgent> = new Map();
    private auditStmt: any = null;

    /** Real-time thinking stream callback — wired to VoiceAgent UI */
    private _onThinkingStep: ((step: ThinkingStep) => void) | null = null;

    /** Register an agent instance */
    register(agent: BaseAgent): void {
        this.agents.set(agent.id, agent);

        // Wire the agent's thinking steps to the orchestrator's stream
        agent.onThinkingStep((step) => {
            this._onThinkingStep?.(step);
        });

        console.log(`[Orchestrator] Registered: ${agent.manifest.icon} ${agent.manifest.name}`);
    }

    /** Initialize all registered agents */
    initializeAll(): void {
        console.log(`[Orchestrator] Initializing ${this.agents.size} agents...`);
        for (const [id, agent] of this.agents) {
            try {
                agent.initialize();
                console.log(`[Orchestrator] ✅ ${agent.manifest.icon} ${agent.manifest.name} online`);
            } catch (err: any) {
                console.error(`[Orchestrator] ❌ ${agent.manifest.name} failed to initialize:`, err.message);
            }
        }
        console.log(`[Orchestrator] All agents initialized.`);
    }

    /** Set the real-time thinking stream callback */
    onThinkingStep(cb: (step: ThinkingStep) => void): void {
        this._onThinkingStep = cb;
        // Re-wire all existing agents
        for (const agent of this.agents.values()) {
            agent.onThinkingStep(cb);
        }
    }

    /** Get an agent by ID */
    getAgent(id: AgentId): BaseAgent | undefined {
        return this.agents.get(id);
    }

    /** Get all registered agents */
    getAllAgents(): BaseAgent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Route a request to the appropriate agent.
     * This is the primary entry point for the VoiceAgent and other callers.
     */
    async route(request: AgentRequest): Promise<AgentResponse> {
        const agent = this.agents.get(request.toAgent);
        if (!agent) {
            return {
                requestId: request.id,
                fromAgent: 'orchestrator',
                status: 'failed',
                result: { error: `Agent "${request.toAgent}" not found` },
                thinkingSteps: [],
                timeMs: 0,
                confidence: 0,
            };
        }

        const start = Date.now();

        try {
            const response = await agent.handleRequest(request);

            // Audit log
            this.logAudit(agent.id, request.action, request.params, response);

            return {
                ...response,
                timeMs: Date.now() - start,
            };
        } catch (err: any) {
            const timeMs = Date.now() - start;
            return {
                requestId: request.id,
                fromAgent: request.toAgent,
                status: 'failed',
                result: { error: err.message },
                thinkingSteps: agent.flushThinkingSteps(),
                timeMs,
                confidence: 0,
            };
        }
    }

    /**
     * Smart routing — analyze a natural language intent and pick the best agent(s).
     * Used by the Personal Assistant and VoiceAgent.
     */
    async smartRoute(intent: string, params: Record<string, any> = {}): Promise<AgentResponse> {
        const lower = intent.toLowerCase();

        // Route based on intent keywords
        let targetAgent: AgentId = 'personal_assistant';

        // ... existing keyword logic ...
        if (lower.includes('draft') || lower.includes('email') || lower.includes('compose') || lower.includes('template') || lower.includes('follow up') || lower.includes('follow-up') || (lower.includes('text') && lower.includes('send'))) {
            targetAgent = 'communications_director';
        } else if (lower.includes('estimate') || lower.includes('price') || lower.includes('line item') || lower.includes('margin') || lower.includes('bid') || lower.includes('cost')) {
            targetAgent = 'estimation_analyst';
        } else if (lower.includes('claim') || lower.includes('supplement') || lower.includes('adjuster') || lower.includes('carrier') || lower.includes('insurance')) {
            targetAgent = 'claims_strategist';
        } else if (lower.includes('photo') || lower.includes('inspect') || lower.includes('damage') || lower.includes('evidence') || lower.includes('report')) {
            targetAgent = 'photo_inspector';
        } else if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('crew') || lower.includes('appointment')) {
            targetAgent = 'scheduling_optimizer';
        } else if (lower.includes('pipeline') || lower.includes('stale') || lower.includes('bottleneck') || lower.includes('briefing') || lower.includes('overdue') || lower.includes('trend')) {
            targetAgent = 'operations_monitor';
        } else if (lower.includes('call') || lower.includes('message') || lower.includes('text')) {
            targetAgent = 'communications_director';
        }

        const request: AgentRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            fromAgent: 'orchestrator',
            toAgent: targetAgent,
            action: intent,
            params,
            priority: 'normal',
            createdAt: new Date().toISOString(),
        };

        return this.route(request);
    }

    /**
     * Explicitly map an AI Auto-Pilot rule action to a specific agent request.
     * This avoids natural language parsing and guarantees strict execution.
     */
    async routeRuleIntent(actionType: string, params: Record<string, any>, context: string): Promise<AgentResponse> {
        let targetAgent: AgentId = 'personal_assistant';
        let action = actionType;

        // Map rule actions directly to specialized agents
        switch (actionType) {
            case 'create_task':
                targetAgent = 'operations_monitor';
                action = 'Create follow-up task';
                break;
            case 'update_job':
                targetAgent = 'operations_monitor';
                action = 'Update job status';
                break;
            case 'send_sms':
            case 'send_email':
                targetAgent = 'communications_director';
                break;
            case 'analyze_estimate':
                targetAgent = 'estimation_analyst';
                break;
            case 'review_claim':
                targetAgent = 'claims_strategist';
                break;
            default:
                action = actionType;
                break;
        }

        const request: AgentRequest = {
            id: `rule_exec_${Date.now()}`,
            fromAgent: 'ai_self_agent' as any,
            toAgent: targetAgent,
            action: `[Autonomous Action] ${action} (Context: ${context})`,
            params,
            priority: 'urgent',
            createdAt: new Date().toISOString()
        };

        return this.route(request);
    }

    /**
     * Delegate: one agent asks another for help.
     * Creates a sub-request linked to the parent.
     */
    async delegate(fromAgent: AgentId, toAgent: AgentId, action: string, params: Record<string, any>, parentRequestId?: string): Promise<AgentResponse> {
        const request: AgentRequest = {
            id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            fromAgent,
            toAgent,
            action,
            params,
            priority: 'normal',
            parentRequestId,
            createdAt: new Date().toISOString(),
        };

        return this.route(request);
    }

    /**
     * Get status of all agents for the dashboard.
     */
    getSystemStatus(): { agents: { id: AgentId; name: string; icon: string; pillar: string; status: ReturnType<BaseAgent['getStatus']>; autonomy: number }[] } {
        const agents = [];
        for (const [id, agent] of this.agents) {
            agents.push({
                id,
                name: agent.manifest.name,
                icon: agent.manifest.icon,
                pillar: agent.manifest.pillar,
                status: agent.getStatus(),
                autonomy: agent.getAutonomy(),
            });
        }
        return { agents };
    }

    // ── Audit ──

    private logAudit(agentId: AgentId, action: string, params: any, response: AgentResponse): void {
        try {
            if (!this.auditStmt) {
                this.auditStmt = db.prepare(`
          INSERT INTO agent_audit_log (agentId, action, params, result, confidence, autonomyLevel, approved, thinkingSteps)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
            }
            this.auditStmt.run(
                agentId,
                action,
                JSON.stringify(params),
                JSON.stringify(response.result),
                response.confidence,
                response.status === 'completed' ? 'act_notify' : 'observe',
                1,
                JSON.stringify(response.thinkingSteps),
            );
        } catch (err: any) {
            console.error('[Orchestrator] Audit log failed:', err.message);
        }
    }
}

/** Singleton orchestrator instance */
export const orchestrator = new AgentOrchestrator();
 
