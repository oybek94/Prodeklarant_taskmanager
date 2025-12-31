# PowerShell script to fix server build with memory optimization
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
    
    # Check memory
    Write-Host "`nChecking server memory..." -ForegroundColor Yellow
    $memResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "free -h"
    Write-Host $memResult.Output
    
    # Clean old build
    Write-Host "`nCleaning old build..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && rm -rf dist .vite node_modules/.vite" | Out-Null
    
    # Build with minimal memory usage
    Write-Host "`nBuilding frontend (optimized for low memory)..." -ForegroundColor Yellow
    Write-Host "This may take 5-10 minutes..." -ForegroundColor Cyan
    
    # Use nohup to run in background and avoid timeout
    $buildScript = @"
cd /var/www/app/frontend
export NODE_OPTIONS='--max-old-space-size=1024'
npx vite build --mode production > /tmp/build.log 2>&1
echo 'BUILD_EXIT_CODE:' \$?
"@
    
    # Save script to file
    Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$buildScript' > /tmp/build-frontend.sh && chmod +x /tmp/build-frontend.sh" | Out-Null
    
    # Run build in background
    Write-Host "Starting build in background..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "nohup /tmp/build-frontend.sh > /tmp/build-output.log 2>&1 &" | Out-Null
    
    # Wait and check progress
    Write-Host "Waiting for build to complete..." -ForegroundColor Yellow
    $maxWait = 600  # 10 minutes
    $waited = 0
    $checkInterval = 10
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds $checkInterval
        $waited += $checkInterval
        
        $checkResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'DONE' || (ps aux | grep -v grep | grep 'vite build' > /dev/null && echo 'RUNNING' || echo 'FAILED')"
        
        if ($checkResult.Output -match "DONE") {
            Write-Host "`nBuild completed successfully!" -ForegroundColor Green
            break
        } elseif ($checkResult.Output -match "FAILED") {
            Write-Host "`nBuild process stopped. Checking logs..." -ForegroundColor Red
            $logResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "tail -50 /tmp/build.log"
            Write-Host $logResult.Output
            break
        } else {
            Write-Host "." -NoNewline
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "`nBuild timeout. Checking status..." -ForegroundColor Yellow
        $statusResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "tail -30 /tmp/build.log"
        Write-Host $statusResult.Output
    }
    
    # Check final result
    $finalCheck = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'SUCCESS' || echo 'FAILED'"
    Write-Host "`nFinal result: $($finalCheck.Output)" -ForegroundColor $(if ($finalCheck.Output -match "SUCCESS") { "Green" } else { "Red" })
    
    if ($finalCheck.Output -match "SUCCESS") {
        # Fix permissions
        Write-Host "`nFixing permissions..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html" | Out-Null
        
        # Reload nginx
        Write-Host "Reloading nginx..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
        
        # Test
        $testResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
        Write-Host "`nHTTP Status: $($testResult.Output)" -ForegroundColor $(if ($testResult.Output -match "200") { "Green" } else { "Yellow" })
        
        Write-Host "`nSUCCESS! Server should be working now." -ForegroundColor Green
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}


