"""
Server'da OpenAI API key'ni o'rnatish
"""

import paramiko
import sys

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

# API key - Iltimos, o'z API key'ingizni kiriting
# API key'ni olish uchun: https://platform.openai.com/account/api-keys
API_KEY = 'YOUR_OPENAI_API_KEY_HERE'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('Serverga ulanmoqda...')
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('[OK] Serverga ulandi\n')
    
    # .env faylini o'qish
    print('.env faylini o\'qish...')
    stdin, stdout, stderr = ssh.exec_command('cat /var/www/app/backend/.env')
    env_content = stdout.read().decode('utf-8', errors='replace')
    
    # OPENAI_API_KEY'ni yangilash yoki qo'shish
    if 'OPENAI_API_KEY=' in env_content:
        # Mavjud key'ni yangilash
        print('Mavjud OPENAI_API_KEY yangilanmoqda...')
        lines = env_content.split('\n')
        new_lines = []
        updated = False
        for line in lines:
            if line.startswith('OPENAI_API_KEY='):
                new_lines.append(f'OPENAI_API_KEY={API_KEY}')
                updated = True
            else:
                new_lines.append(line)
        if not updated:
            new_lines.append(f'OPENAI_API_KEY={API_KEY}')
        new_env = '\n'.join(new_lines)
    else:
        # Yangi key qo'shish
        print('Yangi OPENAI_API_KEY qo\'shilmoqda...')
        new_env = env_content.rstrip() + f'\nOPENAI_API_KEY={API_KEY}\n'
    
    # .env faylini yangilash
    print('.env faylini yangilash...')
    stdin, stdout, stderr = ssh.exec_command(f'cat > /var/www/app/backend/.env << \'EOF\'\n{new_env}\nEOF')
    stdout.read()
    print('[OK] .env fayli yangilandi\n')
    
    # Tekshirish
    print('Tekshirish...')
    stdin, stdout, stderr = ssh.exec_command('grep OPENAI_API_KEY /var/www/app/backend/.env')
    output = stdout.read().decode('utf-8', errors='replace')
    if output.strip():
        key_preview = output.strip().split('=')[1][:20] + '...' if '=' in output.strip() else 'topildi'
        print(f'[OK] OPENAI_API_KEY: {key_preview}\n')
    else:
        print('[FAIL] Key topilmadi!\n')
    
    # PM2 restart (environment variables yangilanishi uchun)
    print('PM2 restart qilmoqda (environment variables yangilanishi uchun)...')
    stdin, stdout, stderr = ssh.exec_command('pm2 restart prodeklarant-backend --update-env')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Status tekshirish
    print('\nPM2 status:')
    stdin, stdout, stderr = ssh.exec_command('sleep 3 && pm2 status')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    # Log'larni ko'rsatish
    print('\n=== Backend log\'lari (oxirgi 5 qator) ===')
    stdin, stdout, stderr = ssh.exec_command('pm2 logs prodeklarant-backend --lines 5 --nostream')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    print('\n' + '=' * 60)
    print('[OK] OpenAI API Key muvaffaqiyatli o\'rnatildi!')
    print('=' * 60)
    print('\nEndi ST PDF yuklashni sinab ko\'ring!')
    print('AI structuring endi ishlashi kerak.')
    
finally:
    ssh.close()

