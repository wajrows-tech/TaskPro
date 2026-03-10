import { db, generateJobNumber } from '../db';
import fetch from 'node-fetch';

interface SyncResult {
    contacts: number;
    jobs: number;
    messages: number;
    errors: string[];
}

export async function syncAccuLynxData(apiKey: string): Promise<SyncResult> {
    const result: SyncResult = { contacts: 0, jobs: 0, messages: 0, errors: [] };
    const headers = { 'Authorization': `Bearer ${apiKey}` };

    // A mapping of AccuLynx contact IDs to TaskPro contact IDs
    const contactIdMap = new Map<string, number>();

    try {
        // 1. Sync Contacts
        console.log('[AccuLynx] Fetching contacts...');
        const contactsRes = await fetch('https://api.acculynx.com/api/v2/contacts', { headers });
        if (!contactsRes.ok) throw new Error(`Failed to fetch contacts: ${contactsRes.statusText}`);

        // AccuLynx pagination is usually top-level or in a 'results'/'data' array. Adjusting for standard array payload.
        const contactsData = await contactsRes.json();
        const contacts = Array.isArray(contactsData) ? contactsData : (contactsData.results || contactsData.data || []);

        const insertContactStmt = db.prepare(`
      INSERT INTO contacts (firstName, lastName, role, company, email, phone, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        for (const c of contacts) {
            try {
                const firstName = c.firstName || 'Unknown';
                const lastName = c.lastName || '';
                const role = c.contactType === 'Subcontractor' ? 'subcontractor' : 'homeowner';
                const company = c.companyName || '';
                const email = c.emailAddresses?.[0]?.address || c.email || '';
                const phone = c.phoneNumbers?.[0]?.number || c.phone || '';
                const address = c.primaryAddress ? `${c.primaryAddress.street}, ${c.primaryAddress.city}, ${c.primaryAddress.stateProvince} ${c.primaryAddress.zipCode}` : '';

                // Check if contact already exists by exact name match to prevent simple duplicates
                const existing = db.prepare('SELECT id FROM contacts WHERE firstName = ? AND lastName = ?').get(firstName, lastName) as { id: number } | undefined;
                let localContactId: number;

                if (existing) {
                    localContactId = existing.id;
                } else {
                    const res = insertContactStmt.run(firstName, lastName, role, company, email, phone, address, '');
                    localContactId = res.lastInsertRowid as number;
                    result.contacts++;
                }

                // Map the AccuLynx ID to the local SQLite ID for relational linking later
                if (c.id) contactIdMap.set(String(c.id), localContactId);

            } catch (err: any) {
                result.errors.push(`Error saving contact ${c.id}: ${err.message}`);
            }
        }
        console.log(`[AccuLynx] Synced ${result.contacts} contacts.`);


        // 2. Sync Jobs
        console.log('[AccuLynx] Fetching jobs...');
        const jobsRes = await fetch('https://api.acculynx.com/api/v2/jobs', { headers });
        if (!jobsRes.ok) throw new Error(`Failed to fetch jobs: ${jobsRes.statusText}`);

        const jobsData = await jobsRes.json();
        const activeJobs = Array.isArray(jobsData) ? jobsData : (jobsData.results || jobsData.data || []);

        const insertJobStmt = db.prepare(`
      INSERT INTO jobs (jobNumber, name, address, city, state, zip, stage, type, estimatedValue, assignedTo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertJobContactStmt = db.prepare('INSERT OR IGNORE INTO job_contacts (jobId, contactId, role) VALUES (?, ?, ?)');

        for (const j of activeJobs) {
            try {
                const jobNumber = j.jobId || generateJobNumber();
                const name = j.name || 'AccuLynx Job';

                const street = j.address?.street || '';
                const city = j.address?.city || '';
                const state = j.address?.stateProvince || '';
                const zip = j.address?.zipCode || '';

                // Map AccuLynx statuses to our pipeline stages loosely
                let stage = 'lead';
                const alStatus = (j.status || '').toLowerCase();
                if (alStatus.includes('prospect') || alStatus.includes('lead')) stage = 'lead';
                else if (alStatus.includes('approved') || alStatus.includes('prod')) stage = 'production';
                else if (alStatus.includes('complete')) stage = 'completed';
                else if (alStatus.includes('estimat')) stage = 'estimate';

                const type = j.jobCategory === 'Commercial' ? 'commercial' : 'residential';
                const assignedTo = j.salesRepresentative || j.owner || '';
                const estimatedValue = j.contractAmount || 0;

                // Prevent duplicate jobs based on name/jobNumber combo
                const existingJob = db.prepare('SELECT id FROM jobs WHERE name = ? OR jobNumber = ?').get(name, j.jobId || 'N/A') as { id: number } | undefined;
                let localJobId: number;

                if (existingJob) {
                    localJobId = existingJob.id;
                } else {
                    const res = insertJobStmt.run(jobNumber, name, street, city, state, zip, stage, type, estimatedValue, assignedTo);
                    localJobId = res.lastInsertRowid as number;
                    result.jobs++;
                }

                // Link the associated contact if present
                const alContactId = j.primaryContactId || j.contactId;
                if (alContactId && contactIdMap.has(String(alContactId))) {
                    insertJobContactStmt.run(localJobId, contactIdMap.get(String(alContactId)), 'homeowner');
                }

            } catch (err: any) {
                result.errors.push(`Error saving job ${j.id}: ${err.message}`);
            }
        }
        console.log(`[AccuLynx] Synced ${result.jobs} jobs.`);


        // 3. Sync Messages/Logs
        console.log('[AccuLynx] Syncing messages/logs for synced contacts...');
        const insertCommStmt = db.prepare(`
      INSERT INTO communications (contactId, channel, direction, subject, body, sentAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        // Fetch logs only for mapped contacts to avoid hitting rate limits or pulling junk data
        // Usually AccuLynx logs are attached to Contacts or Jobs. Here we sync by Contact.
        for (const [alContactId, localContactId] of contactIdMap.entries()) {
            try {
                const logsRes = await fetch(`https://api.acculynx.com/api/v2/contacts/${alContactId}/logs`, { headers });
                if (logsRes.ok) {
                    const logsData = await logsRes.json();
                    const logs = Array.isArray(logsData) ? logsData : (logsData.results || logsData.data || []);

                    for (const log of logs) {
                        const channel = log.logType === 'Email' ? 'email' : log.logType === 'Call' ? 'call' : 'note';
                        const subject = log.subject || `AccuLynx ${channel}`;
                        const body = log.body || log.notes || '';
                        const sentAt = log.dateCreated || new Date().toISOString();

                        // Very simple duplicate log prevention
                        const existingLog = db.prepare('SELECT id FROM communications WHERE contactId = ? AND body = ? AND channel = ?').get(localContactId, body, channel) as { id: number } | undefined;
                        if (!existingLog && body.trim()) {
                            insertCommStmt.run(localContactId, channel, 'inbound', subject, body, sentAt);
                            result.messages++;
                        }
                    }
                }
            } catch (err: any) {
                // Silently ignore individual log errors to not halt sync
            }
        }
        console.log(`[AccuLynx] Synced ${result.messages} messages/logs.`);

    } catch (err: any) {
        result.errors.push(`Critical Sync Error: ${err.message}`);
        console.error('[AccuLynx] Sync failed:', err.message);
    }

    return result;
}
