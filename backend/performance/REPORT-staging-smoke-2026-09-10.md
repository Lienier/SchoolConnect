# Authenticated staging smoke test

Target: https://schoolconnect-performance.onrender.com
Executed September 10, 2026, at approximately 19:24 Asia/Manila.

Verified fixture: 100 active synthetic students, 200 announcements, 100 events.
Exported 100 distinct access tokens to ignored results/accounts.json. Tokens
expire after two hours; refresh from backend with
`python -m performance.export_tokens`. This reads the existing fixture and does
not insert or modify database rows. Keep .env.local and tokens private.

All four setup requests passed authentication, permissions and response checks.
One user then executed one measured browsing journey:

| Endpoint | Measured duration | Result |
| --- | ---: | --- |
| /api/auth/me | 2.24s | Success |
| /api/feed | 5.50s | Success |
| /api/events | 10s timeout | Failure |
| /api/notifications | 3.76s | Success |

Workload errors: 1/4 (25%). Rate-limited requests: zero. These are individual
observations, not statistically meaningful latency percentiles or capacity
estimates. All exceeded the provisional 800ms latency target. The setup event
request completed in approximately 11.33s under its longer timeout.

Do not interpret this as a passed smoke test. Higher-load runs were not started.
Investigate event query/serialization time and hosting/database region and
resource settings first. Server telemetry was not collected; no bottleneck
cause is established. Notifications are empty for these synthetic users, and
registration writes and other workflows are not covered.

Evidence: results/20260910-192409-749-smoke-staging-authenticated.summary.json,
the matching metrics.json and run.json. The production backend was not tested
or reconfigured during this setup.

## Follow-up diagnosis

A read-only comparison from the development machine against the staging database
isolated event loading and serialization for 20 approved events:

| Query strategy | SQL statements | Extra statements during serialization | Elapsed |
| --- | ---: | ---: | ---: |
| Current relationship loading | 43 | 40 | 14.09s |
| Batched attachments and results | 5 | 0 | 1.57s |

Event.to_dict accesses attachments and results. Both relationships load lazily,
producing two extra queries per event, including when the collections are empty.
The measured SQL execution time was 14.01s vs 1.56s respectively. This confirms
a database round-trip bottleneck in the current list serialization. These are
single local measurements, not deployed end-to-end response times; cache/order
effects and network location may affect the timing comparison.

The route additionally calls refresh_lifecycle before pagination. That method
loads all approved/ongoing events, even future events with no state transition.
This is another scaling concern found in code, but was not included in this
timed comparison. Authentication and pagination also add work.

Reproduce with `python -m performance.diagnose_events` from backend. It runs
SELECT queries in read-only transactions and rolls back each comparison.
No application optimization has been deployed. Batch-loading attachments/results
in the event-list query is the first concrete optimization to implement and
validate, followed by rerunning the deployed smoke test.
