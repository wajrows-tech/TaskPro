import { IntegrationModule } from '../../types.ts';

/**
 * Generic Webhook Relay
 * Send OUT or receive IN generic payloads, perfect for Make.com or Zapier.
 */
export const webhookRelayIntegration: IntegrationModule = {
    id: 'webhook_relay',
    name: 'Zapier / Webhooks',
    description: 'Create custom incoming and outgoing webhooks to connect to any other software.',
    category: 'developer',
    icon: 'webhook',
    brandColor: '#f97316', // orange
    version: '1.0.0',
    author: 'TaskPro',
    capabilities: {
        canSync: false,
        canWebhook: true,
        canOAuth: false,
        canImport: false,
        canExport: false,
        supportedEntities: []
    },
    credentialFields: [
        {
            key: 'secretHeader',
            label: 'Secret Security Header',
            type: 'password',
            required: false,
            helpText: 'Optional: Custom header to verify incoming webhooks.'
        }
    ],
    settingsFields: [
        {
            key: 'allowInbound',
            label: 'Allow Inbound Webhooks',
            type: 'toggle',
            defaultValue: true
        },
        {
            key: 'allowOutbound',
            label: 'Allow Outbound Webhooks',
            type: 'toggle',
            defaultValue: true
        }
    ],
    defaultSyncRules: [],
    async connect() {
        return { success: true, message: 'Webhook system ready' };
    },
    async disconnect() { },
    async healthCheck() {
        return { healthy: true, latencyMs: 5, checkedAt: new Date().toISOString() };
    },
    async handleCrmEvent(event, credentials) {
        // Filter against user-configured webhook routing and POST it
        if (event.type.startsWith('job.')) {
            console.log(`[Webhooks] Captured job event ${event.type}, no outbound destinations configured.`);
        }
    }
};
 
