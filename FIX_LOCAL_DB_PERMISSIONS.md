# Local Database Permissions Tuzatish

## Muammo
Localhost'da login qilishda quyidagi xatolik chiqmoqda:
```
Invalid `prisma.user.findMany()` invocation
Error: нет доступа к таблице User
```

## Yechim

### 1-usul: Docker container orqali (Agar Docker Desktop ishlayotgan bo'lsa)

1. Docker Desktop'ni ishga tushiring
2. Terminal'da quyidagi buyruqlarni bajaring:

```powershell
# Container'ni ishga tushirish
docker-compose up -d db

# Container'ga ulanish va permissions berish
docker exec -it prodeklarant-db psql -U app -d prodeklarant

# PostgreSQL'da quyidagi buyruqlarni bajaring:
GRANT ALL PRIVILEGES ON TABLE "User" TO app;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;
GRANT USAGE ON SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;

# Chiqish
\q
```

### 2-usul: pgAdmin orqali (Tavsiya etiladi)

1. pgAdmin'ni oching (http://localhost:5050)
   - Email: admin@local.test
   - Password: admin

2. `prodeklarant` database'ni tanlang

3. **Tools → Query Tool** ni oching

4. Quyidagi SQL'ni kiriting va **Execute** tugmasini bosing:

```sql
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
```

### 3-usul: PostgreSQL to'g'ridan-to'g'ri o'rnatilgan bo'lsa

1. PostgreSQL'ga ulaning:
```powershell
# PostgreSQL bin papkasini topish
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
# Yoki 15, 14, 13 versiyalarini sinab ko'ring

# Ulanish
& $psqlPath -U postgres -d prodeklarant
```

2. Quyidagi SQL buyruqlarini bajaring (yuqoridagi SQL'ni ishlating)

### 4-usul: Qo'lda .env faylini tekshirish

Agar database boshqa user bilan ishlayotgan bo'lsa:

1. `backend/.env` faylini oching
2. `DATABASE_URL` ni tekshiring
3. Agar `postgres` user bilan ishlayotgan bo'lsa, quyidagilarni bajaring:

```sql
-- postgres user bilan ulaning
psql -U postgres -d prodeklarant

-- app user'ga huquq bering
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;
```

## Tekshirish

Permissions o'rnatilganini tekshirish:

```sql
SELECT table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'User' 
AND grantee = 'app';
```

Agar natija ko'rsatilsa, permissions o'rnatilgan.

## Keyingi qadam

Permissions o'rnatilgandan keyin:
1. Backend server'ni qayta ishga tushiring (agar ishlayotgan bo'lsa)
2. Login qilib sinab ko'ring

