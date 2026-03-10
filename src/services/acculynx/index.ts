import { SessionClient } from './sessionClient.js';
import { JobDiscovery } from './jobDiscovery.js';
import { JobHydrator } from './jobHydrator.js';
import { UpsertEngine } from './upsert.js';
import { StateManager } from './stateManager.js';
import { SyncMetrics } from './types.js';

export async function syncAccuLynxData(apiKey: string): Promise<SyncMetrics> {
    const metrics: SyncMetrics = {
        jobsDiscovered: 0,
        jobsSkipped: 0,
        jobsHydrated: 0,
        jobsUpserted: 0,
        contactsUpserted: 0,
        mediaItemsDiscovered: 0,
        mediaQueued: 0,
        errors: []
    };

    const stateManager = new StateManager();
    const lockAcquired = stateManager.acquireSyncLock();
    if (!lockAcquired) {
        console.warn('[AccuLynx Proxy] Sync aborted: Another sync is currently running.');
        metrics.errors.push('Sync aborted due to overlapping run lock.');
        return metrics;
    }

    try {
        // 1. Initialize Client (Hijack Session)
        const client = new SessionClient();
        await client.initialize();

        // 2. Discover relevant list payloads
        const discovery = new JobDiscovery(client, metrics);
        const listJobs = await discovery.getFilteredJobs();

        if (listJobs.length > 0) {
            // 3. Hydrate deep JSON data incrementally
            const hydrator = new JobHydrator(client, metrics, stateManager);
            const { detailed, nextHashes } = await hydrator.hydrateJobs(listJobs, 10);

            // 4. Map and Upsert safely
            const upsertEngine = new UpsertEngine(metrics);
            await upsertEngine.processJobs(detailed);

            // 5. Commit incremental Checkpoint state
            stateManager.saveJobStateHashes(nextHashes);
        }

    } catch (err: any) {
        metrics.errors.push(`Critical Sync Proxy Error: ${err.message}`);
        console.error('[AccuLynx Proxy Orchestrator] Sync failed:', err.message);
    } finally {
        stateManager.releaseSyncLock();
    }

    return metrics;
}
