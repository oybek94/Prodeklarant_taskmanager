import { Router } from 'express';
import { BackupService } from '../services/backup.service';
import multer from 'multer';
import PizZip from 'pizzip';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// /api/system/backup
router.get('/backup', async (req, res) => {
  try {
    const archivePath = await BackupService.createBackupArchive();
    res.download(archivePath);
  } catch (err) {
    console.error('Zaxira yaratishda xatolik:', err);
    res.status(500).json({ error: 'Zaxira faylini yaratishda xatolik yuz berdi.' });
  }
});

// /api/system/restore
router.post('/restore', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi.' });
    }

    let backupData;
    const fileName = req.file.originalname.toLowerCase();

    if (fileName.endsWith('.zip')) {
      const zip = new PizZip(req.file.buffer);
      const jsonFile = zip.file('database.json');
      if (!jsonFile) {
        return res.status(400).json({ error: "ZIP fayl ichida 'database.json' topilmadi." });
      }
      backupData = JSON.parse(jsonFile.asText());
    } else if (fileName.endsWith('.json')) {
      backupData = JSON.parse(req.file.buffer.toString('utf-8'));
    } else {
      return res.status(400).json({ error: "Faqat .zip yoki .json format ruxsat etiladi." });
    }

    // Ma'lumotlarni bazaga yozish
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
    const models = Prisma.dmmf.datamodel.models;

    for (const model of models) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${model.name}" CASCADE;`);
    }

    for (const model of models) {
      const modelName = model.name;
      const prismaModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const records = backupData[modelName];
      if (records && records.length > 0) {
        await (prisma as any)[prismaModelName].createMany({
          data: records,
          skipDuplicates: true,
        });
      }
    }

    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    res.json({ message: "Ma'lumotlar muvaffaqiyatli tiklandi! ✅" });

  } catch (error) {
    console.error('[RESTORE ERROR]', error);
    try {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (e) {}
    res.status(500).json({ error: "Zaxirani tiklashda xatolik yuz berdi." });
  }
});

export default router;
