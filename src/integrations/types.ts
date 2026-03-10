// ── Integration System Types ────────────────────────────────────────────────
// Every integration implements this contract. The registry manages lifecycle.

/** Unique identifier for each integration */
export type IntegrationId =
    | 'acculynx'
    | 'companycam'
    | 'quickbooks'
    | 'xero'
    | 'phone_messenger'
    | 'email_sync'
    | 'camera'
    | 'google_calendar'
    | 'ai_self_agent'
    | 'webhook_relay';

/** Categories for organizing integrations in the UI */
export type IntegrationCategory =
    | 'roofing_software'
    | 'accounting'
    | 'communication'
    | 'media'
    | 'scheduling'
    | 'ai_agents'
    | 'developer';

/** Connection status of an integration */
export type ConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error'
    | 'rate_limited';

/** Health check result */
export interface HealthCheckResult {
    healthy: boolean;
    latencyMs: number;
    message?: string;
    checkedAt: string;
}

/** Credential shapes vary by integration - stored encrypted in DB */
export interface IntegrationCredentials {
    [key: string]: string | number | boolean;
}

/** Webhook event from any integration */
export interface IntegrationEvent {
    integrationId: IntegrationId;
    eventType: string;          // e.g. 'job.created', 'photo.uploaded', 'invoice.paid'
    payload: Record<string, any>;
    timestamp: string;
    idempotencyKey?: string;    // for deduplication
}

/** Configuration stored per-integration in the database */
export interface IntegrationConfig {
    id: number;
    integrationId: IntegrationId;
    enabled: boolean;
    credentials: IntegrationCredentials;   // encrypted JSON
    hasCredentials?: boolean;              // used by frontend
    settings: Record<string, any>;         // module-specific settings
    lastSyncAt: string | null;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Field mapping between CRM entities and external system entities */
export interface FieldMapping {
    crmField: string;
    externalField: string;
    transform?: 'uppercase' | 'lowercase' | 'trim' | 'date_iso' | 'cents_to_dollars' | 'custom';
    customTransform?: string;    // JS expression as string
}

/** Sync direction configuration */
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

/** Sync rule for a specific entity type */
export interface SyncRule {
    entityType: 'job' | 'contact' | 'task' | 'estimate' | 'communication' | 'document';
    direction: SyncDirection;
    fieldMappings: FieldMapping[];
    conflictResolution: 'crm_wins' | 'external_wins' | 'newest_wins' | 'manual';
    autoSync: boolean;
    syncIntervalMinutes?: number;
}

/** Capability flags — what can this integration do? */
export interface IntegrationCapabilities {
    canSync: boolean;
    canWebhook: boolean;
    canOAuth: boolean;
    canImport: boolean;
    canExport: boolean;
    supportedEntities: SyncRule['entityType'][];
    maxRequestsPerMinute?: number;
}

/**
 * The contract every integration module must implement.
 * Each integration is a self-contained module in its own directory.
 */
export interface IntegrationModule {
    /** Unique ID */
    id: IntegrationId;

    /** Display name */
    name: string;

    /** Short description shown in the marketplace */
    description: string;

    /** Category for grouping */
    category: IntegrationCategory;

    /** Icon name (lucide-react icon key) */
    icon: string;

    /** Brand color for UI accents */
    brandColor: string;

    /** Version of this integration module */
    version: string;

    /** Author */
    author: string;

    /** What this integration can do */
    capabilities: IntegrationCapabilities;

    /** Required credential fields (rendered in settings form) */
    credentialFields: {
        key: string;
        label: string;
        type: 'text' | 'password' | 'url' | 'select';
        placeholder?: string;
        required: boolean;
        options?: { value: string; label: string }[];   // for select type
        helpText?: string;
    }[];

    /** Module-specific settings schema */
    settingsFields: {
        key: string;
        label: string;
        type: 'toggle' | 'text' | 'number' | 'select';
        defaultValue: any;
        options?: { value: string; label: string }[];
        helpText?: string;
    }[];

    /** Default sync rules */
    defaultSyncRules: SyncRule[];

    // ── Lifecycle hooks ──

    /** Called when credentials are first saved — validate and establish connection */
    connect(credentials: IntegrationCredentials): Promise<{ success: boolean; message: string }>;

    /** Called when integration is disabled — clean up resources */
    disconnect(): Promise<void>;

    /** Health check — is the external service reachable? */
    healthCheck(credentials: IntegrationCredentials): Promise<HealthCheckResult>;

    // ── Data operations ──

    /** Push CRM data to external system */
    push?(entityType: string, data: Record<string, any>, credentials: IntegrationCredentials): Promise<{ externalId: string }>;

    /** Pull data from external system into CRM format */
    pull?(entityType: string, externalId: string, credentials: IntegrationCredentials): Promise<Record<string, any>>;

    /** Full sync of an entity type */
    sync?(entityType: string, credentials: IntegrationCredentials, lastSyncAt: string | null): Promise<{ created: number; updated: number; errors: string[] }>;

    /** Handle incoming webhook from external system */
    handleWebhook?(event: IntegrationEvent): Promise<void>;

    /** Handle internal CRM events emitted by the agent event bus */
    handleCrmEvent?(event: import('../agents/protocol.ts').CRMEvent, credentials: IntegrationCredentials): Promise<void>;
}
 
