# Remediation phases

1. Security and accounts: enforce parent attachment visibility; clear private caches on account changes; revoke access and refresh sessions together; close revoked realtime sessions; prevent a delayed refresh from restoring a logged-out account.
2. Data and API: repair six school editors and role updates; aggregate actual attendance; normalize UTC timestamps; repair SQLite refresh and replay handling; filter feeds before limiting and cap merged feeds.
3. Workflows: paginate events and registrations with server filters; load calendar date ranges and complete attendance selections; apply assignment/permission checks; add event deadlines, approval mode and metadata editing; disable duplicate/expired actions; improve request errors and retries.
4. Accessibility and maintenance: accessible modal focus/Tab/Escape/return; control names, contrast and narrow profile layout; repair TypeScript and require it in builds; standardize root environment setup; add regression and UI commands; update vulnerable dependencies and PostCSS integration.
5. Verification: rerun original visible Chrome scenarios on a fresh synthetic fixture; add editor/settings/pagination/permission/recovery/accessibility journeys; run backend regressions, lint, typecheck, production build and dependency audit; preserve screenshots and per-step evidence.

## Deployment notes

- Access tokens now identify revocable session rows. Existing tokens issued without a session claim need a new sign-in. No database schema migration is required.
- UTC timestamps always include offsets. Attendance rates count present/late records among approved participants in ongoing/completed, nondeleted events; upcoming events are excluded from department historical rates.
- New Cloudinary uploads use authenticated assets and signed downloads valid for 60 seconds. Historical public assets require `backend/tools/migrate_private_uploads.py` with configured staging/production credentials: review its dry run, then use `--apply`. They are not served by the app until migrated. Remote storage migration and CDN invalidation have not been executed locally.
- Use root `.venv`, `backend/requirements.txt` and `scripts/setup.ps1`; the old backend environment is not the supported setup path.
- Updated frontend requires Node 22.12 or newer. Tailwind 4 browser support: Safari 16.4+, Chrome 111+, Firefox 128+. Browser testing here uses Chrome.
- PostgreSQL concurrency, production Cloudinary and actual camera/email integrations still need deployment verification.

Migration references: [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide), [Vite migration guide](https://vite.dev/guide/migration).

## Completed local verification

All five phases are complete locally. Final evidence: 22 visible-Chrome UI scenarios / 131 passing steps, 39 backend tests, successful lint and production build/typecheck, zero known frontend dependency vulnerabilities. The 22 sampled light route scans and verified dark profile have zero WCAG A/AA violations. See [report](REPORT.md) for the 31-item checklist and deployment limits.
