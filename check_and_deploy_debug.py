"""
Server'dagi kodni tekshirish va to'g'ri deploy qilish
"""

import paramiko
import sys
import os

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
sftp = None

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()
    
    # Local tasks.ts faylini o'qish
    print('Local tasks.ts faylini o\'qish...')
    with open('backend/src/routes/tasks.ts', 'r', encoding='utf-8') as f:
        local_content = f.read()
    
    # Server'dagi tasks.ts faylini o'qish
    print('Server\'dagi tasks.ts faylini o\'qish...')
    try:
        with sftp.open('/var/www/app/backend/src/routes/tasks.ts', 'r') as f:
            server_content = f.read().decode('utf-8')
    except:
        server_content = ""
    
    # debugLog mavjudligini tekshirish
    local_has_debug = 'const debugLog' in local_content or 'function debugLog' in local_content
    server_has_debug = 'const debugLog' in server_content or 'function debugLog' in server_content
    
    print(f'\nLocal has debugLog: {local_has_debug}')
    print(f'Server has debugLog: {server_has_debug}')
    
    if not server_has_debug and local_has_debug:
        print('\nDeploying updated tasks.ts to server...')
        # Faylni yuborish
        with sftp.open('/var/www/app/backend/src/routes/tasks.ts', 'w') as f:
            f.write(local_content.encode('utf-8'))
        print('[OK] tasks.ts deployed')
        
        # Backend'ni rebuild qilish
        print('\nRebuilding backend...')
        stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npm run build 2>&1 | tail -10')
        output = stdout.read().decode('utf-8', errors='replace')
        errors = stderr.read().decode('utf-8', errors='replace')
        
        if output:
            sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
            sys.stdout.buffer.flush()
        if errors:
            sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
            sys.stderr.buffer.flush()
        
        # PM2 restart
        print('\nRestarting PM2...')
        ssh.exec_command('pm2 restart prodeklarant-backend')
        print('[OK] Backend restarted')
    else:
        print('\nCode is already up to date or debugLog not found locally')
    
finally:
    if sftp:
        sftp.close()
    ssh.close()

