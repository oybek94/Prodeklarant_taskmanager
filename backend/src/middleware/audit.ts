import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth';

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
                body: req.body,
                query: req.query,
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

