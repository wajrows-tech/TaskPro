import puppeteer from 'puppeteer-core';
import fetch from 'node-fetch';

async function testFetch() {
    console.log('[AccuLynx Debug] Connecting...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find((p: any) => p.url().includes('acculynx.com')) || pages[0];

    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    browser.disconnect();

    console.log('[AccuLynx Debug] Cookies extracted:', cookieString.substring(0, 50) + '...');

    const headers = {
        'Accept': 'application/json',
        'Cookie': cookieString
    };

    const url = 'https://my.acculynx.com/api/joblist?page=1&pageSize=10&filters=salesPerson%3DJoe%20Wajrowski';
    const res = await fetch(url, { headers });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response Snippet:', text.substring(0, 300));
}

testFetch();
