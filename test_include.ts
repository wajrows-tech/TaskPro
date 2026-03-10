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
    const jobId = 'cb8e05ad-f9c4-48d1-9b27-1ba43e55c8b5';
    try {
        console.log("Testing ?include parameters to get user/owner on Job...");
        const includes = ['users', 'owner', 'estimators', 'salesRepresentative', 'customFields'];
        for (const inc of includes) {
            const res = await fetch(`https://api.acculynx.com/api/v2/jobs/${jobId}?include=${inc}`, { headers });
            if (res.ok) {
                const data = await res.json();
                console.log(`Included ${inc}: keys ->`, Object.keys(data));
                if (data[inc]) {
                    console.log(`-- HAS ${inc} data!`);
                }
            } else {
                console.log(`Failed include=${inc}:`, res.status);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
