import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/backups');

export class BackupService {
  /**
   * Barcha jadvallardagi ma'lumotlarni o'qiydi (JSON formatida).
   */
  static async exportAllData(): Promise<Record<string, any[]>> {
    const backupData: Record<string, any[]> = {};
    const models = Prisma.dmmf.datamodel.models;

    for (const model of models) {
      const modelName = model.name as string;
      // Kichik harf bilan boshlanadigan prisma chaqiruvi (masalan, 'user', 'task')
      const prismaModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      
      try {
        if ((prisma as any)[prismaModelName] && typeof (prisma as any)[prismaModelName].findMany === 'function') {
          const records = await (prisma as any)[prismaModelName].findMany();
          backupData[modelName] = records;
        }
      } catch (e) {
        console.error(`[BACKUP] Xatolik jadvalni o'qishda: ${modelName}`, e);
      }
    }

    return backupData;
  }

  /**
   * JSON ma'lumotlarini ZIP qilib saqlaydi.
   */
  static async createBackupArchive(): Promise<string> {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${dateStr}.zip`;
    const filepath = path.join(UPLOADS_DIR, filename);

    const data = await this.exportAllData();
    const jsonString = JSON.stringify(data, null, 2);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum siqish
      });

      output.on('close', () => {
        console.log(`[BACKUP] Muvaffaqiyatli saqlandi: ${filepath} (${archive.pointer()} bayt)`);
        this.cleanOldBackups();
        resolve(filepath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.append(jsonString, { name: 'database.json' });
      archive.finalize();
    });
  }

  /**
   * Oxirgi 3 ta backupdan tashqari eskilarini o'chiradi
   */
  static cleanOldBackups(keepCount = 3) {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    fs.readdir(UPLOADS_DIR, (err, files) => {
      if (err) {
        console.error('[BACKUP] Eski fayllarni tekshirishda xatolik:', err);
        return;
      }

      const zipFiles = files
        .filter(f => f.endsWith('.zip') && f.startsWith('db-backup-'))
        .map(f => ({ name: f, path: path.join(UPLOADS_DIR, f), time: fs.statSync(path.join(UPLOADS_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (zipFiles.length > keepCount) {
        const filesToDelete = zipFiles.slice(keepCount);
        filesToDelete.forEach(file => {
          fs.unlink(file.path, (e) => {
            if (e) console.error(`[BACKUP] Fayl o'chirishda xato: ${file.path}`, e);
            else console.log(`[BACKUP] Eski fayl o'chirildi: ${file.name}`);
          });
        });
      }
    });
  }
}
