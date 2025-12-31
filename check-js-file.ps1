$server = "138.249.7.15"
$user = "root"
$password = "a9794536"

Import-Module Posh-SSH
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Checking JS file on server..." -ForegroundColor Yellow
    
    # Check file size
    $sizeResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "wc -c /var/www/app/frontend/dist/assets/index-BHtOXsxz.js"
    Write-Host "Server file size: $($sizeResult.Output)"
    
    # Check local file size
    $localFile = "G:\Prodeklarant\frontend\dist\assets\index-BHtOXsxz.js"
    if (Test-Path $localFile) {
        $localSize = (Get-Item $localFile).Length
        Write-Host "Local file size: $localSize bytes"
    }
    
    # Check first 200 characters
    $headResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "head -c 200 /var/www/app/frontend/dist/assets/index-BHtOXsxz.js | od -A x -t x1z -v | head -5"
    Write-Host "`nFirst 200 bytes (hex):"
    Write-Host $headResult.Output
    
    # Check if file is valid JS (check for common JS patterns)
    $validCheck = Invoke-SSHCommand -SessionId $session.SessionId -Command "head -c 1000 /var/www/app/frontend/dist/assets/index-BHtOXsxz.js | grep -o 'function\|const\|var\|let\|export' | head -5"
    Write-Host "`nJS keywords found:"
    Write-Host $validCheck.Output
    
    # Check for syntax errors (look for 'evented' which was in error)
    $errorCheck = Invoke-SSHCommand -SessionId $session.SessionId -Command "grep -n 'evented' /var/www/app/frontend/dist/assets/index-BHtOXsxz.js | head -3"
    Write-Host "`nLines with 'evented':"
    Write-Host $errorCheck.Output
    
    Remove-SSHSession -SessionId $session.SessionId
}


