$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$pythonExecutable = Join-Path $projectDirectory '.venv/Scripts/python.exe'
Push-Location $projectDirectory
try {
    if (-not (Test-Path -LiteralPath $pythonExecutable)) { python -m venv .venv }
    & $pythonExecutable -m pip install -r backend/requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
    & $pythonExecutable -c 'import flask_socketio, flask_sqlalchemy, flask_jwt_extended'
    if ($LASTEXITCODE -ne 0) { throw 'Backend environment is incomplete.' }
    Push-Location frontend
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    } finally { Pop-Location }
} finally { Pop-Location }
