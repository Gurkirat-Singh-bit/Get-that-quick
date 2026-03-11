# GetThatQuick — One-liner installer for Windows (PowerShell)
# Usage (PowerShell, run as Administrator recommended):
#   irm https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO_URL    = "https://github.com/Gurkirat-Singh-bit/Get-that-quick.git"
$INSTALL_DIR = "$env:USERPROFILE\GetThatQuick"
$PORT        = 12233

function Write-Info { Write-Host "[info] $args" -ForegroundColor Cyan }
function Write-Ok   { Write-Host "[ok]   $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[warn] $args" -ForegroundColor Yellow }
function Write-Err  {
    Write-Host "[err]  $args" -ForegroundColor Red
    # Use throw so callers can catch; avoids closing the shell in iex context
    throw "Installation failed: $args"
}

Write-Host ""
Write-Host "GetThatQuick Installer" -ForegroundColor Cyan
Write-Host "--------------------------------------"
Write-Host ""

# ── Check if running as Admin (needed for winget installs) ───────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Warn "Not running as Administrator. Some installs may fail."
    Write-Warn "Consider re-running PowerShell as Administrator if any step fails."
}

# ── Install git ───────────────────────────────────────────────────────────
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    Write-Ok "$(& git --version) already installed"
} else {
    Write-Warn "git not found — installing via winget..."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
        # Refresh PATH so git is available immediately
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("PATH", "User")
        Write-Ok "git installed"
    } else {
        Write-Err "winget not available. Install git from https://git-scm.com/download/win then re-run."
    }
}

# ── Install Docker Desktop ────────────────────────────────────────────────
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Ok "$(& docker --version) already installed"
} else {
    Write-Warn "Docker not found — installing Docker Desktop via winget..."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install --id Docker.DockerDesktop -e --source winget --accept-package-agreements --accept-source-agreements
        Write-Ok "Docker Desktop installed"
        # Launch Docker Desktop so it can finish first-time setup
        $dockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktopExe) {
            Start-Process $dockerDesktopExe
        }
        Write-Warn "Docker Desktop is starting. Wait for the whale icon in the system tray to turn steady, then re-run this script."
        exit 0
    } else {
        Write-Err "winget not available. Install Docker Desktop from https://www.docker.com/products/docker-desktop then re-run."
    }
}

# ── Wait for Docker daemon ────────────────────────────────────────────────
Write-Info "Waiting for Docker daemon to be ready..."
$attempts = 0
$dockerReady = $false
while ($attempts -lt 15) {
    $result = & docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }
    $attempts++
    Start-Sleep -Seconds 2
}
if (-not $dockerReady) {
    Write-Err "Docker daemon did not start in time. Please start Docker Desktop and re-run."
}
Write-Ok "Docker daemon is ready"

# ── Check docker compose ──────────────────────────────────────────────────
$composeCheck = & docker compose version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Ok "docker compose (v2) available"
} else {
    Write-Err "docker compose not found. Please update Docker Desktop to a recent version."
}

# ── Clone or update repo ──────────────────────────────────────────────────
if (Test-Path (Join-Path $INSTALL_DIR ".git")) {
    Write-Info "Repo already exists at $INSTALL_DIR — pulling latest..."
    & git -C "$INSTALL_DIR" pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Could not fast-forward pull (local modifications?). Continuing with current version."
    }
} else {
    Write-Info "Cloning GetThatQuick into $INSTALL_DIR..."
    & git clone $REPO_URL "$INSTALL_DIR"
    if ($LASTEXITCODE -ne 0) { Write-Err "git clone failed." }
}
Write-Ok "Repo ready at $INSTALL_DIR"

# ── Start the app ─────────────────────────────────────────────────────────
Write-Info "Building and starting GetThatQuick (this may take a few minutes on first run)..."
Set-Location "$INSTALL_DIR"
& docker compose up --build -d
if ($LASTEXITCODE -ne 0) { Write-Err "docker compose up failed." }
Write-Ok "GetThatQuick is running!"

Write-Host ""
Write-Host "All done!" -ForegroundColor Green
Write-Host "  App:  http://localhost:$PORT" -ForegroundColor Cyan
Write-Host "  Data: $env:USERPROFILE\getthatquick" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop:   cd `"$INSTALL_DIR`"; docker compose down"
Write-Host "To update: cd `"$INSTALL_DIR`"; git pull; docker compose up --build -d"
Write-Host ""
