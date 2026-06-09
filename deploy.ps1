param([string]$msg = "")

$VPS_IP  = "187.77.115.14"
$VPS_KEY = "$HOME\.ssh\ndalem_vps"

# Commit message
if ($msg -eq "") {
    $msg = Read-Host "Pesan commit (Enter = 'chore: update')"
    if ($msg -eq "") { $msg = "chore: update" }
}

# 1. Push ke GitHub
Write-Host "[1/3] Push ke GitHub..." -ForegroundColor Yellow
git add .
git commit -m $msg
git push
if ($LASTEXITCODE -ne 0) { Write-Host "Git push gagal." -ForegroundColor Red; exit 1 }
Write-Host "GitHub updated" -ForegroundColor Green

# 2. Deploy ke VPS
Write-Host "[2/3] Deploy ke VPS..." -ForegroundColor Yellow
ssh -i $VPS_KEY -o StrictHostKeyChecking=no "root@$VPS_IP" "cd /docker/n8n/ndalem-pleret && git pull && cd /docker/n8n && docker compose up -d --build ndalem"
if ($LASTEXITCODE -ne 0) { Write-Host "Deploy VPS gagal." -ForegroundColor Red; exit 1 }
Write-Host "Container rebuilt" -ForegroundColor Green

# 3. Cek log
Write-Host "[3/3] Status server..." -ForegroundColor Yellow
ssh -i $VPS_KEY -o StrictHostKeyChecking=no "root@$VPS_IP" "docker logs --tail 5 `$(docker ps --filter 'name=ndalem' --format '{{.Names}}' | head -1)"

Write-Host ""
Write-Host "Deploy selesai! https://ndalempleret.com" -ForegroundColor Cyan
