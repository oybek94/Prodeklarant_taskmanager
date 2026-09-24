import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    branchId: number | null;
    name: string;
  };
}

// Mijoz (CLIENT) tokeni `sub` sifatida Client.id ni saqlaydi, User.id emas.
// Shuning uchun rolsiz requireAuth() uni RAD ETADI — aks holda mijoz xodim
// endpointlariga kirib, o'z ID'si bilan to'qnashgan xodim nomidan ish ko'radi.
// Mijoz portali endpointlari 'CLIENT' ni rollar ro'yxatida aniq ko'rsatishi shart.
export const CLIENT_ROLE = 'CLIENT';
export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'DEKLARANT', 'SELLER', 'CERTIFICATE_WORKER'] as const;

export const requireAuth =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = auth.slice(7);
      try {
        const payload = verifyAccessToken(token);
        req.user = {
          id: payload.sub,
          role: payload.role,
          branchId: payload.branchId || null,
          name: payload.name,
        };
        if (payload.role === CLIENT_ROLE && !roles.includes(CLIENT_ROLE)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        if (roles.length && !roles.includes(payload.role)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      } catch (err: any) {
        console.error('JWT verification error:', err.message);
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } catch (err: any) {
      console.error('Auth middleware error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

// Xodimlar ham, mijoz portali ham foydalanadigan endpointlar uchun.
// Handler ichida CLIENT faqat o'z ma'lumotini ko'rishi tekshirilishi shart.
export const requireStaffOrClient = () => requireAuth(...STAFF_ROLES, CLIENT_ROLE);
