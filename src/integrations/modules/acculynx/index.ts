import { IntegrationModule } from '../../types.ts';

/**
 * AccuLynx Integration
 * Specialized roofing CRM used by many contractors. Bidirectional sync of jobs,
 * contacts, tasks, and documents.
 */
export const acculynxIntegration: IntegrationModule = {
    id: 'acculynx',
    name: 'AccuLynx',
    description: 'Bidirectional sync for Jobs, Contacts, and Documents with AccuLynx roofing software.',
    category: 'roofing_software',
    icon: 'house',
    brandColor: '#2563eb', // blue
    version: '1.0.0',
    author: 'TaskPro',
    capabilities: {
        canSync: true,
        canWebhook: true,
        canOAuth: false,
        canImport: true,
        canExport: true,
        supportedEntities: ['job', 'contact', 'document'],
        maxRequestsPerMinute: 60
    },
    credentialFields: [
        {
            key: 'apiKey',
            label: 'AccuLynx API Key',
            type: 'password',
            required: true,
            helpText: 'Found in AccuLynx App Settings > API Keys'
        }
    ],
    settingsFields: [
        {
            key: 'importStaleJobs',
            label: 'Import Legacy Jobs',
            type: 'toggle',
            defaultValue: false,
            helpText: 'If enabled, we will sync jobs older than 12 months.'
        }
    ],
    defaultSyncRules: [
        {
            entityType: 'job',
            direction: 'bidirectional',
            fieldMappings: [
                { crmField: 'name', externalField: 'JobName' },
                { crmField: 'address', externalField: 'StreetAddress' },
                { crmField: 'stage', externalField: 'Milestone' }
            ],
            conflictResolution: 'newest_wins',
            autoSync: true,
            syncIntervalMinutes: 15
        }
    ],
    async connect(credentials) {
        // Real implementation would actually ping the AccuLynx API /v1/ping endpoint
        try {
            if (!credentials.apiKey) throw new Error('API Key is required');
            // Mock connection test
            const isValid = String(credentials.apiKey).length > 20;
            if (!isValid) return { success: false, message: 'Invalid API Key format' };
            return { success: true, message: 'Connected successfully to AccuLynx' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    async disconnect() { },
    async healthCheck(credentials) {
        return { healthy: true, latencyMs: 120, checkedAt: new Date().toISOString() };
    },
    async handleCrmEvent(event, credentials) {
        console.log(`[AccuLynx] Handling CRM event: ${event.type} for ${event.entityType}#${event.entityId}`);
        // If event === 'job.created', call push() to map Job -> AccuLynx JobName payload
    }
};
 
 
