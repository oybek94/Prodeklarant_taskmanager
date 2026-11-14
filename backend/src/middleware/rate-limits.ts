import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { PORTAL_ROLE } from './auth';

// So'rov chegaralari. Butun ofis internetga bitta IP orqali chiqadi, shuning uchun
// tizimga kirgan foydalanuvchi IP bo'yicha EMAS, o'z hisobi bo'yicha sanaladi — aks holda
// bir xodimning og'ir sahifasi hammani 429 ga tushirardi (prod logida bitta IP dan
// daqiqasiga 253 so'rovgacha kuzatilgan).
//
// Uch qatlam:
//   1) apiIpBackstop   — autentifikatsiyadan OLDIN, IP bo'yicha, keng chegara: noto'g'ri
//                        token bilan to'fon JWT tekshiruvigacha cheklanadi.
//   2) apiLimiter      — autentifikatsiyadan KEYIN: xodim/mijoz o'z hisobi bo'yicha,
//                        token'siz (ochiq) yo'llar IP bo'yicha.
//   3) loginLimiter    — faqat muvaffaqiyatsiz urinishlar, IP bo'yicha (telefon bo'yicha
//                        blok alohida: utils/login-attempts.ts).

interface Limits {
  ipBackstopPerMinute: number;
  userPerMinute: number;
  anonymousPerMinute: number;
  loginFailuresPer15Min: number;
}

export const PRODUCTION_LIMITS: Limits = {
  ipBackstopPerMinute: 1200,
  userPerMinute: 300,
  anonymousPerMinute: 200,
  loginFailuresPer15Min: 10,
};

// Lokal dev va integratsiya testlari (Newman) ataylab keng
export const DEVELOPMENT_LIMITS: Limits = {
  ipBackstopPerMinute: 6000,
  userPerMinute: 3000,
  anonymousPerMinute: 3000,
  loginFailuresPer15Min: 1000,
};

export const resolveLimits = (nodeEnv: string | undefined): Limits =>
  nodeEnv === 'production' ? PRODUCTION_LIMITS : DEVELOPMENT_LIMITS;

type RateLimitedRequest = Pick<Request, 'ip'> & { user?: { id: number; role: string } };

/**
 * Hisoblagich kaliti. Portal tokenida `id` = Client.id (User.id emas), shuning uchun
 * xodim va mijoz kalitlari alohida prefiksda — bir xil raqamli ID lar bitta chelakka tushmaydi.
 */
export function rateLimitKey(req: RateLimitedRequest): string {
  if (req.user) {
    return `${req.user.role === PORTAL_ROLE ? 'client' : 'user'}:${req.user.id}`;
  }
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

const TOO_MANY_REQUESTS = { error: "Juda ko'p so'rov. Bir daqiqadan keyin qayta urinib ko'ring." };

const isUploadPath = (req: Request): boolean =>
  req.path.startsWith('/uploads') || req.path.startsWith('/api/uploads');

export function createRateLimiters(limits: Limits = resolveLimits(process.env.NODE_ENV)) {
  const apiIpBackstop = rateLimit({
    windowMs: 60 * 1000,
    limit: limits.ipBackstopPerMinute,
    message: TOO_MANY_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isUploadPath,
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: (req: Request) =>
      (req as RateLimitedRequest).user ? limits.userPerMinute : limits.anonymousPerMinute,
    keyGenerator: (req: Request) => rateLimitKey(req as RateLimitedRequest),
    message: TOO_MANY_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isUploadPath,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limits.loginFailuresPer15Min,
    // To'g'ri parol bilan kirish hisobga olinmaydi: ofisdagi hamma bitta IP ortida,
    // ertalab ketma-ket kirishlar bir-birini bloklamasin.
    skipSuccessfulRequests: true,
    message: { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return { apiIpBackstop, apiLimiter, loginLimiter };
}
