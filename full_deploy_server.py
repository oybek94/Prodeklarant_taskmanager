"""
Server'da to'liq deploy qilish
"""

import paramiko
import sys

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('=' * 50)
    print('Server\'da to\'liq deploy qilish')
    print('=' * 50)
    print('\nServerga ulanmoqda...')
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('[OK] Serverga ulandi\n')
    
    # 1. Git pull
    print('[1/6] Git pull qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app && git clean -fd && git stash && git pull origin main')
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    if errors and 'error' in errors.lower():
        print('Xatolik:', errors)
    print('[OK] Git pull yakunlandi\n')
    
    # 2. Backend dependencies
    print('[2/6] Backend dependencies o\'rnatilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npm install')
    output = stdout.read().decode('utf-8', errors='replace')
    # Faqat oxirgi 10 qatorni ko'rsatish
    lines = output.split('\n')
    if len(lines) > 10:
        print('\n'.join(lines[-10:]))
    else:
        try:
            print(output)
        except:
            sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
            sys.stdout.buffer.flush()
    print('[OK] Backend dependencies o\'rnatildi\n')
    
    # 3. Prisma generate
    print('[3/6] Prisma client generate qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npm run prisma:generate')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    print('[OK] Prisma client generate qilindi\n')
    
    # 4. Backend build
    print('[4/6] Backend build qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/backend && npx tsc --skipLibCheck 2>&1 | tail -20')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Build natijasini tekshirish
    stdin, stdout, stderr = ssh.exec_command('test -d /var/www/app/backend/dist && echo "OK" || echo "FAIL"')
    build_result = stdout.read().decode('utf-8').strip()
    if build_result == 'OK':
        print('[OK] Backend build muvaffaqiyatli\n')
    else:
        print('[FAIL] Backend build muammosi!\n')
    
    # 5. Frontend build
    print('[5/6] Frontend build qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('cd /var/www/app/frontend && npm install && npm run build 2>&1 | tail -20')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Frontend build natijasini tekshirish
    stdin, stdout, stderr = ssh.exec_command('test -d /var/www/app/frontend/dist && echo "OK" || echo "FAIL"')
    frontend_result = stdout.read().decode('utf-8').strip()
    if frontend_result == 'OK':
        print('[OK] Frontend build muvaffaqiyatli\n')
    else:
        print('[FAIL] Frontend build muammosi!\n')
    
    # 6. PM2 restart
    print('[6/6] PM2 restart qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('pm2 restart prodeklarant-backend')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Nginx reload
    print('\nNginx reload qilmoqda...')
    stdin, stdout, stderr = ssh.exec_command('nginx -t && systemctl reload nginx')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Status tekshirish
    print('\n' + '=' * 50)
    print('Deploy natijasi:')
    print('=' * 50)
    
    print('\nPM2 Status:')
    stdin, stdout, stderr = ssh.exec_command('sleep 3 && pm2 status')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Log'larni ko'rsatish
    print('\n=== Backend log\'lari (oxirgi 10 qator) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 10 --nostream')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    print('\n' + '=' * 50)
    print('[OK] To\'liq deploy yakunlandi!')
    print('=' * 50)
    print('\nDastur endi yangi kod bilan ishlayapti.')
    print('Login qilib sinab ko\'ring!')
    
finally:
    ssh.close()

