-- Database'dagi rollarni tekshirish
SELECT DISTINCT role FROM "User";

-- Enum'dagi barcha qiymatlarni ko'rish
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
ORDER BY enumsortorder;

