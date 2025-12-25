# Import Scripts

## import-tasks-from-csv.ts

CSV fayldan task'larni va stage assignment'larni import qilish.

### Foydalanish:

1. CSV faylni quyidagi yo'lda qo'ying:
   - Windows: `c:/Users/11870/OneDrive/Desktop/Chiqim_turlari.csv`
   - Yoki skript ichidagi `csvPath` o'zgaruvchisini o'zgartiring

2. Skriptni ishga tushiring:
   ```bash
   cd backend
   npx ts-node --transpile-only scripts/import-tasks-from-csv.ts
   ```

### Nima qiladi:

1. CSV faylni o'qiydi
2. Har bir task uchun:
   - Client'ni topadi yoki yaratadi
   - Branch'ni topadi yoki yaratadi
   - Task'ni topadi (title va clientId bo'yicha) yoki yaratadi
   - Har bir "Tayyor" stage uchun:
     - Worker'ni topadi (name bo'yicha)
     - TaskStage'ni update qiladi (status = TAYYOR, assignedToId, completedAt)

### Eslatma:

- Task topilmasa, yangi task yaratiladi (admin user kerak)
- Worker topilmasa, stage assignment o'tkazib yuboriladi
- Stage topilmasa, stage assignment o'tkazib yuboriladi

