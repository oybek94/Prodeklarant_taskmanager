$server = "138.249.7.15"
$user = "root"
$password = "a9794536"

Import-Module Posh-SSH
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    $test = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost/"
    Write-Host "HTTP Status: $($test.Output)" -ForegroundColor $(if($test.Output -eq '200'){'Green'}else{'Yellow'})
    
    $files = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -la /var/www/app/frontend/dist/ | head -10"
    Write-Host "`nFiles in dist:"
    Write-Host $files.Output
    
    Remove-SSHSession -SessionId $session.SessionId
}


