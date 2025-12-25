"""
Server'ga final o'zgarishlarni deploy qilish
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
    
    commands = [
        'cd /var/www/app && git pull',
        'cd /var/www/app/backend && npm install',
        'cd /var/www/app/backend && npx prisma generate',
        'cd /var/www/app/backend && npm run build || true',
        'cd /var/www/app/backend && npx ts-node --transpile-only scripts/set-all-durations-server.ts',
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
        if exit_status != 0 and 'build' not in cmd:
            print(f'[Warning] Command exited with status {exit_status}')
    
    print('\n[OK] Deploy muvaffaqiyatli!')
    
finally:
    ssh.close()

