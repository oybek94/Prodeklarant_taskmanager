#!/usr/bin/env python3
import paramiko
import time

SERVER = "138.249.7.15"
USER = "root"
PASSWORD = "a9794536"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASSWORD, timeout=30)

# Check if deployment script is still running
stdin, stdout, stderr = ssh.exec_command('ps aux | grep "[d]eploy-remote.sh"')
running = stdout.read().decode().strip()
if running:
    print("Deployment script is still running...")
    print(running)
else:
    print("Deployment script has finished. Checking status...")
    
    # Check last lines of output
    stdin, stdout, stderr = ssh.exec_command('tail -100 /root/.bash_history 2>/dev/null || echo "No history"')
    print(stdout.read().decode())

ssh.close()

