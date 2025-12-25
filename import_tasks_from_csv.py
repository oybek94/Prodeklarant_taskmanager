"""
CSV fayldan task'larni va stage assignment'larni import qilish
Bu skript:
1. CSV'dan task ma'lumotlarini o'qiydi
2. Client, Branch, User'larni topadi yoki yaratadi
3. Task'larni topadi yoki yaratadi
4. Stage assignment'larni update qiladi
"""
import csv
import sys
from pathlib import Path
from datetime import datetime
import paramiko

# CSV fayl yo'li
csv_path = Path(r"c:\Users\11870\OneDrive\Desktop\Chiqim_turlari.csv")

# Stage nomlari mapping (CSV dagi nomlar -> Database dagi nomlar)
STAGE_MAPPING = {
    'Invoys': 'Invoys',
    'Zayavka': 'Zayavka',
    'TIR-SMR': 'TIR-SMR',
    'ST': 'ST',
    'FITO': 'Fito',
    'Deklaratsiya': 'Deklaratsiya',
    'Xujjat_tekshirish': 'Tekshirish',
    'Xujjat_topshirish': 'Topshirish',
    'Pochta': 'Pochta',
}

# Stage order mapping
STAGE_ORDER = {
    'Invoys': 1,
    'Zayavka': 2,
    'TIR-SMR': 3,
    'ST': 4,
    'Fito': 5,
    'Deklaratsiya': 6,
    'Tekshirish': 7,
    'Topshirish': 8,
    'Pochta': 9,
}

def parse_csv():
    """CSV faylni o'qib, task va stage ma'lumotlarini qaytaradi"""
    tasks = []
    
    # Encoding'ni tekshirish
    encodings = ['utf-8-sig', 'windows-1251', 'cp1251', 'utf-8', 'latin-1']
    encoding_used = None
    
    for enc in encodings:
        try:
            with open(csv_path, 'r', encoding=enc) as f:
                f.read(100)  # Test read
            encoding_used = enc
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    
    if not encoding_used:
        raise ValueError("CSV fayl encoding'ini aniqlab bo'lmadi")
    
    print(f"Fayl encoding: {encoding_used}")
    
    with open(csv_path, 'r', encoding=encoding_used) as f:
        reader = csv.DictReader(f, delimiter=';')
        
        for row in reader:
            task_id = row.get('Task ID', '').strip()
            if not task_id:
                continue
            
            # Task asosiy ma'lumotlari
            task_data = {
                'task_id': task_id,
                'client_name': row.get('Klient', '').strip(),
                'task_name': row.get('Task Name', '').strip(),
                'branch_name': row.get('Filial', '').strip(),
                'psr': row.get('PSR', '').strip(),
                'status': row.get('Status', '').strip(),
                'driver_phone': row.get('Shopir Tel raqami', '').strip(),
                'deal_amount': row.get('Kelishuv summasi', '').strip(),
                'expenses': row.get('Rasxodlar', '').strip(),
                'creation_date': row.get('Creation Date', '').strip(),
            }
            
            # Stage assignment'lar
            stage_assignments = []
            
            for csv_stage_name, db_stage_name in STAGE_MAPPING.items():
                stage_status = row.get(csv_stage_name, '').strip()
                worker_name = row.get(f'{csv_stage_name}_bajaruvchi', '').strip()
                
                if stage_status == 'Tayyor' and worker_name:
                    stage_assignments.append({
                        'stage_name': db_stage_name,
                        'worker_name': worker_name,
                        'status': 'TAYYOR',
                    })
            
            task_data['stage_assignments'] = stage_assignments
            tasks.append(task_data)
    
    return tasks

