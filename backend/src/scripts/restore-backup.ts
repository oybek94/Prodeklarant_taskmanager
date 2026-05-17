import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreDatabase(jsonFilePath: string) {
  try {
    console.log(`[RESTORE] Zaxira fayli o'qilmoqda: ${jsonFilePath}`);
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const backupData = JSON.parse(fileContent);

    console.log('[RESTORE] Baza tozalash va ma\\'lumotlarni kiritish boshlandi...');

    // 1. Foreign key (tashqi kalit) tekshiruvlarini vaqtinchalik o'chiramiz
    // Bu qadam ma'lumotlarni ketma-ketligidan qat'iy nazar yozishga ruxsat beradi
    await prisma.$executeRawUnsafe(\`SET session_replication_role = 'replica';\`);

    const models = Prisma.dmmf.datamodel.models;

    // 2. Barcha jadvallarni tozalaymiz (eski ma'lumotlar o'chadi)
    for (const model of models) {
      const modelName = model.name;
      console.log(\`[RESTORE] Tozalanmoqda: \${modelName}...\`);
      await prisma.$executeRawUnsafe(\`TRUNCATE TABLE "\${modelName}" CASCADE;\`);
    }

    // 3. Zaxiradagi ma'lumotlarni yozamiz
    for (const model of models) {
      const modelName = model.name;
      const prismaModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      
      const records = backupData[modelName];
      
      if (records && records.length > 0) {
        console.log(\`[RESTORE] Yuklanmoqda: \${modelName} (\${records.length} ta qator)...\`);
        
        // createMany yordamida tezkor kiritish
        await (prisma as any)[prismaModelName].createMany({
          data: records,
          skipDuplicates: true,
        });
      }
    }

    // 4. Foreign key tekshiruvlarini qayta yoqamiz
    await prisma.$executeRawUnsafe(\`SET session_replication_role = 'origin';\`);

    console.log('[RESTORE] Barcha ma\\'lumotlar muvaffaqiyatli tiklandi! ✅');

  } catch (error) {
    console.error('[RESTORE] Tiklashda xatolik yuz berdi:', error);
    // Xato bo'lsa ham tekshiruvni yoqib qo'yish kerak
    try {
      await prisma.$executeRawUnsafe(\`SET session_replication_role = 'origin';\`);
    } catch (e) {}
  } finally {
    await prisma.$disconnect();
  }
}

// Skriptni ishga tushirish uchun: npx tsx src/scripts/restore.ts path/to/database.json
const filePath = process.argv[2];
if (!filePath) {
  console.error("Iltimos, JSON fayl yo'lini kiriting. Masalan: npx tsx src/scripts/restore-backup.ts ./database.json");
  process.exit(1);
}

restoreDatabase(path.resolve(filePath));
