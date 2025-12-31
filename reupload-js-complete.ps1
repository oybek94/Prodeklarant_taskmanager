$server = "138.249.7.15"
$user = "root"
$password = "a9794536"
$jsPath = "G:\Prodeklarant\frontend\dist\assets\index-BHtOXsxz.js"

Import-Module Posh-SSH
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

Write-Host "Connecting..." -ForegroundColor Cyan
$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Connected!" -ForegroundColor Green
    
    # Read entire JS file
    Write-Host "`nReading JS file..." -ForegroundColor Yellow
    $jsContent = [System.IO.File]::ReadAllText($jsPath)
    $jsName = "index-BHtOXsxz.js"
    
    Write-Host "File size: $($jsContent.Length) bytes" -ForegroundColor Cyan
    
    # Delete old file
    Write-Host "`nDeleting old file..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "rm -f /var/www/app/frontend/dist/assets/$jsName" | Out-Null
    
    # Upload using base64 in smaller chunks
    Write-Host "Uploading JS file (this will take a few minutes)..." -ForegroundColor Yellow
    
    # Convert to base64
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsContent)
    $base64 = [Convert]::ToBase64String($bytes)
    
    # Split into 50KB chunks
    $chunkSize = 50000
    $chunks = [math]::Ceiling($base64.Length / $chunkSize)
    
    Write-Host "Splitting into $chunks chunks..." -ForegroundColor Cyan
    
    # Create file and append chunks
    for ($i = 0; $i -lt $chunks; $i++) {
        $start = $i * $chunkSize
        $length = [Math]::Min($chunkSize, $base64.Length - $start)
        $chunk = $base64.Substring($start, $length)
        
        if ($i -eq 0) {
            # First chunk - create file
            $cmd = "echo '$chunk' | base64 -d > /var/www/app/frontend/dist/assets/$jsName"
        } else {
            # Append chunks
            $cmd = "echo '$chunk' | base64 -d >> /var/www/app/frontend/dist/assets/$jsName"
        }
        
        Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd | Out-Null
        
        if (($i + 1) % 10 -eq 0) {
            Write-Host "  Progress: $($i+1)/$chunks chunks" -ForegroundColor Gray
        }
    }
    
    Write-Host "`nVerifying file..." -ForegroundColor Yellow
    $verify = Invoke-SSHCommand -SessionId $session.SessionId -Command "wc -c /var/www/app/frontend/dist/assets/$jsName && head -c 100 /var/www/app/frontend/dist/assets/$jsName | od -A x -t x1z | head -1"
    Write-Host $verify.Output
    
    # Fix permissions
    Write-Host "`nFixing permissions..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "chown -R www-data:www-data /var/www/app/frontend/dist && chmod -R 755 /var/www/app/frontend/dist && chmod 644 /var/www/app/frontend/dist/assets/$jsName" | Out-Null
    
    # Reload nginx
    Write-Host "Reloading nginx..." -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl reload nginx" | Out-Null
    
    # Test
    Write-Host "`nTesting..." -ForegroundColor Yellow
    $test = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost/"
    Write-Host "HTTP Status: $($test.Output)" -ForegroundColor $(if($test.Output -eq '200'){'Green'}else{'Yellow'})
    
    if ($test.Output -eq '200') {
        Write-Host "`nSUCCESS! JS file uploaded correctly!" -ForegroundColor Green
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect" -ForegroundColor Red
}

