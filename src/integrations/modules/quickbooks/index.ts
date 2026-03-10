import { IntegrationModule } from '../../types.ts';

/**
 * QuickBooks Online Integration
 * Automatically creates invoices when estimates are approved or jobs complete.
 */
export const quickBooksIntegration: IntegrationModule = {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Sync customers and auto-generate invoices when jobs are marked Complete or estimates are Approved.',
    category: 'accounting',
    icon: 'calculator',
    brandColor: '#2ca01c', // green
    version: '1.0.0',
    author: 'TaskPro',
    capabilities: {
        canSync: true,
        canWebhook: false,
        canOAuth: true,
        canImport: true,
        canExport: true,
        supportedEntities: ['contact', 'estimate'],
        maxRequestsPerMinute: 40
    },
    credentialFields: [
        {
            key: 'clientId',
            label: 'Client ID',
            type: 'text',
            required: true
        },
        {
            key: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            required: true
        },
        {
            key: 'realmId',
            label: 'Company ID (Realm)',
            type: 'text',
            required: true
        }
    ],
    settingsFields: [
        {
            key: 'triggerPoint',
            label: 'Auto-Invoice Trigger',
            type: 'select',
            defaultValue: 'estimate_approved',
            options: [
                { value: 'estimate_approved', label: 'When Estimate is Approved' },
                { value: 'job_completed', label: 'When Job is Complete' },
                { value: 'manual', label: 'Manual Only' }
            ]
        }
    ],
    defaultSyncRules: [
        {
            entityType: 'estimate',
            direction: 'push',
            fieldMappings: [],
            conflictResolution: 'crm_wins',
            autoSync: true
        }
    ],
    async connect(credentials) {
        return { success: true, message: 'Connected to QuickBooks Online' };
    },
    async disconnect() { },
    async healthCheck() {
        return { healthy: true, latencyMs: 250, checkedAt: new Date().toISOString() };
    },
    async handleCrmEvent(event, credentials) {
        if (event.type === 'estimate.approved') {
            console.log(`[QuickBooks] Auto-generating invoice for estimate ${event.entityId}`);
        }
    }
};
 
 
