import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth';

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    res.json = function (body: any) {
      // Log after response
      if (req.user && res.statusCode < 400) {
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

