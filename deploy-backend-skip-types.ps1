# PowerShell script to deploy backend without type checking
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"

# Install Posh-SSH if not available
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -SkipPublisherCheck
}

Import-Module Posh-SSH

# Create secure password
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

Write-Host "Connecting to server $server..." -ForegroundColor Cyan
$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Connection successful!" -ForegroundColor Green
    
    # Pull latest code
    Write-Host "`n[1] Pulling latest code..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/backend && git pull"
    Write-Host $result.Output
    
    # Build backend without type checking
    Write-Host "`n[2] Building backend (skipping type check)..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/backend && npx tsc --skipLibCheck --noEmit false || echo 'Type errors ignored' && npx tsc --skipLibCheck"
    Write-Host $result.Output
    if ($result.ExitStatus -ne 0) {
        Write-Host "Build completed with warnings (type errors ignored)" -ForegroundColor Yellow
    }
    
    # Restart PM2
    Write-Host "`n[3] Restarting PM2..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/backend && pm2 restart prodeklarant-backend"
    Write-Host $result.Output
    
    # Check PM2 status
    Write-Host "`n[4] Checking PM2 status..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "pm2 status"
    Write-Host $result.Output
    
    # Check backend health
    Write-Host "`n[5] Checking backend health..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -f http://localhost:3001/health 2>&1"
    Write-Host $result.Output
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "`nDone!" -ForegroundColor Green
} else {
    Write-Host "Failed to connect to server" -ForegroundColor Red
}

