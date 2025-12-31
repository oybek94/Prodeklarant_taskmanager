# PowerShell script to upload frontend dist directly
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
    
    # Remove old dist
    Write-Host "`n[1] Removing old dist..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "rm -rf /var/www/app/frontend/dist/*"
    Write-Host "Old dist removed"
    
    # Upload index.html
    Write-Host "`n[2] Uploading index.html..." -ForegroundColor Yellow
    $indexContent = Get-Content "G:\Prodeklarant\frontend\dist\index.html" -Raw
    $indexBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($indexContent))
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$indexBase64' | base64 -d > /var/www/app/frontend/dist/index.html"
    Write-Host "index.html uploaded"
    
    # Upload assets directory
    Write-Host "`n[3] Uploading assets directory..." -ForegroundColor Yellow
    $assetsFiles = Get-ChildItem "G:\Prodeklarant\frontend\dist\assets" -File
    foreach ($file in $assetsFiles) {
        Write-Host "  Uploading $($file.Name)..." -ForegroundColor Gray
        $fileContent = [System.IO.File]::ReadAllBytes($file.FullName)
        $fileBase64 = [Convert]::ToBase64String($fileContent)
        
        # Split into chunks if too large
        $chunkSize = 50000
        $chunks = @()
        for ($i = 0; $i -lt $fileBase64.Length; $i += $chunkSize) {
            $chunk = $fileBase64.Substring($i, [Math]::Min($chunkSize, $fileBase64.Length - $i))
            $chunks += $chunk
        }
        
        # Create file on server
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p /var/www/app/frontend/dist/assets && touch /var/www/app/frontend/dist/assets/$($file.Name)"
        
        # Upload chunks
        for ($i = 0; $i -lt $chunks.Count; $i++) {
            if ($i -eq 0) {
                $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$($chunks[$i])' | base64 -d > /var/www/app/frontend/dist/assets/$($file.Name)"
            } else {
                $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$($chunks[$i])' | base64 -d >> /var/www/app/frontend/dist/assets/$($file.Name)"
            }
        }
    }
    Write-Host "Assets uploaded"
    
    # Fix permissions
    Write-Host "`n[4] Fixing permissions..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html"
    Write-Host "Permissions fixed"
    
    # Reload nginx
    Write-Host "`n[5] Reloading nginx..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx"
    Write-Host "Nginx reloaded"
    
    # Test
    Write-Host "`n[6] Testing..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -3"
    Write-Host $result.Output
    
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && echo 'EXISTS' || echo 'NOT FOUND'"
    Write-Host "File check: $($result.Output)"
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "`nDone!" -ForegroundColor Green
} else {
    Write-Host "Failed to connect to server" -ForegroundColor Red
}

