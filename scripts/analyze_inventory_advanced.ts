import fs from 'fs';
import path from 'path';

const backupPath = 'C:/Users/wajro/.gemini/antigravity/scratch/acculynx_inventory_backup_20260310_012851.json';
const outPath = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\TaskPro\\scripts\\out_full_inventory.txt';

let content = fs.readFileSync(backupPath, 'utf8');
let inventory: any[] = [];
try { inventory = JSON.parse(content); } catch (e) {
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace !== -1) inventory = JSON.parse(content.substring(0, lastBrace + 1) + '\n]');
}

// 1. raw captured requests total
const rawCount = inventory.length;

// Helper to extract query keys
function getQueryKeys(searchString: string) {
    if (!searchString) return '';
    try {
        const u = new URLSearchParams(searchString);
        return Array.from(u.keys()).sort().join('&');
    } catch { return ''; }
}

const urlSet = new Set<string>();
const normalizedMap = new Map<string, any>();

inventory.forEach((req: any) => {
    // Basic filter for internal APIs
    if (!req.url.includes('/api/') && !req.url.includes('graphql') && !req.url.includes('/ajax/')) return;
    if (req.url.match(/\.(js|css|svg|png|jpg|jpeg|woff|ttf)$/i)) return;
    if (req.url.includes('tracking') || req.url.includes('metrics')) return;

    // 2. unique method + full URL/path count
    const mUrl = `${req.method} ${req.url}`;
    urlSet.add(mUrl);

    let urlObj;
    try { urlObj = new URL(req.url); } catch { return; }

    // Normalization rules: replace UUIDs and standalone IDs
    const templatePath = urlObj.pathname.replace(/\/[a-f0-9-]{36}/gi, '/{uuid}').replace(/\/\d+(?=\/|$)/g, '/{id}');
    const qKeys = getQueryKeys(urlObj.search);

    // 3. unique method + normalized route-template + query shape
    const normKey = `${req.method}|${templatePath}|${qKeys}`;

    if (!normalizedMap.has(normKey)) {
        normalizedMap.set(normKey, {
            method: req.method,
            templatePath,
            examplePath: urlObj.pathname + urlObj.search,
            queryKeys: qKeys,
            resourceType: req.resourceType,
            count: 1
        });
    } else {
        normalizedMap.get(normKey).count++;
    }
});

const uniqueMethodUrlCount = urlSet.size;
const normalizedEndpoints = Array.from(normalizedMap.values());
const normalizedCount = normalizedEndpoints.length;

// Categorize
const categories: Record<string, any[]> = {
    'jobs list/filter': [],
    'job detail': [],
    'users/assignment': [],
    'contacts': [],
    'financials': [],
    'documents/files/photos': [],
    'notes/activity': [],
    'webhook/config': [],
    'other': []
};

normalizedEndpoints.forEach(ep => {
    const p = ep.templatePath.toLowerCase();

    if (p.includes('estimat') || p.includes('invoic') || p.includes('financ') || p.includes('payment') || p.includes('loan')) categories['financials'].push(ep);
    else if (p.includes('document') || p.includes('photo') || p.includes('file') || p.includes('album') || p.includes('attachment') || p.includes('media')) categories['documents/files/photos'].push(ep);
    else if (p.includes('user') || p.includes('rep') || p.includes('assign') || p.includes('crew') || p.includes('role')) categories['users/assignment'].push(ep);
    else if (p.includes('contact') || p.includes('customer') || p.includes('supplier')) categories['contacts'].push(ep);
    else if (p.includes('note') || p.includes('message') || p.includes('activity')) categories['notes/activity'].push(ep);
    else if (p.includes('webhook') || p.includes('config') || p.includes('integrat')) categories['webhook/config'].push(ep);
    else if (p.includes('joblist') || p.includes('/search') || ep.queryKeys.includes('page')) categories['jobs list/filter'].push(ep);
    else if (p.includes('job') || p.includes('milestone') || p.includes('nextsteps')) categories['job detail'].push(ep);
    else categories['other'].push(ep);
});

// Output generation
let out = '';
out += `1. Raw captured requests total: ${rawCount}\n`;
out += `2. Unique method + full URL count: ${uniqueMethodUrlCount}\n`;
out += `3. Unique normalized endpoints (method + path template + query shape): ${normalizedCount}\n\n`;

out += `4. Category Totals:\n`;
Object.keys(categories).forEach(cat => {
    out += `   - ${cat.padEnd(25)} : ${categories[cat].length} unique endpoints\n`;
});

out += `\n=== FULL DEDUPED INVENTORY TABLE ===\n`;
out += `| Category | Method | Normalized Path | Query Params Structure | Type Guess | Count | Example URL |\n`;
out += `|----------|--------|-----------------|------------------------|------------|-------|-------------|\n`;

Object.keys(categories).forEach(cat => {
    categories[cat].forEach(ep => {
        let typeGuess = ep.resourceType === 'xhr' || ep.resourceType === 'fetch' ? 'json' : ep.resourceType;
        if (ep.templatePath.endsWith('.pdf') || ep.templatePath.endsWith('.jpg')) typeGuess = 'file';

        out += `| ${cat} | ${ep.method} | ${ep.templatePath} | ${ep.queryKeys || '(none)'} | ${typeGuess} | ${ep.count} | ${ep.examplePath} |\n`;
    });
});

fs.writeFileSync(outPath, out);
console.log('Report generated at Scripts/out_full_inventory.txt');
