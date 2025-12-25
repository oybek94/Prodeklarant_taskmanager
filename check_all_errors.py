import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    # Get recent error logs
    print("Checking recent backend errors...")
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && tail -n 100 logs/pm2-error.log | tail -n 50')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
    # Also check if there are any recent errors in the output log
    print("\n\nChecking recent output logs for errors...")
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && tail -n 50 logs/pm2-out.log | grep -i error')
    output = stdout.read().decode('utf-8', errors='replace')
    if output.strip():
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    else:
        print("No errors found in output log")
    
finally:
    ssh.close()

