import fs from 'fs';
import path from 'path';

const origPath = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\acculynx_inventory.json';
const backupPath = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\acculynx_inventory_backup_20260310_012851.json';

// Copy file
try {
    fs.copyFileSync(origPath, backupPath);
} catch (err: any) {
    console.log('Strict copy failed, doing buffer read...', err.message);
    const buf = fs.readFileSync(origPath);
    fs.writeFileSync(backupPath, buf);
}

const origStat = fs.statSync(origPath);
const backupStat = fs.statSync(backupPath);

console.log(`original file path: ${origPath}`);
console.log(`original size: ${origStat.size} bytes`);
console.log(`backup file path: ${backupPath}`);
console.log(`backup size: ${backupStat.size} bytes`);

let content = fs.readFileSync(backupPath, 'utf8');
let inventory: any[] = [];
let parsingSucceeded = false;

try {
    inventory = JSON.parse(content);
    parsingSucceeded = true;
    console.log('parsing succeeded: true');
} catch (e) {
    console.log('parsing succeeded: false (attempting repair)');
    // Try to repair torn JSON by finding the last valid object
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace !== -1) {
        content = content.substring(0, lastBrace + 1) + '\n]';
        try {
            inventory = JSON.parse(content);
            console.log('parsing succeeded: true (after repair)');
            parsingSucceeded = true;
        } catch (e2) {
            console.log('parsing succeeded: false (repair failed)');
        }
    }
}

if (!parsingSucceeded) {
    process.exit(0);
}

console.log(`Total captured unique requests (raw): ${inventory.length}`);

const categories: Record<string, Set<string>> = {
    'jobs list/filter': new Set(),
    'job detail': new Set(),
    'users/assignment': new Set(),
    'contacts': new Set(),
    'financials': new Set(),
    'documents/files/photos': new Set(),
    'notes/activity': new Set(),
    'webhook/config': new Set(),
    'other': new Set()
};

const uniquePaths = new Map<string, any>();

inventory.forEach((req: any) => {
    if (!req.url.includes('/api/') && !req.url.includes('graphql') && !req.url.includes('/ajax/')) return;
    if (req.url.match(/\.(js|css|svg|png|jpg|jpeg|woff|ttf)$/i)) return;
    if (req.url.includes('tracking') || req.url.includes('metrics')) return;

    let urlObj;
    try { urlObj = new URL(req.url); } catch { return; }

    // Templetize UUIDs and IDs
    const templatedPath = urlObj.pathname.replace(/\/[a-f0-9-]{36}/gi, '/{uuid}').replace(/\/\d+(?=\/|$)/g, '/{id}');
    const key = `${req.method} ${templatedPath}`;

    if (!uniquePaths.has(key)) {
        uniquePaths.set(key, { ...req, templatedPath, query: urlObj.search });
    }
});

Array.from(uniquePaths.values()).forEach(req => {
    let authType = 'cookie';
    if (req.headers.authorization || req.headers.Authorization) authType = 'bearer';
    if (req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'] || req.headers['x-xsrf-token']) authType += '+csrf';

    const summary = `[Auth: ${authType.padEnd(11)}] ${req.method.padEnd(5)} ${req.templatedPath}`;
    const p = req.templatedPath.toLowerCase();

    if (p.includes('estimat') || p.includes('invoic') || p.includes('financ') || p.includes('payment')) categories['financials'].add(summary);
    else if (p.includes('document') || p.includes('photo') || p.includes('file') || p.includes('album') || p.includes('attachment')) categories['documents/files/photos'].add(summary);
    else if (p.includes('user') || p.includes('rep') || p.includes('assign') || p.includes('crew')) categories['users/assignment'].add(summary);
    else if (p.includes('contact') || p.includes('customer')) categories['contacts'].add(summary);
    else if (p.includes('note') || p.includes('message') || p.includes('activity')) categories['notes/activity'].add(summary);
    else if (p.includes('webhook') || p.includes('config') || p.includes('integrat')) categories['webhook/config'].add(summary);
    else if (p.includes('job') && (p.includes('/list') || p.includes('/search') || req.query.includes('page'))) categories['jobs list/filter'].add(summary);
    else if (p.includes('job') || p.includes('milestone')) categories['job detail'].add(summary);
    else categories['other'].add(summary);
});

console.log('\n--- top endpoint categories found ---');
Object.keys(categories).forEach(cat => {
    if (categories[cat].size > 0) {
        console.log(`\nCategory: ${cat} (${categories[cat].size})`);
        Array.from(categories[cat]).slice(0, 10).forEach(s => console.log('  ' + s));
        if (categories[cat].size > 10) console.log('  ... and more');
    }
});
