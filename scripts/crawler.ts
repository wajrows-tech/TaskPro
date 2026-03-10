import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const OUT_FILE = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\acculynx_inventory_auto.json';

// Safe GET URLs we assume exist in AccuLynx based on standard CRM architectures and the APIs we saw.
const safeUrls = [
    'https://my.acculynx.com/dashboard',
    'https://my.acculynx.com/jobs/list',
    'https://my.acculynx.com/contacts/list',
    'https://my.acculynx.com/calendar',
    'https://my.acculynx.com/messages',
    'https://my.acculynx.com/tasks',
    'https://my.acculynx.com/reports',
    'https://my.acculynx.com/settings'
];

async function autoScrapeSession() {
    console.log('[Auto-Scraper] Connecting to local Chrome on port 9222...');
    const browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
    });

    const pages = await browser.pages();
    let alPage = pages.find(p => p.url().includes('acculynx.com'));

    if (!alPage) {
        console.log('[Auto-Scraper] No active AccuLynx tab found. Using first tab.');
        alPage = pages[0];
    }

    const inventory: any[] = [];

    // We also want to merge in the existing user-driven capture
    try {
        const existingData = fs.readFileSync('C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\acculynx_inventory.json', 'utf8');
        const existing = JSON.parse(existingData);
        inventory.push(...existing);
        console.log(`[Auto-Scraper] Loaded ${existing.length} prior requests from user session.`);
    } catch (e) { /* ignore */ }

    alPage.on('request', request => {
        const url = request.url();
        if (url.includes('api') || url.includes('ajax') || url.includes('.json') || request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
            inventory.push({
                method: request.method(),
                url: url,
                resourceType: request.resourceType(),
                headers: request.headers(),
                postData: request.postData() ? 'present' : 'none'
            });
            fs.writeFileSync(OUT_FILE, JSON.stringify(inventory, null, 2));
        }
    });

    // Strategy 1: Navigate to the hardcoded safe index URLs
    console.log('[Auto-Scraper] Navigating to common index pages...');
    for (const url of safeUrls) {
        try {
            console.log(` -> Visiting ${url}`);
            await alPage.goto(url, { waitUntil: 'networkidle2', timeout: 8000 });
            await new Promise(r => setTimeout(r, 2000)); // wait for lazy APIs
        } catch (e: any) {
            console.log(`    (Skipped ${url} - timeout or error: ${e.message.substring(0, 50)})`);
        }
    }

    // Strategy 2: Look for dashboard links and click them if they are internal GETs
    console.log('[Auto-Scraper] Scanning for dynamic navigational links...');
    try {
        const links = await alPage.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors
                .map((a: any) => a.href)
                .filter(href => href.includes('acculynx.com') && !href.includes('logout') && !href.includes('delete') && !href.includes('javascript:'));
        });

        // Dedupe links and pick up to 10 safe ones
        const uniqueLinks = [...new Set(links)];
        const targetLinks = uniqueLinks.slice(0, 15);

        for (const link of targetLinks) {
            console.log(` -> Visiting dynamic link: ${link}`);
            try {
                await alPage.goto(link, { waitUntil: 'networkidle2', timeout: 8000 });
                await new Promise(r => setTimeout(r, 1000));
            } catch (e: any) {
                console.log(`    (Skipped)`);
            }
        }
    } catch (e) {
        console.log('[Auto-Scraper] Could not extract links.');
    }

    console.log(`[Auto-Scraper] Done! Wrote to ${OUT_FILE}`);
    browser.disconnect();
    process.exit(0);
}

autoScrapeSession().catch(console.error);
