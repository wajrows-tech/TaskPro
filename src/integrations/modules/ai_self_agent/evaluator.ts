import { db } from '../../../db/index.ts';
import type { CRMEvent } from '../../../agents/protocol.ts';

// ── Types ───────────────────────────────────────────────────────────────────

export type RuleOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'age_days_gt';

export interface RuleCondition {
    field: string;
    operator: RuleOperator;
    value: any;
}

export interface AgentRule {
    id: number;
    agentId: string;
    name: string;
    triggerEvent: string;
    conditions: RuleCondition[];
    actionType: string;
    actionParams: Record<string, any>;
    cooldownMinutes: number;
    lastFiredAt: string | null;
}

// ── Evaluator Engine ────────────────────────────────────────────────────────

/**
 * Gets the nested value from an object using a dot-notation path like "data.stage"
 */
function getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Checks if a single condition is met against the event payload
 */
function evaluateCondition(condition: RuleCondition, event: CRMEvent): boolean {
    // The "field" could be top level like 'entityType' or nested in data like 'stage'
    let actualValue: any;

    // Special handling for implicit data fields
    if (condition.field in event.data) {
        actualValue = event.data[condition.field];
    } else {
        actualValue = getValueByPath(event, condition.field);
    }

    if (actualValue === undefined || actualValue === null) {
        return false; // Cannot evaluate against missing data
    }

    const expectedValue = condition.value;

    switch (condition.operator) {
        case 'eq':
            return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
        case 'neq':
            return String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
        case 'gt':
            return Number(actualValue) > Number(expectedValue);
        case 'lt':
            return Number(actualValue) < Number(expectedValue);
        case 'contains':
            return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
        case 'age_days_gt':
            // E.g., check if a job has been in a stage for > X days
            // We expect actualValue to be an ISO date string
            const dateStr = String(actualValue);
            if (!dateStr || isNaN(Date.parse(dateStr))) return false;
            const diffDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
            return diffDays > Number(expectedValue);
        default:
            return false;
    }
}

/**
 * Loads all active rules that trigger on this event and evaluates them.
 * Returns the array of rules that PASSED all conditions and are ready to execute.
 */
export function evaluateRulesForEvent(event: CRMEvent): AgentRule[] {
    const triggeredRules: AgentRule[] = [];

    // Load active rules for this specific event type (or wildcard)
    const rulesConfig = db.prepare(`
        SELECT * FROM agent_rules 
        WHERE enabled = 1 AND (triggerEvent = ? OR triggerEvent = '*')
    `).all(event.type) as any[];

    for (const row of rulesConfig) {
        try {
            const conditions: RuleCondition[] = JSON.parse(row.conditions || '[]');
            const actionParams = JSON.parse(row.actionParams || '{}');

            const rule: AgentRule = {
                id: row.id,
                agentId: row.agentId,
                name: row.name,
                triggerEvent: row.triggerEvent,
                conditions,
                actionType: row.actionType,
                actionParams,
                cooldownMinutes: row.cooldownMinutes,
                lastFiredAt: row.lastFiredAt
            };

            // Check cooldown
            if (rule.lastFiredAt && rule.cooldownMinutes > 0) {
                const firedDate = new Date(rule.lastFiredAt).getTime();
                const minutesSinceLastFire = (Date.now() - firedDate) / (1000 * 60);
                if (minutesSinceLastFire < rule.cooldownMinutes) {
                    continue; // Skip, rule is in cooldown
                }
            }

            // Evaluate all conditions (AND logic)
            let allPassed = true;
            for (const cond of rule.conditions) {
                if (!evaluateCondition(cond, event)) {
                    allPassed = false;
                    break;
                }
            }

            if (allPassed) {
                triggeredRules.push(rule);
            }

        } catch (err: any) {
            console.error(`[Evaluator] Failed to parse rule ${row.id}:`, err.message);
        }
    }

    return triggeredRules;
}
