import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { resolveServableUploadPath } from '../utils/upload-path';

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const UPLOADS_URL_PREFIX = '/uploads/';

/**
 * Bazadagi `fileUrl` (`/uploads/documents/x.pdf`) ni diskdagi absolyut yo'lga aylantiradi.
 * `uploads` dan tashqariga chiqadigan yoki yopiq papkaga tushadigan yo'l — null.
 */
export function resolveUploadFilePath(fileUrl: string, uploadsRoot: string = UPLOADS_ROOT): string | null {
  const normalized = fileUrl.replace(/\\/g, '/');
  if (!normalized.startsWith(UPLOADS_URL_PREFIX)) return null;
  return resolveServableUploadPath(uploadsRoot, normalized.slice(UPLOADS_URL_PREFIX.length));
}

/**
 * Yozuvlari bazadan o'chirilgan fayllarni diskdan olib tashlaydi.
 * Faylga boshqa hujjat (vazifa yoki arxiv) hali ishora qilsa — tegilmaydi: arxivga
 * ko'chirilgan hujjat asl fayl bilan bir xil `fileUrl` dan foydalanadi.
 * Xato chiqarmaydi (yozuv allaqachon o'chirilgan) — muammo logga yoziladi.
 */
export async function removeUnreferencedUploads(fileUrls: string[], uploadsRoot: string = UPLOADS_ROOT): Promise<void> {
  for (const fileUrl of new Set(fileUrls)) {
    try {
      const [taskRefs, archiveRefs] = await Promise.all([
        prisma.taskDocument.count({ where: { fileUrl } }),
        prisma.archiveDocument.count({ where: { fileUrl } }),
      ]);
      if (taskRefs + archiveRefs > 0) continue;

      const filePath = resolveUploadFilePath(fileUrl, uploadsRoot);
      if (!filePath) continue;
      await fs.promises.unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
      console.error('[uploads] Faylni o\'chirib bo\'lmadi:', fileUrl, err);
    }
  }
}
