import fs from 'fs';
import path from 'path';

const backupPath = 'C:/Users/wajro/.gemini/antigravity/scratch/acculynx_inventory_auto.json';
const outPath = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\TaskPro\\scripts\\out_crawler_inventory.txt';

let content = fs.readFileSync(backupPath, 'utf8');
let inventory: any[] = [];
try { inventory = JSON.parse(content); } catch (e) {
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace !== -1) inventory = JSON.parse(content.substring(0, lastBrace + 1) + '\n]');
}

const rawCount = inventory.length;

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
    if (!req.url.includes('/api/') && !req.url.includes('graphql') && !req.url.includes('/ajax/')) return;
    if (req.url.match(/\.(js|css|svg|png|jpg|jpeg|woff|ttf|ico)$/i)) return;

    const mUrl = `${req.method} ${req.url}`;
    urlSet.add(mUrl);

    let urlObj;
    try { urlObj = new URL(req.url); } catch { return; }

    const templatePath = urlObj.pathname.replace(/\/[a-f0-9-]{36}/gi, '/{uuid}').replace(/\/\d+(?=\/|$)/g, '/{id}');
    const qKeys = getQueryKeys(urlObj.search);
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

// Separation logic
const noise: any[] = [];
const business: any[] = [];

normalizedEndpoints.forEach(ep => {
    const p = ep.templatePath.toLowerCase();

    const isNoise =
        p.includes('tracking') ||
        p.includes('metrics') ||
        p.includes('sockets/poll') ||
        p.includes('sockets/connect') ||
        p.includes('ably/authenticate') ||
        p.includes('features/is-allowed') ||
        p.includes('view-unacknowledge-type-counts') ||
        p.includes('getactivityfeedcount');

    if (isNoise) {
        noise.push(ep);
    } else {
        business.push(ep);
    }
});

const businessCount = business.length;

const categories: Record<string, any[]> = {
    'jobs list/filter': [],
    'job detail': [],
    'users/assignment': [],
    'contacts': [],
    'financials': [],
    'documents/files/photos': [],
    'notes/activity': [],
    'webhook/config': [],
    'noise/polling (excluded)': noise,
    'other (business)': []
};

business.forEach(ep => {
    const p = ep.templatePath.toLowerCase();
    if (p.includes('estimat') || p.includes('invoic') || p.includes('financ') || p.includes('payment') || p.includes('loan')) categories['financials'].push(ep);
    else if (p.includes('document') || p.includes('photo') || p.includes('file') || p.includes('album') || p.includes('attachment') || p.includes('media')) categories['documents/files/photos'].push(ep);
    else if (p.includes('user') || p.includes('rep') || p.includes('assign') || p.includes('crew') || p.includes('role')) categories['users/assignment'].push(ep);
    else if (p.includes('contact') || p.includes('customer') || p.includes('supplier')) categories['contacts'].push(ep);
    else if (p.includes('note') || p.includes('message') || p.includes('activity')) categories['notes/activity'].push(ep);
    else if (p.includes('webhook') || p.includes('config') || p.includes('integrat')) categories['webhook/config'].push(ep);
    else if (p.includes('joblist') || p.includes('/search') || ep.queryKeys.includes('page')) categories['jobs list/filter'].push(ep);
    else if (p.includes('job') || p.includes('milestone') || p.includes('nextsteps')) categories['job detail'].push(ep);
    else categories['other (business)'].push(ep);
});

let out = `=== ENDPOINT INVENTORY DISCOVERY REPORT ===\n\n`;
out += `1. Final Counts\n`;
out += `- Raw captured requests total: ${rawCount}\n`;
out += `- Unique method + full URL count: ${uniqueMethodUrlCount}\n`;
out += `- Unique normalized endpoints (all): ${normalizedCount}\n`;
out += `- Unique normalized endpoints EXCLUDING obvious noise/polling: ${businessCount}\n\n`;

out += `2. Category Totals\n`;
Object.keys(categories).forEach(cat => {
    out += `- ${cat.padEnd(25)} : ${categories[cat].length} unique endpoints\n`;
});

out += `\n3. High-Value Business Endpoints Only (${businessCount} total)\n`;
out += `| Category | Method | Normalized Path | Query Params | Count | Example URL |\n`;
out += `|----------|--------|-----------------|--------------|-------|-------------|\n`;

Object.keys(categories).forEach(cat => {
    if (cat === 'noise/polling (excluded)') return;
    categories[cat].forEach(ep => {
        out += `| ${cat} | ${ep.method} | ${ep.templatePath} | ${ep.queryKeys || '(none)'} | ${ep.count} | ${ep.examplePath} |\n`;
    });
});

out += `\n4. Top Omitted Noise Categories (Removed from business count)\n`;
noise.slice(0, 10).forEach(ep => {
    out += `- [Noise] ${ep.method} ${ep.templatePath} (${ep.count} hits)\n`;
});
if (noise.length > 10) out += `- ... and ${noise.length - 10} more noise endpoints\n`;

fs.writeFileSync(outPath, out);
console.log('Advanced final crawler report generated at scripts/out_crawler_inventory.txt');
