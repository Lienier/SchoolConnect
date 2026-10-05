# Phased fixes and UI retest - October 5, 2026

Local application fixes address the 31 concrete items below. Original assessment evidence is preserved. No production deployment, remote storage migration or production data changes were made.

## Verification results

**22 UI scenarios / 131 steps passed, with zero browser JavaScript errors in the final evidence.** This combines 10 original journeys, six extended journeys and six targeted follow-ups. Business actions used visible Chrome and rendered UI; the drivers made zero direct application API calls. Database seeds and browser response interception supplied explicit synthetic preconditions.

| Check | Result | Evidence |
| --- | --- | --- |
| Original UI journeys | 10 passed / 54 steps | [Results](final-pass/scenario-results.json) |
| Extended UI journeys | 6 passed / 55 steps | [Results](final-pass/extended-results.json) |
| Targeted follow-ups | 6 passed / 22 steps | [Attendance](final-pass/attendance-followup-results.json), [theme](final-pass/theme-followup-results.json), [large roster](final-pass/roster-followup-results.json), [validation](final-pass/validation-followup-results.json), [closed-deadline editing](final-pass/closed-edit-followup-results.json), [console checks](final-pass/console-followup-results.json) |
| Backend suite | 39 passed in 47.49 seconds | [Recorded output](backend-tests.txt), [regressions](../../../backend/tests/test_qa_regressions.py) |
| Typecheck + production build | Passed; typecheck gates build | [Build log](build.txt) |
| ESLint | Passed | [Lint log](lint.txt) |
| Dependency audit | Zero known frontend vulnerabilities | [Audit JSON](npm-audit.json) |
| Accessibility | 22 light route scans + one verified dark profile; zero sampled WCAG A/AA violations | [Light scans](final-pass/accessibility.json), [actual dark scan](final-pass/dark-accessibility.json) |
| Narrow layout | Profile fits within 320px viewport | [Screenshot](final-pass/screenshots/E06-26.png) |
| Complete roster | 107 records visible and exported through UI | [CSV](final-pass/large-roster.csv) |

Environment: root working tree based on `e3be41f`, root Python environment, isolated SQLite/local upload fixture, visible Chrome, desktop 1440 x 900, mobile check-in 390 x 844, profile 320 x 844, Manila timezone. Existing user changes and nested SchoolConnect submodule were preserved.

## Completed phases

1. **Security and accounts:** parent attachment permissions, private delivery, cache isolation, revocable access sessions and realtime disconnection.
2. **Data and API:** school/role payloads, actual attendance aggregates, UTC timestamps, safe refresh rotation, feed eligibility and merged limit.
3. **Workflows:** complete lists, correct permissions, retries, event settings/editing and registration action states.
4. **Accessibility and maintenance:** modal keyboard handling, names/contrast/layout, TypeScript, canonical setup, dependency updates and repeatable UI commands.
5. **Verification:** fresh original and extended UI journeys, backend regressions, production checks, screenshots and targeted follow-ups.

## Complete remediation checklist

