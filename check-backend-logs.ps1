# PowerShell script to check backend logs
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
    
    # Check PM2 logs
    Write-Host "`n[1] Checking PM2 logs (last 50 lines)..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/backend && pm2 logs prodeklarant-backend --lines 50 --nostream 2>&1 | tail -50"
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Errors:" -ForegroundColor Red
        Write-Host $result.Error
    }
    
    # Check PM2 status
    Write-Host "`n[2] Checking PM2 status..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "pm2 status"
    Write-Host $result.Output
    
    # Check backend error logs
    Write-Host "`n[3] Checking backend error logs..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "tail -50 /var/www/app/backend/logs/pm2-error.log 2>&1"
    Write-Host $result.Output
    
    # Check backend output logs
    Write-Host "`n[4] Checking backend output logs..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "tail -50 /var/www/app/backend/logs/pm2-out.log 2>&1"
    Write-Host $result.Output
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "`nDone!" -ForegroundColor Green
} else {
    Write-Host "Failed to connect to server" -ForegroundColor Red
}

