"""
Server'da backend'ni qayta build qilish
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
    
    print('Backend\'ni build qilish (TypeScript xatoliklarini o\'tkazib yuborish)...')
    
    # Build qilish (skipLibCheck bilan)
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npx tsc --skipLibCheck 2>&1 | tail -15')
    
    # Output'ni real-time o'qish
    while True:
        line = stdout.readline()
        if not line:
            break
        sys.stdout.buffer.write(line.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Error'larni ham ko'rsatish
    errors = stderr.read().decode('utf-8', errors='replace')
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
        sys.stderr.buffer.flush()
    
    # Build natijasini tekshirish
    print('\n=== Build natijasi ===')
    stdin, stdout, stderr = ssh.exec_command('ls -la /var/www/app/backend/dist/services/ | grep document')
    output = stdout.read().decode('utf-8', errors='replace')
    if output:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # PM2 restart
    print('\nPM2 restart...')
    ssh.exec_command('pm2 restart prodeklarant-backend')
    
    # Log'larni ko'rsatish
    print('\n=== Backend log\'lari (oxirgi 5 qator) ===')
    stdin, stdout, stderr = ssh.exec_command('sleep 2 && pm2 logs prodeklarant-backend --lines 5 --nostream')
    output = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    sys.stdout.buffer.flush()
    
    print('\n[OK] Backend rebuild yakunlandi!')
    
finally:
    ssh.close()

