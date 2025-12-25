"""
Server'dagi task'lar va stage'lar ma'lumotlarini tekshirish
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
        'cd /var/www/app/backend && npx ts-node --transpile-only -e "import { PrismaClient } from \'@prisma/client\'; const prisma = new PrismaClient(); prisma.task.count().then(c => { console.log(\'Jami task\'lar:\', c); prisma.taskStage.count({ where: { status: \'TAYYOR\' } }).then(sc => { console.log(\'Tayyor stage\'lar:\', sc); prisma.taskStage.count({ where: { durationMin: 90 } }).then(dc => { console.log(\'90 daqiqa belgilangan stage\'lar:\', dc); prisma.$disconnect(); }); }); });"',
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
    
finally:
    ssh.close()

