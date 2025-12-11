# PostgreSQL database setup script
# Parolni o'zgartiring agar kerak bo'lsa
$PGPASSWORD = "postgres"  # O'z PostgreSQL parolingizni yozing
$env:PGPASSWORD = $PGPASSWORD

# psql'ga ulanish va database yaratish
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
if (-not (Test-Path $psqlPath)) {
    $psqlPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
}
if (-not (Test-Path $psqlPath)) {
    $psqlPath = "C:\Program Files\PostgreSQL\14\bin\psql.exe"
}

Write-Host "PostgreSQL'ga ulanmoqda..."
& $psqlPath -U postgres -c "CREATE DATABASE prodeklarant;" 2>&1
& $psqlPath -U postgres -c "CREATE USER app WITH PASSWORD 'app';" 2>&1
& $psqlPath -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;" 2>&1
& $psqlPath -U postgres -d prodeklarant -c "GRANT ALL ON SCHEMA public TO app;" 2>&1

Write-Host "Database yaratildi!"
Write-Host "Keyingi qadam: cd backend && npx prisma migrate dev --name init"

