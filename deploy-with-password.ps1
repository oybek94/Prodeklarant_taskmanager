# PowerShell script to deploy using SSH with password
$server = "138.249.7.15"
$user = "root"
$password = "a9794536"
$scriptPath = "deploy.sh"

# Install Posh-SSH if not available
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module..."
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser
}

Import-Module Posh-SSH

# Create secure password
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($user, $secPassword)

Write-Host "Connecting to server..."
$session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey

if ($session) {
    Write-Host "Connection successful!"
    
    # Upload deploy script
    Write-Host "Uploading deployment script..."
    Set-SCPFile -ComputerName $server -Credential $credential -LocalFile $scriptPath -RemotePath "/root/deploy.sh"
    
    # Make script executable and run it
    Write-Host "Executing deployment script..."
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "chmod +x /root/deploy.sh && /root/deploy.sh"
    
    Write-Host "Deployment output:"
    Write-Host $result.Output
    
    if ($result.Error) {
        Write-Host "Errors:"
        Write-Host $result.Error
    }
    
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Failed to connect to server"
}

