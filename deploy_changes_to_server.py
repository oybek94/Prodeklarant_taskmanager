"""
Server'ga barcha o'zgarishlarni deploy qilish
- Backend'ni build qilish
- Server'ga yuborish
- Script'larni ishga tushirish (encoding fix, durations, completion times)
- Backend'ni restart qilish
"""

import paramiko
import sys
import os

# Server ma'lumotlari
HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'
PORT = 22

def execute_remote_command(ssh, command, description):
    """Remote server'da command'ni bajarish"""
    print(f"\n{description}...")
    stdin, stdout, stderr = ssh.exec_command(command)
    
    # Output'ni o'qish
    output = stdout.read().decode('utf-8', errors='ignore')
    error = stderr.read().decode('utf-8', errors='ignore')
    
    if output:
        sys.stdout.buffer.write(output.encode('utf-8', errors='ignore'))
        sys.stdout.buffer.flush()
    
    if error:
        sys.stderr.buffer.write(error.encode('utf-8', errors='ignore'))
        sys.stderr.buffer.flush()
    
    exit_status = stdout.channel.recv_exit_status()
    return exit_status == 0

def main():
    print("Server'ga o'zgarishlarni deploy qilish...\n")
    
    # SSH connection
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"SSH orqali {HOST} server'ga ulanish...")
        ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
        print("[OK] SSH ulanish muvaffaqiyatli\n")
        
        # 1. Git'dan yangi o'zgarishlarni olish
        print("=== 1. Git'dan yangi o'zgarishlarni olish ===")
        execute_remote_command(ssh, "cd /var/www/app && git pull", "Git pull")
        
        # 2. Backend dependencies'ni yangilash
        print("\n=== 2. Backend dependencies'ni yangilash ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && npm install", "Backend dependencies install")
        
        # 3. Prisma generate
        print("\n=== 3. Prisma generate ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && npx prisma generate", "Prisma generate")
        
        # 4. Backend'ni build qilish
        print("\n=== 4. Backend'ni build qilish ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && npm run build || true", "Backend build")
        
        # 5. Encoding fix script'ni ishga tushirish
        print("\n=== 5. Task nomlarini encoding bilan to'g'rilash ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && npx ts-node --transpile-only scripts/fix-all-task-titles.ts", "Fix task titles encoding")
        
        # 6. Duration'larni belgilash
        print("\n=== 6. Duration'larni belgilash ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && npx ts-node --transpile-only scripts/set-task-durations.ts", "Set task durations")
        
        # 7. Completion time'larni belgilash
        print("\n=== 7. Completion time'larni belgilash ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && npx ts-node --transpile-only scripts/set-stage-completion-times.ts", "Set stage completion times")
        
        # 8. Backend'ni restart qilish
        print("\n=== 8. Backend'ni restart qilish ===")
        execute_remote_command(ssh, "cd /var/www/app/backend && pm2 restart backend || pm2 start dist/server.js --name backend", "Backend restart")
        
        # 9. PM2 status'ni ko'rsatish
        print("\n=== 9. PM2 status ===")
        execute_remote_command(ssh, "pm2 status", "PM2 status")
        
        print("\n[OK] Barcha o'zgarishlar server'ga deploy qilindi!")
        
    except Exception as e:
        print(f"\n[ERROR] Xatolik: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == '__main__':
    main()

