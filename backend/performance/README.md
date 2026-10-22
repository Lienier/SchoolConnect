# SchoolConnect performance testing with k6

For isolated authenticated tests with distinct virtual-user accounts and
synthetic data, follow [the staging setup](STAGING.md). This environment has
not yet been provisioned. `ACCOUNTS_FILE` accepts a JSON array of objects with
`access_token` fields; supply at least one distinct valid token per maximum VU.
The file is resolved relative to `schoolconnect.js` and must remain uncommitted.
Without this setting the single-account behavior below still applies.

Run these tests against the Flask backend backed by a separate, representative
test database. The workload exercises `/api/auth/me`, `/api/feed`, `/api/events`
and `/api/notifications` sequentially. It checks HTTP status and the application's
success envelope. Setup logs in once and preflights every endpoint before load.
Use an active test account with `events.view` permission (for example a student).
The default API prefix is `/api`; override with `$env:API_PREFIX` if needed.

This is API browsing performance coverage. It does not measure browser rendering,
WebSockets, uploads, concurrent registrations, or login throughput. All virtual
users share one account, so personalized data and cache behavior are not a model
of many distinct users. Login writes audit/session records, and listing events
calls `refresh_lifecycle()`, which can update event state.

## Run on Windows

### Existing deployment without an account

The selected API target is
`https://schoolconnect-performance.onrender.com/api`. The frontend must be
redeployed to replace an older bundle that still uses the previous backend.
To test only the public feed:

```powershell
$env:PUBLIC_ONLY = 'true'
$env:VUS = '2'
$env:TIME_SCALE = '0.1'
$env:RATE = '1'
$env:DURATION = '30s'
$env:PREALLOCATED_VUS = '5'
$env:MAX_VUS = '10'
$testBase = 'https://schoolconnect-performance.onrender.com'
.\backend\performance\run.ps1 -Profile smoke -BaseUrl $testBase
.\backend\performance\run.ps1 -Profile load -BaseUrl $testBase
.\backend\performance\run.ps1 -Profile stress -BaseUrl $testBase
.\backend\performance\run.ps1 -Profile spike -BaseUrl $testBase
.\backend\performance\run.ps1 -Profile scalability -BaseUrl $testBase
```

This reduced live-deployment experiment has 42s load, 69s stress (peak 8 users),
32s spike (peak 10 users), and 30s scalability (1 request/second), plus setup and
grace periods. `TIME_SCALE` scales ramp-stage durations, rounded to whole seconds
with a minimum of one second. Public mode uses one request per journey and skips
login. It measures the public feed only. Low-intensity, short runs do not establish
the breaking point, sustained capacity, or infrastructure scalability.
Setup allows 60 seconds per GET for a possible cold start; workload timeout is
10 seconds. Latencies include network travel from the load generator.

Remove these overrides before using the full authenticated defaults:
`Remove-Item Env:PUBLIC_ONLY,Env:VUS,Env:TIME_SCALE,Env:RATE,Env:DURATION,Env:PREALLOCATED_VUS,Env:MAX_VUS`.

### Authenticated test environment

k6 is already installed on the development machine. On another machine use
`winget install --id k6.k6 --exact` and reopen PowerShell.

Start the backend with its normal production server configuration against the
test database (see the backend README). Do not use Flask's debug server for
capacity claims. From the repository root:

```powershell
$testBase = 'http://127.0.0.1:5000' # replace with your test backend origin, without /api
$env:TEST_EMAIL = Read-Host 'Dedicated test account email'
$secret = Read-Host 'Dedicated test account password' -AsSecureString
$env:TEST_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password

.\backend\performance\run.ps1 -Profile smoke -BaseUrl $testBase
# Continue only after smoke passes:
.\backend\performance\run.ps1 -Profile load -BaseUrl $testBase
.\backend\performance\run.ps1 -Profile stress -BaseUrl $testBase
.\backend\performance\run.ps1 -Profile spike -BaseUrl $testBase

Remove-Item Env:TEST_PASSWORD
Remove-Item Env:TEST_EMAIL
```

Alternatively set `$env:ACCESS_TOKEN` to a fresh Flask access token; a Supabase
API key is not a Flask token. No credentials should be committed. Tokens default
to 15 minutes in this backend; the longest preset is 11m30s plus setup and grace.
Use a fresh token per run. Custom runs must fit the configured token lifetime;
this suite does not refresh tokens. Expired tokens cause failures, not capacity
measurements. Do not use HTTP debug logging because it exposes credentials.

