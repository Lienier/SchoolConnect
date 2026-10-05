# Repeat the remediation UI scenarios

Run these commands from the project root using separate terminals for the two services. The drivers use installed Chrome, visible windows, Manila timezone, synthetic accounts and UI controls. Data setup is outside the driver. Never connect this fixture to production.

## Dependencies

Run `./scripts/setup.ps1` for the root Python environment and frontend packages. Playwright and axe are included in frontend development dependencies. Node 22.12+ and Google Chrome at the standard Windows path are required.

## Isolated backend

```powershell
$env:SCENARIO_FIXTURE_DIR = Join-Path $env:TEMP ('schoolconnect-qa-' + [guid]::NewGuid().ToString('N'))
$env:SCENARIO_FIXTURE_DIR | Set-Content docs/qa-2026-10-05/fixes/fixture-path.txt
.venv/Scripts/python.exe docs/qa-2026-10-05/scenarios/fixture_server.py
```

## Frontend

```powershell
$env:VITE_API_TARGET = 'http://127.0.0.1:5001'
$env:VITE_API_BASE_URL = '/api'
Set-Location frontend
npm run dev:qa
```

## Original and extended journeys

In a third terminal at the project root:

```powershell
$qaFixturePath = (Get-Content docs/qa-2026-10-05/fixes/fixture-path.txt -Raw).Trim()
$env:SCENARIO_OUTPUT_DIR = Join-Path (Get-Location) 'docs/qa-2026-10-05/fixes/new-run'
node docs/qa-2026-10-05/fixes/scenarios.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
.venv/Scripts/python.exe docs/qa-2026-10-05/fixes/seed_extended.py $qaFixturePath
node docs/qa-2026-10-05/fixes/extended.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
```

Every new complete run needs a fresh fixture. Run original journeys before extended journeys, which rename the school records and add pagination preconditions. Drivers return exit code 1 on any failed or unfinished step or browser JavaScript error. They save per-step results, screenshots, rendered text, attendance export and accessibility violations. `npm run test:ui -- <fixture-directory> <photo>` runs the original driver from frontend.

## Source checks

From frontend: `npm run lint`, `npm run build` (includes typecheck), `npm audit`.

From backend using the root environment:

```powershell
$env:FLASK_ENV = 'testing'
$env:TEST_DATABASE_URL = 'sqlite:///:memory:'
../.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider
```

Stop the fixture and frontend with Ctrl+C after testing. Keep evidence; it contains synthetic data only.

## Targeted follow-ups

After the original and extended runs, using the same fixture and output variables:

```powershell
node docs/qa-2026-10-05/fixes/attendance-followup.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
node docs/qa-2026-10-05/fixes/theme-followup.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
.venv/Scripts/python.exe docs/qa-2026-10-05/fixes/seed_roster.py $qaFixturePath
node docs/qa-2026-10-05/fixes/roster-followup.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
node docs/qa-2026-10-05/fixes/validation-followup.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
node docs/qa-2026-10-05/fixes/closed-edit-followup.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
node docs/qa-2026-10-05/fixes/console-followup.cjs $qaFixturePath docs/qa-2026-10-05/scenarios/fixture.png
```

Run the roster seed once per fixture. It adds 105 synthetic participants and increases the test event capacity to 200. Validation error and outage scenarios intercept browser responses; they still interact through UI forms and Retry controls.
