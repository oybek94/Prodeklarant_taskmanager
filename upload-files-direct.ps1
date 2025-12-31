# Upload files directly using echo/cat
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
    
    # Prepare directory
    Write-Host "`n[1] Preparing directory..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/app/frontend && rm -rf dist && mkdir -p dist/assets" | Out-Null
    
    # Upload index.html
    Write-Host "[2] Uploading index.html..." -ForegroundColor Yellow
    $indexContent = Get-Content "G:\Prodeklarant\frontend\dist\index.html" -Raw
    $indexEscaped = $indexContent -replace '"', '\"' -replace '\$', '\$' -replace '`', '\`'
    Invoke-SSHCommand -SessionId $session.SessionId -Command "cat > /var/www/app/frontend/dist/index.html << 'EOFINDEX'
$indexContent
EOFINDEX
" | Out-Null
    
    # Upload CSS
    Write-Host "[3] Uploading CSS..." -ForegroundColor Yellow
    $cssFiles = Get-ChildItem "G:\Prodeklarant\frontend\dist\assets\*.css"
    foreach ($css in $cssFiles) {
        $cssContent = Get-Content $css.FullName -Raw
        $cssName = $css.Name
        Invoke-SSHCommand -SessionId $session.SessionId -Command "cat > /var/www/app/frontend/dist/assets/$cssName << 'EOFCSS'
$cssContent
EOFCSS
" | Out-Null
        Write-Host "  Uploaded: $cssName" -ForegroundColor Gray
    }
    
    # Upload JS (in chunks if too large)
    Write-Host "[4] Uploading JS..." -ForegroundColor Yellow
    $jsFiles = Get-ChildItem "G:\Prodeklarant\frontend\dist\assets\*.js"
    foreach ($js in $jsFiles) {
        $jsContent = Get-Content $js.FullName -Raw -Encoding UTF8
        $jsName = $js.Name
        # Split into smaller chunks
        $chunkSize = 50000
        $chunks = [math]::Ceiling($jsContent.Length / $chunkSize)
        
        Write-Host "  Uploading $jsName ($chunks chunks)..." -ForegroundColor Gray
        Invoke-SSHCommand -SessionId $session.SessionId -Command "cat > /var/www/app/frontend/dist/assets/$jsName << 'EOFJS'
$jsContent
EOFJS
" | Out-Null
    }
    
    # Upload other files
    Write-Host "[5] Uploading other files..." -ForegroundColor Yellow
    Get-ChildItem "G:\Prodeklarant\frontend\dist" -File | Where-Object { $_.Extension -notin '.html', '.css', '.js' } | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding Byte
        $b64 = [Convert]::ToBase64String($content)
        Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$b64' | python3 -m base64 -d > /var/www/app/frontend/dist/$($_.Name)" | Out-Null
        Write-Host "  Uploaded: $($_.Name)" -ForegroundColor Gray
    }
    
    # Fix permissions
    Write-Host "`n[6] Fixing permissions..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/index.html" | Out-Null
    
    # Reload nginx
    Write-Host "[7] Reloading nginx..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
    
    # Test
    Write-Host "`n[8] Testing..." -ForegroundColor Yellow
    $test = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
    Write-Host "HTTP Status: $($test.Output)" -ForegroundColor $(if ($test.Output -match "200") { "Green" } else { "Yellow" })
    
    $verify = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f /var/www/app/frontend/dist/index.html && ls -lh /var/www/app/frontend/dist/index.html || echo 'NOT FOUND'"
    Write-Host "File: $($verify.Output)" -ForegroundColor $(if ($verify.Output -match "index.html") { "Green" } else { "Red" })
    
    if ($test.Output -match "200") {
        Write-Host "`nSUCCESS! Server is working!" -ForegroundColor Green
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}


