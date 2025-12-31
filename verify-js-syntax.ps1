$server = "138.249.7.15"
$user = "root"
$password = "a9794536"

Import-Module Posh-SSH
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Checking JS file syntax..." -ForegroundColor Yellow
    
    # Check file size
    $size = Invoke-SSHCommand -SessionId $session.SessionId -Command "wc -c /var/www/app/frontend/dist/assets/index-BHtOXsxz.js"
    Write-Host "Server size: $($size.Output)"
    
    $localSize = (Get-Item "G:\Prodeklarant\frontend\dist\assets\index-BHtOXsxz.js").Length
    Write-Host "Local size: $localSize bytes"
    
    # Check first and last 100 bytes match
    $first100 = Invoke-SSHCommand -SessionId $session.SessionId -Command "head -c 100 /var/www/app/frontend/dist/assets/index-BHtOXsxz.js | xxd"
    Write-Host "`nFirst 100 bytes (server):"
    Write-Host $first100.Output
    
    $localFirst = [System.IO.File]::ReadAllBytes("G:\Prodeklarant\frontend\dist\assets\index-BHtOXsxz.js")[0..99]
    $localFirstHex = ($localFirst | ForEach-Object { $_.ToString("x2") }) -join " "
    Write-Host "`nFirst 100 bytes (local):"
    Write-Host $localFirstHex
    
    # Check if sizes match
    if ($size.Output -match "(\d+)") {
        $serverSize = [int]$matches[1]
        if ($serverSize -eq $localSize) {
            Write-Host "`nSUCCESS: File sizes match!" -ForegroundColor Green
        } else {
            Write-Host "`nWARNING: File sizes don't match!" -ForegroundColor Yellow
            Write-Host "Server: $serverSize, Local: $localSize" -ForegroundColor Yellow
        }
    }
    
    Remove-SSHSession -SessionId $session.SessionId
}


