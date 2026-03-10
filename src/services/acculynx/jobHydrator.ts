import { SessionClient } from './sessionClient.js';
import { SyncMetrics, AccuLynxJobProxyData } from './types.js';
import { StateManager } from './stateManager.js';

export class JobHydrator {
    constructor(private client: SessionClient, private metrics: SyncMetrics, private stateManager: StateManager) { }

    async hydrateJobs(jobs: any[], limit: number = 20): Promise<{ detailed: AccuLynxJobProxyData[], nextHashes: Record<string, string> }> {
        console.log(`[AccuLynx Hydrator] Analyzing ${jobs.length} list jobs for staleness...`);
        const detailedJobs: AccuLynxJobProxyData[] = [];

        const previousHashes = this.stateManager.getJobStateHashes();
        const nextHashes: Record<string, string> = { ...previousHashes };

        // Process up to limits
        for (const job of jobs.slice(0, limit)) {
            const uuid = job.Id;
            const currentHash = this.stateManager.hashJobPayload(job);

            // Incremental Checkpoint Logic
            if (previousHashes[uuid] === currentHash) {
                this.metrics.jobsSkipped++;
                continue; // Job perfectly unmodified. Bypass deep fetches.
            }

            try {
                // Fetch Bootstrap (High-Value Address/Contacts)
                const bootstrap = await this.client.getJson(`/api/jobs/${uuid}/GetJobBootstrap`);

                // Fetch Financials
                const ar = await this.client.getJson(`/api/jobs/${uuid}/GetBalanceDueAndARAge`);

                // Fetch Media metadata
                const mediaItems = await this.client.getJson(`/api/v3/media/job/${uuid}/view-media?useAbsoluteUrls=false`) || [];

                detailedJobs.push({
                    listData: job,
                    bootstrap,
                    ar,
                    media: Array.isArray(mediaItems) ? mediaItems : []
                });

                // Checkpoint Update
                nextHashes[uuid] = currentHash;

                this.metrics.jobsHydrated++;
                this.metrics.mediaItemsDiscovered += Array.isArray(mediaItems) ? mediaItems.length : 0;
            } catch (e: any) {
                console.error(`[AccuLynx Hydrator] Failed strictly hydrating job ${uuid}:`, e.message);
                this.metrics.errors.push(`Hydration failed for ${uuid}: ${e.message}`);
            }
        }

        return { detailed: detailedJobs, nextHashes };
    }
}
