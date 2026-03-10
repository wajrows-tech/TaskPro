// ── Agent Protocol Types ────────────────────────────────────────────────────
// The contract for inter-agent communication in the ClaimSync agentic platform.
// Three platform pillars: Rapid Photo Report | ClaimSync | TaskPro Core

/** All agent identifiers in the system */
export type AgentId =
    // ── ClaimSync agents ──
    | 'claims_strategist'
    | 'estimation_analyst'
    // ── Rapid Photo Report agents ──
    | 'photo_inspector'
    // ── TaskPro Core agents ──
    | 'operations_monitor'
    | 'communications_director'
    | 'scheduling_optimizer'
    | 'personal_assistant'
    // ── System ──
    | 'orchestrator';

/** Which platform pillar does this agent belong to? */
export type PlatformPillar = 'taskpro' | 'rapid_photo' | 'claimsync';

export const AGENT_PILLAR_MAP: Record<AgentId, PlatformPillar> = {
    claims_strategist: 'claimsync',
    estimation_analyst: 'claimsync',
    photo_inspector: 'rapid_photo',
    operations_monitor: 'claimsync',
    communications_director: 'claimsync',
    scheduling_optimizer: 'claimsync',
    personal_assistant: 'claimsync',
    orchestrator: 'claimsync',
};

/** Agent metadata — display info for UI */
export interface AgentManifest {
    id: AgentId;
    name: string;
    pillar: PlatformPillar;
    icon: string;
    brandColor: string;
    description: string;
    version: string;
    capabilities: string[];
    /** Tools this agent has access to */
    tools: string[];
    /** Default autonomy level 0-1 */
    defaultAutonomy: number;
}

/** All registered agent manifests */
export const AGENT_MANIFESTS: AgentManifest[] = [
    {
        id: 'claims_strategist',
        name: 'Claims Strategist',
        pillar: 'taskpro',
        icon: '⚖️',
        brandColor: '#E17055',
        description: 'Insurance claim lifecycle management, supplement strategy, adjuster profiling, and carrier negotiation intelligence.',
        version: '1.0.0',
        capabilities: ['track_claims', 'supplement_strategy', 'adjuster_profiling', 'negotiation_history', 'acculynx_sync'],
        tools: ['get_job', 'update_job', 'create_note', 'create_communication', 'delegate_to_agent'],
        defaultAutonomy: 0.5,
    },
    {
        id: 'estimation_analyst',
        name: 'Estimation Analyst',
        pillar: 'taskpro',
        icon: '💰',
        brandColor: '#FDCB6E',
        description: 'AI-powered line item suggestions, pricing intelligence, margin analysis, and Xactimate compatibility.',
        version: '1.0.0',
        capabilities: ['line_item_suggestions', 'pricing_intelligence', 'margin_analysis', 'version_compare'],
        tools: ['get_job', 'create_estimate', 'update_estimate', 'create_note'],
        defaultAutonomy: 0.4,
    },
    {
        id: 'photo_inspector',
        name: 'Photo Inspector',
        pillar: 'rapid_photo',
        icon: '📸',
        brandColor: '#00B894',
        description: 'AI vision analysis, damage detection, severity classification, evidence packaging, and Photo Report generation.',
        version: '1.0.0',
        capabilities: ['vision_analysis', 'damage_detection', 'severity_classification', 'report_generation', 'evidence_packaging'],
        tools: ['analyze_image', 'create_document', 'create_note', 'delegate_to_agent'],
        defaultAutonomy: 0.4,
    },
    {
        id: 'operations_monitor',
        name: 'Operations Monitor',
        pillar: 'taskpro',
        icon: '🔧',
        brandColor: '#6C5CE7',
        description: 'Pipeline monitoring, bottleneck detection, SLA tracking, auto-task creation, daily briefings, and trend analysis.',
        version: '1.0.0',
        capabilities: ['pipeline_monitoring', 'bottleneck_detection', 'sla_tracking', 'auto_tasks', 'daily_briefing', 'trend_analysis'],
        tools: ['get_jobs', 'get_tasks', 'create_task', 'update_job', 'create_note'],
        defaultAutonomy: 0.6,
    },
    {
        id: 'communications_director',
        name: 'Communications Director',
        pillar: 'taskpro',
        icon: '📧',
        brandColor: '#74B9FF',
        description: 'Professional email drafting, SMS via Twilio, communication scheduling, client preference learning, and auto-follow-ups.',
        version: '1.0.0',
        capabilities: ['draft_email', 'send_sms', 'schedule_comms', 'client_preferences', 'auto_followup'],
        tools: ['create_communication', 'get_contacts', 'create_task', 'create_note'],
        defaultAutonomy: 0.3,
    },
    {
        id: 'scheduling_optimizer',
        name: 'Scheduling Optimizer',
        pillar: 'taskpro',
        icon: '📅',
        brandColor: '#00CEC9',
        description: 'Google Calendar sync, crew scheduling optimization, material timing, weather awareness, and conflict detection.',
        version: '1.0.0',
        capabilities: ['calendar_sync', 'crew_scheduling', 'material_timing', 'weather_awareness', 'conflict_detection'],
        tools: ['get_tasks', 'create_task', 'update_task', 'create_note'],
        defaultAutonomy: 0.5,
    },
    {
        id: 'personal_assistant',
        name: 'Personal Assistant',
        pillar: 'taskpro',
        icon: '🤖',
        brandColor: '#A29BFE',
        description: 'Natural language CRM queries, smart reminders, user preference learning, and multi-agent delegation.',
        version: '1.0.0',
        capabilities: ['nl_queries', 'smart_reminders', 'preference_learning', 'delegation'],
        tools: ['get_jobs', 'get_tasks', 'get_contacts', 'create_note', 'delegate_to_agent'],
        defaultAutonomy: 0.7,
    },
];

