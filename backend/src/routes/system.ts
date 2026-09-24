import { Router, Request, Response, NextFunction } from 'express';
import { BackupService, RestoreValidationError } from '../services/backup.service';
import multer from 'multer';
import PizZip from 'pizzip';

const router = Router();
// Kunlik zaxira ~4MB (zip); 100MB — katta o'sish uchun zaxira, xotirani to'ldirmaslik uchun chegara
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } });

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

    let backupData: unknown;
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

    // Validatsiya + TRUNCATE + yozish — hammasi bitta tranzaksiyada (service ichida)
    const inserted = await BackupService.restoreAllData(backupData);
    const totalRows = Object.values(inserted).reduce((sum, n) => sum + n, 0);
    res.json({ message: `Ma'lumotlar muvaffaqiyatli tiklandi! ✅ (${totalRows} ta yozuv)`, inserted });

  } catch (error) {
    if (error instanceof RestoreValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "Zaxira faylidagi JSON buzilgan. Baza o'zgarmadi." });
    }
    console.error('[RESTORE ERROR]', error);
    res.status(500).json({ error: "Zaxirani tiklashda xatolik yuz berdi. Tranzaksiya bekor qilindi — baza o'zgarmadi." });
  }
});

// Multer xatolari (masalan, fayl juda katta) — umumiy 500 o'rniga tushunarli javob
router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: status === 413 ? 'Fayl juda katta (maks. 100MB).' : `Fayl yuklashda xato: ${err.code}` });
  }
  next(err);
});

export default router;
