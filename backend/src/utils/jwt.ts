import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: number;
  role: string;
  branchId: number | null;
  name: string;
  /** Faqat PORTAL tokeni: parol hash'i izi — parol almashtirilsa eski tokenlar yaroqsiz bo'ladi */
  pv?: string;
  /** Faqat xodim tokeni: User.tokenVersion nusxasi — versiya oshsa token yaroqsiz (yo'q = 0) */
  tv?: number;
}

// Algoritm qat'iy belgilanadi: verify faqat HS256 ni qabul qiladi (algoritm almashtirish hujumi yo'q)
const JWT_ALGORITHM = 'HS256' as const;

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.tokenTtl, algorithm: JWT_ALGORITHM } as jwt.SignOptions);

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.refreshTtl, algorithm: JWT_ALGORITHM } as jwt.SignOptions);

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALGORITHM] });
  if (typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  return decoded as unknown as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtRefreshSecret, { algorithms: [JWT_ALGORITHM] });
  if (typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  return decoded as unknown as JwtPayload;
};

