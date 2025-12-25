import paramiko
import sys
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    print("Testing login with admin123...")
    stdin, stdout, stderr = ssh.exec_command('curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -H "Origin: http://138.249.7.15" -d \'{"password":"admin123"}\'')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    print("Response:", output)
    
    try:
        login_data = json.loads(output)
        if 'accessToken' in login_data:
            print("\n[SUCCESS] Login successful!")
            print(f"User: {login_data.get('user', {}).get('name', 'N/A')}")
            print(f"Role: {login_data.get('user', {}).get('role', 'N/A')}")
        else:
            print("\n[ERROR] Login failed:", login_data.get('error', 'Unknown error'))
    except json.JSONDecodeError:
        print("\n[ERROR] Failed to parse response as JSON")
        print("Raw response:", output)
    
    if errors:
        print("Errors:", errors)
    
finally:
    ssh.close()

