param(
    [ValidateSet('smoke', 'load', 'stress', 'spike', 'scalability')]
    [string]$Profile = 'smoke',
    [string]$BaseUrl = 'http://127.0.0.1:5000',
    [string]$Label = 'baseline'
)
$ErrorActionPreference = 'Stop'
if ($Label -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Label may contain only letters, digits, underscores and hyphens.' }
if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) { throw 'Install k6 first: winget install --id k6.k6 --exact' }
$resultDirectory = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Path $resultDirectory -Force | Out-Null
$runName = '{0}-{1}-{2}' -f (Get-Date -Format 'yyyyMMdd-HHmmss-fff'), $Profile, $Label
$runPath = Join-Path $resultDirectory $runName
$previousProfile = $env:PROFILE
$previousBase = $env:BASE_URL
try {
    $env:PROFILE = $Profile
    $env:BASE_URL = $BaseUrl
    & k6 run --summary-export "$runPath.summary.json" --out "json=$runPath.metrics.json" (Join-Path $PSScriptRoot 'schoolconnect.js')
    $runExitCode = $LASTEXITCODE
    [ordered]@{
        profile = $Profile
        base_url = $BaseUrl
        label = $Label
        exit_code = $runExitCode
        completed_at = (Get-Date).ToString('o')
        public_only = $env:PUBLIC_ONLY
        vus = $env:VUS
        time_scale = $env:TIME_SCALE
        rate = $env:RATE
        duration = $env:DURATION
        preallocated_vus = $env:PREALLOCATED_VUS
        max_vus = $env:MAX_VUS
        distinct_accounts = [bool]$env:ACCOUNTS_FILE
    } | ConvertTo-Json | Set-Content "$runPath.run.json"
    Write-Host "Results: $runPath.*.json"
} finally {
    $env:PROFILE = $previousProfile
    $env:BASE_URL = $previousBase
}
exit $runExitCode
