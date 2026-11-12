import path from 'path';

/**
 * `uploads/` ichida turgan, lekin HTTP orqali hech kimga berilmaydigan papkalar.
 * `backups` — eski DB zaxiralari shu yerda yotgan: `/api/secure-uploads` har qanday
 * xodim tokeni bilan ochilgani uchun fayl nomini taxmin qilgan xodim butun bazani
 * yuklab olishi mumkin edi. Yangi zaxiralar endi `uploads/` dan tashqarida saqlanadi.
 */
const PRIVATE_UPLOAD_DIRS = new Set(['backups']);

/**
 * So'ralgan nisbiy yo'lni `uploads` ichidagi absolyut yo'lga aylantiradi.
 * Yo'l uploads'dan tashqariga chiqsa, ildizning o'zi bo'lsa yoki yopiq papkaga
 * tushsa — null (fayl berilmaydi).
 */
export function resolveServableUploadPath(uploadsRoot: string, relativePath: string): string | null {
  const root = path.resolve(uploadsRoot);
  const absolutePath = path.resolve(path.join(root, relativePath));

  const relative = path.relative(root, absolutePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;

  const topLevelDir = relative.split(path.sep)[0].toLowerCase();
  if (PRIVATE_UPLOAD_DIRS.has(topLevelDir)) return null;

  return absolutePath;
}
