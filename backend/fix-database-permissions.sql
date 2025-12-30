-- Database permissions'ni tuzatish
-- Bu script User jadvaliga kirish huquqini beradi

-- Avval database'ga ulanish kerak
-- psql -U postgres -d prodeklarant -f fix-database-permissions.sql

-- Database'ni o'zgartirish
\c prodeklarant

-- Joriy foydalanuvchini ko'rish
SELECT current_user;

-- User jadvaliga barcha huquqlarni berish
GRANT ALL PRIVILEGES ON TABLE "User" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;

-- Agar schema mavjud bo'lsa, schema'ga ham huquq berish
GRANT USAGE ON SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO current_user;

-- Kelajakdagi jadvallarga ham huquq berish
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO current_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO current_user;

-- Boshqa muhim jadvallarga ham huquq berish
GRANT ALL PRIVILEGES ON TABLE "Task" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "TaskStage" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "TaskDocument" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Client" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Branch" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Worker" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Invoice" TO current_user;
GRANT ALL PRIVILEGES ON TABLE "Contract" TO current_user;

-- Tekshirish
SELECT 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'User' 
AND grantee = current_user;

