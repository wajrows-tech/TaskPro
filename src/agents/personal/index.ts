// ── Personal Assistant Agent ────────────────────────────────────────────────
// Pillar: TaskPro Core
//
// Natural language CRM queries, smart reminders, user preference learning,
// daily summaries, and multi-agent delegation. This is the user's primary
// AI interface — the "front desk" that routes complex requests to specialists.

import { BaseAgent } from '../baseAgent.ts';
import { AGENT_MANIFESTS, type AgentId, type AgentRequest, type AgentResponse, type CRMEvent } from '../protocol.ts';
import { orchestrator } from '../orchestrator.ts';

const manifest = AGENT_MANIFESTS.find(m => m.id === 'personal_assistant')!;

export class PersonalAssistantAgent extends BaseAgent {
    constructor() {
        super(manifest);
    }

    initialize(): void {
        // The personal assistant listens to everything to build context
        this.subscribe(['*']);

        // Load user preferences
        const prefs = this.recall('user_preferences');
        if (!prefs) {
            this.remember('preference', 'user_preferences', {
                morningBriefingTime: '07:00',
                preferredName: 'Boss',
                notificationLevel: 'important_only',
                autoSuggest: true,
            }, 0.5);
        }
    }

    async handleRequest(request: AgentRequest): Promise<AgentResponse> {
        switch (request.action) {
            case 'whats_on_my_plate':
                return this.myPlate(request.id, request.params);
            case 'summarize':
                return this.summarize(request.id, request.params);
            case 'quick_action':
                return this.quickAction(request.id, request.params);
            case 'set_preference':
                return this.setPreference(request.id, request.params);
            default:
                // The personal assistant's superpower: smart delegation
                return this.smartDelegate(request.id, request.action, request.params);
        }
    }

    private async myPlate(requestId: string, params: any): Promise<AgentResponse> {
        this.think('🤖 Gathering your daily overview...', 'reasoning');

        // Delegate to Operations Monitor for pipeline data
        this.think('📊 Asking Operations Monitor for pipeline status...', 'delegation');
        const opsResponse = await orchestrator.delegate(this.id, 'operations_monitor', 'daily_briefing', {}, requestId);

        // Check for pending communications
        this.think('📧 Checking for communication follow-ups...', 'delegation');
        const commsResponse = await orchestrator.delegate(this.id, 'communications_director', 'suggest_followup', {}, requestId);

        // Build the overview
        const overview = {
            greeting: `Good ${this.getTimeOfDay()}, here's your overview:`,
            briefing: opsResponse.result,
            pendingComms: commsResponse.result,
            quickActions: [
                'Say "check my pipeline" for bottleneck analysis',
                'Say "draft an email to [contact]" for quick communications',
                'Say "claim status for [job]" for insurance updates',
            ],
        };

        this.think('✅ Daily overview assembled', 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: overview,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.8,
        };
    }

    private async summarize(requestId: string, params: any): Promise<AgentResponse> {
        this.think(`📋 Summarizing: ${params.topic || 'general'}...`, 'reasoning');

        const topic = (params.topic || '').toLowerCase();

        // Route to specialist agents for domain-specific summaries
        if (topic.includes('claim') || topic.includes('insurance')) {
            return orchestrator.delegate(this.id, 'claims_strategist', 'analyze_claim', params, requestId);
        }
        if (topic.includes('estimate') || topic.includes('price')) {
            return orchestrator.delegate(this.id, 'estimation_analyst', 'analyze_margins', params, requestId);
        }
        if (topic.includes('schedule') || topic.includes('calendar')) {
            return orchestrator.delegate(this.id, 'scheduling_optimizer', 'optimize_schedule', params, requestId);
        }

        // General summary
        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { summary: 'What would you like me to summarize? I can cover claims, estimates, schedules, or your overall pipeline.' },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    private async quickAction(requestId: string, params: any): Promise<AgentResponse> {
        this.think(`⚡ Quick action: ${params.action}`, 'action');

        // Track quick action for habit learning
        const key = `quick_action_${params.action?.toLowerCase()?.replace(/\s/g, '_')}`;
        const existing = this.recall(key);
        const count = (existing?.count || 0) + 1;
        this.remember('pattern', key, { action: params.action, count, lastUsed: new Date().toISOString() }, Math.min(0.9, 0.3 + count * 0.05));

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { action: params.action, status: 'executed' },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.7,
        };
    }

