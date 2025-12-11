# Database rollarini yangilash scripti
# PostgreSQL connection string'ni o'zgartiring agar kerak bo'lsa

$env:PGPASSWORD = "postgres"  # O'z PostgreSQL parolingizni yozing

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
Write-Host "Database rollarini yangilash..." -ForegroundColor Yellow

# SQL scriptni bajarish
$sqlScript = @"
-- Avval barcha eski rollarni DEKLARANT ga o'zgartirish
UPDATE "User" 
SET role = 'DEKLARANT' 
WHERE role::text IN ('MANAGER', 'WORKER', 'ACCOUNTANT');

-- Enum'ni yangilash
DO \$\$ 
BEGIN
    -- Agar Role_new enum mavjud bo'lsa, uni o'chirish
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_new') THEN
        DROP TYPE "Role_new";
    END IF;
    
    -- Yangi enum yaratish
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEKLARANT');
    
    -- User jadvalidagi role ustunini yangilash
    ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";
    
    -- Eski enum'ni o'chirish
    DROP TYPE IF EXISTS "Role";
    
    -- Yangi enum'ni asl nomiga qaytarish
    ALTER TYPE "Role_new" RENAME TO "Role";
END \$\$;
"@

# SQL'ni faylga yozish
$sqlFile = "fix-roles-temp.sql"
$sqlScript | Out-File -FilePath $sqlFile -Encoding UTF8

# psql orqali bajarish
& $psqlPath -U postgres -d prodeklarant -f $sqlFile

# Temp faylni o'chirish
Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host "Database rollari yangilandi!" -ForegroundColor Green
Write-Host "Keyingi qadam: cd backend && npx prisma generate" -ForegroundColor Yellow

