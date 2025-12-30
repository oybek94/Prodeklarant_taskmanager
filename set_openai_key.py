"""
Server'da OpenAI API key'ni o'rnatish
"""

import paramiko
import sys

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

# API key'ni argument sifatida olish yoki environment variable'dan
import os
api_key = os.environ.get('OPENAI_API_KEY', '')

if not api_key:
    print('=' * 60)
    print('OpenAI API Key o\'rnatish')
    print('=' * 60)
    print('\nIltimos, OpenAI API key\'ni kiriting.')
    print('API key\'ni olish uchun: https://platform.openai.com/account/api-keys')
    print('\nAgar key\'ni keyinroq o\'rnatmoqchi bo\'lsangiz, scriptni bekor qiling (Ctrl+C)')
    print('va key\'ni o\'z-o\'zidan o\'rnatish uchun quyidagi buyruqni ishlating:')
    print('\n  ssh root@138.249.7.15')
    print('  echo "OPENAI_API_KEY=your_key_here" >> /var/www/app/backend/.env')
    print('  pm2 restart prodeklarant-backend --update-env')
    print('\nYoki key\'ni shu yerga kiriting:')
    api_key = input('\nAPI Key: ').strip()

if not api_key:
    print('\n[FAIL] API key kiritilmadi. Script bekor qilindi.')
    sys.exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('\nServerga ulanmoqda...')
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('[OK] Serverga ulandi\n')
    
    # .env faylini o'qish
    print('.env faylini o\'qish...')
    stdin, stdout, stderr = ssh.exec_command('cat /var/www/app/backend/.env')
    env_content = stdout.read().decode('utf-8', errors='replace')
    
    # OPENAI_API_KEY'ni yangilash yoki qo'shish
    if 'OPENAI_API_KEY=' in env_content:
        # Mavjud key'ni yangilash
        lines = env_content.split('\n')
        new_lines = []
        for line in lines:
            if line.startswith('OPENAI_API_KEY='):
                new_lines.append(f'OPENAI_API_KEY={api_key}')
            else:
                new_lines.append(line)
        new_env = '\n'.join(new_lines)
    else:
        # Yangi key qo'shish
        new_env = env_content.rstrip() + f'\nOPENAI_API_KEY={api_key}\n'
    
    # .env faylini yangilash
    print('.env faylini yangilash...')
    stdin, stdout, stderr = ssh.exec_command(f'cat > /var/www/app/backend/.env << \'EOF\'\n{new_env}\nEOF')
    stdout.read()
    print('[OK] .env fayli yangilandi\n')
    
    # Tekshirish
    print('Tekshirish...')
    stdin, stdout, stderr = ssh.exec_command('grep OPENAI_API_KEY /var/www/app/backend/.env')
    output = stdout.read().decode('utf-8', errors='replace')
    print(f'OPENAI_API_KEY: {output.strip()[:20]}...' if output.strip() else 'Key topilmadi')
    
    # PM2 restart (environment variables yangilanishi uchun)
    print('\nPM2 restart qilmoqda (environment variables yangilanishi uchun)...')
    stdin, stdout, stderr = ssh.exec_command('pm2 restart prodeklarant-backend --update-env')
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
    
finally:
    ssh.close()

