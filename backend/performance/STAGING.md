# Isolated performance experiment

Status: staging is deployed at https://schoolconnect-performance.onrender.com.
The synthetic fixture and 100 tokens were created September 10, 2026. The initial
authenticated smoke test failed on event-list timeout; see
[the staging smoke report](REPORT-staging-smoke-2026-09-10.md). Higher-load runs
remain pending. Refresh existing fixture tokens from backend with
`python -m performance.export_tokens`; do not rerun the empty-database seeder.

1. Create a separate Render Docker service from this repository with root `backend`,
   using the same instance size and Docker command as production. Name it
   `schoolconnect-performance`. Disable automatic deployment during experiments.
2. Create a separate PostgreSQL/Supabase database with the same compute tier,
   region and connection mode as production. Never copy production personal data.
3. Configure the service with `FLASK_ENV=production`, its separate `DATABASE_URL`,
   independent random `SECRET_KEY` and `JWT_SECRET_KEY`, `STORAGE_BACKEND=local`,
   `RATELIMIT_DEFAULT=6000 per minute`, `JWT_ACCESS_TOKEN_MINUTES=120`.
   Do not configure SEED_ADMIN credentials: the fixture requires an empty user table.
   Keep rate limiting enabled. Record this test-only allowance in the report.
   Match production WEB_THREADS and WEB_TIMEOUT. The existing Docker command
   runs migrations and seeds RBAC. Local storage is sufficient for this browsing
   experiment; upload performance is outside its scope.
4. From a backend Python environment with requirements installed, set
   `PERF_DATABASE_URL` to that same separate database, `PERF_CONFIRM_EMPTY_DATABASE=yes`,
   and the staging service's SECRET_KEY and JWT_SECRET_KEY. Run from `backend`:
   `python -m performance.seed_fixture`. The script refuses a database containing
   users. It creates 100 unique students, 200 announcements and 100 events and
   saves short-lived tokens in ignored `performance/results/accounts.json`.
   These are synthetic baseline assumptions, not verified production volumes.
   Tokens are for browsing tests; password login is not measured.
5. From the repository root in a fresh PowerShell terminal:

```powershell
$env:PUBLIC_ONLY = 'false'
$env:ACCOUNTS_FILE = './results/accounts.json' # resolved relative to schoolconnect.js
$env:VUS = '20'
$env:TIME_SCALE = '1'
$env:RATE = '5'
$env:DURATION = '10m'
$env:PREALLOCATED_VUS = '50'
$env:MAX_VUS = '100'
$env:K6_WEB_DASHBOARD = 'true'
$staging = 'https://YOUR-PERFORMANCE-SERVICE.onrender.com'
.\backend\performance\run.ps1 -Profile smoke -BaseUrl $staging -Label staging-smoke
```

Continue only after smoke passes. Open localhost:5665 during each run, closing
the dashboard tab afterward so the process can exit. Warm up with one unreported
load run. Run load, stress, spike and scalability separately, three times each,
allowing service/database metrics to return to baseline between runs. For a 14m
load run set TIME_SCALE=2, then restore TIME_SCALE=1 for stress and spike. Tokens
must remain valid through the run; generate fresh tokens before a later session
using your authorized staging account tooling (do not rerun the empty-DB seeder).

Monitor Render CPU/memory and Supabase query latency, locks and connection usage.
Record deployment commit, regions, database row counts, worker/thread settings,
run settings and generator CPU with every report. The current runner records
its basic settings; preserve this additional context separately.

For scalability, run fixed rates 5, 10, 20 journeys/second on one configuration,
then repeat identical rates after changing compute/instance count. Do not run
these simultaneously. Compare highest throughput meeting the same provisional
p95<800ms, p99<1500ms, errors<1% and zero dropped-iteration targets. Revisit targets
with the project owner before claiming acceptance. Do not interpret a single
configuration as evidence of scaling efficiency.

Remaining coverage: registration writes, notification-rich user histories,
uploads, browser rendering and WebSockets. The supplied fixture and suite cover
authenticated browsing only; a representative full-system workload requires
those workflows and agreed usage proportions.
