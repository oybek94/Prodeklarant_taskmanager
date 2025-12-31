# PowerShell script to fix server build issues
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
    
    # Step 1: Clean old dist
    Write-Host "`n[1] Cleaning old dist directory..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && rm -rf dist node_modules/.vite"
    Write-Host $result.Output
    
    # Step 2: Install dependencies
    Write-Host "`n[2] Installing dependencies..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && npm install"
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Errors: $($result.Error)" -ForegroundColor Red
    }
    
    # Step 3: Build frontend (with increased memory)
    Write-Host "`n[3] Building frontend (this may take a few minutes)..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && NODE_OPTIONS='--max-old-space-size=4096' npm run build"
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Errors: $($result.Error)" -ForegroundColor Red
    }
    
    # Step 4: Check if index.html was created
    Write-Host "`n[4] Checking if index.html was created..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -la /var/www/app/frontend/dist/ | head -10"
    Write-Host $result.Output
    
    $checkResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'EXISTS' || echo 'NOT FOUND'"
    Write-Host "index.html status: $($checkResult.Output)"
    
    if ($checkResult.Output -match "NOT FOUND") {
        Write-Host "`nERROR: index.html was not created! Build may have failed." -ForegroundColor Red
        Write-Host "Checking build errors..." -ForegroundColor Yellow
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && npm run build 2>&1 | tail -30"
        Write-Host $result.Output
    } else {
        # Step 5: Fix permissions
        Write-Host "`n[5] Fixing file permissions..." -ForegroundColor Yellow
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html"
        Write-Host $result.Output
        
        # Step 6: Reload nginx
        Write-Host "`n[6] Reloading nginx..." -ForegroundColor Yellow
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx"
        Write-Host $result.Output
        
        # Step 7: Test
        Write-Host "`n[7] Testing..." -ForegroundColor Yellow
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -5"
        Write-Host $result.Output
        
        if ($result.Output -match "200 OK") {
            Write-Host "`nSUCCESS! Server is working!" -ForegroundColor Green
        } else {
            Write-Host "`nWARNING: Still getting errors. Check nginx logs." -ForegroundColor Yellow
        }
    }
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "`nDone!" -ForegroundColor Green
} else {
    Write-Host "Failed to connect to server" -ForegroundColor Red
}


