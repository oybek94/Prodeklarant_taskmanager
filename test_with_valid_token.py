import paramiko
import sys
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    # First, try to login to get a valid token
    print("Step 1: Attempting login...")
    stdin, stdout, stderr = ssh.exec_command('curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -H "Origin: http://138.249.7.15" -d \'{"password":"admin"}\'')
    login_output = stdout.read().decode('utf-8', errors='replace')
    login_errors = stderr.read().decode('utf-8', errors='replace')
    
    print("Login response:", login_output[:200])
    
    try:
        login_data = json.loads(login_output)
        if 'accessToken' in login_data:
            token = login_data['accessToken']
            print(f"\nStep 2: Testing /auth/me with valid token...")
            stdin, stdout, stderr = ssh.exec_command(f'curl -s -X GET http://localhost:3001/api/auth/me -H "Authorization: Bearer {token}" -H "Origin: http://138.249.7.15"')
            me_output = stdout.read().decode('utf-8', errors='replace')
            me_errors = stderr.read().decode('utf-8', errors='replace')
            
            print("Response:", me_output)
            if me_errors:
                print("Errors:", me_errors)
        else:
            print("No token received from login")
    except json.JSONDecodeError:
        print("Failed to parse login response as JSON")
        print("Full response:", login_output)
    
finally:
    ssh.close()

