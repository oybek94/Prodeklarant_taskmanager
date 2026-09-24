// CORS ruxsat etilgan originlar.
//
// Ilgari production'da HAR QANDAY origin qabul qilinardi ("Nginx orqali kelgan
// so'rovlar" deb) — bu allowlist'ni ma'nosiz qilardi. Aslida frontend API bilan
// bir xil origin'da (nginx /api proxy), shuning uchun production'da faqat o'z
// domenimiz kerak. Origin'siz so'rovlar (curl, server→server, nginx health)
// CORS'ga taalluqli emas va o'tkaziladi.

const DEFAULT_ORIGINS = ['https://app.prodeklarant.uz'];

const DEV_LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function parseAllowedOrigins(envValue: string | undefined): string[] {
  const fromEnv = (envValue ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  isProduction: boolean,
): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Lokal dev: Vite (5173) va boshqa localhost portlari
  if (!isProduction && DEV_LOCAL_ORIGIN.test(origin)) return true;
  return false;
}

const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const isProduction = process.env.NODE_ENV === 'production';

/**
 * `cors` va Socket.IO uchun umumiy origin tekshiruvchi. Ruxsatsiz origin'ga
 * xato emas, `false` qaytaramiz — javobda CORS sarlavhalari bo'lmaydi va
 * brauzer uni bloklaydi (xato qaytarish global handler orqali 500 berardi).
 */
export const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  const allowed = isOriginAllowed(origin, allowedOrigins, isProduction);
  if (!allowed) console.warn(`⚠️  CORS: ruxsatsiz origin rad etildi: ${origin}`);
  callback(null, allowed);
};
