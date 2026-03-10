import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const OUT_FILE = path.join(__dirname, '..', '..', 'acculynx_inventory.json');

async function sniffSession() {
    console.log('[Sniffer] Attempting to connect to local Chrome on port 9222...');
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        });
    } catch (e) {
        console.error('Failed to connect. Is Chrome running with --remote-debugging-port=9222 ?');
        process.exit(1);
    }

    console.log('[Sniffer] Connected successfully. Looking for AccuLynx tabs...');
    const pages = await browser.pages();
    let alPage = pages.find(p => p.url().includes('acculynx.com'));

    if (!alPage) {
        console.log('[Sniffer] No active AccuLynx tab found. Please navigate to AccuLynx in Chrome!');
        process.exit(1);
    }

    console.log(`[Sniffer] Attached to: ${alPage.url()}`);
    console.log('[Sniffer] Recording network traffic... Please click around the AccuLynx Web App now!');
    console.log(' - Go to the Jobs List');
    console.log(' - Open a specific Job Detail');
    console.log(' - Click the Contacts, Financials, and Documents tabs');
    console.log('\nPress Ctrl+C when you are done to save the inventory.');

    const inventory: any[] = [];

    alPage.on('request', request => {
        const url = request.url();
        if (url.includes('api') || url.includes('ajax') || url.includes('.json') || request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
            const endpoint = {
                method: request.method(),
                url: url,
                resourceType: request.resourceType(),
                headers: request.headers(),
                postData: request.postData() ? 'present' : 'none'
            };
            inventory.push(endpoint);
            // Write to file immediately so we don't lose data on kill
            fs.writeFileSync(OUT_FILE, JSON.stringify(inventory, null, 2));
            console.log(`[Captured] ${endpoint.method} ${url.split('?')[0]}`);
        }
    });

    // Handle graceful exit to save file (fallback)
    process.on('SIGINT', () => {
        console.log(`\n[Sniffer] Stopping. Collected ${inventory.length} internal AccuLynx endpoints.`);
        browser.disconnect();
        process.exit(0);
    });

    // Keep process alive indefinitely until user hits Ctrl+C
    await new Promise(() => { });
}

sniffSession().catch(console.error);
