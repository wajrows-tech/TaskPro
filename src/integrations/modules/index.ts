import { acculynxIntegration } from './acculynx/index.ts';
import { companyCamIntegration } from './companycam/index.ts';
import { quickBooksIntegration } from './quickbooks/index.ts';
import { twilioIntegration } from './twilio/index.ts';
import { gmailIntegration } from './gmail/index.ts';
import { googleCalendarIntegration } from './google_calendar/index.ts';
import { cameraIntegration } from './camera/index.ts';
import { aiSelfAgentIntegration } from './ai_self_agent/index.ts';
import { webhookRelayIntegration } from './webhook_relay/index.ts';

/** Array of all available integration modules */
export const INTEGRATION_MODULES = [
    acculynxIntegration,
    companyCamIntegration,
    quickBooksIntegration,
    twilioIntegration,
    gmailIntegration,
    googleCalendarIntegration,
    cameraIntegration,
    aiSelfAgentIntegration,
    webhookRelayIntegration
];
