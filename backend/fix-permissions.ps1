# Database permissions'ni tuzatish scripti
# PostgreSQL connection string'ni o'zgartiring agar kerak bo'lsa

Write-Host "Database permissions'ni tuzatish..." -ForegroundColor Yellow

# PostgreSQL parolini so'ra
$password = Read-Host "PostgreSQL parolini kiriting (default: postgres)" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
if ([string]::IsNullOrEmpty($plainPassword)) {
    $plainPassword = "postgres"
}

$env:PGPASSWORD = $plainPassword

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
    Write-Host "PostgreSQL topilmadi. Iltimos, PostgreSQL o'rnatilganligini tekshiring." -ForegroundColor Red
    exit 1
}

Write-Host "PostgreSQL topildi: $psqlPath" -ForegroundColor Green

# Database nomini so'ra
$dbName = Read-Host "Database nomini kiriting (default: prodeklarant)"
if ([string]::IsNullOrEmpty($dbName)) {
    $dbName = "prodeklarant"
}

# SQL scriptni bajarish
$sqlScript = @"
-- Database permissions'ni tuzatish
\c $dbName

-- Joriy foydalanuvchini ko'rish
SELECT current_user;

-- User jadvaliga barcha huquqlarni berish
GRANT ALL PRIVILEGES ON TABLE "User" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;

-- Schema'ga huquq berish
GRANT USAGE ON SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO current_user;

-- Kelajakdagi jadvallarga ham huquq berish
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO current_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO current_user;

-- Boshqa muhim jadvallarga ham huquq berish
GRANT ALL PRIVILEGES ON TABLE "Task" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "TaskStage" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "TaskDocument" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Client" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Branch" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Worker" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Invoice" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Contract" TO current_user;

-- Tekshirish
SELECT 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'User' 
AND grantee = current_user;
"@

# SQL'ni faylga yozish
$sqlFile = "fix-permissions-temp.sql"
$sqlScript | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "SQL script bajarilmoqda..." -ForegroundColor Yellow

# psql orqali bajarish
& $psqlPath -U postgres -d $dbName -f $sqlFile

# Temp faylni o'chirish
Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host "`nDatabase permissions tuzatildi!" -ForegroundColor Green
Write-Host "Keyingi qadam: Backend server'ni qayta ishga tushiring" -ForegroundColor Yellow

