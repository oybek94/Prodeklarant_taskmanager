#!/usr/bin/env python3
import paramiko
import time

SERVER = "138.249.7.15"
USER = "root"
PASSWORD = "a9794536"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASSWORD, timeout=30)

print("Waiting for backend to fully start...")
time.sleep(10)

# Check backend health
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3001/health')
backend_health = stdout.read().decode('utf-8', errors='ignore').strip()
print(f"Backend health: {backend_health}")

# Check PM2 status
stdin, stdout, stderr = ssh.exec_command('pm2 status')
pm2_status = stdout.read().decode('utf-8', errors='ignore')
print(f"\nPM2 Status:\n{pm2_status}")

# Check frontend
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost/')
frontend_code = stdout.read().decode('utf-8', errors='ignore').strip()
print(f"\nFrontend HTTP status: {frontend_code}")

# Check API endpoint
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health')
api_code = stdout.read().decode('utf-8', errors='ignore').strip()
print(f"API health endpoint HTTP status: {api_code}")

# Check database
stdin, stdout, stderr = ssh.exec_command('docker ps | grep prodeklarant-db')
db_status = stdout.read().decode('utf-8', errors='ignore').strip()
print(f"\nDatabase container: {db_status if db_status else 'Not running'}")

# Check Nginx
stdin, stdout, stderr = ssh.exec_command('systemctl is-active nginx')
nginx_status = stdout.read().decode('utf-8', errors='ignore').strip()
print(f"Nginx status: {nginx_status}")

ssh.close()