| # | Phase | Problem | Change | Verification / remaining scope |
| --- | --- | --- | --- | --- |
| 1 | Security | Attachment audience bypass | Resolve parent permissions before local/signed delivery; hide deleted parents; expose app URLs only. New Cloudinary assets are authenticated. | Backend audience tests and private-storage mock. Legacy remote migration still required. |
| 2 | Security | Cross-account private cache | Cancel and clear queries on login/logout/session expiry; key personal data by user. | S08 |
| 3 | Data | Six school editors return 422 | Whitelist editable request fields; omit response metadata. | E01: all six edits survive reload |
| 4 | Data | Custom-role edit returns 422 | Send only display name/description in update body. | E01 |
| 5 | Data | Attendance reports disagree with check-ins | Count present/late Attendance records; historical denominator excludes upcoming/deleted events. | S05, F01; backend corrections test |
| 6 | Maintenance | 108 TypeScript errors and build bypass | Repair component/feature types; typecheck is a required build step. | Build exit 0, lint exit 0 |
| 7 | Workflows | Event category lost | Use Controller with Radix onValueChange. | S02 |
| 8 | Workflows | Only first 20 records accessible | Paginate events/mine with server filters; fetch complete calendar date ranges, managed attendance pickers and event rosters. | E03, E04, F03: 107 CSV rows |
| 9 | Workflows | Approval stale until reload | Explicit TypeScript Vite config supplies Socket.IO proxy; registration invalidation, reconnect refresh and polling fallback. | S01/S03: no student reload |
| 10 | Data | Feed eligibility filtered after limit | Filter announcement audience/expiry first, then limit eligible rows. | Backend feed regression |
| 11 | Data | SQLite refresh returns 500 | Normalize UTC expiry; transactional, conditional refresh consumption; controlled replay denial. | Backend refresh/expiry/replay tests |
| 12 | Data | SQLite event time shifts | Serialize UTC datetimes with explicit offset and normalize update comparisons. | S02/E02: Manila 09:00-11:00 retained |
| 13 | Workflows | Officer/leader sees unassigned attendance | Server-managed event scope and valid default/empty state. | E04 |
| 14 | Workflows | Forbidden attendance actions offered | Permission-gate QR, manual marking and scan actions. | E04 |
| 15 | Security | Student can navigate to admin dashboard | Guard role-specific dashboard routes. | E04: Forbidden |
| 16 | Workflows | 503 looks like permissions failure, no Retry | Render server error detail and a Retry button. | E05: intercepted 503 then recovery |
| 17 | Accessibility | Modal focus/Tab/Escape/return failures | Use Radix dialog and restore opening control focus. | S10/E06: 35 trapped Tab steps |
| 18 | Accessibility | Unnamed controls and calendar icons | Name selects/icon controls, hide decorative icons, name report canvases, label event images and calendar more links. | 22 light WCAG scans |
| 19 | Accessibility | Low contrast on sampled pages | Darken muted text; fix council labels and calendar event/date contrast. | 22 light scans + F02 actual dark profile: zero violations |
| 20 | Accessibility | Profile overflows at 320 pixels | Allow shrinking containers and wrap long account values. | E06: document 305, viewport 320; screenshot reviewed |
| 21 | Workflows | Generic validation and missing team feedback | Show server field paths/details; inline team/deadline form errors. | F04 |
| 22 | Workflows | Duplicate/expired registration actions stay enabled | Return own registration status and deadline; disable inappropriate actions. | S04/E02/F05 |
| 23 | Workflows | Registration deadline unavailable in UI | Create/edit deadline with validation and timezone conversion. | E02/F04 |
| 24 | Workflows | Approval mode unavailable in UI | Add checkbox, request validators and persistence for automatic approval. | E02: Approved receipt |
| 25 | Workflows | Event metadata editing unavailable | Add guarded edit route/form, explicit update payload and cache invalidation. | E02/F05 |
| 26 | Security | Access JWT stays valid after logout | Bind access tokens to revocable refresh sessions; revoke/disconnect on logout, rotation and password changes. | Backend access and Socket.IO revocation tests |
| 27 | Maintenance | Inconsistent Python environment | Document root .venv and add dependency/import setup script. | 39 tests and fixture run in root environment; clean-machine setup unverified |
| 28 | Maintenance | Regression/UI commands missing | Add regression cases, Playwright/axe dependencies, UI commands and repeatable fixture/runbook. Fail drivers on unfinished/failed scenarios or JS errors. | 39 backend tests; 22 UI scenarios / 131 steps |
| 29 | Maintenance | PostCSS from warning | Upgrade Vite/Tailwind and use Tailwind dedicated PostCSS integration. Update vulnerable frontend dependencies. | Production build has no PostCSS from warning; npm audit 0 |
| 30 | Accessibility | Notification cannot be marked via keyboard | Use focusable semantic buttons for nonlink notification actions. | E05: Enter marks notification read |
| 31 | Data | Merged feed can return twice limit | Apply a final cap after sorting merged eligible results. | Backend merged-limit regression |

## Additional issues found and fixed during retest

- User status/role dropdowns used empty Radix item values and crashed on opening. They now use an explicit All sentinel; E01 applies and clears both filters.
- The broader accessibility run exposed council controls, image semantics, canvas names, and calendar more-link/contrast issues; these were corrected and scanned again.
- Metadata editing now preserves an unchanged past deadline; F05 verifies a location edit after registration closes. Changed deadlines still require validation.
- The theme toggle treated system mode as dark when choosing its next state. It now resolves the system preference; F02 verifies actual dark styling and the switch back to light.
- Development logs exposed invalid dashboard loading markup and transient empty image URLs. Stat values now use valid containers, and image previews wait for a URL; F06 observes the dashboard and protected image with zero console errors. An SVG favicon prevents the missing-favicon request.
- Frontend dependency audit initially reported vulnerable packages. Dependency and build-tool updates now produce zero known frontend vulnerabilities.

## Evidence review notes

Saved page text has trailing whitespace trimmed for repository readability. Intermediate attempts remain available and are excluded from final counts. One original rerun checked profile headings before the account request completed; its saved page showed the correct second account. The final run explicitly waits for that identity. The attendance screenshot initially captured a refetch in progress; F01 explicitly waits for the event history badge, and the reusable driver now does the same. An early large-roster attempt navigated before event cards loaded; the corrected helper waits for the loaded page and pagination indicator.

The last extended scan was initially labeled dark while the system-theme toggle had selected light. That label is not evidence of dark coverage. F02 supplies the verified dark scan with an asserted HTML class and card background. Count 22 light scans from the extended file plus the one actual dark scan. Selected mobile, calendar, modal, event-form and dark screenshots were visually inspected. Automated accessibility scans cover sampled states, not complete certification.

## Deployment work and limits

1. **Legacy public Cloudinary assets still require remote migration.** Run [migration tool](../../../backend/tools/migrate_private_uploads.py) with staging/production credentials: review the default dry run, then apply. The app refuses legacy public redirects, but previously public asset URLs remain public at Cloudinary until that migration and CDN invalidation finish. Remote migration was not executed.
2. Existing access tokens without the new session claim require a fresh sign-in. No database schema change is required.
3. PostgreSQL concurrency, live Cloudinary delivery, actual camera scanning and production email remain unverified. Camera check-in used the UI code field. Cloudinary upload/privacy behavior was mocked in backend tests.
4. [Root setup script](../../../scripts/setup.ps1) was added; the existing root environment was used. A clean-machine install was not executed. Updated frontend requires Node 22.12+.
5. Tests were completed locally before pushing these changes. No production deployment was performed.

## Repeat the tests

See [runbook](RUNBOOK.md), [phase/deployment notes](PHASES.md) and [machine-readable verification summary](final-pass/verification-summary.json). Each complete run needs a new fixture because the scenarios create and modify synthetic records.