// ── Inter-agent communication ──

/** Autonomy levels — what can the agent do without asking? */
export type AutonomyLevel = 'observe' | 'suggest' | 'act_notify' | 'full_auto';

export function getAutonomyLevel(confidence: number): AutonomyLevel {
    if (confidence >= 0.85) return 'full_auto';
    if (confidence >= 0.6) return 'act_notify';
    if (confidence >= 0.3) return 'suggest';
    return 'observe';
}

/** A request from one agent to another */
export interface AgentRequest {
    id: string;                 // unique request ID
    fromAgent: AgentId;
    toAgent: AgentId;
    action: string;             // e.g., 'generate_evidence_package'
    params: Record<string, any>;
    priority: 'low' | 'normal' | 'urgent';
    deadline?: string;          // ISO timestamp
    parentRequestId?: string;   // for delegation chains
    createdAt: string;
}

/** Response from an agent after processing a request */
export interface AgentResponse {
    requestId: string;
    fromAgent: AgentId;
    status: 'completed' | 'failed' | 'delegated' | 'needs_approval';
    result: any;
    thinkingSteps: ThinkingStep[];
    timeMs: number;
    confidence: number;         // 0-1, how confident is the agent in this result
    delegatedTo?: AgentId;      // if status === 'delegated'
}

/** A single thinking step — shown to users for transparency */
export interface ThinkingStep {
    agentId: AgentId;
    agentName: string;
    agentIcon: string;
    message: string;
    type: 'reasoning' | 'action' | 'delegation' | 'result' | 'error';
    timestamp: number;
    data?: any;                 // optional structured data
}

/** CRM events that agents subscribe to via the event bus */
export type CRMEventType =
    | 'job.created' | 'job.updated' | 'job.deleted' | 'job.stage_changed'
    | 'contact.created' | 'contact.updated' | 'contact.deleted'
    | 'task.created' | 'task.completed' | 'task.overdue' | 'task.updated'
    | 'estimate.created' | 'estimate.approved' | 'estimate.sent' | 'estimate.updated'
    | 'communication.logged'
    | 'document.uploaded'
    | 'note.created'
    | 'agent.action';   // when an agent does something

export interface CRMEvent {
    type: CRMEventType;
    entityType: string;
    entityId: number | null;
    data: Record<string, any>;
    triggeredBy: AgentId | 'user';
    timestamp: string;
}

/** Agent rule — for autonomous monitoring (Operations Monitor, Claims Strategist, etc.) */
export interface AgentRule {
    id: string;
    agentId: AgentId;
    name: string;
    description: string;
    trigger: {
        event: CRMEventType;
        conditions: {
            field: string;
            operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'age_days_gt' | 'age_days_lt';
            value: any;
        }[];
    };
    action: {
        type: string;             // 'create_task' | 'update_job' | 'send_notification' | 'delegate'
        params: Record<string, any>;
    };
    cooldownMinutes: number;
    lastFiredAt?: string;
    enabled: boolean;
}

/** Audit log entry — complete record of every autonomous agent action */
export interface AgentAuditEntry {
    id: number;
    agentId: AgentId;
    action: string;
    params: Record<string, any>;
    result: any;
    confidence: number;
    autonomyLevel: AutonomyLevel;
    approved: boolean;          // was it user-approved or auto-approved?
    thinkingSteps: ThinkingStep[];
    parentRequestId?: string;
    createdAt: string;
}
 
