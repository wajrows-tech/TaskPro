const puppeteer = require('puppeteer-core');
const fs = require('fs');

const OUT_FILE = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\API_SPEC_PROBE.json';

async function probeApi() {
    console.log('[API Probe] Connecting to local Chrome...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('acculynx.com')) || pages[0];

    console.log('[API Probe] Running safe fetch probes in browser context...');
    const results = await page.evaluate(async () => {
        const data = {};
        const uuid = 'ea2d3425-8049-4902-9632-3e9df8043d7b';

        async function safeFetch(url) {
            try {
                const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
                const text = await r.text();
                let json = null;
                try { json = JSON.parse(text); } catch (e) { json = text.substring(0, 500); }
                return { status: r.status, ok: r.ok, url, payload: json };
            } catch (e) {
                return { error: e.message, url };
            }
        }

        data.joblist_base = await safeFetch('/api/joblist?page=1&loadAll=false');
        data.joblist_page_size_large = await safeFetch('/api/joblist?page=1&pageSize=500');
        data.joblist_dup_filter = await safeFetch('/api/joblist?page=1&filters=currentMilestoneList%3DProspect&filters=currentMilestoneList%3DProspect');
        data.joblist_fake_param = await safeFetch('/api/joblist?page=1&fakeUnknownParam=123');
        data.joblist_joe_filter = await safeFetch('/api/joblist?page=1&filters=salesPerson%3DJoe%20Wajrowski');

        data.job_bootstrap = await safeFetch('/api/jobs/' + uuid + '/GetJobBootstrap');
        data.job_ar = await safeFetch('/api/jobs/' + uuid + '/GetBalanceDueAndARAge');
        data.media = await safeFetch('/api/v3/media/job/' + uuid + '/view-media?useAbsoluteUrls=false');
        data.albums = await safeFetch('/api/v3/album/job/' + uuid + '/view-job-albums');
        data.estimates = await safeFetch('/api/Estimatev3/GetEstimates/' + uuid);
        data.users = await safeFetch('/api/v3/companyusers');

        return data;
    });

    console.log('[API Probe] Complete. Saving results.');
    fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    browser.disconnect();
}

probeApi().catch(console.error);
