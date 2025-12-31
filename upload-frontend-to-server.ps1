# PowerShell script to upload built frontend to server
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"
$localDistPath = "G:\Prodeklarant\frontend\dist"
$remotePath = "/var/www/app/frontend/dist"

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
        Write-Host "ERROR: Local dist folder not found at $localDistPath" -ForegroundColor Red
        Write-Host "Please build frontend first: cd frontend && npm run build" -ForegroundColor Yellow
        Remove-SSHSession -SessionId $session.SessionId
        exit 1
    }
    
    Write-Host "`nLocal dist folder found!" -ForegroundColor Green
    
    # Backup old dist on server
    Write-Host "`n[1] Backing up old dist on server..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && mv dist dist.backup.$(Get-Date -Format 'yyyyMMddHHmmss') 2>/dev/null || true" | Out-Null
    
    # Create remote directory
    Write-Host "[2] Creating remote directory..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p $remotePath" | Out-Null
    
    # Upload files
    Write-Host "[3] Uploading files (this may take a minute)..." -ForegroundColor Yellow
    
    # Get all files to upload
    $files = Get-ChildItem -Path $localDistPath -Recurse -File
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($localDistPath.Length + 1)
        $remoteFilePath = "$remotePath/$relativePath".Replace('\', '/')
        $remoteDir = Split-Path -Path $remoteFilePath -Parent
        
        # Create directory on server
        Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p `"$remoteDir`"" | Out-Null
        
        # Upload file
        Set-SCPFile -ComputerName $server -Credential $credential -LocalFile $file.FullName -RemotePath $remoteFilePath
        
        Write-Host "  Uploaded: $relativePath" -ForegroundColor Gray
    }
    
    Write-Host "`n[4] Fixing permissions..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data $remotePath && chmod -R 755 $remotePath && chmod 644 $remotePath/index.html" | Out-Null
    
    Write-Host "[5] Reloading nginx..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
    
    Write-Host "[6] Testing..." -ForegroundColor Yellow
    $testResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
    Write-Host "`nHTTP Status: $($testResult.Output)" -ForegroundColor $(if ($testResult.Output -match "200") { "Green" } else { "Yellow" })
    
    # Verify index.html
    $verifyResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f $remotePath/index.html && echo 'index.html exists' || echo 'index.html missing'"
    Write-Host "File check: $($verifyResult.Output)" -ForegroundColor $(if ($verifyResult.Output -match "exists") { "Green" } else { "Red" })
    
    if ($testResult.Output -match "200" -and $verifyResult.Output -match "exists") {
        Write-Host "`nSUCCESS! Server is now working!" -ForegroundColor Green
        Write-Host "You can access the site at: http://138.249.7.15" -ForegroundColor Cyan
    } else {
        Write-Host "`nWARNING: Some issues detected. Please check manually." -ForegroundColor Yellow
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect to server" -ForegroundColor Red
}


