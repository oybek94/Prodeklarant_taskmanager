"""
Backend fix'ni server'ga deploy qilish
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
    
    # Backend fayllarini yuborish
    print('Backend fayllarini server\'ga yuborish...')
    
    files_to_upload = [
        'backend/src/services/document.service.ts',
    ]
    
    for local_file in files_to_upload:
        if os.path.exists(local_file):
            remote_file = f'/var/www/app/{local_file}'
            remote_dir = os.path.dirname(remote_file)
            
            # Remote directory yaratish
            try:
                sftp.mkdir(remote_dir)
            except:
                pass
            
            # Faylni yuborish
            sftp.put(local_file, remote_file)
            print(f'  [OK] {local_file}')
        else:
            print(f'  [WARNING] {local_file} topilmadi')
    
    # Backend'ni build qilish
    print('\nBackend\'ni build qilish...')
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
    print('\nPM2 restart...')
    ssh.exec_command('pm2 restart prodeklarant-backend')
    
    print('\n[OK] Backend fix deploy qilindi!')
    
finally:
    if sftp:
        sftp.close()
    ssh.close()

