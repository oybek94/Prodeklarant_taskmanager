# Local database permissions'ni tuzatish
# Docker container'da PostgreSQL permissions'ni berish

Write-Host "Local database permissions'ni tuzatish..." -ForegroundColor Yellow

# Docker container nomini topish
$containerName = "prodeklarant-db"

# Container ishlayotganini tekshirish
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $containerName

if (-not $containerRunning) {
    Write-Host "[FAIL] Docker container '$containerName' ishlamayapti!" -ForegroundColor Red
    Write-Host "Iltimos, docker-compose up -d db buyrug'ini bajaring" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Docker container topildi: $containerName" -ForegroundColor Green

# SQL scriptni yaratish
$sqlScript = @"
-- Database permissions'ni tuzatish
\c prodeklarant

-- User jadvaliga barcha huquqlarni berish
GRANT ALL PRIVILEGES ON TABLE "User" TO app;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;

-- Schema'ga huquq berish
GRANT USAGE ON SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;

-- Kelajakdagi jadvallarga ham huquq berish
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;

-- Boshqa muhim jadvallarga ham huquq berish
GRANT ALL PRIVILEGES ON TABLE "Task" TO app;
GRANT ALL PRIVILEGES ON TABLE "TaskStage" TO app;
GRANT ALL PRIVILEGES ON TABLE "TaskDocument" TO app;
GRANT ALL PRIVILEGES ON TABLE "Client" TO app;
GRANT ALL PRIVILEGES ON TABLE "Branch" TO app;
GRANT ALL PRIVILEGES ON TABLE "Worker" TO app;
GRANT ALL PRIVILEGES ON TABLE "Invoice" TO app;
GRANT ALL PRIVILEGES ON TABLE "Contract" TO app;

-- Tekshirish
SELECT table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'User' 
AND grantee = 'app';
"@

# SQL'ni faylga yozish
$sqlFile = "fix_local_permissions.sql"
$sqlScript | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "SQL scriptni Docker container'ga bajarish..." -ForegroundColor Yellow

# Docker container'ga SQL'ni bajarish
Get-Content $sqlFile | docker exec -i $containerName psql -U app -d prodeklarant

# Temp faylni o'chirish
Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host "`n[OK] Local database permissions tuzatildi!" -ForegroundColor Green
Write-Host "Keyingi qadam: Backend server'ni qayta ishga tushiring" -ForegroundColor Yellow

