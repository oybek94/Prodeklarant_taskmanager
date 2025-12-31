# PowerShell script to check and fix server errors
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
    
    # Check frontend/dist directory
    Write-Host "`n[1] Checking frontend/dist directory..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -la /var/www/app/frontend/dist/ 2>&1 | head -10"
    Write-Host $result.Output
    
    # Check if index.html exists
    Write-Host "`n[2] Checking index.html..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'EXISTS' || echo 'NOT FOUND'"
    Write-Host $result.Output
    
    # Check file permissions
    Write-Host "`n[3] Checking file permissions..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -la /var/www/app/frontend/dist/index.html 2>&1"
    Write-Host $result.Output
    
    # Check nginx error logs
    Write-Host "`n[4] Checking nginx error logs..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "tail -20 /var/log/nginx/error.log 2>&1"
    Write-Host $result.Output
    
    # Check nginx status
    Write-Host "`n[5] Checking nginx status..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl status nginx --no-pager -l | head -15"
    Write-Host $result.Output
    
    # Fix permissions
    Write-Host "`n[6] Fixing file permissions..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app && git pull && cd frontend && npm run build && chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html && systemctl reload nginx && echo 'DONE'"
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Errors:" -ForegroundColor Red
        Write-Host $result.Error
    }
    
    # Test after fix
    Write-Host "`n[7] Testing after fix..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -5"
    Write-Host $result.Output
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "`nDone!" -ForegroundColor Green
} else {
    Write-Host "Failed to connect to server" -ForegroundColor Red
}


