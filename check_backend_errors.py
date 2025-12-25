#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko
import sys
import io

# Set stdout to handle UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SERVER = "138.249.7.15"
USER = "root"
PASSWORD = "a9794536"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASSWORD, timeout=30)

# Check PM2 logs
stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 50 --nostream 2>&1')
pm2_logs = stdout.read().decode('utf-8', errors='replace')
print("PM2 Logs (last 50 lines):")
print(pm2_logs)

# Check if backend process is running
stdin, stdout, stderr = ssh.exec_command('pm2 list')
pm2_list = stdout.read().decode('utf-8', errors='ignore')
print("\nPM2 Process List:")
print(pm2_list)

# Check backend dist folder
stdin, stdout, stderr = ssh.exec_command('ls -la /var/www/app/backend/dist/ | head -10')
dist_files = stdout.read().decode('utf-8', errors='ignore')
print("\nBackend dist files:")
print(dist_files)

ssh.close()

