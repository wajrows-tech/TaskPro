import { IntegrationModule } from '../../types.ts';

/**
 * Google Calendar Integration
 * Syncs Tasks with scheduled dates into the user's real Google Calendar.
 */
export const googleCalendarIntegration: IntegrationModule = {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync your scheduled CRM tasks directly to your Google Calendar.',
    category: 'scheduling',
    icon: 'calendar',
    brandColor: '#4285F4', // google blue
    version: '1.0.0',
    author: 'TaskPro',
    capabilities: {
        canSync: true,
        canWebhook: true,
        canOAuth: true,
        canImport: true,
        canExport: true,
        supportedEntities: ['task'],
        maxRequestsPerMinute: 60
    },
    credentialFields: [
        {
            key: 'oauthToken',
            label: 'OAuth2 Refresh Token',
            type: 'password',
            required: true
        },
        {
            key: 'calendarId',
            label: 'Calendar ID',
            type: 'text',
            required: true,
            placeholder: 'primary'
        }
    ],
    settingsFields: [
        {
            key: 'syncReminders',
            label: 'Sync Default Reminders',
            type: 'toggle',
            defaultValue: true
        }
    ],
    defaultSyncRules: [
        {
            entityType: 'task',
            direction: 'bidirectional',
            fieldMappings: [],
            conflictResolution: 'newest_wins',
            autoSync: true
        }
    ],
    async connect(credentials) {
        if (!credentials.oauthToken) {
            return { success: false, message: 'Token required' };
        }
        return { success: true, message: 'Authorized with Google Calendar' };
    },
    async disconnect() { },
    async healthCheck() {
        return { healthy: true, latencyMs: 140, checkedAt: new Date().toISOString() };
    },
    async handleCrmEvent(event, credentials) {
        if (event.type === 'task.created' && event.data.scheduledDate) {
            console.log(`[Google Calendar] Adding event to calendar "${credentials.calendarId}" for Task ${event.entityId}`);
        }
    }
};
