"""
Frontend'ni to'liq deploy qilish
"""

import paramiko
import sys
import os

HOST = '138.249.7.15'
USER = 'root'
PASSWORD = 'a9794536'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
sftp = None

try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()
    
    # Local dist papkasini yuborish
    print('Frontend dist papkasini server\'ga yuborish...')
    
    # Avval server'dagi eski dist'ni o'chirish
    ssh.exec_command('rm -rf /var/www/app/frontend/dist/*')
    
    # Local dist papkasidagi barcha fayllarni yuborish
    dist_path = 'frontend/dist'
    
    def upload_directory(local_dir, remote_dir):
        """Rekursiv ravishda papka yuborish"""
        if not os.path.exists(local_dir):
            print(f'[ERROR] Local papka topilmadi: {local_dir}')
            return
        
        for item in os.listdir(local_dir):
            local_path = os.path.join(local_dir, item)
            remote_path = f"{remote_dir}/{item}"
            
            if os.path.isfile(local_path):
                try:
                    sftp.put(local_path, remote_path)
                    print(f'  [OK] {item}')
                except Exception as e:
                    print(f'  [ERROR] {item}: {e}')
            elif os.path.isdir(local_path):
                try:
                    sftp.mkdir(remote_path)
                except:
                    pass
                upload_directory(local_path, remote_path)
    
    # Remote dist papkasini yaratish
    try:
        sftp.mkdir('/var/www/app/frontend/dist')
    except:
        pass
    
    upload_directory(dist_path, '/var/www/app/frontend/dist')
    
    # Permissions
    ssh.exec_command('chown -R root:root /var/www/app/frontend/dist')
    ssh.exec_command('chmod -R 755 /var/www/app/frontend/dist')
    
    print('\n[OK] Frontend deploy qilindi!')
    
    # Nginx reload
    print('Nginx reload...')
    ssh.exec_command('systemctl reload nginx')
    
finally:
    if sftp:
        sftp.close()
    ssh.close()

