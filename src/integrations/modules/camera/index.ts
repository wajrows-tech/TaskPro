import { IntegrationModule } from '../../types.ts';

/**
 * Camera Integration (Browser APIs)
 * This is unique because it's a client-side integration that uses the 
 * MediaDevices API to capture photos natively inside the TaskPro UI.
 */
export const cameraIntegration: IntegrationModule = {
    id: 'camera',
    name: 'Device Camera',
    description: 'Capture high-resolution photos and document scans directly into jobs using your device camera.',
    category: 'media',
    icon: 'camera',
    version: '1.0.0',
    author: 'TaskPro',
    brandColor: '#8b5cf6', // purple
    capabilities: {
        canSync: false,
        canWebhook: false,
        canOAuth: false,
        canImport: false,
        canExport: false,
        supportedEntities: ['document']
    },
    credentialFields: [], // No credentials needed, relies on browser prompt
    settingsFields: [
        {
            key: 'captureResolution',
            label: 'Capture Resolution',
            type: 'select',
            defaultValue: '1080p',
            options: [
                { value: '720p', label: '720p (Fastest)' },
                { value: '1080p', label: '1080p (Standard)' },
                { value: '4k', label: '4K (Maximum Quality)' }
            ]
        },
        {
            key: 'autoCompress',
            label: 'Auto-Compress Images',
            type: 'toggle',
            defaultValue: true,
            helpText: 'Shrink file size before uploading to save storage space.'
        }
    ],
    defaultSyncRules: [],
    async connect() {
        return { success: true, message: 'Camera access ready (Browser permission required)' };
    },
    async disconnect() { },
    async healthCheck() {
        return { healthy: true, latencyMs: 0, checkedAt: new Date().toISOString() };
    }
};
 
 
