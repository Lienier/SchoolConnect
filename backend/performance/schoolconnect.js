import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import execution from 'k6/execution';
import encoding from 'k6/encoding';
import { SharedArray } from 'k6/data';

const profile = __ENV.PROFILE || 'smoke';
const base = (__ENV.BASE_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const api = (__ENV.API_PREFIX || '/api').replace(/\/+$/, '');
const positive = (name, fallback) => {
  const value = Number(__ENV[name] || fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
};
const vus = positive('VUS', 20);
const rate = positive('RATE', 10);
const timeScale = Number(__ENV.TIME_SCALE || 1);
if (!Number.isFinite(timeScale) || timeScale <= 0) throw new Error('TIME_SCALE must be positive');
const ramp = (stages) => ({ executor: 'ramping-vus', startVUs: 0, stages: stages.map(stage => ({ ...stage, duration: `${Math.max(1, Math.round(parseFloat(stage.duration) * (stage.duration.endsWith('m') ? 60 : 1) * timeScale))}s` })), gracefulRampDown: '15s', gracefulStop: '15s' });
const profiles = {
  smoke: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '1m' },
  load: ramp([{ duration: '1m', target: vus }, { duration: '5m', target: vus }, { duration: '1m', target: 0 }]),
  stress: ramp([{ duration: '1m', target: vus }, { duration: '2m', target: vus }, { duration: '1m', target: vus * 2 }, { duration: '2m', target: vus * 2 }, { duration: '1m', target: vus * 4 }, { duration: '2m', target: vus * 4 }, { duration: '1m', target: vus }, { duration: '1m', target: vus }, { duration: '30s', target: 0 }]),
  spike: ramp([{ duration: '30s', target: vus }, { duration: '1m', target: vus }, { duration: '5s', target: vus * 5 }, { duration: '1m', target: vus * 5 }, { duration: '5s', target: vus }, { duration: '2m', target: vus }, { duration: '30s', target: 0 }]),
  scalability: { executor: 'constant-arrival-rate', rate, timeUnit: '1s', duration: __ENV.DURATION || '5m', preAllocatedVUs: positive('PREALLOCATED_VUS', 50), maxVUs: positive('MAX_VUS', 200), gracefulStop: '15s' },
};
if (!profiles[profile]) throw new Error('PROFILE must be smoke, load, stress, spike, or scalability');
if (!/^https?:\/\//.test(base)) throw new Error('BASE_URL must be an HTTP(S) backend origin');
if (profile === 'scalability' && profiles.scalability.maxVUs < profiles.scalability.preAllocatedVUs) throw new Error('MAX_VUS must be >= PREALLOCATED_VUS');
const businessErrors = new Rate('business_errors');
const rateLimited = new Rate('rate_limited');
const publicOnly = __ENV.PUBLIC_ONLY === 'true';
const accounts = new SharedArray('test accounts', () => __ENV.ACCOUNTS_FILE ? JSON.parse(open(__ENV.ACCOUNTS_FILE)) : []);
const requiredAccounts = profile === 'smoke' ? 1 : profile === 'stress' ? vus * 4 : profile === 'spike' ? vus * 5 : profile === 'scalability' ? profiles.scalability.maxVUs : vus;
if (!publicOnly && accounts.length && accounts.length < requiredAccounts) throw new Error(`Need at least ${requiredAccounts} distinct test accounts`);
if (accounts.length) {
  const identities = new Set();
  for (const account of accounts) {
    const claims = JSON.parse(encoding.b64decode(account.access_token.split('.')[1], 'rawurl', 's'));
    if (!claims.sub || identities.has(claims.sub)) throw new Error('Test tokens must have distinct user identities');
    if (!claims.exp || claims.exp * 1000 < Date.now() + 30 * 60 * 1000) throw new Error('Generate fresh test tokens with at least 30 minutes remaining');
    identities.add(claims.sub);
  }
}
const endpoints = publicOnly ? [['feed', '/feed?limit=12']] : [
  ['me', '/auth/me'],
  ['feed', '/feed?limit=12'],
  ['events', '/events?page=1&page_size=20'],
  ['notifications', '/notifications?page=1&page_size=20'],
];
const thresholds = {
  'http_reqs{phase:workload}': ['count>0'],
  'http_req_failed{phase:workload}': ['rate<0.01'],
  business_errors: ['rate<0.01'],
  rate_limited: ['rate==0'],
  'http_req_duration{phase:workload}': ['p(95)<800', 'p(99)<1500'],
};
for (const [name] of endpoints) thresholds[`http_req_duration{endpoint:${name},phase:workload}`] = ['p(95)<800'];
if (profile === 'scalability') thresholds.dropped_iterations = ['count==0'];
export const options = {
  scenarios: { [profile]: profiles[profile] }, thresholds,
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  systemTags: ['status', 'method', 'name', 'scenario', 'expected_response'],
  setupTimeout: '2m',
};

function params(token, endpoint, phase) {
  return { headers: token ? { Authorization: `Bearer ${token}` } : {}, tags: { name: endpoint, endpoint, phase }, timeout: phase === 'setup' ? '60s' : '10s', redirects: 0 };
}
function valid(response) {
  try { return response.status === 200 && response.json('success') === true && response.json('data') !== undefined; }
  catch (_) { return false; }
}
export function setup() {
  let token = accounts.length ? accounts[0].access_token : __ENV.ACCESS_TOKEN;
  if (publicOnly) token = null;
  if (!publicOnly && !token) {
    if (!__ENV.TEST_EMAIL || !__ENV.TEST_PASSWORD) throw new Error('Set ACCESS_TOKEN or TEST_EMAIL and TEST_PASSWORD for a dedicated test account');
    const response = http.post(`${base}${api}/auth/login`, JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }), {
      headers: { 'Content-Type': 'application/json' }, tags: { name: 'login', phase: 'setup' }, timeout: '10s', redirects: 0,
    });
    if (!valid(response)) throw new Error(`Test login failed (HTTP ${response.status}); check credentials and rate limits`);
    token = response.json('data.access_token');
    if (!token) throw new Error('Login did not return an access token');
  }
  for (const [name, path] of endpoints) {
    const response = http.get(`${base}${api}${path}`, params(token, name, 'setup'));
    if (!valid(response)) throw new Error(`Preflight failed for ${name} (HTTP ${response.status}); check URL, account permissions, token expiry and database`);
  }
  return { token };
}
export default function (data) {
  const token = !publicOnly && accounts.length ? accounts[execution.vu.idInTest - 1].access_token : data.token;
  for (const [name, path] of endpoints) {
    const response = http.get(`${base}${api}${path}`, params(token, name, 'workload'));
    const ok = valid(response);
    check(response, { [`${name}: HTTP 200 and success envelope`]: () => ok });
    businessErrors.add(!ok, { endpoint: name });
    rateLimited.add(response.status === 429, { endpoint: name });
  }
  if (profile !== 'scalability') sleep(1 + Math.random() * 2);
}

