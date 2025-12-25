import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    # Test the endpoint directly
    stdin, stdout, stderr = ssh.exec_command('curl -v http://localhost:3001/api/auth/me -H "Authorization: Bearer test" 2>&1')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
    if errors:
        sys.stderr.buffer.write(errors.encode('utf-8', errors='replace'))
    
finally:
    ssh.close()

