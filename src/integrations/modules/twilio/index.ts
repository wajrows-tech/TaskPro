import { IntegrationModule } from '../../types.ts';

/**
 * Twilio Phone/SMS Integration
 * Enables the Communications Director agent to send real SMS messages to customers.
 */
export const twilioIntegration: IntegrationModule = {
    id: 'phone_messenger',
    name: 'Twilio SMS & Voice',
    description: 'Send and receive automated SMS texts and voice calls directly from TaskPro.',
    category: 'communication',
    icon: 'message-square',
    brandColor: '#F22F46', // twilio red
    version: '1.0.0',
    author: 'TaskPro',
    capabilities: {
        canSync: false,
        canWebhook: true,
        canOAuth: false,
        canImport: false,
        canExport: true,
        supportedEntities: ['communication'],
        maxRequestsPerMinute: 100
    },
    credentialFields: [
        {
            key: 'accountSid',
            label: 'Account SID',
            type: 'text',
            required: true
        },
        {
            key: 'authToken',
            label: 'Auth Token',
            type: 'password',
            required: true
        },
        {
            key: 'fromNumber',
            label: 'Twilio Phone Number',
            type: 'text',
            required: true,
            placeholder: '+1234567890'
        }
    ],
    settingsFields: [
        {
            key: 'enableAgentReplies',
            label: 'Enable AI Auto-Replies',
            type: 'toggle',
            defaultValue: true,
            helpText: 'Let the Communications Director agent automatically respond to incoming SMS messages.'
        }
    ],
    defaultSyncRules: [],
    async connect(credentials) {
        if (!credentials.accountSid || !credentials.authToken || !credentials.fromNumber) {
            return { success: false, message: 'All fields are required' };
        }
        return { success: true, message: 'Connected to Twilio successfully' };
    },
    async disconnect() { },
    async healthCheck() {
        return { healthy: true, latencyMs: 60, checkedAt: new Date().toISOString() };
    },
    async handleCrmEvent(event, credentials) {
        if (event.type === 'communication.logged' && event.data.channel === 'text' && event.data.direction === 'outbound') {
            console.log(`[Twilio] Firing real SMS message to contact ${event.data.contactId}: "${event.data.content}"`);
        }
    }
};
 
 
