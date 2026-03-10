import { SessionClient } from './sessionClient.js';
import { SyncMetrics } from './types.js';

export class JobDiscovery {
    constructor(private client: SessionClient, private metrics: SyncMetrics) { }

    async getFilteredJobs(): Promise<any[]> {
        console.log('[AccuLynx Discovery] Finding jobs assigned to Joe Wajrowski...');

        // Target specifically Joe + 4 milestones to limit scope
        const listPath = '/api/joblist?page=1&pageSize=50' +
            '&filters=salesPerson%3DJoe%20Wajrowski' +
            '&filters=currentMilestoneList%3DProspect' +
            '&filters=currentMilestoneList%3DApproved' +
            '&filters=currentMilestoneList%3DClosed' +
            '&filters=currentMilestoneList%3DInvoiced';

        const listData = await this.client.getJson(listPath);
        const jobs = listData.results || [];

        this.metrics.jobsDiscovered += jobs.length;
        console.log(`[AccuLynx Discovery] Found ${jobs.length} relevant jobs.`);

        return jobs;
    }
}
