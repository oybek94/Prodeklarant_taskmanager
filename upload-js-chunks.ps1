# Upload JS file in chunks
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"
$jsPath = "G:\Prodeklarant\frontend\dist\assets\index-BHtOXsxz.js"

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
    
    # Read JS file
    $jsContent = [System.IO.File]::ReadAllText($jsPath)
    $jsName = "index-BHtOXsxz.js"
    
    Write-Host "`nUploading JS file ($($jsContent.Length) bytes)..." -ForegroundColor Yellow
    
    # Split into smaller chunks and upload
    $chunkSize = 20000
    $chunks = [math]::Ceiling($jsContent.Length / $chunkSize)
    
    # Create file on server
    Invoke-SSHCommand -SessionId $session.SessionId -Command "cat > /var/www/app/frontend/dist/assets/$jsName << 'JSSTART'" | Out-Null
    
    for ($i = 0; $i -lt $chunks; $i++) {
        $start = $i * $chunkSize
        $length = [Math]::Min($chunkSize, $jsContent.Length - $start)
        $chunk = $jsContent.Substring($start, $length)
        
        # Escape special characters
        $chunkEscaped = $chunk -replace '\\', '\\' -replace '\$', '\$' -replace '`', '\`' -replace '"', '\"'
        
        # Append chunk
        Invoke-SSHCommand -SessionId $session.SessionId -Command "cat >> /var/www/app/frontend/dist/assets/$jsName << 'JSCHUNK'
$chunk
JSCHUNK
" | Out-Null
        
        Write-Host "  Chunk $($i+1)/$chunks" -ForegroundColor Gray
    }
    
    # Close heredoc
    Invoke-SSHCommand -SessionId $session.SessionId -Command "echo 'JSEND' >> /var/www/app/frontend/dist/assets/$jsName && sed -i 's/JSSTART//; s/JSEND//' /var/www/app/frontend/dist/assets/$jsName" | Out-Null
    
    Write-Host "`nFixing permissions..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && systemctl reload nginx" | Out-Null
    
    Write-Host "Testing..." -ForegroundColor Yellow
    $test = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -I http://localhost/ 2>&1 | head -1"
    Write-Host "`nHTTP Status: $($test.Output)" -ForegroundColor $(if ($test.Output -match "200") { "Green" } else { "Yellow" })
    
    $verify = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -lh /var/www/app/frontend/dist/assets/$jsName"
    Write-Host "JS file: $($verify.Output)" -ForegroundColor Green
    
    if ($test.Output -match "200") {
        Write-Host "`nSUCCESS! Server is working!" -ForegroundColor Green
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}


