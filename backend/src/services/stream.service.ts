// @ts-nocheck — LMS Prisma modellari hali schema'ga qo'shilmagan
import crypto from 'crypto';
import { prisma } from '../prisma';
import { config } from '../config';

export async function createStreamSession(userId: number, mediaId: number, clientIp?: string, userAgent?: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.streamTokenTtlSec * 1000);

  const session = await prisma.lmsMediaStreamSession.create({
    data: {
      userId,
      mediaId,
      sessionToken: token,
      expiresAt,
      clientIp: clientIp || null,
      userAgent: userAgent || null,
    },
  });

  return { token: session.sessionToken, expiresAt: session.expiresAt };
}

export async function verifyStreamSession(token: string, mediaId?: number) {
  const now = new Date();
  const session = await prisma.lmsMediaStreamSession.findUnique({
    where: { sessionToken: token },
  });

  if (!session) return null;
  if (session.revoked) return null;
  if (session.expiresAt < now) return null;
  if (mediaId && session.mediaId !== mediaId) return null;
  return session;
}

export async function revokeStreamSession(token: string) {
  await prisma.lmsMediaStreamSession.updateMany({ where: { sessionToken: token }, data: { revoked: true } });
}
