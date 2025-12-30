"""
Server'da backend'ni restart qilish
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
    
    # PM2 restart
    print('PM2 restart qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('pm2 restart prodeklarant-backend')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Status tekshirish
    print('\nPM2 status:')
    stdin, stdout, stderr = ssh.exec_command('sleep 3 && pm2 status')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Log'larni ko'rsatish
    print('\n=== Backend log\'lari (oxirgi 15 qator) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 15 --nostream')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    print('\n[OK] Backend restart yakunlandi!')
    print('\nDatabase permissions allaqachon tuzatilgan.')
    print('Endi login qilib sinab ko\'ring!')
    
finally:
    ssh.close()

