# Local PostgreSQL database permissions'ni tuzatish
# PostgreSQL to'g'ridan-to'g'ri o'rnatilgan bo'lsa

Write-Host "Local PostgreSQL database permissions'ni tuzatish..." -ForegroundColor Yellow

# PostgreSQL bin papkasini topish
$psqlPath = $null
$versions = @(16, 15, 14, 13, 12)
foreach ($version in $versions) {
    $path = "C:\Program Files\PostgreSQL\$version\bin\psql.exe"
    if (Test-Path $path) {
        $psqlPath = $path
        break
    }
}

if (-not $psqlPath) {
    Write-Host "[FAIL] PostgreSQL topilmadi!" -ForegroundColor Red
    Write-Host "Iltimos, PostgreSQL o'rnatilganligini tekshiring" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] PostgreSQL topildi: $psqlPath" -ForegroundColor Green

# Database nomi va user
$dbName = "prodeklarant"
$dbUser = "app"

# PostgreSQL parolini so'ra
$password = Read-Host "PostgreSQL parolini kiriting (default: app)" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
if ([string]::IsNullOrEmpty($plainPassword)) {
    $plainPassword = "app"
}

$env:PGPASSWORD = $plainPassword

# SQL scriptni bajarish
Write-Host "`nSQL scriptni bajarish..." -ForegroundColor Yellow

$sqlCommands = @"
-- Database permissions'ni tuzatish
\c $dbName

-- User jadvaliga barcha huquqlarni berish
GRANT ALL PRIVILEGES ON TABLE "User" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;

-- Schema'ga huquq berish
GRANT USAGE ON SCHEMA public TO $dbUser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $dbUser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $dbUser;

-- Kelajakdagi jadvallarga ham huquq berish
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $dbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $dbUser;

-- Boshqa muhim jadvallarga ham huquq berish
GRANT ALL PRIVILEGES ON TABLE "Task" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "TaskStage" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "TaskDocument" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Client" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Branch" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Worker" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Invoice" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Contract" TO $dbUser;

-- Tekshirish
SELECT table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'User' 
AND grantee = '$dbUser';
"@

# SQL'ni faylga yozish
$sqlFile = "fix_local_permissions.sql"
$sqlCommands | Out-File -FilePath $sqlFile -Encoding UTF8

# psql orqali bajarish
& $psqlPath -U postgres -d $dbName -f $sqlFile

# Temp faylni o'chirish
Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host "`n[OK] Local database permissions tuzatildi!" -ForegroundColor Green
Write-Host "Keyingi qadam: Backend server'ni qayta ishga tushiring" -ForegroundColor Yellow

