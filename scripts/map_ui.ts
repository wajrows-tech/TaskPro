import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function mapUI() {
    console.log('[UI Mapper] Connecting...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    const targetUrl = 'https://my.acculynx.com/jobs/dashboard/35286d41-4c2f-46c3-bd0f-6b6d38de2aed';

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });
        console.log('[UI Mapper] Loaded Job Dashboard.');

        // Dump clickable elements with "Note" or "Task" or "Message" in them
        const interactables = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            return elements.map(el => ({
                tag: el.tagName,
                text: (el as HTMLElement).innerText?.trim().substring(0, 50),
                href: (el as HTMLAnchorElement).href || null,
                classes: el.className
            })).filter(e => e.text && (
                e.text.toLowerCase().includes('note') ||
                e.text.toLowerCase().includes('task') ||
                e.text.toLowerCase().includes('message') ||
                e.text.toLowerCase().includes('add activity')
            ));
        });

        console.log('\n[UI Mapper] Found candidate interactables:', interactables.length);
        interactables.forEach((el, i) => console.log(`${i}. [${el.tag}] "${el.text}" (Class: ${el.classes})`));

        // Save a snapshot of the raw body text to look for clues
        const text = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync('scripts/dashboard_text_dump.txt', text);
        console.log('[UI Mapper] Dumped full page text to dashboard_text_dump.txt');

    } catch (e: any) {
        console.error('[UI Mapper] Error:', e.message);
    } finally {
        await page.close();
        browser.disconnect();
    }
}

mapUI().catch(console.error);
