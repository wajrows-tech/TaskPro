import fs from 'fs';

const FILE = 'C:/Users/wajro/.gemini/antigravity/scratch/acculynx_inventory_20260310.json';
const inventory = JSON.parse(fs.readFileSync(FILE, 'utf8'));

console.log(`Analyzing capturing containing ${inventory.length} total network requests`);

// Deduplicate and filter
const uniquePaths = new Map<string, any>();

inventory.forEach((req: any) => {
    // Only care about API endpoints
    if (!req.url.includes('/api/') && !req.url.includes('graphql') && !req.url.includes('ajax')) return;
    
    // Ignore static assets, metrics, and basic polling
    if (req.url.includes('.js') || req.url.includes('.css') || req.url.includes('tracking') || req.url.includes('metrics') || req.url.includes('notifications')) return;

    let urlObj;
    try {
        urlObj = new URL(req.url);
    } catch { return; }

    const pathTemplate = urlObj.pathname.replace(/\/[a-f0-9-]{36}/gi, '/{uuid}').replace(/\/\d+/g, '/{id}');
    const key = `${req.method} ${pathTemplate}`;

    if (!uniquePaths.has(key)) {
        uniquePaths.set(key, { ...req, templatedPath: pathTemplate, query: urlObj.search });
    }
});

console.log(`\n--- Unique High-Value Endpoints (${uniquePaths.size}) ---`);
const categories: Record<string, any[]> = {
    jobs: [],
    users: [],
    financials: [],
    documents: [],
    other: []
};

Array.from(uniquePaths.values()).forEach(req => {
    const path = req.templatedPath.toLowerCase();
    
    // Authorization info
    let authType = 'cookie';
    if (req.headers.authorization || req.headers.Authorization) authType = 'bearer';
    if (req.headers['x-csrf-token'] || req.headers['X-CSRF-Token']) authType += '+csrf';

    const summary = `${req.method.padEnd(6)} ${req.templatedPath.padEnd(50)} [Auth: ${authType}]`;

    if (path.includes('job') || path.includes('milestone')) categories.jobs.push({ summary, req });
    else if (path.includes('user') || path.includes('rep') || path.includes('assign')) categories.users.push({ summary, req });
    else if (path.includes('estimat') || path.includes('invoic') || path.includes('financ') || path.includes('payment')) categories.financials.push({ summary, req });
    else if (path.includes('document') || path.includes('photo') || path.includes('file') || path.includes('album') || path.includes('attachment')) categories.documents.push({ summary, req });
    else categories.other.push({ summary, req });
});

['jobs', 'users', 'financials', 'documents'].forEach(cat => {
    console.log(`\n=== CATEGORY: ${cat.toUpperCase()} ===`);
    categories[cat].forEach(entry => console.log(entry.summary));
});

console.log('\n--- Selected Interesting Details ---');
// Let's print out the exact query params for the jobs list
const jobsList = categories.jobs.find(j => j.summary.includes('api/v1/jobs') || j.summary.includes('api/jobs') || j.summary.includes('graphql'));
if (jobsList) {
    console.log('Jobs List Query Params:', jobsList.req.query);
}
