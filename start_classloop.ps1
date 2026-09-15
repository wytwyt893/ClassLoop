[CmdletBinding()]
param(
    [ValidateSet("Full", "Visual")]
    [string]$Mode = "Full"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClassLoopBackend = Join-Path $Root "ClassLoop\backend"
$ClassLoopFrontend = Join-Path $Root "ClassLoop\frontend"
$VentureBackend = Join-Path $Root "venture_agent\backend"

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-TcpPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync("127.0.0.1", $Port)
        if (-not $task.Wait(500)) { return $false }
        return $client.Connected
    }
    catch { return $false }
    finally { $client.Dispose() }
}

function Wait-TcpPort([int]$Port, [string]$Name, [int]$TimeoutSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort $Port) {
            Write-Host "[OK] $Name is listening on port $Port" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$Name did not start on port $Port within $TimeoutSeconds seconds. Check its PowerShell window."
}

function Test-DockerReady {
    # Run through cmd.exe so Docker's expected "engine not ready" stderr does
    # not become a terminating PowerShell error while the desktop app starts.
    & $env:ComSpec /d /c "docker info >nul 2>&1"
    return $LASTEXITCODE -eq 0
}

function Import-DotEnvFile([string]$Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $name = $matches[1]
            $value = $matches[2].Trim()
            if ($value.Length -ge 2 -and (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            )) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Start-ServiceWindow([string]$Title, [string]$WorkingDirectory, [string]$Command) {
    $safeTitle = $Title.Replace("'", "''")
    $safeDirectory = $WorkingDirectory.Replace("'", "''")
    $body = "`$Host.UI.RawUI.WindowTitle='$safeTitle'; Set-Location -LiteralPath '$safeDirectory'; $Command"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($body))
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded
    ) | Out-Null
}

Write-Host "ClassLoop demo launcher ($Mode mode)" -ForegroundColor White
Write-Host "Project: $Root" -ForegroundColor DarkGray

Write-Step "Checking ClassLoop prerequisites"
$classLoopPython = Join-Path $ClassLoopBackend ".venv\Scripts\python.exe"
if (-not (Test-Path $classLoopPython)) {
    throw "Missing ClassLoop virtual environment: $classLoopPython"
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm.cmd was not found. Install Node.js or add it to PATH."
}
if (-not (Test-Path (Join-Path $ClassLoopFrontend "node_modules"))) {
    throw "Frontend dependencies are missing. Run npm.cmd install in ClassLoop\frontend first."
}

if ($Mode -eq "Full") {
    Write-Step "Checking VentureAgent prerequisites"
    $venturePython = Join-Path $VentureBackend ".venv\Scripts\python.exe"
    $ventureEnv = Join-Path $VentureBackend ".env"
    if (-not (Test-Path $venturePython)) {
        throw "Missing VentureAgent virtual environment. Create venture_agent\backend\.venv and install requirements.txt first."
    }
    if (-not (Test-Path $ventureEnv)) {
        throw "Missing venture_agent\backend\.env. Copy .env.example to .env and add DEEPSEEK_API_KEY first."
    }
    Import-DotEnvFile $ventureEnv
    if ([string]::IsNullOrWhiteSpace($env:DEEPSEEK_API_KEY)) {
        throw "DEEPSEEK_API_KEY is missing or empty in venture_agent\backend\.env."
    }

    Write-Step "Checking ClassLoop Neo4j"
    if (Test-TcpPort 7688) {
        Write-Host "[SKIP] ClassLoop Neo4j is already listening on port 7688; reusing its existing data." -ForegroundColor Yellow
    }
    else {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            throw "ClassLoop Neo4j is not listening on port 7688 and Docker CLI was not found. Install Docker Desktop first."
        }
        if (-not (Test-DockerReady)) {
            $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
            if (-not (Test-Path $dockerDesktop)) {
                throw "Docker Desktop is not running and its executable was not found."
            }
            Write-Host "Docker Engine is not ready. Starting Docker Desktop with 'docker desktop start'..." -ForegroundColor Yellow
            & $env:ComSpec /d /c "docker desktop start"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Docker CLI startup failed; falling back to Docker Desktop.exe..." -ForegroundColor Yellow
                Start-Process -FilePath $dockerDesktop | Out-Null
            }
            $deadline = (Get-Date).AddSeconds(180)
            do {
                Write-Host "Waiting for Docker Linux Engine..." -ForegroundColor DarkGray
                Start-Sleep -Seconds 5
                $dockerReady = Test-DockerReady
            } while (-not $dockerReady -and (Get-Date) -lt $deadline)
            if (-not $dockerReady) {
                throw "Docker Desktop opened, but its Linux Engine did not become ready within 180 seconds. Open Docker Desktop and check its error message."
            }
        }
        Write-Host "[OK] Docker Linux Engine is ready" -ForegroundColor Green
        Push-Location $ClassLoopBackend
        try { docker compose -f docker-compose.neo4j.yml up -d }
        finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { throw "ClassLoop Neo4j Docker Compose startup failed." }
        Wait-TcpPort 7688 "ClassLoop Neo4j" 120
    }

    if (Test-TcpPort 7687) {
        Write-Host "[OK] VentureAgent Neo4j is listening on port 7687" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] VentureAgent Neo4j is not listening on port 7687; VentureAgent graph-backed features may be unavailable." -ForegroundColor Yellow
    }

    Write-Step "Starting VentureAgent"
    if (Test-TcpPort 8140) {
        Write-Host "[SKIP] Port 8140 is already in use; assuming VentureAgent is running." -ForegroundColor Yellow
    }
    else {
        Start-ServiceWindow "VentureAgent :8140" $VentureBackend ".\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8140"
        Wait-TcpPort 8140 "VentureAgent" 90
    }
}

Write-Step "Starting ClassLoop backend"
if (Test-TcpPort 8100) {
    Write-Host "[SKIP] Port 8100 is already in use. Stop the old backend if it does not contain the latest code." -ForegroundColor Yellow
}
else {
    $agentEnvironment = if ($Mode -eq "Full") {
        "`$env:CLASSLOOP_AGENT_BASE_URL='http://127.0.0.1:8140'; `$env:CLASSLOOP_AGENT_MODEL='deepseek-chat'; "
    } else { "" }
    Start-ServiceWindow "ClassLoop backend :8100" $ClassLoopBackend ($agentEnvironment + ".\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8100")
    Wait-TcpPort 8100 "ClassLoop backend" 60
}

Write-Step "Starting ClassLoop frontend"
if (Test-TcpPort 5173) {
    Write-Host "[SKIP] Port 5173 is already in use; assuming the frontend is running." -ForegroundColor Yellow
}
else {
    Start-ServiceWindow "ClassLoop frontend :5173" $ClassLoopFrontend "npm.cmd run dev -- --host 127.0.0.1"
    Wait-TcpPort 5173 "ClassLoop frontend" 60
}

Write-Host "`nClassLoop is ready:" -ForegroundColor Green
Write-Host "  App:       http://127.0.0.1:5173"
Write-Host "  API docs:  http://127.0.0.1:8100/docs"
Write-Host "  API health:http://127.0.0.1:8100/api/health"
if ($Mode -eq "Full") {
    Write-Host "  Agent docs:http://127.0.0.1:8140/docs"
    Write-Host "  ClassLoop Neo4j:http://127.0.0.1:7475"
    Write-Host "  VentureAgent Neo4j:http://127.0.0.1:7474"
}
Write-Host "`nKeep the service PowerShell windows open while demonstrating ClassLoop." -ForegroundColor Yellow
