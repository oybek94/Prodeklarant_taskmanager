import type { Request, Response, NextFunction } from 'express';

/**
 * Sekin so'rovlarni logga yozadi.
 *
 * Prodda sekinlashuv sababini topish uchun kerak: qaysi endpoint,
 * qancha vaqt ketgani va status kodi yoziladi. Chegaradan tez
 * so'rovlar loglarni to'ldirmasligi uchun umuman yozilmaydi.
 *
 * Chegara SLOW_REQUEST_MS env orqali o'zgartiriladi (default 1000ms).
 */
const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS) || 1000;

export function requestTiming() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      if (durationMs < SLOW_REQUEST_MS) return;

      // req.route so'rov tugagandan keyin mavjud — parametrlarsiz yo'l beradi
      const routePath = req.route?.path ?? req.originalUrl.split('?')[0];
      console.warn(
        `[slow] ${durationMs.toFixed(0)}ms ${req.method} ${routePath} -> ${res.statusCode}`
      );
    });

    next();
  };
}
