import { NextFunction, Response } from 'express';
import { AuthRequest, requireAuth } from './auth';

const staffOnly = requireAuth();
const adminOnly = requireAuth('ADMIN');

/** Faqat xodimlar tanlov ro'yxati so'rovi: `GET /api/users?selectList=true` (aynan ildiz yo'l). */
export const isUserSelectListRequest = (req: Pick<AuthRequest, 'method' | 'path' | 'query'>): boolean =>
  req.method === 'GET' && req.path === '/' && req.query.selectList === 'true';

/**
 * `/api/users` darvozasi: tanlov ro'yxati har qanday xodimga, qolgan hamma narsa faqat ADMIN ga.
 * Router ichidagi tekshiruvlarga tayanmaydi — yangi yo'l himoyasiz qo'shilsa ham yopiq qoladi.
 */
export const usersAccessGuard = (req: AuthRequest, res: Response, next: NextFunction) =>
  (isUserSelectListRequest(req) ? staffOnly : adminOnly)(req, res, next);
