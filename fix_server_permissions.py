"""
Server'da database permissions'ni tuzatish
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
    
    # Database container nomini topish
    print('Database container\'ni topmoqda...')
    stdin, stdout, stderr = ssh.exec_command('docker ps --format "{{.Names}}" | grep -i db')
    containers = stdout.read().decode('utf-8').strip().split('\n')
    db_container = containers[0] if containers else 'prodeklarant-db'
    print(f'[OK] Database container: {db_container}\n')
    
    # Database user'ni tekshirish
    print('Database user\'ni tekshirish...')
    stdin, stdout, stderr = ssh.exec_command(f'docker exec {db_container} psql -U app -d prodeklarant -c "SELECT current_user;"')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Permissions'ni berish
    print('\nDatabase permissions\'ni berish...')
    
    # SQL scriptni yaratish
    sql_commands = """
    -- User jadvaliga barcha huquqlarni berish
    GRANT ALL PRIVILEGES ON TABLE "User" TO app;
    GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;
    
    -- Schema'ga huquq berish
    GRANT USAGE ON SCHEMA public TO app;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;
    
    -- Kelajakdagi jadvallarga ham huquq berish
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;
    
    -- Boshqa muhim jadvallarga ham huquq berish
    GRANT ALL PRIVILEGES ON TABLE "Task" TO app;
    GRANT ALL PRIVILEGES ON TABLE "TaskStage" TO app;
    GRANT ALL PRIVILEGES ON TABLE "TaskDocument" TO app;
    GRANT ALL PRIVILEGES ON TABLE "Client" TO app;
    GRANT ALL PRIVILEGES ON TABLE "Branch" TO app;
    GRANT ALL PRIVILEGES ON TABLE "Worker" TO app;
    GRANT ALL PRIVILEGES ON TABLE "Invoice" TO app;
    GRANT ALL PRIVILEGES ON TABLE "Contract" TO app;
    
    -- Tekshirish
    SELECT table_name, privilege_type 
    FROM information_schema.table_privileges 
    WHERE table_name = 'User' 
    AND grantee = 'app';
    """
    
    # SQL'ni faylga yozish
    stdin, stdout, stderr = ssh.exec_command('cat > /tmp/fix_permissions.sql << \'EOF\'\n' + sql_commands + '\nEOF')
    stdout.read()  # Wait for command to complete
    
    # SQL'ni bajarish
    print('SQL scriptni bajarish...')
    stdin, stdout, stderr = ssh.exec_command(f'docker exec -i {db_container} psql -U app -d prodeklarant < /tmp/fix_permissions.sql')
    
    # Output'ni ko'rsatish
    output = stdout.read().decode('utf-8', errors='replace')
    errors = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        print(output)
    if errors and 'ERROR' not in errors.upper():
        print(errors)
    
    # Agar app user mavjud bo'lmasa, postgres user orqali bajarish
    if 'ERROR' in output.upper() or 'permission denied' in output.lower():
        print('\napp user bilan muammo, postgres user orqali bajarish...')
        stdin, stdout, stderr = ssh.exec_command(f'docker exec -i {db_container} psql -U postgres -d prodeklarant < /tmp/fix_permissions.sql')
        output = stdout.read().decode('utf-8', errors='replace')
        errors = stderr.read().decode('utf-8', errors='replace')
        if output:
            print(output)
        if errors:
            print(errors)
    
    # Temp faylni o'chirish
    ssh.exec_command('rm -f /tmp/fix_permissions.sql')
    
    # Permissions'ni tekshirish
    print('\n=== Permissions tekshiruvi ===')
    stdin, stdout, stderr = ssh.exec_command(f'docker exec {db_container} psql -U app -d prodeklarant -c "SELECT table_name, privilege_type FROM information_schema.table_privileges WHERE table_name = \'User\' AND grantee = \'app\';"')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    # Test query
    print('\n=== Test query (User jadvalini o\'qish) ===')
    stdin, stdout, stderr = ssh.exec_command(f'docker exec {db_container} psql -U app -d prodeklarant -c "SELECT COUNT(*) FROM \\"User\\";"')
    output = stdout.read().decode('utf-8', errors='replace')
    print(output)
    
    if 'ERROR' not in output.upper():
        print('\n[OK] Database permissions muvaffaqiyatli tuzatildi!')
        print('\nKeyingi qadam: Backend server\'ni qayta ishga tushiring')
    else:
        print('\n[FAIL] Permissions tuzatishda muammo bo\'ldi')
        print('Iltimos, qo\'lda tekshiring')
    
finally:
    ssh.close()

