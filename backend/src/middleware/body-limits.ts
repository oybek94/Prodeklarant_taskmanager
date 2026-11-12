import express, { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

// So'rov tanasi (JSON / urlencoded) hajmi chegaralari.
//
// Ilgari 50 MB limit autentifikatsiya va rate-limitdan OLDIN qo'llanardi: token'siz
// har kim (masalan /api/auth/login ga) 50 MB JSON yuborib, uni xotiraga o'qittirishi
// mumkin edi. Bazadagi eng katta JSON yozuvi ~32 KB; fayllar multipart (multer) orqali
// ketadi va bu limitlarga bog'liq emas.

/** Token'siz so'rovlar: login, portal login, Mini App formasi (eng kattasi ~60 KB) */
export const PUBLIC_BODY_LIMIT_BYTES = 200 * 1024;
/** Autentifikatsiyadan o'tgan xodim: invoys, shartnoma, o'quv matni kabi katta formalar */
export const AUTHENTICATED_BODY_LIMIT_BYTES = 5 * 1024 * 1024;

/**
 * Tanani o'qiydi; chegara so'rovchi autentifikatsiyadan o'tganiga qarab tanlanadi.
 * `authenticateApi` dan KEYIN ulanishi shart (u `req.user` ni o'rnatadi).
 */
export const parseRequestBody = () => {
  const publicJson = express.json({ limit: PUBLIC_BODY_LIMIT_BYTES });
  const publicForm = express.urlencoded({ extended: true, limit: PUBLIC_BODY_LIMIT_BYTES });
  const staffJson = express.json({ limit: AUTHENTICATED_BODY_LIMIT_BYTES });
  const staffForm = express.urlencoded({ extended: true, limit: AUTHENTICATED_BODY_LIMIT_BYTES });

  return (req: Request, res: Response, next: NextFunction) => {
    const isAuthenticated = !!(req as AuthRequest).user;
    const parseJson = isAuthenticated ? staffJson : publicJson;
    const parseForm = isAuthenticated ? staffForm : publicForm;
    parseJson(req, res, (error?: unknown) => (error ? next(error) : parseForm(req, res, next)));
  };
};
