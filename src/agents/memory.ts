// ── Agent Memory System ─────────────────────────────────────────────────────
// SQLite-backed persistent memory for all agents.
// Replaces the text-file memory from the CRC Agent Team.
//
// Each agent has a namespaced memory store with typed entries.
// Memory entries have confidence scores that decay/grow with access patterns.

import { db } from '../db/index.ts';
import type { AgentId } from './protocol.ts';

export type MemoryType = 'learning' | 'pattern' | 'preference' | 'playbook' | 'template' | 'profile';

export interface MemoryEntry {
    id: number;
    agentId: AgentId;
    memoryType: MemoryType;
    key: string;
    value: any;            // parsed from JSON
    confidence: number;    // 0-1
    accessCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// ── Prepared statements (initialized after DB migration runs) ──
let _stmts: {
    get: any;
    getAll: any;
    getByType: any;
    upsert: any;
    remove: any;
    search: any;
    topK: any;
    decayAll: any;
} | null = null;

function stmts() {
    if (!_stmts) {
        _stmts = {
            get: db.prepare(`SELECT * FROM agent_memory WHERE agentId = ? AND key = ?`),
            getAll: db.prepare(`SELECT * FROM agent_memory WHERE agentId = ? ORDER BY accessCount DESC`),
            getByType: db.prepare(`SELECT * FROM agent_memory WHERE agentId = ? AND memoryType = ? ORDER BY confidence DESC`),
            upsert: db.prepare(`
        INSERT INTO agent_memory (agentId, memoryType, key, value, confidence)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(agentId, memoryType, key) DO UPDATE SET
          value = excluded.value,
          confidence = excluded.confidence,
          accessCount = accessCount + 1,
          lastAccessedAt = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP
      `),
            remove: db.prepare(`DELETE FROM agent_memory WHERE agentId = ? AND key = ?`),
            search: db.prepare(`SELECT * FROM agent_memory WHERE agentId = ? AND (key LIKE ? OR value LIKE ?) ORDER BY confidence DESC LIMIT ?`),
            topK: db.prepare(`SELECT * FROM agent_memory WHERE agentId = ? AND memoryType = ? ORDER BY confidence DESC, accessCount DESC LIMIT ?`),
            decayAll: db.prepare(`UPDATE agent_memory SET confidence = MAX(0.1, confidence * 0.995) WHERE agentId = ?`),
        };
    }
    return _stmts;
}

// ── Public API ──

export const agentMemory = {
    /**
     * Store or update a memory entry.
     * Uses UPSERT — if the key exists, it updates value/confidence and increments accessCount.
     */
    remember(agentId: AgentId, memoryType: MemoryType, key: string, value: any, confidence: number = 0.5): void {
        const json = typeof value === 'string' ? value : JSON.stringify(value);
        stmts().upsert.run(agentId, memoryType, key, json, Math.max(0, Math.min(1, confidence)));
    },

    /**
     * Recall a specific memory by key.
     * Increments access count (memory strengthening).
     */
    recall(agentId: AgentId, key: string): MemoryEntry | null {
        const row = stmts().get.get(agentId, key) as any;
        if (!row) return null;

        // Strengthen on access
        db.prepare(`UPDATE agent_memory SET accessCount = accessCount + 1, lastAccessedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);

        return parseRow(row);
    },

    /**
     * Get all memories for an agent, sorted by access frequency.
     */
    recallAll(agentId: AgentId): MemoryEntry[] {
        return (stmts().getAll.all(agentId) as any[]).map(parseRow);
    },

    /**
     * Get memories of a specific type for an agent.
     */
    recallByType(agentId: AgentId, memoryType: MemoryType): MemoryEntry[] {
        return (stmts().getByType.all(agentId, memoryType) as any[]).map(parseRow);
    },

    /**
     * Get top K most confident memories of a type.
     * Used to build agent context windows efficiently.
     */
    topK(agentId: AgentId, memoryType: MemoryType, k: number = 10): MemoryEntry[] {
        return (stmts().topK.all(agentId, memoryType, k) as any[]).map(parseRow);
    },

    /**
     * Full-text search across an agent's memories.
     */
    search(agentId: AgentId, query: string, limit: number = 20): MemoryEntry[] {
        const pattern = `%${query}%`;
        return (stmts().search.all(agentId, pattern, pattern, limit) as any[]).map(parseRow);
    },

    /**
     * Forget a specific memory.
     */
    forget(agentId: AgentId, key: string): void {
        stmts().remove.run(agentId, key);
    },

    /**
     * Apply confidence decay to all memories of an agent.
     * Call periodically (e.g., daily) to let unused memories fade.
     * Minimum confidence is 0.1 — memories never fully disappear.
     */
    decayMemories(agentId: AgentId): void {
        stmts().decayAll.run(agentId);
    },

    /**
     * Build a context string for injecting into an AI prompt.
     * Returns the agent's top memories formatted as a knowledge block.
     */
    buildContext(agentId: AgentId, maxEntries: number = 15): string {
        const memories = (stmts().getAll.all(agentId) as any[]).slice(0, maxEntries).map(parseRow);
        if (memories.length === 0) return '(No accumulated knowledge yet.)';

        return memories.map(m => {
            const val = typeof m.value === 'object' ? JSON.stringify(m.value) : m.value;
            return `[${m.memoryType}] ${m.key}: ${val} (confidence: ${(m.confidence * 100).toFixed(0)}%)`;
        }).join('\n');
    },
};

// ── Helpers ──

function parseRow(row: any): MemoryEntry {
    let value = row.value;
    try { value = JSON.parse(value); } catch { /* keep as string */ }
    return { ...row, value };
}
 
 
