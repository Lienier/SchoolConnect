// Read-only verification of the production deployment after the repair push.
const fs = require('fs'), path = require('path');
const req = require('module').createRequire(path.resolve(__dirname, '../../../../frontend/package.json'));
const { chromium } = req('playwright');
const base = 'https://school-connect-ashen.vercel.app';
const backend = 'https://schoolconnect-performance.onrender.com';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const results = [], errors = [], targets = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/api/feed')) targets.push(request.url()); });
    const serviceChecks = Promise.all(['/health', '/ready', '/api/feed?limit=1', '/socket.io/?EIO=4&transport=polling'].map(async route => {
      try {
        const response = await context.request.get(backend + route, { timeout: 15000 });
        results.push({ name: route, status: response.status() === 200 ? 'passed' : 'failed', httpStatus: response.status() });
      } catch (error) { results.push({ name: route, status: 'failed', observed: error.message.split('\n')[0] }); }
    }));
    const response = await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    results.push({ name: 'Production frontend', status: response.status() === 200 ? 'passed' : 'failed', httpStatus: response.status() });
    try {
      const alert = page.getByRole('alert');
      await alert.waitFor({ timeout: 22000 });
      results.push({ name: 'Deployed outage feedback', status: 'passed', observed: await alert.innerText() });
      results.push({ name: 'Retry control', status: await page.getByRole('button', { name: 'Retry', exact: true }).isVisible() ? 'passed' : 'failed' });
    } catch (error) { results.push({ name: 'Deployed outage feedback', status: 'failed', observed: error.message.split('\n')[0] }); }
    results.push({ name: 'Selected production API target', status: targets.length && targets.every(url => url.startsWith(backend + '/api/')) ? 'passed' : 'failed' });
    results.push({ name: 'Browser JavaScript exceptions', status: errors.length ? 'failed' : 'passed', observed: errors });
    await page.screenshot({ path: path.join(__dirname, '04-live-outage.png'), fullPage: true });
    await serviceChecks;
    const report = { timestamp: new Date().toISOString(), frontend: base, backend, results, feedTargets: targets };
    fs.writeFileSync(path.join(__dirname, 'live-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
