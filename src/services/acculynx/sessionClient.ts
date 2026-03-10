import puppeteer from 'puppeteer-core';
import fetch from 'node-fetch';

export class SessionClient {
    private cookieString: string | null = null;
    private baseUrl = 'https://my.acculynx.com';

    async initialize() {
        console.log('[AccuLynx Client] Connecting to local Chrome session on 9222...');
        const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
        const pages = await browser.pages();
        const page = pages.find((p: any) => p.url().includes('acculynx.com')) || pages[0];

        // Hijack Session Cookies
        const cookies = await page.cookies();
        this.cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        browser.disconnect();

        if (!this.cookieString.includes('ASP.NET_SessionId')) {
            throw new Error('No valid ASP.NET_SessionId found on the active page.');
        }

        console.log('[AccuLynx Client] Authorized session hijacked successfully.');
    }

    async getJson(path: string): Promise<any> {
        if (!this.cookieString) throw new Error('SessionClient not initialized.');

        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Accept': 'application/json',
            'Cookie': this.cookieString
        };

        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`API GET failed: HTTP ${res.status} on ${path}`);
        }
        return res.json();
    }

    async postJson(path: string, body: any): Promise<any> {
        if (!this.cookieString) throw new Error('SessionClient not initialized.');

        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json;charset=UTF-8',
            'Cookie': this.cookieString
        };

        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API POST failed: HTTP ${res.status} on ${path}. Body: ${errText}`);
        }

        // Some POSTs return empty 200/204, so safely parse JSON
        const text = await res.text();
        try {
            return text ? JSON.parse(text) : { success: true };
        } catch {
            return { success: true, textResponse: text };
        }
    }
}