def generate_sql_script(tasks):
    """SQL script yaratadi"""
    sql_lines = []
    sql_lines.append("-- CSV fayldan task va stage assignment import qilish")
    sql_lines.append("-- Bu scriptni database'da bajarishdan oldin backup oling!")
    sql_lines.append("")
    sql_lines.append("BEGIN;")
    sql_lines.append("")
    
    # User name mapping (CSV dagi ismlar -> Database dagi user ID'larni topish uchun)
    sql_lines.append("-- Avval user'larni name bo'yicha topamiz")
    sql_lines.append("DO $$")
    sql_lines.append("DECLARE")
    sql_lines.append("    v_user_id INTEGER;")
    sql_lines.append("    v_task_id INTEGER;")
    sql_lines.append("    v_stage_id INTEGER;")
    sql_lines.append("    v_client_id INTEGER;")
    sql_lines.append("    v_branch_id INTEGER;")
    sql_lines.append("BEGIN")
    sql_lines.append("")
    
    processed_tasks = 0
    
    for task in tasks:
        # Client va Branch'ni topish/yaratish
        sql_lines.append(f"    -- Task: {task['task_name'][:50]} (ID: {task['task_id']})")
        sql_lines.append(f"    -- Client: {task['client_name']}, Branch: {task['branch_name']}")
        sql_lines.append("")
        
        # Branch'ni topish
        sql_lines.append(f"    SELECT id INTO v_branch_id FROM \"Branch\" WHERE name = '{task['branch_name']}';")
        sql_lines.append("    IF v_branch_id IS NULL THEN")
        sql_lines.append(f"        INSERT INTO \"Branch\" (name) VALUES ('{task['branch_name']}') RETURNING id INTO v_branch_id;")
        sql_lines.append("    END IF;")
        sql_lines.append("")
        
        # Client'ni topish/yaratish
        sql_lines.append(f"    SELECT id INTO v_client_id FROM \"Client\" WHERE name = '{task['client_name']}';")
        sql_lines.append("    IF v_client_id IS NULL THEN")
        sql_lines.append(f"        INSERT INTO \"Client\" (name, phone, \"dealAmount\") VALUES ('{task['client_name']}', '{task['driver_phone']}', {task['deal_amount'] or 'NULL'}) RETURNING id INTO v_client_id;")
        sql_lines.append("    END IF;")
        sql_lines.append("")
        
        # Task'ni topish (title va clientId bo'yicha)
        # Agar topilmasa, yaratish kerak (lekin bu murakkab, shuning uchun faqat topilgan task'larni update qilamiz)
        task_name_escaped = task['task_name'].replace("'", "''")
        sql_lines.append(f"    SELECT id INTO v_task_id FROM \"Task\" WHERE title = '{task_name_escaped}' AND \"clientId\" = v_client_id LIMIT 1;")
        sql_lines.append("")
        
        # Agar task topilsa, stage assignment'larni update qilish
        sql_lines.append("    IF v_task_id IS NOT NULL THEN")
        
        for stage in task['stage_assignments']:
            worker_name = stage['worker_name'].replace("'", "''")
            stage_name = stage['stage_name'].replace("'", "''")
            
            sql_lines.append(f"        -- Stage: {stage_name}, Worker: {worker_name}")
            sql_lines.append(f"        SELECT id INTO v_user_id FROM \"User\" WHERE name = '{worker_name}' LIMIT 1;")
            sql_lines.append("        IF v_user_id IS NOT NULL THEN")
            sql_lines.append(f"            SELECT id INTO v_stage_id FROM \"TaskStage\" WHERE \"taskId\" = v_task_id AND name = '{stage_name}';")
            sql_lines.append("            IF v_stage_id IS NOT NULL THEN")
            sql_lines.append(f"                UPDATE \"TaskStage\" SET status = 'TAYYOR', \"assignedToId\" = v_user_id, \"completedAt\" = NOW() WHERE id = v_stage_id;")
            sql_lines.append("            END IF;")
            sql_lines.append("        END IF;")
            sql_lines.append("")
        
        sql_lines.append("    END IF;")
        sql_lines.append("")
        
        processed_tasks += 1
        if processed_tasks % 10 == 0:
            sql_lines.append(f"    -- Processed {processed_tasks} tasks")
            sql_lines.append("")
    
    sql_lines.append("END $$;")
    sql_lines.append("")
    sql_lines.append("COMMIT;")
    
    return "\n".join(sql_lines)

def main():
    try:
        print("CSV faylni o'qish...")
        tasks = parse_csv()
        print(f"Jami {len(tasks)} ta task topildi")
        
        print("\nSQL script yaratilmoqda...")
        sql_script = generate_sql_script(tasks)
        
        output_file = Path("import_tasks.sql")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_script)
        
        print(f"\nSQL script yaratildi: {output_file}")
        print(f"Jami {len(tasks)} ta task uchun SQL script tayyor")
        print("\nEslatma: Bu scriptni database'da bajarishdan oldin backup oling!")
        
    except Exception as e:
        print(f"Xatolik: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

