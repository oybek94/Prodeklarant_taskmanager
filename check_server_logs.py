"""
Server'dan log'larni tekshirish
"""

import paramiko
import sys
import os

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    
    # .cursor directory yaratish
    print('Creating .cursor directory if needed...')
    ssh.exec_command('mkdir -p /var/www/app/.cursor')
    
    # Debug log faylini tekshirish
    print('\nChecking debug log file...')
    stdin, stdout, stderr = ssh.exec_command('ls -la /var/www/app/.cursor/ 2>&1')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # PM2 log'larni ko'rish (oxirgi 30 qator)
    print('\n=== PM2 LOGS (last 30 lines) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 30 --nostream 2>&1 | tail -30')
    pm2_output = stdout.read().decode('utf-8', errors='replace')
    if pm2_output:
        sys.stdout.buffer.write(pm2_output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Backend kodini tekshirish - debugLog funksiyasi mavjudligini
    print('\n=== Checking if debugLog exists in code ===')
    stdin, stdout, stderr = ssh.exec_command('grep -n "debugLog" /var/www/app/backend/src/routes/tasks.ts | head -5')
    grep_output = stdout.read().decode('utf-8', errors='replace')
    if grep_output:
        print(grep_output)
    else:
        print('debugLog not found in tasks.ts')
    
finally:
    ssh.close()

