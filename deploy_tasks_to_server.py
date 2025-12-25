"""
Local database'dan export qilingan task'lar ma'lumotlarini server'ga yuborish va import qilish
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
    
    # Export faylni server'ga yuborish
    local_file = 'tasks-export.json'
    remote_file = '/var/www/app/tasks-export.json'
    
    print(f'Export faylni server\'ga yuborish: {local_file} -> {remote_file}')
    sftp.put(local_file, remote_file)
    print('[OK] Fayl yuborildi\n')
    
    # Script'larni git'dan olish
    commands = [
        'cd /var/www/app && git pull',
        'cd /var/www/app/backend && npm install',
        'cd /var/www/app/backend && npx prisma generate',
        'cd /var/www/app/backend && npx ts-node --transpile-only scripts/import-tasks-data.ts',
        'pm2 restart prodeklarant-backend',
        'sleep 2',
        'pm2 status'
    ]
    
    for cmd in commands:
        print(f'\n[Executing] {cmd}')
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode('utf-8', errors='replace')
        errors = stderr.read().decode('utf-8', errors='replace')
        
        if output:
            sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        if errors:
            sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
        
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            print(f'[Warning] Command exited with status {exit_status}')
    
    print('\n[OK] Task\'lar server\'ga import qilindi!')
    
finally:
    if sftp:
        sftp.close()
    ssh.close()

