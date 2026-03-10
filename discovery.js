import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.ACCULYNX_API_KEY;

if (!apiKey) {
    console.error("Missing API Key");
    process.exit(1);
}

const headers = { 'Authorization': `Bearer ${apiKey}` };

async function run() {
    try {
        console.log("Fetching jobs (first 5) to inspect schema...");
        const jobsRes = await fetch('https://api.acculynx.com/api/v2/jobs?pageSize=5', { headers });
        const jobsData = await jobsRes.json();
        fs.writeFileSync('acculynx_jobs_sample.json', JSON.stringify(jobsData, null, 2));
        console.log("Saved acculynx_jobs_sample.json");

        // Let's try to fetch users to see if we can identify Joe Wajrowski
        console.log("Fetching users to find Joe Wajrowski...");
        const usersRes = await fetch('https://api.acculynx.com/api/v2/users', { headers });
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            fs.writeFileSync('acculynx_users_sample.json', JSON.stringify(usersData, null, 2));
            console.log("Saved acculynx_users_sample.json");
        } else {
            console.log("Users endpoint failed:", usersRes.status, usersRes.statusText);
        }

        // Let's also check if there are job status filters
        // No explicit /statuses endpoint known, but let's check one job's metadata deeply
        if (jobsData.items && jobsData.items.length > 0) {
            const firstJobId = jobsData.items[0].id;
            console.log(`Fetching deep details for job ${firstJobId}...`);
            const oneJobRes = await fetch(`https://api.acculynx.com/api/v2/jobs/${firstJobId}`, { headers });
            if (oneJobRes.ok) {
                const oneJobData = await oneJobRes.json();
                fs.writeFileSync('acculynx_one_job_sample.json', JSON.stringify(oneJobData, null, 2));
                console.log("Saved acculynx_one_job_sample.json");
            }

            // Test fetching documents/files/photos for this job
            console.log(`Fetching documents for job ${firstJobId}...`);
            const docsRes = await fetch(`https://api.acculynx.com/api/v2/jobs/${firstJobId}/documents`, { headers });
            if (docsRes.ok) {
                const docsData = await docsRes.json();
                fs.writeFileSync('acculynx_job_docs_sample.json', JSON.stringify(docsData, null, 2));
                console.log("Saved acculynx_job_docs_sample.json");
            } else {
                console.log("Documents endpoint failed:", docsRes.status, docsRes.statusText);
                // Sometimes documents are called attachments or photos? Let's try /photos and /attachments just in case
                const attachmentsRes = await fetch(`https://api.acculynx.com/api/v2/jobs/${firstJobId}/attachments`, { headers });
                if (attachmentsRes.ok) {
                    const attachmentsData = await attachmentsRes.json();
                    fs.writeFileSync('acculynx_job_attachments_sample.json', JSON.stringify(attachmentsData, null, 2));
                    console.log("Saved acculynx_job_attachments_sample.json");
                } else {
                    console.log("Attachments endpoint failed:", attachmentsRes.status, attachmentsRes.statusText);
                }

                const photosRes = await fetch(`https://api.acculynx.com/api/v2/jobs/${firstJobId}/photos`, { headers });
                if (photosRes.ok) {
                    const photosData = await photosRes.json();
                    fs.writeFileSync('acculynx_job_photos_sample.json', JSON.stringify(photosData, null, 2));
                    console.log("Saved acculynx_job_photos_sample.json");
                } else {
                    console.log("Photos endpoint failed:", photosRes.status, photosRes.statusText);
                }
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
