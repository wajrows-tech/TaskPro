import { db } from '../db/index.ts';

// ── Shared validation sets ──────────────────────────────────────────────────
export const VALID_STAGES = new Set(['lead', 'inspection', 'estimate', 'scope_approval', 'contract_signed', 'material_order', 'production', 'supplement', 'final_invoice', 'complete', 'closed', 'canceled']);
export const VALID_JOB_TYPES = new Set(['residential', 'commercial', 'insurance', 'retail', 'government', 'other']);
export const VALID_CHANNELS = new Set(['email', 'call', 'text', 'meeting', 'note', 'letter']);
export const VALID_DIRECTIONS = new Set(['inbound', 'outbound']);
export const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
export const VALID_STATUSES = new Set(['todo', 'in_progress', 'waiting', 'done', 'canceled']);
export const VALID_CONTACT_ROLES = new Set(['homeowner', 'adjuster', 'appraiser', 'subcontractor', 'supplier', 'property_manager', 'sales_rep', 'other']);
export const VALID_ESTIMATE_STATUSES = new Set(['draft', 'sent', 'approved', 'rejected', 'revised']);

/**
 * Validates a value against a set of allowed values.
 * Falls back to defaultVal if empty, or if invalid (to be lenient with AI agents).
 */
export function validate(value: any, validSet: Set<string>, fieldName: string, defaultVal?: string): string {
    if (!value && defaultVal) return defaultVal;
    if (!value) return '';
    const v = String(value).toLowerCase();
    if (!validSet.has(v)) {
        // Be lenient — return default instead of erroring for AI agent compatibility
        return defaultVal || v;
    }
    return v;
}

/**
 * Dynamically builds and executes a SQLite UPDATE statement.
 * @param table The table to update
 * @param id The ID of the row to update
 * @param data The unstructured request body payload
 * @param allowedFields The whitelist of fields permitted to be updated
 * @returns boolean indicating if the update executed
 */
export function buildUpdate(table: string, id: string | number, data: Record<string, any>, allowedFields: string[]): boolean {
    const entries = Object.entries(data).filter(([k]) => allowedFields.includes(k) && data[k] !== undefined);
    if (entries.length === 0) return false;

    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([, v]) => v);
    db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...values, id);
    return true;
}
