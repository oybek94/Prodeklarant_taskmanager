import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: number;
  role: string;
  branchId: number | null;
  name: string;
}

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.tokenTtl } as jwt.SignOptions);

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.refreshTtl } as jwt.SignOptions);

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  return decoded as unknown as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtRefreshSecret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  return decoded as unknown as JwtPayload;
};

