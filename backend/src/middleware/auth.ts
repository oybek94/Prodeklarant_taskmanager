import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../utils/jwt';
import { isStaffSessionValid } from '../utils/staff-session';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    branchId: number | null;
    name: string;
  };
}

// Mijoz portali olib tashlangan, lekin ilgari berilgan CLIENT tokenlari muddati
// tugamaguncha yaroqli bo'lib qoladi. Ularning `sub` = Client.id (User.id emas),
// shuning uchun ular HECH QAYERDA qabul qilinmaydi — aks holda mijoz o'z ID'si
// bilan to'qnashgan xodim nomidan ish ko'rardi. Yangi portal qurilganda shu yerni qayta ko'ring.
const REVOKED_CLIENT_ROLE = 'CLIENT';

// Mijoz portali (my.prodeklarant.uz) tokeni. `sub` = Client.id, User.id emas, shuning
// uchun rolsiz requireAuth() uni RAD ETADI — faqat requirePortal() qabul qiladi.
export const PORTAL_ROLE = 'PORTAL';
export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'DEKLARANT', 'SELLER', 'CERTIFICATE_WORKER'] as const;


/**
 * Xodim tokeni hali amalda ekanini bazadagi holat bilan solishtiradi (tokenVersion + active).
 * Portal tokeni o'z `pv` tekshiruviga ega, mijoz tokeni umuman qabul qilinmaydi.
 * Baza xatosida 'error' — foydalanuvchini tizimdan chiqarib yubormaslik uchun 503 qaytariladi.
 */
const checkStaffSession = async (payload: JwtPayload): Promise<'ok' | 'revoked' | 'error'> => {
  if (payload.role === PORTAL_ROLE || payload.role === REVOKED_CLIENT_ROLE) return 'ok';
  try {
    return (await isStaffSessionValid(payload.sub, payload.tv)) ? 'ok' : 'revoked';
  } catch (err) {
    console.error('Staff session check error:', err instanceof Error ? err.message : err);
    return 'error';
  }
};

export const requireAuth =
  (...roles: string[]) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      let payload: JwtPayload;
      try {
        payload = verifyAccessToken(auth.slice(7));
      } catch (err: any) {
        console.error('JWT verification error:', err.message);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (payload.role === REVOKED_CLIENT_ROLE) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (payload.role === PORTAL_ROLE && !roles.includes(PORTAL_ROLE)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const session = await checkStaffSession(payload);
      if (session === 'revoked') return res.status(401).json({ error: 'Unauthorized' });
      if (session === 'error') return res.status(503).json({ error: 'Service unavailable' });
      req.user = {
        id: payload.sub,
        role: payload.role,
        branchId: payload.branchId || null,
        name: payload.name,
      };
      next();
    } catch (err: any) {
      console.error('Auth middleware error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

/**
 * Token'ga yoziladigan rol. Amaldagi xodim rollari o'z holicha qoladi; faqat enum'dan
 * olib tashlangan eski rollar (WORKER, ACCOUNTANT) DEKLARANT ga tushiriladi.
 * Ilgari login CERTIFICATE_WORKER ni ham DEKLARANT qilib yuborardi — sertifikatchi
 * birinchi refresh'gacha deklarant huquqlari bilan ishlardi.
 */
export const resolveStaffRole = (role: string): string =>
  (STAFF_ROLES as readonly string[]).includes(role) ? role : 'DEKLARANT';

/**
 * `:param` dagi xodim ID si so'rovchining o'ziniki bo'lishi shart (admin bundan mustasno).
 * Xodimning daromadi, KPI va statistikasi kabi shaxsiy ma'lumot endpointlari uchun.
 * requireAuth() dan KEYIN qo'yiladi.
 */
export const requireSelfOrAdmin =
  (param: string) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    // Faqat o'nlik raqamlar: handlerlar ID ni parseInt bilan o'qiydi, Number() esa
    // "7e1" ni 70, parseInt 7 deb o'qiydi — turlicha talqin tekshiruvni chetlab o'tardi.
    const raw = String(req.params[param] ?? '');
    if (!/^\d+$/.test(raw)) return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(raw, 10)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    next();
  };

// Faqat mijoz portali endpointlari uchun (`/api/portal/*`): xodim tokeni o'tmaydi.
export const requirePortal = () => requireAuth(PORTAL_ROLE);

// /api ostida token'siz ochiq bo'lishi SHART bo'lgan yo'llar (app.use('/api') ga nisbatan).
// Yangi ochiq endpoint qo'shilsa — shu yerga ataylab yozilishi kerak.
const PUBLIC_API_EXACT = new Set([
  '/auth/login',
  '/auth/refresh',
  '/portal/auth/login',
  '/portal/auth/refresh',
  '/health/db',
  '/public/site-stats', // landing statistikasi — router o'zi SITE_STATS_KEY ni tekshiradi
]);
const PUBLIC_API_PREFIXES = [
  '/q/', // QR orqali hujjatni ochiq tekshirish
  '/v1/media/stream/', // LMS video — o'z stream token'ini query'da tekshiradi
  '/tg-cargo/', // Yuk ma'lumotlari Mini App — router har so'rovda Telegram initData imzosini tekshiradi
];

export const isPublicApiPath = (path: string): boolean => {
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return PUBLIC_API_EXACT.has(normalized) || PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix));
};

/**
 * Himoya "sukut bo'yicha yopiq": /api ostidagi har bir so'rov yaroqli token talab
 * qiladi, faqat PUBLIC_API ro'yxati bundan mustasno. Ilgari ~20
 * router auth'siz mount qilingan va himoya har endpointdagi requireAuth'ga bog'liq
 * edi — bittasini unutish endpointni ochiq qoldirardi. Rol cheklovlari hamon
 * endpoint darajasidagi requireAuth(...) da.
 */
export const authenticateApi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS' || isPublicApiPath(req.path)) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(auth.slice(7));
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (payload.role === REVOKED_CLIENT_ROLE) return res.status(403).json({ error: 'Forbidden' });
  // Portal tokeni faqat o'z yo'llarida: endpoint-darajasida requireAuth unutilgan
  // router'larga mijoz (sub = Client.id) kira olmasligi uchun.
  if (payload.role === PORTAL_ROLE && !req.path.startsWith('/portal/')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const session = await checkStaffSession(payload);
  if (session === 'revoked') return res.status(401).json({ error: 'Unauthorized' });
  if (session === 'error') return res.status(503).json({ error: 'Service unavailable' });
  req.user = { id: payload.sub, role: payload.role, branchId: payload.branchId || null, name: payload.name };
  next();
};
