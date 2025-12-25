#!/usr/bin/env python3
import paramiko

SERVER = "138.249.7.15"
USER = "root"
PASSWORD = "a9794536"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASSWORD, timeout=30)

commands = [
    ("Node.js version", "node --version 2>/dev/null || echo 'Not installed'"),
    ("npm version", "npm --version 2>/dev/null || echo 'Not installed'"),
    ("PM2 version", "pm2 --version 2>/dev/null || echo 'Not installed'"),
    ("Docker version", "docker --version 2>/dev/null || echo 'Not installed'"),
    ("Nginx status", "systemctl is-active nginx 2>/dev/null || echo 'Not active'"),
    ("Project directory", "ls -la /var/www/app 2>/dev/null | head -5 || echo 'Not found'"),
    ("Database container", "docker ps | grep prodeklarant-db || echo 'Not running'"),
    ("PM2 processes", "pm2 list 2>/dev/null || echo 'PM2 not running'"),
]

for name, cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    result = output if output else error
    print(f"{name}: {result}")

ssh.close()

