import { db } from '../db/index.ts';
import { encryptCredentials, decryptCredentials } from './crypto.ts';
import { RateLimiter } from './rateLimiter.ts';
import { IntegrationModule, IntegrationConfig, IntegrationId, HealthCheckResult } from './types.ts';
import { eventBus } from '../agents/index.ts';
import type { CRMEvent } from '../agents/protocol.ts';

/**
 * ── Integration Registry ──────────────────────────────────────────────────
 * Manages the lifecycle of all integration modules: loading, saving credentials,
 * applying rate limits, and checking health.
 */
class IntegrationRegistry {
    private modules = new Map<IntegrationId, IntegrationModule>();
    private rateLimiters = new Map<IntegrationId, RateLimiter>();

    constructor() {
        // Subscribe to all CRM events so integrations can react asynchronously
        eventBus.subscribe('system_integrations_registry' as any, ['*'], (event) => this.dispatchCrmEvent(event));
    }

    /** Route CRM events to any enabled integration that implements handleCrmEvent */
    private async dispatchCrmEvent(event: CRMEvent) {
        for (const [id, module] of this.modules) {
            try {
                const config = this.getConfig(id, true);
                if (config && config.enabled && module.handleCrmEvent) {
                    await module.handleCrmEvent(event, config.credentials);
                }
            } catch (err: any) {
                console.error(`[Registry] Module ${id} failed to handle event ${event.type}:`, err.message);
                this.logIntegrationEvent(id, event.type, 'outbound', event.entityType, event.entityId, event.data, 'failed', err.message);
            }
        }
    }

    /** Log an integration-specific outbound/inbound event to the database */
    logIntegrationEvent(
        integrationId: string,
        eventType: string,
        direction: 'inbound' | 'outbound',
        entityType: string | null = null,
        entityId: number | null = null,
        payload: any = {},
        status: 'success' | 'failed' | 'pending' = 'success',
        errorMessage: string | null = null,
        idempotencyKey: string | null = null
    ) {
        try {
            db.prepare(`
                INSERT INTO integration_events 
                (integrationId, eventType, direction, entityType, entityId, payload, status, errorMessage, idempotencyKey)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                integrationId, eventType, direction, entityType, entityId,
                JSON.stringify(payload), status, errorMessage, idempotencyKey
            );
        } catch (err: any) {
            console.error(`[Registry] Failed to log event for ${integrationId}:`, err.message);
        }
    }

    /** Register an integration implementation */
    register(module: IntegrationModule) {
        this.modules.set(module.id, module);
        console.log(`[Registry] Registered module: ${module.name} (${module.id})`);

        // Initialize rate limiter if the module declares a limit
        if (module.capabilities.maxRequestsPerMinute) {
            this.rateLimiters.set(module.id, new RateLimiter(module.capabilities.maxRequestsPerMinute));
        }

        // Ensure the config row exists in the database
        this.ensureConfigExists(module.id);
    }

    /** Get the code module definition */
    getModule(id: IntegrationId): IntegrationModule | undefined {
        return this.modules.get(id);
    }

    /** Get all registered modules */
    getAllModules(): IntegrationModule[] {
        return Array.from(this.modules.values());
    }

    /**
     * Get the database configuration for an integration, including 
     * decrypted credentials if loadCredentials is true
     */
    getConfig(id: IntegrationId, loadCredentials = false): IntegrationConfig | null {
        try {
            const row = db.prepare('SELECT * FROM integrations WHERE integrationId = ?').get(id) as any;
            if (!row) return null;

            return {
                id: row.id,
                integrationId: row.integrationId as IntegrationId,
                enabled: Boolean(row.enabled),
                credentials: loadCredentials ? decryptCredentials(row.credentials) : {},
                settings: JSON.parse(row.settings || '{}'),
                lastSyncAt: row.lastSyncAt,
                lastError: row.lastError,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        } catch (err: any) {
            console.error(`[Registry] Failed to get config for ${id}:`, err.message);
            return null;
        }
    }

    /** Ensure a DB record exists when an integration is registered */
    private ensureConfigExists(id: IntegrationId) {
        try {
            db.prepare(`
                INSERT OR IGNORE INTO integrations (integrationId, enabled, credentials)
                VALUES (?, 0, '{}')
            `).run(id);
        } catch (err: any) {
            console.error(`[Registry] Failed to init DB config for ${id}:`, err.message);
        }
    }

    /**
     * Update credentials and settings. 
     * Auto-calls the module's connect() method to verify the new credentials.
     */
    async updateConfig(id: IntegrationId, credentials: Record<string, any>, settings: Record<string, any> = {}, enabled: boolean) {
        const module = this.getModule(id);
        if (!module) throw new Error(`Integration ${id} not found`);

        let errMessage: string | null = null;

        // If enabling, test the connection
        if (enabled && module.connect && Object.keys(credentials).length > 0) {
            try {
                const res = await module.connect(credentials);
                if (!res.success) {
                    enabled = false;
                    errMessage = res.message;
                }
            } catch (err: any) {
                enabled = false;
                errMessage = err.message;
            }
        }

        // Encrypt credentials before saving
        const encrypted = encryptCredentials(credentials);

        try {
            db.prepare(`
                UPDATE integrations 
                SET enabled = ?, credentials = ?, settings = ?, lastError = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE integrationId = ?
            `).run(
                enabled ? 1 : 0,
                encrypted,
                JSON.stringify(settings),
                errMessage,
                id
            );
        } catch (err: any) {
            throw new Error(`Failed to save config: ${err.message}`);
        }

        // Return connection test result
        if (errMessage) {
            return { success: false, message: errMessage };
        }
        return { success: true, message: 'Configuration saved and connected' };
    }

    /**
     * Disconnect and clear credentials
     */
    async disconnect(id: IntegrationId) {
        const module = this.getModule(id);
        if (module && module.disconnect) {
            try {
                await module.disconnect();
            } catch (err) {
                // ignore
            }
        }

        db.prepare(`
            UPDATE integrations 
            SET enabled = 0, credentials = '{}', lastError = NULL, updatedAt = CURRENT_TIMESTAMP
            WHERE integrationId = ?
        `).run(id);
    }

    /** Apply rate limiting before a module makes external calls */
    async applyRateLimit(id: IntegrationId): Promise<void> {
        const limiter = this.rateLimiters.get(id);
        if (limiter) {
            await limiter.waitForToken();
        }
    }
}

export const registry = new IntegrationRegistry();
