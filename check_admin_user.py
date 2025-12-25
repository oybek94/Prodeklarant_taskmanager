import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    # Check if admin user exists
    print("Checking if admin user exists...")
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && docker compose exec -T db psql -U app -d prodeklarant -c "SELECT id, name, email, active FROM \\"User\\" WHERE email = \'admin@local.test\' OR name = \'Admin\';"')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
    # Check all users
    print("\n\nChecking all users...")
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && docker compose exec -T db psql -U app -d prodeklarant -c "SELECT id, name, email, active, role::text FROM \\"User\\";"')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
finally:
    ssh.close()

