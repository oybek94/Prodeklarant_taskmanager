import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth';

const REDACTED = '[REDACTED]';
// password, passwordHash, token, refreshToken, accessToken, clientSecret, ...
const SENSITIVE_KEY = /password|token|secret/i;

/**
 * Audit yozuviga tushadigan so'rov tanasidan maxfiy maydonlarni olib tashlaydi.
 * `/api/users` da xodim paroli ochiq matnda AuditLog'ga (undan zaxira fayliga)
 * yozilayotgani topilgan — parol hech qachon bazaga ochiq holda tushmasligi kerak.
 */
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redactSensitive(inner)])
  );
}

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    res.json = function (body: any) {
      // Log after response.
      // Faqat MUTATSIYALARni audit qilamiz — GET/HEAD/OPTIONS (o'qish) yozilmaydi.
      // AuditLog hech qachon o'qilmaydi; har GET'da INSERT qilish behuda yuk va
      // cheksiz o'sish (111k+ qator) sababi edi.
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (req.user && res.statusCode < 400 && isMutation) {
        const entityId = req.params.id || body?.id || null;
        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              action,
              entity,
              entityId: entityId ? parseInt(String(entityId)) : null,
              payload: JSON.stringify({
                method: req.method,
                path: req.path,
                body: redactSensitive(req.body),
                query: redactSensitive(req.query),
              }),
            },
          })
          .catch((err) => console.error('Audit log error:', err));
      }
      return originalSend.call(this, body);
    };
    next();
  };
};
