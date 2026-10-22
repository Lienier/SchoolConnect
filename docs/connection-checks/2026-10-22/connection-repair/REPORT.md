# Connection repair - October 22, 2026

**Local system repaired and verified. Production backend remains unavailable.**

## Completed repairs

- Backed up local PostgreSQL with `pg_dump` before applying all seven outstanding migrations. Backup: `%LOCALAPPDATA%/SchoolConnect/backups/schoolconnect-before-repair-2026-10-22-8ae71c83.dump` (126,191 bytes).
- Local database migration head is now `a4c6e8f0b2d4`. Model tables and columns match the migrated database.
- Resolved relative upload paths from the backend directory so storage and file delivery use the same location.
- Bounded PostgreSQL connection and pool waits at 10 seconds by default.
- Added 15-second API and refresh request timeouts, useful network error messages, and a homepage Retry action. Feed outages no longer appear as empty announcement/event lists.
- Kept the production frontend pointed at the selected `schoolconnect-performance` Render service.

## Verification

| Check | Result |
| --- | --- |
| Backend regression tests | 43 passed, including 4 connection/path tests |
| Frontend production build and TypeScript | Passed |
| Frontend ESLint | Passed |
| Local PostgreSQL health, readiness and public feed | HTTP 200 |
| Local configured administrator login, profile, events, notifications and logout | HTTP 200 |
| Local Playwright UI scenarios | 8/8 passed |

The browser scenarios covered the real local PostgreSQL feed, administrator login, authenticated Socket.IO readiness, events/notifications/reports/college structure pages, logout and route guards, a simulated 503 with successful Retry, and a deliberately held request with a 15-second timeout and successful Retry. No uncaught browser exceptions or unexpected API 5xx responses were observed. No business records were created; login/logout updated session and audit records.

The initial outage selectors in the test driver were too strict. Those two driver failures are preserved in `initial-selector-attempt.json`; the corrected run is in [ui-results.json](ui-results.json). This is a focused connection check, not exhaustive feature coverage. Existing uploaded-file delivery was not verified against a matching local file; upload path configuration and the existing backend upload tests passed.

## Production blocker

The saved performance database URL identifies Supabase project reference `gzpcqdfvzsjlhutowplz`. A bounded read-only connection attempt failed with **tenant/user not found**. This confirms the saved pooler host and username combination is not accepted; it does not establish whether the project is paused, deleted, or configured differently in Render.

Supabase's [official troubleshooting guidance](https://supabase.com/docs/guides/troubleshooting/tenant-or-user-not-found) requires using the exact connection string from the project's Connect dialog. Do not guess the pooler cluster or reset the database password as a substitute for checking it.

Render and Supabase account connections are unavailable in this session. Their plugins were suggested, but installation/connection is not confirmed. Therefore Render environment variables, deployment logs, live migrations, CORS, production storage configuration and authenticated production flows cannot yet be repaired or verified. The selected service is `schoolconnect-performance` (`srv-dah8ueijnfac738qk4vg`). Local migration success does not update the remote database.

To finish: connect the owning Render and Supabase accounts, read the actual Render database configuration and Supabase connection details, repair the live configuration, deploy/migrate, then rerun live health, feed, authentication, realtime and upload checks.

Local QA endpoints are `http://127.0.0.1:5000` (backend) and `http://127.0.0.1:5175` (frontend); these are separate from the production deployment.

## Deployment and final live check

Source fixes were pushed to `main` in commit `a26adac`. GitHub reported the Vercel deployment successful. A fresh read-only Playwright check at 21:02 Asia/Manila confirmed:

- Production frontend returned HTTP 200 and requested the selected performance backend.
- The deployed homepage displayed the new timeout message and Retry control.
- No uncaught browser JavaScript exceptions occurred.
- Render health, readiness, public feed and Socket.IO polling each timed out after 15 seconds. Production remains unavailable for backend-dependent features.

See [live-results.json](live-results.json) and the reproducible [live-check.cjs](live-check.cjs). Local QA services were left running on the addresses above at handoff. No Render environment changes or remote migrations were performed.
