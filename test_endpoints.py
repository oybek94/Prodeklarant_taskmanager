import paramiko
import sys
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('138.249.7.15', username='root', password='a9794536')
    
    # First login to get token
    print("1. Testing login...")
    stdin, stdout, stderr = ssh.exec_command('curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -H "Origin: http://138.249.7.15" -d \'{"password":"admin123"}\'')
    login_output = stdout.read().decode('utf-8', errors='replace')
    
    try:
        login_data = json.loads(login_output)
        if 'accessToken' in login_data:
            token = login_data['accessToken']
            print("   [OK] Login successful")
            
            # Test /auth/me
            print("\n2. Testing /api/auth/me...")
            stdin, stdout, stderr = ssh.exec_command(f'curl -s -X GET http://localhost:3001/api/auth/me -H "Authorization: Bearer {token}" -H "Origin: http://138.249.7.15"')
            me_output = stdout.read().decode('utf-8', errors='replace')
            if me_output.startswith('{'):
                print("   [OK] /auth/me works")
            else:
                print(f"   [ERROR] /auth/me failed: {me_output[:200]}")
            
            # Test /api/branches
            print("\n3. Testing /api/branches...")
            stdin, stdout, stderr = ssh.exec_command(f'curl -s -X GET http://localhost:3001/api/branches -H "Authorization: Bearer {token}" -H "Origin: http://138.249.7.15"')
            branches_output = stdout.read().decode('utf-8', errors='replace')
            if branches_output.startswith('[') or branches_output.startswith('{'):
                print("   [OK] /branches works")
            else:
                print(f"   [ERROR] /branches failed: {branches_output[:200]}")
            
            # Test /api/dashboard/stats
            print("\n4. Testing /api/dashboard/stats...")
            stdin, stdout, stderr = ssh.exec_command(f'curl -s -X GET http://localhost:3001/api/dashboard/stats -H "Authorization: Bearer {token}" -H "Origin: http://138.249.7.15"')
            stats_output = stdout.read().decode('utf-8', errors='replace')
            if stats_output.startswith('[') or stats_output.startswith('{'):
                print("   [OK] /dashboard/stats works")
            else:
                print(f"   [ERROR] /dashboard/stats failed: {stats_output[:200]}")
        else:
            print(f"   [ERROR] Login failed: {login_output}")
    except json.JSONDecodeError:
        print(f"   [ERROR] Login response not JSON: {login_output[:200]}")
    
finally:
    ssh.close()

