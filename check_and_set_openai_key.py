"""
Server'da OpenAI API key'ni tekshirish va o'rnatish
"""

import paramiko
import sys

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print('Serverga ulanmoqda...')
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('[OK] Serverga ulandi\n')
    
    # .env faylini o'qish
    print('Backend .env faylini tekshirish...')
    stdin, stdout, stderr = ssh.exec_command('cat /var/www/app/backend/.env')
    env_content = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    print('Hozirgi .env mazmuni:')
    print('=' * 50)
    print(env_content)
    print('=' * 50)
    
    # OPENAI_API_KEY tekshirish
    if 'OPENAI_API_KEY' in env_content:
        lines = env_content.split('\n')
        for line in lines:
            if 'OPENAI_API_KEY' in line:
                key_value = line.split('=')[1].strip() if '=' in line else ''
                if key_value and key_value != '':
                    print(f'\n[OK] OPENAI_API_KEY mavjud: {key_value[:10]}...')
                else:
                    print('\n[FAIL] OPENAI_API_KEY bo\'sh!')
                    print('\nIltimos, OpenAI API key\'ni kiriting:')
                    api_key = input('API Key: ').strip()
                    if api_key:
                        # .env faylini yangilash
                        print('\n.env faylini yangilash...')
                        new_env = env_content.replace('OPENAI_API_KEY=', f'OPENAI_API_KEY={api_key}')
                        stdin, stdout, stderr = ssh.exec_command(f'cat > /var/www/app/backend/.env << \'EOF\'\n{new_env}\nEOF')
                        stdout.read()
                        print('[OK] .env fayli yangilandi')
                    else:
                        print('[FAIL] API key kiritilmadi')
    else:
        print('\n[FAIL] OPENAI_API_KEY .env faylida yo\'q!')
        print('\nIltimos, OpenAI API key\'ni kiriting:')
        api_key = input('API Key: ').strip()
        if api_key:
            # .env fayliga qo'shish
            print('\n.env fayliga qo\'shish...')
            new_line = f'\nOPENAI_API_KEY={api_key}\n'
            stdin, stdout, stderr = ssh.exec_command(f'echo "{new_line}" >> /var/www/app/backend/.env')
            stdout.read()
            print('[OK] OPENAI_API_KEY .env fayliga qo\'shildi')
        else:
            print('[FAIL] API key kiritilmadi')
    
    # PM2 restart (environment variables yangilanishi uchun)
    print('\nPM2 restart qilmoqda (environment variables yangilanishi uchun)...')
    stdin, stdout, stderr = ssh.exec_command('pm2 restart prodeklarant-backend --update-env')
    output = stdout.read().decode('utf-8', errors='replace')
    try:
        print(output)
    except:
        sys.stdout.buffer.write(output.encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    
    print('\n[OK] Backend restart qilindi!')
    print('\nEndi ST PDF yuklashni sinab ko\'ring!')
    
finally:
    ssh.close()

