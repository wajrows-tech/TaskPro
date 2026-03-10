import fs from 'fs';
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
        console.log("Fetching all users to find Joe Wajrowski...");
        const usersRes = await fetch('https://api.acculynx.com/api/v2/users?pageSize=100', { headers });
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            const joe = usersData.items.find((u: any) => u.firstName.includes('Joe') || u.lastName.includes('Wajrowski'));
            if (joe) {
                console.log("Found Joe:", joe);
            } else {
                console.log("Joe not found in users.");
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
