import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function sniffNextPost() {
    console.log('[Write-Back Proofer] Hooking into active Chrome session...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find((p: any) => p.url().includes('acculynx.com')) || pages[0];

    console.log(`[Write-Back Proofer] Sniffing on active tab: ${page.url()}`);
    console.log('[Write-Back Proofer] Waiting for you to trigger a POST action (like Add Note)...');

    // Attach to the current session CDPSession to sniff all network activity without blocking navigation
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.requestWillBeSent', async (e) => {
        const req = e.request;
        if (req.method === 'POST' && req.url.includes('acculynx.com/api')) {
            console.log('\n--- TARGET POST DETECTED ---');
            console.log(`URL: ${req.url}`);

            // Extract Headers specifically looking for CSRF
            const headers = req.headers;
            const csrfKeys = Object.keys(headers).filter(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('csrf'));

            const payload = {
                url: req.url,
                method: req.method,
                csrfHeaders: csrfKeys.reduce((acc, key) => ({ ...acc, [key]: headers[key] }), {}),
                body: req.postData || 'No Body Captured',
                contentType: headers['content-type'] || headers['Content-Type']
            };

            fs.writeFileSync('scripts/post_proof.json', JSON.stringify(payload, null, 2));
            console.log('[Write-Back Proofer] Signature captured to post_proof.json! Disconnecting...');

            await client.send('Network.disable');
            browser.disconnect();
            process.exit(0);
        }
    });

    // Keep process alive for 5 minutes max
    setTimeout(() => {
        console.log('[Write-Back Proofer] Timeout reached (5 mins). Exiting.');
        browser.disconnect();
        process.exit(1);
    }, 300000);
}

sniffNextPost().catch(console.error);
