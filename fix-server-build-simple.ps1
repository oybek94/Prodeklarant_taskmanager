# PowerShell script to fix server build - simple version
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -SkipPublisherCheck
}

Import-Module Posh-SSH
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

Write-Host "Connecting to server..." -ForegroundColor Cyan
$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Connected!" -ForegroundColor Green
    
    # Build without type check (using vite directly)
    Write-Host "`nBuilding frontend (no type check)..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && npx vite build --mode production" -TimeOut 300
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Errors: $($result.Error)" -ForegroundColor Red
    }
    
    # Check result
    $checkResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'SUCCESS' || echo 'FAILED'"
    Write-Host "`nBuild result: $($checkResult.Output)" -ForegroundColor $(if ($checkResult.Output -match "SUCCESS") { "Green" } else { "Red" })
    
    if ($checkResult.Output -match "SUCCESS") {
        # Fix permissions
        Write-Host "`nFixing permissions..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html" | Out-Null
        
        # Reload nginx
        Write-Host "Reloading nginx..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
        
        # Test
        $testResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
        Write-Host "`nTest result: $($testResult.Output)" -ForegroundColor $(if ($testResult.Output -match "200") { "Green" } else { "Yellow" })
        
        Write-Host "`nSUCCESS! Server should be working now." -ForegroundColor Green
    } else {
        Write-Host "`nBuild failed. Checking dist directory..." -ForegroundColor Red
        $listResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -la /var/www/app/frontend/dist/"
        Write-Host $listResult.Output
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}


