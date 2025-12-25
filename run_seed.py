import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    print("Running seed script to create admin user...")
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npm run prisma:seed')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
    # Verify admin user was created
    print("\n\nVerifying admin user was created...")
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && docker compose exec -T db psql -U app -d prodeklarant -c "SELECT id, name, email, active, role::text FROM \\"User\\";"')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
finally:
    ssh.close()

