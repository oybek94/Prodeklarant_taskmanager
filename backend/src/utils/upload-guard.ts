import path from 'path';

/**
 * Brauzer ochganda skript bajarishi mumkin bo'lgan fayl turlari.
 * Hujjat yuklash oynasi har qanday faylni qabul qiladi (Excel, Word, ZIP, XML...),
 * shuning uchun allowlist emas — faqat shu faol kontent bloklanadi.
 */
const BLOCKED_EXTENSIONS = new Set([
  '.html', '.htm', '.xhtml', '.xht', '.shtml', '.mht', '.mhtml',
  '.svg', '.svgz',
  '.js', '.mjs', '.cjs',
]);

const BLOCKED_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'multipart/related', // .mht
  'message/rfc822',
]);

/** Kengaytmani kichik harfda, oxiridagi nuqta/bo'shliqlarsiz qaytaradi ("a.HTML. " → ".html") */
export function normalizedExtension(fileName: string): string {
  return path.extname(fileName.replace(/[.\s]+$/, '')).toLowerCase();
}

/** Fayl kengaytmasi YOKI mime turi faol kontent bo'lsa — true */
export function isActiveContentFile(fileName: string, mimeType: string): boolean {
  const mime = (mimeType || '').split(';')[0].trim().toLowerCase();
  return BLOCKED_EXTENSIONS.has(normalizedExtension(fileName)) || BLOCKED_MIME_TYPES.has(mime);
}

/** Multer fileFilter uchun 400 statusli xato (global handler 500 qilib yubormasligi uchun) */
export function uploadRejectedError(message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status: 400 });
}

export const ACTIVE_CONTENT_REJECT_MESSAGE =
  "Bu turdagi fayl (HTML, SVG, JS) xavfsizlik sababli qabul qilinmaydi";
