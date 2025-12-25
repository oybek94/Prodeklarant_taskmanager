"""
Server'da debug script'ni ishga tushirish
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
    
    # Export faylni server'ga yuborish
    sftp = ssh.open_sftp()
    sftp.put('tasks-export.json', '/var/www/app/tasks-export.json')
    sftp.close()
    print('[OK] Export fayl yuborildi\n')
    
    # Git pull va debug script'ni ishga tushirish
    cmd = 'cd /var/www/app && git pull && cd backend && npx ts-node --transpile-only scripts/debug-import.ts'
    
    print('[Executing] Debug script...')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
finally:
    ssh.close()

