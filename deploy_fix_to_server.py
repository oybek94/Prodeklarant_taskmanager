"""
Server'ga o'zgarishlarni deploy qilish va restart qilish
"""

import paramiko
import sys

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('Serverga ulanmoqda...')
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('[OK] Serverga ulandi\n')
    
    # Git pull
    print('Git pull qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app && git pull')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    print(output)
    if errors:
        print(errors)
    
    # Backend'ni build qilish
    print('\nBackend\'ni build qilish...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npm run build 2>&1 | tail -20')
    
    while True:
        line = stdout.readline()
        if not line:
            break
        sys.stdout.buffer.write(line.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # PM2 restart
    print('\nPM2 restart qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('pm2 restart prodeklarant-backend')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Status tekshirish
    print('\nPM2 status:')
    stdin, stdout, stderr = ssh.exec_command('sleep 3 && pm2 status')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Log'larni ko'rsatish
    print('\n=== Backend log\'lari (oxirgi 10 qator) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 10 --nostream')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    print('\n[OK] Deploy yakunlandi!')
    
finally:
    ssh.close()

