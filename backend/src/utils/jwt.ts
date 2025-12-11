import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: number;
  role: string;
  branchId: number | null;
  name: string;
}

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.tokenTtl });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.refreshTtl });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, config.jwtSecret) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;

