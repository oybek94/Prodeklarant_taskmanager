# Server'dagi database'ga ulanishni o'rnatish
# Bu eng oson yechim - local database muammosini hal qiladi

Write-Host "Server'dagi database'ga ulanishni o'rnatish..." -ForegroundColor Yellow

$envFile = "G:\Prodeklarant\backend\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "[FAIL] .env fayli topilmadi!" -ForegroundColor Red
    Write-Host "Iltimos, backend/.env faylini yarating" -ForegroundColor Yellow
    exit 1
}

# .env faylini o'qish
$envContent = Get-Content $envFile -Raw

# DATABASE_URL'ni o'zgartirish
if ($envContent -match 'DATABASE_URL=(.+)') {
    $oldUrl = $matches[1].Trim()
    Write-Host "Hozirgi DATABASE_URL: $oldUrl" -ForegroundColor Cyan
    
    # Server'dagi database'ga o'zgartirish
    $newUrl = "postgresql://app:app@138.249.7.15:5432/prodeklarant"
    $newEnvContent = $envContent -replace 'DATABASE_URL=.+', "DATABASE_URL=$newUrl"
    
    # .env faylini yangilash
    $newEnvContent | Set-Content $envFile -NoNewline
    
    Write-Host "`n[OK] DATABASE_URL yangilandi!" -ForegroundColor Green
    Write-Host "Yangi DATABASE_URL: $newUrl" -ForegroundColor Cyan
    Write-Host "`nKeyingi qadam: Backend server'ni qayta ishga tushiring" -ForegroundColor Yellow
} else {
    Write-Host "[FAIL] DATABASE_URL topilmadi!" -ForegroundColor Red
    Write-Host "Iltimos, .env faylini qo'lda tekshiring" -ForegroundColor Yellow
}