| Profile | Default workload | Purpose |
| --- | --- | --- |
| smoke | 1 user, 1 journey | Verify authentication and all four routes |
| load | Ramp to 20 users, hold 5m, ramp down; 7m total | Expected-load baseline |
| stress | 20, 40, 80 users with holds, then recovery at 20; 11m30s | Find degradation and observe recovery |
| spike | 20 to 100 users in 5s, hold 1m, return to 20 for 2m | Sudden surge and recovery; 5m10s total |
| scalability | 10 journeys/second for 5m | Compare identical offered traffic across server sizes |

The first three browsing profiles include 1–3 seconds of think time per journey.
Set `$env:VUS = '50'` to change their baseline (stress peaks at 4x, spike at 5x).
These are starting assumptions, not established application capacity or expected
traffic. Adjust to measured usage. Threshold failures are expected when stress
exceeds capacity; retain the time series to identify when degradation began.

## Scalability experiment

One journey makes four requests, so RATE=10 offers approximately 40 workload
requests/second if journeys complete. Arrival-rate runs do not add think time.

```powershell
# Set credentials as above before running.
foreach ($offeredRate in 5, 10, 20) {
    $env:RATE = [string]$offeredRate
    .\backend\performance\run.ps1 -Profile scalability -BaseUrl $testBase -Label "one-instance-rate-$offeredRate"
}
```

Repeat that same rate sweep after changing to two instances or a larger server,
using labels describing the configuration. The script does not provision or
resize infrastructure. Hold database dataset, account, server settings, test
duration, and load generator constant; warm up first, allow recovery between runs,
and repeat each configuration three times. Record median results and variation.
Use a separate load-generator machine for credible server capacity measurements.

Optional settings: `DURATION` (default `5m`), `PREALLOCATED_VUS` (50), `MAX_VUS`
(200). Dropped iterations fail the scalability test: inspect generator CPU/network
and VU availability before attributing them to the server. Increase allocation
only when the generator has spare resources.

## Evidence and interpretation

### HTTP 429 during repeated runs

The September 10 ten-user run received 106 HTTP 429 responses out of 137
workload requests (77.37%). The local backend defaults to `200 per hour` keyed
by remote address; virtual users from one machine share the originating IP.
The effective deployed limit and proxy behavior should be verified in backend
configuration/logs. The suite now reports a separate `rate_limited` metric.
429 responses still fail the HTTP and business-error thresholds.

Wait for the active rate-limit window to reset before another run. For capacity
testing, use a dedicated environment with an explicitly sized limit, configured
through the backend's existing `RATELIMIT_DEFAULT` environment setting. Changing
that variable in the local k6 terminal does not change the deployed server.
If testing production is necessary, establish a bounded test allowance in the
backend configuration and restore the prior setting afterward; do not disable
all rate limiting or treat 429 as a successful feed response. No production rate
limits have been changed by this suite.

Throttling and latency are separate: the ten-user run's overall workload p95 was
2,682ms, and earlier runs without 429 also exceeded the 800ms target. Raising a
rate limit alone does not fix response time. Measure successful-response latency
and server/database timings after removing throttling as a test confounder.

Each run saves ignored `results/*.summary.json` aggregate metrics and
`results/*.metrics.json` timestamped metrics. k6 prints the report and returns a
nonzero exit status on failed thresholds. Raw metrics can become large.
The runner also saves `*.run.json` with non-secret run settings and exit status.
Print a Markdown comparison with `python backend/performance/summarize.py`.

Initial acceptance targets (adjust to your requirements): less than 1% HTTP or
application failures, workload p95 below 800ms and p99 below 1500ms, each route
p95 below 800ms, and zero dropped iterations for scalability. Setup traffic is
excluded from workload latency/error thresholds. A 429, 401, or 403 is a failure;
investigate rate limits, token expiry, or permissions before diagnosing overload.
The backend has a configured default rate limit of 200/hour; inspect effective
deployment settings. Keep production protections intact and record any test-only
rate-limit adjustments as part of the experiment.

Observe backend CPU, memory, worker/thread utilization, database connections,
query latency, locks, and errors during each run. Record Supabase compute/pool
configuration and row counts. Inspect timestamped results during the recovery
stage; an aggregate p95 alone cannot prove recovery. Empty test tables are not a
representative benchmark. Stop a run with Ctrl+C if the test environment becomes
unresponsive or impacts shared services.

Use this table in your report; do not fill results until tests actually execute:

| Configuration / profile / offered rate | Dataset | Achieved req/s | p95 / p99 ms | Error % | Dropped iterations | CPU / memory / DB connections | Recovery time | Pass/fail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Scalability is demonstrated by the highest sustainable throughput meeting the
same targets across resource configurations. Compute throughput gain as
`capacity_after / capacity_before` and scaling efficiency as that gain divided
by the resource multiplier. A single increasing-load run alone does not prove
infrastructure scalability.

References: [k6 ramping VUs](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/),
[constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/),
[metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/).
