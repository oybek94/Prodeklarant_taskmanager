import { Router } from 'express';
import { BackupService } from '../services/backup.service';

const router = Router();

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

export default router;
