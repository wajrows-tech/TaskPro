import puppeteer from 'puppeteer-core';

async function extractCSRFandPOST() {
    console.log('[CSRF Discovery] Connecting to local Chrome session on 9222...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    // Create a new headless tab so we don't mess up the user's active view
    const page = await browser.newPage();

    // We captured this UUID earlier:
    // 35286d41-4c2f-46c3-bd0f-6b6d38de2aed ('AccuLynx Job')
    const targetUrl = 'https://my.acculynx.com/jobs/dashboard/35286d41-4c2f-46c3-bd0f-6b6d38de2aed';
    console.log('[CSRF Discovery] Navigating secretly to:', targetUrl);

    // Setup Network Interceptor for clues
    await page.setRequestInterception(true);
    page.on('request', req => {
        const url = req.url();
        if (req.method() === 'POST' && (url.includes('note') || url.includes('message') || url.includes('api'))) {
            console.log('\n[Network Catch] Found POST:', url);
            console.log('Headers:', req.headers());
            console.log('PostData:', req.postData()?.substring(0, 100));
        }
        req.continue();
    });

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });
        console.log('[CSRF Discovery] Page loaded.');

        // 1. Try Classic ASP.NET Hidden Inputs
        const csrfTokens = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[name="__RequestVerificationToken"]'));
            return inputs.map(input => (input as HTMLInputElement).value);
        });

        console.log('\n[CSRF Discovery] Hidden DOM Tokens:', csrfTokens.length);
        if (csrfTokens.length > 0) {
            console.log('Sample Token:', csrfTokens[0].substring(0, 50) + '...');
        }

        // 2. Try Headers injected by AccuLynx Global JS
        const globalHeaders = await page.evaluate(() => {
            const state: any = {};
            if ((window as any).AccuLynx?.antiForgeryToken) {
                state.globalToken = (window as any).AccuLynx.antiForgeryToken;
            }
            if ((window as any).__RequestVerificationToken) {
                state.windowToken = (window as any).__RequestVerificationToken;
            }
            return state;
        });

        console.log('\n[CSRF Discovery] Global JS Tokens:', globalHeaders);

        // 3. Search inline scripts for config
        const inlineConfig = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const s of scripts) {
                const txt = s.textContent || '';
                if (txt.includes('VerificationToken') || txt.includes('antiForgery')) {
                    return txt.substring(txt.indexOf('Token'), txt.indexOf('Token') + 150).replace(/\s+/g, ' ');
                }
            }
            return 'No inline config found.';
        });
        console.log('\n[CSRF Discovery] Inline Script Clues:', inlineConfig);

    } catch (e: any) {
        console.error('[CSRF Discovery] Navigation failed:', e.message);
    } finally {
        await page.close();
        browser.disconnect();
    }
}

extractCSRFandPOST().catch(console.error);
