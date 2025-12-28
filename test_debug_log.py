"""
Server'da debugLog ishlashini tekshirish
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
    
    # Debug log fayl path'ini tekshirish
    print('Checking debug log path...')
    stdin, stdout, stderr = ssh.exec_command('ls -la /var/www/app/.cursor/debug.log 2>&1')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Backend kodida debugLog path'ini tekshirish
    print('\nChecking debugLog path in code...')
    stdin, stdout, stderr = ssh.exec_command('grep -A 5 "getDebugLogPath" /var/www/app/backend/src/routes/tasks.ts | head -10')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Test yozish
    print('\nTesting write to debug log...')
    stdin, stdout, stderr = ssh.exec_command('echo \'{"test":"data"}\' >> /var/www/app/.cursor/debug.log && echo "Write successful" || echo "Write failed"')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Faylni o'qish
    print('\nReading debug log file...')
    stdin, stdout, stderr = ssh.exec_command('cat /var/www/app/.cursor/debug.log 2>&1')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # PM2 log'larda xatolik qidirish
    print('\n=== Recent PM2 errors ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 200 --nostream 2>&1 | grep -i "error\|400\|fito" | tail -20')
    pm2_output = stdout.read().decode('utf-8', errors='replace')
    if pm2_output.strip():
        sys.stdout.buffer.write(pm2_output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
finally:
    ssh.close()

