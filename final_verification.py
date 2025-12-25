#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SERVER = "138.249.7.15"
USER = "root"
PASSWORD = "a9794536"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASSWORD, timeout=30)

print("=" * 60)
print("FINAL DEPLOYMENT VERIFICATION")
print("=" * 60)

# 1. Backend health (direct)
stdin, stdout, stderr = ssh.exec_command('curl -s -H "Origin: http://138.249.7.15" http://localhost:3001/health')
backend_health = stdout.read().decode('utf-8', errors='replace').strip()
print(f"\n1. Backend Health (direct): {backend_health}")

# 2. PM2 Status
stdin, stdout, stderr = ssh.exec_command('pm2 list')
pm2_status = stdout.read().decode('utf-8', errors='replace')
print(f"\n2. PM2 Status:\n{pm2_status}")

# 3. Frontend accessible
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost/')
frontend_code = stdout.read().decode('utf-8', errors='replace').strip()
print(f"\n3. Frontend HTTP Status: {frontend_code}")

# 4. Database container
stdin, stdout, stderr = ssh.exec_command('docker ps | grep prodeklarant-db')
db_status = stdout.read().decode('utf-8', errors='replace').strip()
print(f"\n4. Database Container: {'Running' if db_status else 'Not running'}")

# 5. Nginx status
stdin, stdout, stderr = ssh.exec_command('systemctl is-active nginx')
nginx_status = stdout.read().decode('utf-8', errors='replace').strip()
print(f"\n5. Nginx Status: {nginx_status}")

# 6. Services enabled on boot
stdin, stdout, stderr = ssh.exec_command('systemctl is-enabled nginx docker 2>&1')
services_enabled = stdout.read().decode('utf-8', errors='replace').strip()
print(f"\n6. Services Enabled on Boot:\n{services_enabled}")

# 7. Test external access
print(f"\n7. External Access Test:")
print(f"   Frontend: http://138.249.7.15 (should return 200)")
print(f"   API: http://138.249.7.15/api (proxied to backend)")

print("\n" + "=" * 60)
print("DEPLOYMENT SUMMARY")
print("=" * 60)
print("Application URL: http://138.249.7.15")
print("API Base URL: http://138.249.7.15/api")
print("\nService Management:")
print("  Backend: pm2 restart prodeklarant-backend")
print("  Nginx: systemctl restart nginx")
print("  Database: docker compose restart db")
print("\nLogs:")
print("  Backend: pm2 logs prodeklarant-backend")
print("  Nginx: tail -f /var/log/nginx/error.log")
print("  Database: docker compose logs db")

ssh.close()

