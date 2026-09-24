import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { BackupService } from '../services/backup.service';

// Qo'lda tiklash: /api/system/restore bilan AYNAN bir xil mantiq (bitta tranzaksiya,
// SET LOCAL, validatsiya, sequence'lar) — xato bo'lsa baza o'zgarmaydi.
async function restoreDatabase(jsonFilePath: string) {
  try {
    console.log(`[RESTORE] Zaxira fayli o'qilmoqda: ${jsonFilePath}`);
    const backupData: unknown = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    const inserted = await BackupService.restoreAllData(backupData);
    for (const [model, count] of Object.entries(inserted)) {
      if (count > 0) console.log(`[RESTORE] ${model}: ${count} ta qator`);
    }
    console.log("[RESTORE] Barcha ma'lumotlar muvaffaqiyatli tiklandi! ✅");
  } catch (error) {
    console.error("[RESTORE] Tiklashda xatolik — tranzaksiya bekor qilindi, baza o'zgarmadi:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Skriptni ishga tushirish uchun: npx tsx src/scripts/restore-backup.ts path/to/database.json
const filePath = process.argv[2];
if (!filePath) {
  console.error("Iltimos, JSON fayl yo'lini kiriting. Masalan: npx tsx src/scripts/restore-backup.ts ./database.json");
  process.exit(1);
}

restoreDatabase(path.resolve(filePath));
