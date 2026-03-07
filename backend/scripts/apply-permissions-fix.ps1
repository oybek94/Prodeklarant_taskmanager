# Apply Database Permissions Fix
# This script applies the SQL permissions fix to resolve PostgreSQL error 42501

param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$DatabaseName = "prodeklarant",
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Permissions Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Parse DATABASE_URL if provided
if ($DatabaseUrl) {
    if ($DatabaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
        $DatabaseUser = $matches[1]
        $DatabasePassword = $matches[2]
        $DatabaseHost = $matches[3]
        $DatabasePort = $matches[4]
        $DatabaseName = $matches[5] -replace '\?.*$', '' # Remove query params
        Write-Host "Parsed from DATABASE_URL:" -ForegroundColor Green
        Write-Host "  Host: $DatabaseHost" -ForegroundColor Gray
        Write-Host "  Port: $DatabasePort" -ForegroundColor Gray
        Write-Host "  Database: $DatabaseName" -ForegroundColor Gray
        Write-Host "  User: $DatabaseUser" -ForegroundColor Gray
    }
}

# Check if Docker container is running
$dockerContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "prodeklarant-db"
if ($dockerContainer) {
    Write-Host "[INFO] Docker container found: $dockerContainer" -ForegroundColor Yellow
    Write-Host "Applying permissions via Docker..." -ForegroundColor Yellow
    
    $sqlFile = Join-Path $PSScriptRoot "fix-permissions.sql"
    Get-Content $sqlFile | docker exec -i prodeklarant-db psql -U postgres -d prodeklarant
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Permissions applied successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[FAIL] Failed to apply permissions" -ForegroundColor Red
        exit 1
    }
} else {
    # Try PostgreSQL directly
    Write-Host "[INFO] Docker container not found, trying PostgreSQL directly..." -ForegroundColor Yellow
    
    # Find PostgreSQL installation
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
        Write-Host "[FAIL] PostgreSQL not found!" -ForegroundColor Red
        Write-Host "Please install PostgreSQL or ensure Docker container is running" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "[OK] PostgreSQL found: $psqlPath" -ForegroundColor Green
    
    if (-not $DatabasePassword) {
        $securePassword = Read-Host "Enter PostgreSQL password for user '$DatabaseUser'" -AsSecureString
        $DatabasePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        )
    }
    
    $env:PGPASSWORD = $DatabasePassword
    $sqlFile = Join-Path $PSScriptRoot "fix-permissions.sql"
    
    Write-Host "Applying permissions..." -ForegroundColor Yellow
    & $psqlPath -U $DatabaseUser -d $DatabaseName -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Permissions applied successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[FAIL] Failed to apply permissions" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your backend server" -ForegroundColor White
Write-Host "2. Try logging in again" -ForegroundColor White
Write-Host ""

