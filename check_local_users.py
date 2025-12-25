"""
Local database'dagi user'larni tekshirish
"""
import os
import sys

# Prisma client import qilish
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from prisma import Prisma
    
    prisma = Prisma()
    
    async def main():
        await prisma.connect()
        
        users = await prisma.user.find_many()
        
        print(f"Local database'dagi user'lar ({len(users)} ta):")
        for user in users:
            print(f"  - {user.name} (ID: {user.id}, Role: {user.role})")
        
        await prisma.disconnect()
    
    import asyncio
    asyncio.run(main())
    
except ImportError:
    print("Prisma client topilmadi. Database'ga to'g'ridan-to'g'ri SQL query yuboramiz...")
    import subprocess
    
    # .env fayldan DATABASE_URL o'qish
    env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    database_url = None
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
    
    if database_url:
        # PostgreSQL connection string'ni parse qilish
        # Format: postgresql://user:password@host:port/database
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', database_url)
        if match:
            user, password, host, port, database = match.groups()
            print(f"Database: {database} @ {host}:{port}")
            print(f"User: {user}")
            
            # psql orqali query yuborish
            cmd = f'psql -h {host} -p {port} -U {user} -d {database} -c "SELECT id, name, email, role::text FROM \\"User\\" ORDER BY name;"'
            print(f"\nQuyidagi komandani bajarish kerak:")
            print(cmd)
            print(f"\nYoki PGPASSWORD={password} {cmd}")
        else:
            print("Database URL format'ini tushunib bo'lmadi")
    else:
        print("DATABASE_URL topilmadi")

