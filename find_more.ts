import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.ACCULYNX_API_KEY;

const headers = { 'Authorization': `Bearer ${apiKey}` };

async function run() {
    try {
        console.log("Fetching /users/me to see who owns this API key...");
        const meRes = await fetch('https://api.acculynx.com/api/v2/users/me', { headers });
        if (meRes.ok) {
            const meData = await meRes.json();
            console.log("ME:", JSON.stringify(meData, null, 2));
        } else {
            console.log("/users/me failed:", meRes.status);
        }

        console.log("\nSearching for Joe in jobs...");
        const searchRes = await fetch('https://api.acculynx.com/api/v2/jobs?search=Joe', { headers });
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            console.log(`Found ${searchData.count} jobs searching for 'Joe'. First job:`,
                searchData.items && searchData.items.length > 0 ? searchData.items[0].id : 'None');

            if (searchData.items && searchData.items.length > 0) {
                const jobId = searchData.items[0].id;
                console.log(`\nTesting attachments for job ${jobId}...`);
                const endpoints = [
                    'documents',
                    'files',
                    'attachments',
                    'photos'
                ];
                for (const ep of endpoints) {
                    const epRes = await fetch(`https://api.acculynx.com/api/v2/jobs/${jobId}/${ep}`, { headers });
                    if (epRes.ok) {
                        const epData = await epRes.json();
                        console.log(`SUCCESS on /${ep} -> items count:`, epData.items ? epData.items.length : 'unknown');
                    } else {
                        console.log(`FAILED on /${ep} -> ${epRes.status}`);
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
