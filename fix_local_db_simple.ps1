# Local database permissions'ni tuzatish - soddalashtirilgan versiya
# Bu script PostgreSQL'ga to'g'ridan-to'g'ri ulanadi

Write-Host "Local database permissions'ni tuzatish..." -ForegroundColor Yellow

# PostgreSQL bin papkasini topish
$psqlPath = $null
$versions = @(16, 15, 14, 13, 12)
foreach ($version in $versions) {
    $path = "C:\Program Files\PostgreSQL\$version\bin\psql.exe"
    if (Test-Path $path) {
        $psqlPath = $path
        Write-Host "[OK] PostgreSQL topildi: $path" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "[FAIL] PostgreSQL topilmadi!" -ForegroundColor Red
    Write-Host "`nIltimos, quyidagilardan birini bajaring:" -ForegroundColor Yellow
    Write-Host "1. Docker Desktop'ni ishga tushiring va docker-compose up -d db buyrug'ini bajaring" -ForegroundColor Cyan
    Write-Host "2. PostgreSQL'ni o'rnating: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "3. Yoki server'dagi database'ga ulaning" -ForegroundColor Cyan
    exit 1
}

# Database ma'lumotlari
$dbName = "prodeklarant"
$dbUser = "app"

# PostgreSQL parolini so'ra
Write-Host "`nPostgreSQL parolini kiriting:" -ForegroundColor Yellow
Write-Host "- Agar Docker container ishlayotgan bo'lsa: 'app'" -ForegroundColor Cyan
Write-Host "- Agar PostgreSQL to'g'ridan-to'g'ri o'rnatilgan bo'lsa: o'z parolingiz" -ForegroundColor Cyan
$password = Read-Host "Parol" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
if ([string]::IsNullOrEmpty($plainPassword)) {
    $plainPassword = "app"
}

$env:PGPASSWORD = $plainPassword

# SQL buyruqlarini bajarish
Write-Host "`nSQL buyruqlarini bajarish..." -ForegroundColor Yellow

$sqlFile = "fix_perms.sql"
@"
GRANT ALL PRIVILEGES ON TABLE "User" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;
GRANT USAGE ON SCHEMA public TO $dbUser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $dbUser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $dbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $dbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Task" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "TaskStage" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "TaskDocument" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Client" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Branch" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Worker" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Invoice" TO $dbUser;
GRANT ALL PRIVILEGES ON TABLE "Contract" TO $dbUser;
"@ | Out-File -FilePath $sqlFile -Encoding UTF8

# Avval postgres user bilan urinib ko'ramiz
Write-Host "postgres user bilan urinib ko'rmoqda..." -ForegroundColor Yellow
$result = & $psqlPath -U postgres -d $dbName -f $sqlFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Permissions muvaffaqiyatli o'rnatildi!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] postgres user bilan muammo. app user bilan urinib ko'rmoqda..." -ForegroundColor Yellow
    $env:PGPASSWORD = $plainPassword
    $result = & $psqlPath -U $dbUser -d $dbName -f $sqlFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Permissions muvaffaqiyatli o'rnatildi!" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Xatolik yuz berdi:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
}

# Temp faylni o'chirish
Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host "`n[OK] Script yakunlandi!" -ForegroundColor Green
Write-Host "Keyingi qadam: Backend server'ni qayta ishga tushiring" -ForegroundColor Yellow

