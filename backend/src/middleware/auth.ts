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

// /api ostida token'siz ochiq bo'lishi SHART bo'lgan yo'llar (app.use('/api') ga nisbatan).
// Yangi ochiq endpoint qo'shilsa — shu yerga ataylab yozilishi kerak.
const PUBLIC_API_EXACT = new Set([
  '/auth/login',
  '/auth/client/login',
  '/auth/refresh',
  '/health/db',
]);
const PUBLIC_API_PREFIXES = [
  '/q/', // QR orqali hujjatni ochiq tekshirish
  '/v1/media/stream/', // LMS video — o'z stream token'ini query'da tekshiradi
];

export const isPublicApiPath = (path: string): boolean => {
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return PUBLIC_API_EXACT.has(normalized) || PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix));
};

/**
 * Himoya "sukut bo'yicha yopiq": /api ostidagi har bir so'rov yaroqli token talab
 * qiladi (xodim yoki mijoz), faqat PUBLIC_API ro'yxati bundan mustasno. Ilgari ~20
 * router auth'siz mount qilingan va himoya har endpointdagi requireAuth'ga bog'liq
 * edi — bittasini unutish endpointni ochiq qoldirardi. Rol cheklovlari hamon
 * endpoint darajasidagi requireAuth(...) da.
 */
export const authenticateApi = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS' || isPublicApiPath(req.path)) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = verifyAccessToken(auth.slice(7));
    req.user = { id: payload.sub, role: payload.role, branchId: payload.branchId || null, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
