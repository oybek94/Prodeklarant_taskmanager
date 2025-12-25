import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    # Check for errors after the latest restart
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && tail -n 50 logs/pm2-error.log | grep -A 10 "18:54"')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    if output.strip():
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    else:
        print("No errors found after 18:54")
    
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
finally:
    ssh.close()

