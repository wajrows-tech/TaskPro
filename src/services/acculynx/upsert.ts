import { db } from '../../db/index.ts';
import { SyncMetrics, AccuLynxJobProxyData } from './types.ts';
import { Mapper } from './mapper.ts';

export class UpsertEngine {
    constructor(private metrics: SyncMetrics) { }

    async processJobs(detailedJobs: AccuLynxJobProxyData[]) {
        const upsertContactStmt = db.prepare(`
            INSERT INTO contacts (acculynxId, firstName, lastName, role, company, email, phone, rawPayload, sourceSystem, sourceEntityType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'acculynx', 'Contact')
            ON CONFLICT(acculynxId) DO UPDATE SET
                firstName = excluded.firstName,
                lastName = excluded.lastName,
                company = excluded.company,
                email = excluded.email,
                phone = excluded.phone,
                rawPayload = excluded.rawPayload,
                sourceSystem = excluded.sourceSystem,
                sourceEntityType = excluded.sourceEntityType
            RETURNING id
        `);

        const upsertJobStmt = db.prepare(`
            INSERT INTO jobs (acculynxId, jobNumber, name, address, city, state, zip, stage, type, estimatedValue, assignedTo, rawPayload, financialSummary, sourceSystem, sourceEntityType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'acculynx', 'Job')
            ON CONFLICT(acculynxId) DO UPDATE SET
                name = excluded.name,
                address = excluded.address,
                city = excluded.city,
                state = excluded.state,
                zip = excluded.zip,
                stage = excluded.stage,
                estimatedValue = excluded.estimatedValue,
                rawPayload = excluded.rawPayload,
                financialSummary = excluded.financialSummary,
                sourceSystem = excluded.sourceSystem,
                sourceEntityType = excluded.sourceEntityType
            RETURNING id
        `);

        const insertJobContactStmt = db.prepare(`
            INSERT OR IGNORE INTO job_contacts (jobId, contactId, role) VALUES (?, ?, 'homeowner')
        `);

        // Check if DB Schema Migration 17 is applied by probing a prepared statement softly
        try {
            db.prepare('SELECT acculynxId FROM jobs LIMIT 1').get();
        } catch (e) {
            throw new Error(`Migration V17 has not been applied. Run migrations to add acculynxId column.`);
        }

        const upsertMediaLogStmt = db.prepare(`
            INSERT INTO communications (sourceExternalId, contactId, channel, direction, subject, body, mediaMetadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sourceExternalId) DO UPDATE SET
                body = excluded.body,
                mediaMetadata = excluded.mediaMetadata
            RETURNING id
        `);

        for (const proxyData of detailedJobs) {
            let localContactId = null;

            try {
                // 1. Upsert Contact
                const mappedContact = Mapper.mapContact(proxyData);
                if (mappedContact) {
                    const res = upsertContactStmt.get(
                        mappedContact.acculynxId,
                        mappedContact.firstName,
                        mappedContact.lastName,
                        mappedContact.role,
                        mappedContact.company,
                        mappedContact.email,
                        mappedContact.phone,
                        mappedContact.rawPayload
                    ) as { id: number };

                    localContactId = res.id;
                    // Note: We don't know if it's an insert or update purely from RETURNING id, 
                    // but we count it as a successful row mutation.
                    this.metrics.contactsUpserted++;
                }

                // 2. Upsert Job
                const mappedJob = Mapper.mapJob(proxyData);
                const resJob = upsertJobStmt.get(
                    mappedJob.acculynxId,
                    mappedJob.jobNumber,
                    mappedJob.name,
                    mappedJob.street,
                    mappedJob.city,
                    mappedJob.state,
                    mappedJob.zip,
                    mappedJob.stage,
                    mappedJob.type,
                    mappedJob.estimatedValue,
                    mappedJob.assignedTo,
                    mappedJob.rawPayload,
                    mappedJob.financialSummary
                ) as { id: number };

                const localJobId = resJob.id;
                this.metrics.jobsUpserted++;

                // 3. Link Contact
                if (localContactId && localJobId) {
                    insertJobContactStmt.run(localJobId, localContactId);
                }

                // 4. Upsert Media Queue
                const mediaItems = Mapper.mapMedia(proxyData);
                if (mediaItems.length > 0 && localJobId) {
                    const insertMediaMetaStmt = db.prepare(`
                        INSERT INTO media_metadata (jobId, sourceExternalId, url, fileName, fileSize, mimeType, rawPayload)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(sourceExternalId) DO UPDATE SET 
                            url = excluded.url, 
                            rawPayload = excluded.rawPayload
                    `);

                    let newlyDiscovered = 0;
                    for (const item of mediaItems) {
                        const res = insertMediaMetaStmt.run(
                            localJobId,
                            item.sourceExternalId,
                            item.url,
                            item.fileName,
                            item.fileSize || 0,
                            item.mimeType || 'unknown',
                            item.rawPayload || '{}'
                        );
                        if (res.changes > 0) newlyDiscovered++;
                    }
                    this.metrics.mediaQueued += newlyDiscovered; // Tracking new inventory additions
                }

            } catch (err: any) {
                console.error(`[AccuLynx Upsert] Error processing job ${proxyData.listData.Id}:`, err);
                this.metrics.errors.push(`Error upserting job ${proxyData.listData.Id}: ${err.message}`);
            }
        }
    }
}
