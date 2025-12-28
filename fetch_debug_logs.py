"""
Server'dan debug log'larni olish
"""

import paramiko
import sys

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    
    # Debug log faylini o'qish
    print('Server\'dagi debug log\'larni o\'qish...')
    stdin, stdout, stderr = ssh.exec_command('cat /var/www/app/.cursor/debug.log 2>/dev/null || echo "Log file not found"')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        print('\n=== DEBUG LOGS ===')
        print(output)
        print('=== END LOGS ===')
    
    if errors:
        print('\n=== ERRORS ===')
        print(errors)
    
    # PM2 log'larni ham ko'rish
    print('\n=== PM2 LOGS (last 20 lines) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 20 --nostream 2>&1 | tail -20')
    pm2_output = stdout.read().decode('utf-8', errors='replace')
    if pm2_output:
        print(pm2_output)
    
finally:
    ssh.close()

