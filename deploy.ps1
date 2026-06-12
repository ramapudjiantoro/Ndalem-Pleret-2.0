# =============================================================================
# deploy.ps1 - Deploy Ndalem Pleret ke Hostinger VPS (sekali klik)
#
#   .\deploy.ps1                 -> tanya pesan commit, lalu deploy penuh
#   .\deploy.ps1 "fix navbar"    -> deploy penuh dengan pesan commit
#   .\deploy.ps1 -Fast           -> restart container tanpa rebuild (~10 dtk)
#   .\deploy.ps1 -NoGit          -> deploy ke VPS tanpa git lokal (kode sudah di GitHub)
#
# Cara pakai: klik kanan file ini -> "Run with PowerShell".
# =============================================================================
param(
    [string]$msg = "",
    [switch]$Fast,
    [switch]$NoGit
)

$ErrorActionPreference = "Stop"
$VPS_IP   = "187.77.115.14"
$VPS_KEY  = "$HOME\.ssh\ndalem_vps"
$SITE_URL = "https://ndalempleret.com"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

function Fail($text) { Write-Host "ERROR: $text" -ForegroundColor Red; exit 1 }

# --- 1. Push ke GitHub -------------------------------------------------------
if (-not $NoGit) {
    if ($msg -eq "") {
        $msg = Read-Host "Pesan commit (Enter = 'chore: update')"
        if ($msg -eq "") { $msg = "chore: update" }
    }
    Write-Host "[1/3] Push ke GitHub..." -ForegroundColor Yellow
    git add .
    git commit -m $msg 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      (tidak ada perubahan baru - lanjut redeploy kode terakhir)" -ForegroundColor DarkGray
    } else {
        git push
        if ($LASTEXITCODE -ne 0) { Fail "Git push gagal." }
    }
    Write-Host "[OK] GitHub updated" -ForegroundColor Green
} else {
    Write-Host "[1/3] Lewati git (-NoGit)" -ForegroundColor DarkGray
}

# --- 2. Deploy ke VPS --------------------------------------------------------
Write-Host "[2/3] Deploy ke VPS..." -ForegroundColor Yellow
if ($Fast) {
    $remote = "cd /docker/n8n && docker compose up -d ndalem"
    Write-Host "      mode: FAST (restart tanpa rebuild)" -ForegroundColor DarkGray
} else {
    $remote = "cd /docker/n8n/ndalem-pleret && rm -f Dockerfile && git fetch origin main && git reset --hard origin/main && cd /docker/n8n && DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose up -d --build ndalem"
}
ssh -i $VPS_KEY -o StrictHostKeyChecking=no "root@$VPS_IP" $remote
if ($LASTEXITCODE -ne 0) { Fail "Deploy VPS gagal." }
Write-Host "[OK] Container deployed" -ForegroundColor Green

# --- 3. Health check + log ---------------------------------------------------
# Catatan: JANGAN pakai $(...) di string SSH -> PowerShell akan evaluasi lokal.
# Pakai 'docker compose logs' (tanpa subshell) supaya aman.
Write-Host "[3/3] Cek kesehatan situs..." -ForegroundColor Yellow
$ok = $false
foreach ($i in 1..10) {
    try {
        $r = Invoke-WebRequest -Uri $SITE_URL -UseBasicParsing -TimeoutSec 8
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
ssh -i $VPS_KEY -o StrictHostKeyChecking=no "root@$VPS_IP" "cd /docker/n8n && docker compose logs --tail 5 ndalem"

$sw.Stop()
$elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 0)
Write-Host ""
if ($ok) {
    Write-Host "DONE: Deploy selesai dalam ${elapsed}s - LIVE: $SITE_URL" -ForegroundColor Cyan
} else {
    Write-Host "WARN: Deploy jalan (${elapsed}s) tapi situs belum balas 200." -ForegroundColor Yellow
    Write-Host "      Cek log di atas / coba buka manual: $SITE_URL" -ForegroundColor Yellow
}
