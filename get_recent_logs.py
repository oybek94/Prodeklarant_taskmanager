"""
Server'dan eng so'nggi log'larni olish
"""

import paramiko
import sys
from datetime import datetime

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    
    # Debug log faylini o'qish (oxirgi 50 qator)
    print('=== DEBUG LOG FILE (last 50 lines) ===')
    stdin, stdout, stderr = ssh.exec_command('tail -50 /var/www/app/.cursor/debug.log 2>/dev/null || echo "Log file empty or not found"')
    output = stdout.read().decode('utf-8', errors='replace')
    if output.strip():
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    else:
        print('No debug logs found')
    
    # PM2 log'larni ko'rish (oxirgi 50 qator, faqat xatoliklar va PATCH so'rovlar)
    print('\n=== PM2 LOGS (last 50 lines, filtered) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 100 --nostream 2>&1 | grep -E "(PATCH|Fito|400|error|Error)" | tail -50')
    pm2_output = stdout.read().decode('utf-8', errors='replace')
    if pm2_output.strip():
        sys.stdout.buffer.write(pm2_output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    else:
        print('No relevant PM2 logs found')
    
    # Nginx access log'larni ko'rish (oxirgi PATCH so'rovlar)
    print('\n=== NGINX ACCESS LOGS (last PATCH requests) ===')
    stdin, stdout, stderr = ssh.exec_command('tail -100 /var/log/nginx/access.log 2>/dev/null | grep "PATCH.*stages" | tail -10')
    nginx_output = stdout.read().decode('utf-8', errors='replace')
    if nginx_output.strip():
        sys.stdout.buffer.write(nginx_output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    else:
        print('No PATCH requests in nginx logs')
    
finally:
    ssh.close()

