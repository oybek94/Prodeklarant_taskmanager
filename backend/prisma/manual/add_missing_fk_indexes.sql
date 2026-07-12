-- Yetishmayotgan foreign-key indekslari (Prodeklarant)
-- Xavfsiz qo'llash: CONCURRENTLY = jadvalni bloklamaydi, IF NOT EXISTS = idempotent.
--
-- MUHIM:
--   * Har bir buyruq ALOHIDA (transaction ichida EMAS) ishlashi shart —
--     CONCURRENTLY tranzaksiyada ishlamaydi. psql'da default autocommit — mos.
--   * Bu skript prisma migrate'dan MUSTAQIL. Qo'llanmagan 2 migratsiyaga tegmaydi.
--   * Nomlar Prisma konvensiyasiga mos ({Table}_{col}_idx) — keyin migrate bilan mos keladi.
--
-- Ishga tushirish (SSH tunnel ochiq, DB 127.0.0.1:55432 da):
--   psql "postgresql://app:PAROL@127.0.0.1:55432/prodeklarant" -f prisma/manual/add_missing_fk_indexes.sql
--   (yoki har bir qatorni alohida)

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_taskId_idx"        ON "Transaction" ("taskId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_branchId_idx"          ON "Invoice" ("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_userId_idx"           ON "AuditLog" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CertifierFeeConfig_branchId_idx" ON "CertifierFeeConfig" ("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SellerBonus_leadId_idx"        ON "SellerBonus" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DashboardNote_createdById_idx" ON "DashboardNote" ("createdById");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DashboardNote_assignedToId_idx" ON "DashboardNote" ("assignedToId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DashboardNote_completedById_idx" ON "DashboardNote" ("completedById");

-- Tekshirish (indekslar VALID ekanini ko'rish):
--   SELECT indexrelid::regclass AS index, indisvalid
--   FROM pg_index WHERE NOT indisvalid;   -- bo'sh chiqishi kerak
