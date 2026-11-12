import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { resolveServableUploadPath } from '../utils/upload-path';

const INVALID_PATH = { error: 'Fayl yo\'li noto\'g\'ri' };
const FORBIDDEN_PATH = { error: 'Ruxsat berilmagan yo\'l' };

const safeDecode = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

/**
 * `express.static('/uploads')` oldidan: uploads'dan tashqariga chiqadigan yoki yopiq
 * papkaga (masalan `backups/`) tushadigan so'rovni to'xtatadi.
 */
export const blockPrivateUploads = (uploadsRoot: string) => (req: Request, res: Response, next: NextFunction) => {
  const decoded = safeDecode(req.path);
  if (decoded === null) return res.status(400).json(INVALID_PATH);
  if (!resolveServableUploadPath(uploadsRoot, decoded)) return res.status(403).json(FORBIDDEN_PATH);
  next();
};

/** `GET /api/secure-uploads/*path` — yuklangan faylni token bilan berish */
export const serveSecureUpload = (uploadsRoot: string) => (req: Request, res: Response) => {
  const rawParam: unknown = req.params.path;
  const joined = Array.isArray(rawParam) ? rawParam.join('/') : typeof rawParam === 'string' ? rawParam : '';

  // Eski mijozlar yo'lni ikki marta kodlab yuborishi mumkin — shuning uchun yana bir marta yechiladi;
  // tekshiruv yechilgan yo'l ustida bajariladi
  const relativePath = safeDecode(joined);
  if (relativePath === null) return res.status(400).json(INVALID_PATH);
  if (!relativePath) return res.status(400).json({ error: 'Fayl yo\'li ko\'rsatilmagan' });

  const absolutePath = resolveServableUploadPath(uploadsRoot, relativePath);
  if (!absolutePath) return res.status(403).json(FORBIDDEN_PATH);

  if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'Fayl topilmadi' });

  res.sendFile(absolutePath);
};
