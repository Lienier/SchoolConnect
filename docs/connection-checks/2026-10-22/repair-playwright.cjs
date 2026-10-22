// Local PostgreSQL integration and UI recovery checks. Credentials come from
// the parent process and are never written to the results or screenshots.
const fs = require('fs'), path = require('path');
const req = require('module').createRequire(path.resolve(__dirname, '../../../frontend/package.json'));
const { chromium } = req('playwright');
const base = 'http://127.0.0.1:5175', out = path.join(__dirname, 'connection-repair');
fs.mkdirSync(out, { recursive: true });
const results = [], browserErrors = [], serverErrors = [];
let phase = 'normal';
function assert(value, message) { if (!value) throw new Error(message); }
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Manila' });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('response', response => { if (response.url().includes('/api/') && response.status() >= 500 && phase === 'normal') serverErrors.push({ url: response.url(), status: response.status() }); });
    let realtimeReady = false;
    page.on('websocket', socket => socket.on('framereceived', frame => { if (String(frame.payload).includes('schoolconnect:ready')) realtimeReady = true; }));
    async function check(name, action) {
      const start = Date.now();
      try { results.push({ name, status: 'passed', observed: await action(), milliseconds: Date.now() - start }); }
      catch (error) { results.push({ name, status: 'failed', observed: error.message, milliseconds: Date.now() - start }); }
      console.log(JSON.stringify(results.at(-1)));
    }
    async function shot(name) { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true, mask: [page.locator('#password'), page.locator('#email'), page.locator('aside')] }); }
    await check('PostgreSQL-backed public feed', async () => {
      const response = page.waitForResponse(r => r.url().includes('/api/feed'));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      const data = await response; assert(data.status() === 200 && (await data.json()).success, 'Feed did not return success');
      await page.getByText('Loading announcements...', { exact: true }).waitFor({ state: 'hidden' });
      await shot('01-local-home'); return 'HTTP 200; real local PostgreSQL feed renders';
    });
    await check('Sign in with the configured local administrator', async () => {
      await page.getByRole('banner').getByRole('link', { name: 'Login', exact: true }).click();
      await page.getByLabel('Email', { exact: true }).fill(process.env.REPAIR_LOGIN_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(process.env.REPAIR_LOGIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.waitForURL('**/admin'); await page.getByRole('heading', { name: 'Administrator Dashboard', exact: true }).waitFor();
      return 'Administrator dashboard opens';
    });
    await check('Authenticated realtime connection', async () => {
      const deadline = Date.now() + 8000;
      while (!realtimeReady && Date.now() < deadline) await page.waitForTimeout(100);
      assert(realtimeReady, 'No authenticated schoolconnect:ready WebSocket frame received');
      return 'Socket.IO authenticated connection ready';
    });
    await check('Events, notifications, reports and college structure', async () => {
      for (const [route, heading] of [['/events', 'Events'], ['/notifications', 'Notifications'], ['/reports', 'Reports'], ['/school', 'College Structure']]) {
        await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: heading, exact: true }).waitFor();
        await page.waitForLoadState('networkidle', { timeout: 8000 });
      }
      assert(serverErrors.length === 0, JSON.stringify(serverErrors)); return 'All four authenticated pages load without API 5xx responses';
    });
    await check('Sign out and restore route protection', async () => {
      await page.getByRole('button', { name: 'Log out', exact: true }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Log Out', exact: true }).click();
      await page.waitForURL('**/login');
      await page.goto(base + '/admin', { waitUntil: 'domcontentloaded' }); await page.waitForURL('**/login');
      return 'Session signs out; admin route redirects to login';
    });
    await check('Outage error and Retry recovery', async () => {
      phase = 'outage';
      await page.route('**/api/feed?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic backend outage' }) }));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.getByRole('alert').filter({ hasText: 'Synthetic backend outage' }).waitFor();
      assert(!await page.getByText('No announcements found.', { exact: true }).count(), 'Outage mislabeled as empty data');
      await shot('02-outage'); await page.unroute('**/api/feed?*'); phase = 'normal';
      const response = page.waitForResponse(r => r.url().includes('/api/feed'));
      await page.getByRole('button', { name: 'Retry', exact: true }).click(); assert((await response).status() === 200, 'Retry failed');
      await page.getByRole('alert').waitFor({ state: 'hidden' }); return 'Specific outage shown; Retry restores actual local feed';
    });
    await check('Hung request times out with recovery control', async () => {
      phase = 'timeout'; const held = [];
      await page.route('**/api/feed?*', route => { held.push(route); });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      const started = Date.now();
      await page.getByRole('alert').filter({ hasText: 'The server took too long to respond. Please try again.' }).waitFor({ timeout: 20000 });
      const elapsed = Date.now() - started; assert(elapsed < 20000, 'Request did not time out promptly');
      assert(await page.getByRole('button', { name: 'Retry', exact: true }).isVisible(), 'No retry action');
      await shot('03-timeout'); await page.unroute('**/api/feed?*');
      for (const route of held) await route.abort().catch(() => {});
      phase = 'normal'; const response = page.waitForResponse(r => r.url().includes('/api/feed'));
      await page.getByRole('button', { name: 'Retry', exact: true }).click(); assert((await response).status() === 200, 'Timeout Retry failed');
      await page.getByRole('alert').waitFor({ state: 'hidden' }); return '15-second timeout displays useful error; Retry recovers';
    });
    await check('Browser JavaScript and unexpected server errors', async () => {
      assert(!browserErrors.length && !serverErrors.length, JSON.stringify({ browserErrors, serverErrors })); return 'No JavaScript exceptions or unexpected API 5xx responses';
    });
    fs.writeFileSync(path.join(out, 'ui-results.json'), JSON.stringify({ results, browserErrors, serverErrors, environment: 'Local PostgreSQL, local Flask and Vite', credentialsSaved: false }, null, 2));
    console.log(JSON.stringify({ passed: results.filter(r => r.status === 'passed').length, total: results.length }));
    if (results.some(r => r.status !== 'passed')) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