    private async setPreference(requestId: string, params: any): Promise<AgentResponse> {
        const { key, value } = params;
        this.think(`⚙️ Updating preference: ${key} = ${value}`, 'action');
        this.remember('preference', `user_pref_${key}`, value, 0.9);

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { updated: key, value },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.95,
        };
    }

    /**
     * The personal assistant's main power: interpret natural language
     * and delegate to the right specialist agent.
     */
    private async smartDelegate(requestId: string, intent: string, params: any): Promise<AgentResponse> {
        this.think(`🧠 Interpreting: "${intent}"`, 'reasoning');

        // Determine which agent should handle this
        const routing = this.routeIntent(intent);
        this.think(`Routing to ${routing.agentIcon} ${routing.agentName}...`, 'delegation');

        // Delegate to the chosen agent
        const response = await orchestrator.delegate(
            this.id,
            routing.agentId,
            intent,
            params,
            requestId,
        );

        // Learn from this routing decision
        this.remember('pattern', `route_${intent.toLowerCase().slice(0, 30).replace(/\s/g, '_')}`, {
            intent,
            routedTo: routing.agentId,
            success: response.status === 'completed',
        }, 0.5);

        return {
            ...response,
            // Prepend our thinking steps before the delegated agent's
            thinkingSteps: [...this.flushThinkingSteps(), ...response.thinkingSteps],
        };
    }

    private routeIntent(intent: string): { agentId: AgentId; agentName: string; agentIcon: string } {
        const lower = intent.toLowerCase();

        if (lower.includes('claim') || lower.includes('supplement') || lower.includes('adjuster') || lower.includes('carrier') || lower.includes('insurance')) {
            return { agentId: 'claims_strategist', agentName: 'Claims Strategist', agentIcon: '⚖️' };
        }
        if (lower.includes('photo') || lower.includes('inspect') || lower.includes('damage') || lower.includes('evidence') || lower.includes('report')) {
            return { agentId: 'photo_inspector', agentName: 'Photo Inspector', agentIcon: '📸' };
        }
        if (lower.includes('email') || lower.includes('text') || lower.includes('call') || lower.includes('message') || lower.includes('draft') || lower.includes('follow up')) {
            return { agentId: 'communications_director', agentName: 'Communications Director', agentIcon: '📧' };
        }
        if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('crew') || lower.includes('appointment') || lower.includes('weather')) {
            return { agentId: 'scheduling_optimizer', agentName: 'Scheduling Optimizer', agentIcon: '📅' };
        }
        if (lower.includes('estimate') || lower.includes('price') || lower.includes('line item') || lower.includes('margin') || lower.includes('bid') || lower.includes('cost')) {
            return { agentId: 'estimation_analyst', agentName: 'Estimation Analyst', agentIcon: '💰' };
        }
        if (lower.includes('pipeline') || lower.includes('stale') || lower.includes('bottleneck') || lower.includes('briefing') || lower.includes('overdue') || lower.includes('trend') || lower.includes('plate')) {
            return { agentId: 'operations_monitor', agentName: 'Operations Monitor', agentIcon: '🔧' };
        }

        // Default to operations monitor for general queries
        return { agentId: 'operations_monitor', agentName: 'Operations Monitor', agentIcon: '🔧' };
    }

    private getTimeOfDay(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    onEvent(event: CRMEvent): void {
        // Personal assistant learns from ALL events to build context awareness
        // but doesn't act on them — just observes patterns
        if (event.type === 'job.created') {
            this.remember('pattern', `recent_job_${event.entityId}`, {
                id: event.entityId,
                name: event.data.name,
                created: event.timestamp,
            }, 0.4);
        }
    }

    getStatus() {
        const patterns = this.recallByType('pattern').length;
        const preferences = this.recallByType('preference').length;
        return {
            summary: `${patterns} usage patterns learned, ${preferences} preferences stored`,
            health: 'idle' as const,
        };
    }
}
