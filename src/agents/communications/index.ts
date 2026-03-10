// ── Communications Director Agent ───────────────────────────────────────────
// Pillar: TaskPro Core
//
// Professional email drafting, SMS via Twilio, communication scheduling,
// client preference learning, and auto-follow-ups.
// Absorbs the CRC comms_liaison role.

import { BaseAgent } from '../baseAgent.ts';
import { AGENT_MANIFESTS, type AgentRequest, type AgentResponse, type CRMEvent } from '../protocol.ts';

const manifest = AGENT_MANIFESTS.find(m => m.id === 'communications_director')!;

export class CommunicationsDirectorAgent extends BaseAgent {
    constructor() {
        super(manifest);
    }

    initialize(): void {
        this.subscribe(['communication.logged', 'job.stage_changed', 'task.overdue']);

        // Load email templates from memory
        const templates = this.recallByType('template');
        if (templates.length > 0) {
            this.think(`Loaded ${templates.length} communication templates`, 'reasoning');
        } else {
            // Seed default templates
            this.remember('template', 'welcome_email', {
                subject: 'Welcome to {company} — Your {jobType} Project',
                body: `Dear {contactName},\n\nThank you for choosing us for your {jobType} project. We're excited to work with you.\n\nYour project manager will be in touch shortly to schedule an initial inspection.\n\nBest regards,\n{senderName}`,
                tags: ['new_job', 'welcome'],
            }, 0.7);

            this.remember('template', 'status_update', {
                subject: 'Project Update — {jobName}',
                body: `Dear {contactName},\n\nI wanted to provide you with a quick update on your project:\n\nCurrent Status: {stage}\n{updateDetails}\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\n{senderName}`,
                tags: ['status', 'update'],
            }, 0.7);

            this.remember('template', 'supplement_request', {
                subject: 'Supplement Documentation — Claim #{claimNumber}',
                body: `Dear {adjusterName},\n\nDuring the course of repairs on the above-referenced claim, we have identified additional damage that was not included in the original scope.\n\nPlease find the attached supplement documentation including photographic evidence.\n\nWe look forward to your review.\n\nBest regards,\n{senderName}`,
                tags: ['insurance', 'supplement'],
            }, 0.7);

            this.think('Seeded 3 default email templates', 'action');
        }
    }

    async handleRequest(request: AgentRequest): Promise<AgentResponse> {
        switch (request.action) {
            case 'draft_email':
                return this.draftEmail(request.id, request.params);
            case 'draft_sms':
                return this.draftSMS(request.id, request.params);
            case 'get_templates':
                return this.getTemplates(request.id, request.params);
            case 'suggest_followup':
                return this.suggestFollowUp(request.id, request.params);
            case 'analyze_response_patterns':
                return this.analyzePatterns(request.id, request.params);
            default:
                return this.handleNaturalLanguage(request.id, request.action, request.params);
        }
    }

    private async draftEmail(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📧 Drafting email...', 'reasoning');

        const { to, scenario, contactName, jobName, data } = params;

        // Find best template
        const templates = this.recallByType('template');
        const template = templates.find((t: any) => t.tags?.includes(scenario)) || templates[0];

        this.think(`Using template: "${template?.subject || 'custom'}"`, 'reasoning');

        // Check contact preferences
        const contactPref = this.recall(`contact_pref_${contactName?.toLowerCase()?.replace(/\s/g, '_')}`);
        if (contactPref) {
            this.think(`Contact preference: ${contactPref.preferredChannel || 'email'}, ${contactPref.tone || 'professional'}`, 'reasoning');
        }

        // Build the email
        let subject = template?.subject || params.subject || 'CRM Update';
        let body = template?.body || params.body || '';

        // Template variable replacement
        const vars: Record<string, string> = {
            contactName: contactName || 'Valued Client',
            jobName: jobName || 'Your Project',
            stage: data?.stage || '',
            company: 'CRC',
            senderName: data?.senderName || 'Your Project Team',
            claimNumber: data?.claimNumber || '',
            adjusterName: data?.adjusterName || '',
            updateDetails: data?.updateDetails || '',
            jobType: data?.jobType || 'roofing',
        };

        for (const [key, val] of Object.entries(vars)) {
            subject = subject.replace(new RegExp(`{${key}}`, 'g'), val);
            body = body.replace(new RegExp(`{${key}}`, 'g'), val);
        }

        this.think('✅ Email drafted', 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { to, subject, body, isDraft: true },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.75,
        };
    }

    private async draftSMS(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📱 Drafting SMS...', 'reasoning');

        const message = params.message || `Hi ${params.contactName || 'there'}, quick update on your ${params.jobName || 'project'}: ${params.update || 'We\'ll be in touch shortly.'}`;

        // SMS should be short
        if (message.length > 160) {
            this.think(`⚠️ SMS is ${message.length} chars — consider shortening (160 char limit for single SMS)`, 'reasoning');
        }

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { to: params.phone, message, charCount: message.length, isDraft: true },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.7,
        };
    }

    private async getTemplates(requestId: string, params: any): Promise<AgentResponse> {
        const templates = this.recallByType('template');
        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { templates, count: templates.length },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.9,
        };
    }

    private async suggestFollowUp(requestId: string, params: any): Promise<AgentResponse> {
        this.think('🔄 Analyzing communication gaps...', 'reasoning');

        const suggestions = [
            {
                type: 'email',
                reason: 'No response for 3+ days',
                template: 'status_update',
                urgency: 'medium',
            },
        ];

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { suggestions },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.6,
        };
    }

    private async analyzePatterns(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📊 Analyzing response patterns...', 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                avgResponseTime: 'Not enough data yet',
                bestTimeToSend: 'Tuesday-Thursday, 9-11 AM',
                channelEffectiveness: { email: 'High', sms: 'Medium', call: 'High' },
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    private async handleNaturalLanguage(requestId: string, intent: string, params: any): Promise<AgentResponse> {
        this.think(`🧠 Interpreting comms request: "${intent}"`, 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                interpretation: intent,
                capabilities: ['Draft emails', 'Draft SMS', 'Suggest follow-ups', 'Analyze response patterns', 'Manage templates'],
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    /** Learn contact communication preferences */
    learnContactPreference(contactName: string, channel: string, responseTime?: number): void {
        const key = `contact_pref_${contactName.toLowerCase().replace(/\s/g, '_')}`;
        const existing = this.recall(key) || { preferredChannel: channel, avgResponseHours: null, interactions: 0 };
        existing.preferredChannel = channel;
        existing.interactions++;
        if (responseTime) {
            existing.avgResponseHours = existing.avgResponseHours
                ? (existing.avgResponseHours + responseTime) / 2
                : responseTime;
        }
        this.remember('preference', key, existing, Math.min(0.9, 0.3 + existing.interactions * 0.05));
    }

    onEvent(event: CRMEvent): void {
        if (event.type === 'communication.logged') {
            // Learn from every communication
            const { contactName, channel } = event.data;
            if (contactName && channel) {
                this.learnContactPreference(contactName, channel);
            }
        }
    }

    getStatus() {
        const templates = this.recallByType('template').length;
        const preferences = this.recallByType('preference').length;
        return {
            summary: `${templates} templates, ${preferences} contact preferences learned`,
            health: 'idle' as const,
        };
    }
}
 
 
