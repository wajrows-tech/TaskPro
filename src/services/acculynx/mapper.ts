import { AccuLynxJobProxyData } from './types.js';

export class Mapper {

    static mapContact(jobProxyData: AccuLynxJobProxyData) {
        const job = jobProxyData.listData;
        const pc = job.PrimaryContact || {};

        if (!pc.ContactID) return null; // Can't map without a source ID

        return {
            acculynxId: pc.ContactID,
            firstName: pc.FirstName || 'Unknown',
            lastName: pc.LastName || '',
            company: pc.CompanyName || '',
            email: pc.PrimaryEmail || '',
            phone: pc.PrimaryPhone || '',
            role: 'homeowner',
            rawPayload: JSON.stringify(pc)
        };
    }

    static mapJob(jobProxyData: AccuLynxJobProxyData) {
        const job = jobProxyData.listData;
        const bs = jobProxyData.bootstrap?.Job || {};

        const a = bs.Address || {};
        const milestone = job.CurrentMilestone || '';

        let stage = 'lead';
        if (milestone.includes('Prospect')) stage = 'lead';
        else if (milestone.includes('Approved')) stage = 'production';
        else if (milestone.includes('Closed') || milestone.includes('Invoiced')) stage = 'completed';

        return {
            acculynxId: job.Id, // Stable UUID
            jobNumber: bs.JobNumber || job.Name, // Fallback to Title if Number missing
            name: job.FullName || bs.FullName || 'AccuLynx Job',
            street: a.Street1 || job.FullAddress?.split(',')[0] || '',
            city: a.City || '',
            state: a.State || '',
            zip: a.Zip || '',
            stage,
            type: (job.JobCategories && job.JobCategories[0]) ? job.JobCategories[0].toLowerCase() : 'residential',
            estimatedValue: jobProxyData.ar?.TotalInvoiced || 0,
            assignedTo: job.SalesPerson || '',
            rawPayload: JSON.stringify(jobProxyData.bootstrap ? jobProxyData.bootstrap : jobProxyData.listData),
            financialSummary: JSON.stringify(jobProxyData.ar || {})
        };
    }

    static mapMedia(jobProxyData: AccuLynxJobProxyData) {
        const media = jobProxyData.media;
        if (!media || media.length === 0) return [];

        return media.map((item: any) => ({
            acculynxJobId: jobProxyData.listData.Id,
            sourceExternalId: `al-media-${item.FileID || item.Id || Math.random().toString(36).substring(7)}`,
            url: item.S3Url || item.Url || item.UrlPreview || '',
            fileName: item.FileName || item.Name || 'Downloaded_Document',
            fileSize: item.Size || item.FileSize || 0,
            mimeType: item.Type || item.MimeType || item.ContentType || 'application/octet-stream',
            rawPayload: JSON.stringify(item)
        })).filter((m: any) => m.url !== '');
    }
}
