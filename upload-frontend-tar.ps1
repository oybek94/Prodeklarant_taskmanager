# PowerShell script to upload built frontend using tar
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"
$localDistPath = "G:\Prodeklarant\frontend\dist"
$remotePath = "/var/www/app/frontend"

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
    
    # Check if local dist exists
    if (-not (Test-Path $localDistPath)) {
        Write-Host "ERROR: Local dist folder not found!" -ForegroundColor Red
        Remove-SSHSession -SessionId $session.SessionId
        exit 1
    }
    
    Write-Host "`n[1] Creating tar archive..." -ForegroundColor Yellow
    $tarFile = "G:\Prodeklarant\frontend-dist.tar.gz"
    
    # Use 7zip or tar if available
    if (Get-Command tar -ErrorAction SilentlyContinue) {
        & tar -czf $tarFile -C $localDistPath .
        Write-Host "Archive created: $tarFile" -ForegroundColor Green
    } else {
        Write-Host "ERROR: tar command not found. Please install tar or use 7zip." -ForegroundColor Red
        Remove-SSHSession -SessionId $session.SessionId
        exit 1
    }
    
    # Upload tar file using SCP
    Write-Host "`n[2] Uploading archive to server..." -ForegroundColor Yellow
    try {
        $scp = New-SCPClient -ComputerName $server -Credential $credential
        $scp.Upload($tarFile, "/tmp/frontend-dist.tar.gz")
        Write-Host "Upload complete!" -ForegroundColor Green
    } catch {
        Write-Host "SCP upload failed, trying alternative method..." -ForegroundColor Yellow
        # Alternative: use base64 encoding
        $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($tarFile))
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$base64' | base64 -d > /tmp/frontend-dist.tar.gz"
        Write-Host "Upload complete!" -ForegroundColor Green
    }
    
    # Extract on server
    Write-Host "`n[3] Extracting on server..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && rm -rf dist && mkdir -p dist && cd dist && tar -xzf /tmp/frontend-dist.tar.gz && rm /tmp/frontend-dist.tar.gz"
    Write-Host $result.Output
    
    # Fix permissions
    Write-Host "`n[4] Fixing permissions..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data $remotePath/dist && chmod -R 755 $remotePath/dist && chmod 644 $remotePath/dist/index.html" | Out-Null
    
    # Reload nginx
    Write-Host "[5] Reloading nginx..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
    
    # Test
    Write-Host "[6] Testing..." -ForegroundColor Yellow
    $testResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
    Write-Host "`nHTTP Status: $($testResult.Output)" -ForegroundColor $(if ($testResult.Output -match "200") { "Green" } else { "Yellow" })
    
    # Verify
    $verifyResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f $remotePath/dist/index.html && ls -lh $remotePath/dist/index.html || echo 'NOT FOUND'"
    Write-Host "File check: $($verifyResult.Output)" -ForegroundColor $(if ($verifyResult.Output -match "index.html") { "Green" } else { "Red" })
    
    # Cleanup local tar
    Remove-Item $tarFile -ErrorAction SilentlyContinue
    
    if ($testResult.Output -match "200" -and $verifyResult.Output -match "index.html") {
        Write-Host "`nSUCCESS! Server is now working!" -ForegroundColor Green
        Write-Host "Site: http://138.249.7.15" -ForegroundColor Cyan
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}


