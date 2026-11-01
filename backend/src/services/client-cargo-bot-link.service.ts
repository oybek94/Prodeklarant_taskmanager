import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

// Yuk ma'lumotlari boti: mijozning Telegram guruhini bir martalik kod bilan ulash.
// Telegram kutubxonasiga bog'liq emas — API route'lari ham shu yerdan foydalanadi.

const CODE_TTL_MS = 24 * 60 * 60 * 1000;
// 0/O va 1/I o'xshashligi uchun olib tashlangan
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export interface BotLinkStatus {
  linked: boolean;
  /** Faol (muddati o'tmagan) ulash kodi */
  code: string | null;
  codeExpiresAt: Date | null;
}

export type LinkGroupResult =
  | { ok: true; clientId: number; clientName: string }
  | { ok: false; reason: 'INVALID_CODE' | 'GROUP_TAKEN' };

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export function normalizeLinkCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export async function getBotLinkStatus(clientId: number): Promise<BotLinkStatus | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { botGroupChatId: true, botLinkCode: true, botLinkCodeExpiresAt: true },
  });
  if (!client) return null;
  const codeActive = !!client.botLinkCode && !!client.botLinkCodeExpiresAt && client.botLinkCodeExpiresAt > new Date();
  return {
    linked: !!client.botGroupChatId,
    code: codeActive ? client.botLinkCode : null,
    codeExpiresAt: codeActive ? client.botLinkCodeExpiresAt : null,
  };
}

/** Yangi bir martalik kod yaratadi (eskisi bekor bo'ladi). Mijoz topilmasa null. */
export async function createBotLinkCode(clientId: number): Promise<{ code: string; expiresAt: Date } | null> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { botLinkCode: code, botLinkCodeExpiresAt: expiresAt },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return null;
    throw e;
  }
  return { code, expiresAt };
}

export async function disconnectBotGroup(clientId: number): Promise<boolean> {
  const result = await prisma.client.updateMany({
    where: { id: clientId },
    data: { botGroupChatId: null, botLinkCode: null, botLinkCodeExpiresAt: null },
  });
  return result.count > 0;
}

/** Guruhni kod bo'yicha mijozga ulaydi. Kod muvaffaqiyatli ishlatilgach o'chiriladi. */
export async function linkGroupByCode(rawCode: string, chatId: string): Promise<LinkGroupResult> {
  const code = normalizeLinkCode(rawCode);
  if (code.length !== CODE_LENGTH) return { ok: false, reason: 'INVALID_CODE' };

  const client = await prisma.client.findFirst({
    where: { botLinkCode: code, botLinkCodeExpiresAt: { gt: new Date() } },
    select: { id: true, name: true },
  });
  if (!client) return { ok: false, reason: 'INVALID_CODE' };

  try {
    await prisma.client.update({
      where: { id: client.id },
      data: { botGroupChatId: chatId, botLinkCode: null, botLinkCodeExpiresAt: null },
    });
  } catch (e) {
    // botGroupChatId @unique — guruh allaqachon boshqa mijozga ulangan
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: false, reason: 'GROUP_TAKEN' };
    throw e;
  }
  return { ok: true, clientId: client.id, clientName: client.name };
}

/** Guruh oddiy guruhdan superguruhga o'tganda chat ID o'zgaradi — bog'lanishni yangilaydi */
export async function migrateBotGroupChatId(oldChatId: string, newChatId: string): Promise<void> {
  await prisma.client.updateMany({ where: { botGroupChatId: oldChatId }, data: { botGroupChatId: newChatId } });
}
