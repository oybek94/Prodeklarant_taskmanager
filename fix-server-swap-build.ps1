# Add swap and build on server
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -SkipPublisherCheck
}

Import-Module Posh-SSH
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

Write-Host "Connecting..." -ForegroundColor Cyan
$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Connected!" -ForegroundColor Green
    
    # Check swap
    Write-Host "`n[1] Checking swap..." -ForegroundColor Yellow
    $swapCheck = Invoke-SSHCommand -SessionId $session.SessionId -Command "swapon --show"
    Write-Host $swapCheck.Output
    
    if ($swapCheck.Output -match "no swap") {
        Write-Host "`n[2] Creating 2GB swap file..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab"
        Write-Host "Swap created!" -ForegroundColor Green
    }
    
    # Build
    Write-Host "`n[3] Building frontend (this will take 5-10 minutes)..." -ForegroundColor Yellow
    $buildCmd = "cd /var/www/app/frontend && rm -rf dist && NODE_OPTIONS='--max-old-space-size=2048' npm run build"
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $buildCmd -TimeOut 600
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Errors: $($result.Error)" -ForegroundColor Red
    }
    
    # Check result
    $check = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'SUCCESS' || echo 'FAILED'"
    Write-Host "`nBuild: $($check.Output)" -ForegroundColor $(if ($check.Output -match "SUCCESS") { "Green" } else { "Red" })
    
    if ($check.Output -match "SUCCESS") {
        Write-Host "`n[4] Fixing permissions..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html" | Out-Null
        
        Write-Host "[5] Reloading nginx..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
        
        $test = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
        Write-Host "`nHTTP: $($test.Output)" -ForegroundColor $(if ($test.Output -match "200") { "Green" } else { "Yellow" })
        
        if ($test.Output -match "200") {
            Write-Host "`nSUCCESS! Server is working!" -ForegroundColor Green
        }
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}


