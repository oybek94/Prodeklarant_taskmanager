import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import TelegramBot from 'node-telegram-bot-api';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/backups');

const RESTORE_CHUNK_SIZE = 1000;
const RESTORE_TIMEOUT_MS = 10 * 60 * 1000;

type CreateManyDelegate = {
  createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
};

/** Mijozga ko'rsatiladigan (400) validatsiya xatosi */
export class RestoreValidationError extends Error {}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

/**
 * Zaxira tuzilmasini TRUNCATE'dan OLDIN tekshiradi. Birorta model yo'q bo'lsa rad etamiz:
 * aks holda o'sha jadval tozalanib, bo'sh qolib ketardi (eksportda jadval o'qilmay
 * qolgan bo'lishi mumkin — exportAllData xatoni yutib yuboradi).
 */
export function validateRestoreData(backupData: unknown, modelNames: string[]): Record<string, unknown[]> {
  if (typeof backupData !== 'object' || backupData === null || Array.isArray(backupData)) {
    throw new RestoreValidationError("Zaxira fayli noto'g'ri formatda.");
  }
  const data = backupData as Record<string, unknown>;
  const missing = modelNames.filter((name) => !Array.isArray(data[name]));
  if (missing.length > 0) {
    throw new RestoreValidationError(
      `Zaxirada quyidagi jadvallar yo'q yoki noto'g'ri: ${missing.join(', ')}. Tiklash bekor qilindi, baza o'zgarmadi.`,
    );
  }
  return data as Record<string, unknown[]>;
}

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
   * Zaxiradagi ma'lumotlarni bazaga to'liq tiklaydi — BITTA tranzaksiyada.
   *
   * Hammasi bitta ulanishda bajarilishi shart: `SET LOCAL session_replication_role`
   * faqat shu tranzaksiyaga amal qiladi (pool'dagi boshqa ulanishlarga emas), va
   * istalgan xatoda TRUNCATE ham qaytariladi — baza yarim bo'sh qolmaydi.
   * Huquq yetmasa (superuser emas) SET LOCAL darhol yiqiladi, hech narsa o'chmaydi.
   */
  static async restoreAllData(backupData: unknown): Promise<Record<string, number>> {
    const models = Prisma.dmmf.datamodel.models;
    const data = validateRestoreData(backupData, models.map((m) => m.name));

    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL session_replication_role = 'replica'`;

        const tableList = models.map((m) => quoteIdent(m.dbName ?? m.name)).join(', ');
        await tx.$executeRaw`TRUNCATE TABLE ${Prisma.raw(tableList)} CASCADE`;

        const delegates = tx as unknown as Record<string, CreateManyDelegate>;
        const inserted: Record<string, number> = {};
        for (const model of models) {
          const records = data[model.name];
          const delegate = delegates[model.name.charAt(0).toLowerCase() + model.name.slice(1)];
          let count = 0;
          for (let i = 0; i < records.length; i += RESTORE_CHUNK_SIZE) {
            const res = await delegate.createMany({
              data: records.slice(i, i + RESTORE_CHUNK_SIZE),
              skipDuplicates: true,
            });
            count += res.count;
          }
          inserted[model.name] = count;
        }

        // id'lar aniq qiymat bilan yozildi — autoincrement sequence'larni MAX(id) ga
        // suramiz, aks holda keyingi INSERT mavjud id bilan to'qnashadi
        for (const model of models) {
          const idField = model.fields.find(
            (f) => f.isId && typeof f.default === 'object' && f.default !== null
              && 'name' in f.default && f.default.name === 'autoincrement',
          );
          if (!idField) continue;
          const table = quoteIdent(model.dbName ?? model.name);
          const column = quoteIdent(idField.dbName ?? idField.name);
          const maxId = Prisma.raw(`MAX(${column})`);
          await tx.$executeRaw`SELECT setval(pg_get_serial_sequence(${table}, ${idField.dbName ?? idField.name}), COALESCE(${maxId}, 1), ${maxId} IS NOT NULL) FROM ${Prisma.raw(table)}`;
        }

        return inserted;
      },
      { maxWait: 10_000, timeout: RESTORE_TIMEOUT_MS },
    );
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

      output.on('close', async () => {
        console.log(`[BACKUP] Muvaffaqiyatli saqlandi: ${filepath} (${archive.pointer()} bayt)`);
        this.cleanOldBackups();
        await this.sendToTelegram(filepath, filename);
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

  /**
   * Zaxira qilingan ZIP faylni Telegram guruhiga yuboradi
   */
  static async sendToTelegram(filepath: string, filename: string) {
    try {
      const token = process.env.BACKUP_TELEGRAM_BOT_TOKEN;
      const chatId = process.env.BACKUP_TELEGRAM_CHAT_ID;

      if (!token || !chatId) {
        console.warn('[BACKUP] BACKUP_TELEGRAM_BOT_TOKEN yoki BACKUP_TELEGRAM_CHAT_ID sozlanmagan. Telegramga yuborilmaydi.');
        return;
      }

      console.log(`[BACKUP] Telegramga yuborilmoqda... (${filename})`);
      const bot = new TelegramBot(token, { polling: false });
      
      await bot.sendDocument(chatId, filepath, {
        caption: `📦 Prodeklarant Kunlik Zaxira\n📅 Sana: ${new Date().toLocaleString('uz-UZ')}\n📁 Fayl: ${filename}`
      });

      console.log('[BACKUP] Muvaffaqiyatli Telegramga yuborildi!');
    } catch (error) {
      console.error('[BACKUP] Telegramga yuborishda xatolik:', error);
    }
  }
}
