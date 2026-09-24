import { Request, Response, NextFunction } from 'express';

// ~170 ta route `res.status(500).json({ error: error.message })` qiladi. Ularning
// ko'pi ataylab yozilgan o'zbekcha xabarlar (foydalanuvchiga kerak), lekin Prisma,
// tizim va kutubxona xatolari ham shu yo'l bilan chiqib ketadi: so'rov argumentlari,
// jadval/ustun nomlari, fayl yo'llari, stack, hatto API kalit bo'laklari.
// Bu middleware barcha 5xx JSON javoblarini markazda tekshiradi — ichki tafsilotni
// umumiy xabarga almashtiradi, oddiy foydalanuvchi xabarini esa qoldiradi.

export const GENERIC_ERROR_MESSAGE = 'Serverda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.';

// Foydalanuvchi xabari bunchalik uzun bo'lmaydi — uzun matn deyarli har doim dump
const MAX_PUBLIC_MESSAGE_LENGTH = 300;

const INTERNAL_PATTERNS: RegExp[] = [
  /prisma|invocation|\bP\d{4}\b/i, // Prisma xatolari va kodlari
  /\n\s*at\s|\bat\s+\S+\s+\(.*:\d+:\d+\)/, // stack trace
  /\b(E(CONN\w+|TIMEDOUT|NOTFOUND|AI_AGAIN|PIPE|ACCES|NOENT))\b|socket hang up/i, // tizim/tarmoq
  /Cannot read propert|is not a function|is not defined|is not iterable|Unexpected token|Maximum call stack/i, // JS xatolari
  /\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]*\b(FROM|INTO|SET|WHERE)\b/i, // SQL
  /\b(column|relation|constraint|duplicate key|foreign key|syntax error at)\b/i, // Postgres
  /[A-Za-z]:\\|\/var\/www|\/root\/|node_modules|\.ts:\d+|\.js:\d+/i, // fayl yo'llari
  /\bsk-[A-Za-z0-9_-]{6,}|api[\s_-]?key|bearer\s+[A-Za-z0-9._-]{10,}/i, // kalitlar
];

// 5xx javobda bu maydonlar hech qachon mijozga ketmasligi kerak
const DEBUG_FIELDS = ['stack', 'details', 'detail', 'meta', 'cause', 'sql', 'query'];

export function isInternalErrorMessage(message: string): boolean {
  if (message.length > MAX_PUBLIC_MESSAGE_LENGTH) return true;
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeErrorBody(body: unknown, statusCode: number): unknown {
  if (statusCode < 500 || typeof body !== 'object' || body === null || Array.isArray(body)) {
    return body;
  }
  const result: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const field of DEBUG_FIELDS) delete result[field];

  for (const field of ['error', 'message'] as const) {
    const value = result[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || isInternalErrorMessage(value)) {
      result[field] = GENERIC_ERROR_MESSAGE;
    }
  }
  return result;
}

/**
 * Faqat production'da: dev'da to'liq xato matni debugging uchun kerak.
 * Asl matn server logiga yoziladi — sabab yo'qolmaydi.
 */
export const sanitizeErrorResponses = (isProduction = process.env.NODE_ENV === 'production') =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!isProduction) return next();
    const originalJson = res.json.bind(res);
    res.json = (body?: unknown) => {
      const sanitized = sanitizeErrorBody(body, res.statusCode);
      if (sanitized !== body) {
        const before = body as Record<string, unknown>;
        const after = sanitized as Record<string, unknown>;
        const hidden = (['error', 'message'] as const)
          .filter((field) => before[field] !== after[field])
          .map((field) => before[field]);
        if (hidden.length > 0) {
          console.error(`[sanitize-errors] ${req.method} ${req.originalUrl} ${res.statusCode}: mijozdan yashirildi:`, ...hidden);
        }
      }
      return originalJson(sanitized);
    };
    next();
  };
