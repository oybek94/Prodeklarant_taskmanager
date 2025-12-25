import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    commands = [
        'cd /var/www/app/backend && git pull',
        'cd /var/www/app/backend && npm install',
        'cd /var/www/app/backend && npx prisma generate',
        'cd /var/www/app/backend && npm run build || true',
        'pm2 restart prodeklarant-backend',
        'sleep 3',
        'pm2 logs prodeklarant-backend --lines 20 --nostream'
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
        if exit_status != 0 and 'build' not in cmd:  # Allow build to fail
            print(f'[Warning] Command exited with status {exit_status}')
    
finally:
    ssh.close()

