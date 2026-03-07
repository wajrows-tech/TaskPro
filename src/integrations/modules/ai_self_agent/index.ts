import { IntegrationModule } from '../../types.ts';
import { evaluateRulesForEvent } from './evaluator.ts';
import { registry } from '../../registry.ts';
import { db } from '../../../db/index.ts';
import { orchestrator } from '../../../agents/index.ts';

/**
 * AI Self-Agent
 * Powerful autonomous agent that evaluates configurable rules against all CRM events
 * and triggers automated actions.
 */
export const aiSelfAgentIntegration: IntegrationModule = {
    id: 'ai_self_agent',
    name: 'AI Auto-Pilot',
    description: 'Create powerful IF-THIS-THEN-THAT rules for your agents to execute automatically in the background.',
    category: 'ai_agents',
    icon: 'bot',
    brandColor: '#10b981', // emerald
    version: '1.0.0',
    author: 'TaskPro',
    capabilities: {
        canSync: false,
        canWebhook: false,
        canOAuth: false,
        canImport: false,
        canExport: false,
        supportedEntities: []
    },
    credentialFields: [], // No keys needed, uses internal systems
    settingsFields: [
        {
            key: 'autonomyLevel',
            label: 'Action Autonomy Level',
            type: 'select',
            defaultValue: 'suggest',
            options: [
                { value: 'observe', label: 'Observe Only (Log thoughts)' },
                { value: 'suggest', label: 'Suggest Actions (Wait for approval)' },
                { value: 'act_notify', label: 'Act autonomously and Notify' },
                { value: 'full_auto', label: 'Fully Autonomous (No notifications)' }
            ]
        },
        {
            key: 'enableComplexReasoning',
            label: 'Enable Deep Deep-Thinking',
            type: 'toggle',
            defaultValue: true,
            helpText: 'Slower execution but much better at deciding edge cases.'
        }
    ],
    defaultSyncRules: [],
    async connect() {
        return { success: true, message: 'AI Self-Agent is online and standing by.' };
    },
    async disconnect() { },
    async healthCheck() {
        return { healthy: true, latencyMs: 15, checkedAt: new Date().toISOString() };
    },
    async handleCrmEvent(event, credentials) {
        // 1. Evaluate all active rules against this CRM event
        const triggeredRules = evaluateRulesForEvent(event);
        if (triggeredRules.length === 0) return;

        // 2. Load agent settings to check autonomy level
        const config = registry.getConfig('ai_self_agent', false);
        const autonomyLevel = config?.settings?.autonomyLevel || 'suggest';

        // 3. Dispatch each triggered action to the Agent Orchestrator
        for (const rule of triggeredRules) {
            console.log(`[AI Auto-Pilot] ⚡ Rule Triggered: "${rule.name}" -> Action: ${rule.actionType}`);

            // Update the lastFiredAt timestamp to trigger cooldown
            db.prepare(`UPDATE agent_rules SET lastFiredAt = CURRENT_TIMESTAMP WHERE id = ?`).run(rule.id);

            // Log the autonomous thought/action process
            const auditId = db.prepare(`
                INSERT INTO agent_audit_log (agentId, action, params, confidence, autonomyLevel, parentRequestId)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                rule.agentId,
                rule.actionType,
                JSON.stringify(rule.actionParams),
                0.99, // Rule-based triggers are high confidence
                autonomyLevel,
                `rule_${rule.id}`
            ).lastInsertRowid;

            // In 'observe' mode, we just log it and do nothing else
            if (autonomyLevel === 'observe') continue;

            // Pass the execution to the orchestrator (who routes it to the correct specialized agent)
            try {
                // If it's pure rule execution (e.g. create_task), we map it directly to an agent intent
                await orchestrator.routeRuleIntent(
                    rule.actionType,
                    rule.actionParams,
                    `Event: ${event.type} on ${event.entityType}#${event.entityId}`
                );

                db.prepare(`UPDATE agent_audit_log SET result = ? WHERE id = ?`)
                    .run(JSON.stringify({ success: true, message: 'Action queued in orchestrator' }), auditId);

            } catch (err: any) {
                console.error(`[AI Auto-Pilot] ❌ Failed to execute rule "${rule.name}":`, err.message);
                db.prepare(`UPDATE agent_audit_log SET result = ? WHERE id = ?`)
                    .run(JSON.stringify({ success: false, error: err.message }), auditId);
            }
        }
    }
};
