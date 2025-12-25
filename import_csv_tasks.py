"""
CSV fayldan task'larni va stage assignment'larni import qilish
"""
import csv
import sys
from pathlib import Path

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

def print_summary(tasks):
    """Import qilinadigan ma'lumotlarni ko'rsatadi"""
    print(f"Jami task'lar: {len(tasks)}")
    print("\nBirinchi 5 ta task:")
    for i, task in enumerate(tasks[:5], 1):
        print(f"\n{i}. Task ID: {task['task_id']}")
        print(f"   Client: {task['client_name']}")
        print(f"   Task Name: {task['task_name']}")
        print(f"   Branch: {task['branch_name']}")
        print(f"   Stage assignments: {len(task['stage_assignments'])}")
        for stage in task['stage_assignments']:
            print(f"     - {stage['stage_name']}: {stage['worker_name']} ({stage['status']})")

if __name__ == '__main__':
    try:
        tasks = parse_csv()
        print_summary(tasks)
        
        # SQL script yaratish
        print("\n\nSQL script yaratilmoqda...")
        # Bu keyingi qadamda yaratiladi
    except Exception as e:
        print(f"Xatolik: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()

