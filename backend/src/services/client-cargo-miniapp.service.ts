import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { callTelegram } from './telegram-bot-api';
import { CargoHeader, formatCargoMessage, splitContractLines } from './client-cargo-form';
import { FieldErrors, SubmitBody, validateFormFields } from './client-cargo-miniapp';

// Yuk ma'lumotlari Mini App: forma uchun ma'lumot berish, guruh a'zoligini tekshirish va natijani guruhga yuborish.

const MEMBERSHIP_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONTRACTS = 100;
const MAX_PRODUCTS = 200;

const membershipCache = new Map<string, number>();

interface ChatMember {
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  is_member?: boolean;
}

/** Foydalanuvchi shu guruhning a'zosimi (bot guruhda bo'lishi kerak). Natija 5 daqiqa eslab qolinadi. */
export async function isGroupMember(botToken: string, chatId: string, userId: number): Promise<boolean> {
  const cacheKey = `${chatId}:${userId}`;
  const cachedUntil = membershipCache.get(cacheKey);
  if (cachedUntil && cachedUntil > Date.now()) return true;

  const res = await callTelegram<ChatMember>(botToken, 'getChatMember', { chat_id: chatId, user_id: userId });
  if (!res.ok) return false;
  const { status, is_member: isMember } = res.result;
  const member = status === 'creator' || status === 'administrator' || status === 'member' || (status === 'restricted' && isMember === true);
  if (member) membershipCache.set(cacheKey, Date.now() + MEMBERSHIP_CACHE_TTL_MS);
  return member;
}

export interface CargoContext {
  clientName: string;
  contracts: Array<{
    id: number;
    contractNumber: string;
    buyerName: string;
    currency: string | null;
    /** Условия поставки va uning juftidagi Место там. очистки (shartnomada indeks bo'yicha juft) */
    cities: Array<{ text: string; pairedCustoms: string | null }>;
    customs: string[];
    destinations: string[];
  }>;
  /** Место отгрузки груза uchun faol filiallar */
  branches: Array<{ id: number; name: string; /** Guruh xabariga yoziladigan matn */ place: string }>;
  products: string[];
}

/** Filialning "Место отгрузки груза" matni: invoys hujjatlaridagi kabi viloyat matni, bo'lmasa filial nomi */
export const shipmentPlaceOf = (branch: { name: string; regionText: string | null }): string => branch.regionText?.trim() || branch.name;

export async function getCargoContext(clientId: number): Promise<CargoContext | null> {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
  if (!client) return null;

  const [contracts, products, branches] = await Promise.all([
    prisma.contract.findMany({
      where: { clientId },
      orderBy: { contractDate: 'desc' },
      take: MAX_CONTRACTS,
      select: {
        id: true,
        contractNumber: true,
        buyerName: true,
        contractCurrency: true,
        deliveryTerms: true,
        customsAddress: true,
        destinationPlaces: true,
      },
    }),
    prisma.clientBotProduct.findMany({ where: { clientId }, orderBy: { name: 'asc' }, take: MAX_PRODUCTS, select: { name: true } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, regionText: true } }),
  ]);

  return {
    clientName: client.name,
    contracts: contracts.map((c) => {
      const customsLines = splitContractLines(c.customsAddress);
      const customsByIndex = new Map(customsLines.map((o) => [o.rawIndex, o.text]));
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        buyerName: c.buyerName,
        currency: c.contractCurrency,
        cities: splitContractLines(c.deliveryTerms).map((o) => ({ text: o.text, pairedCustoms: customsByIndex.get(o.rawIndex) ?? null })),
        customs: customsLines.map((o) => o.text),
        destinations: splitContractLines(c.destinationPlaces).map((o) => o.text),
      };
    }),
    branches: branches.map((b) => ({ id: b.id, name: b.name, place: shipmentPlaceOf(b) })),
    products: products.map((p) => p.name),
  };
}

async function rememberProduct(clientId: number, name: string): Promise<void> {
  const existing = await prisma.clientBotProduct.findFirst({
    where: { clientId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return;
  try {
    await prisma.clientBotProduct.create({ data: { clientId, name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return;
    throw e;
  }
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; status: 400; error: string; errors?: FieldErrors }
  | { ok: false; status: 502; error: string };

/** Formani tekshiradi, tartiblangan xabarni guruhga yuboradi va yangi mahsulot nomlarini eslab qoladi */
export async function submitCargo(params: { botToken: string; clientId: number; chatId: string; body: SubmitBody }): Promise<SubmitResult> {
  const { botToken, clientId, chatId, body } = params;

  const validation = validateFormFields(body);
  if (!validation.ok) return { ok: false, status: 400, error: "Ba'zi maydonlar noto'g'ri", errors: validation.errors };
  const header: CargoHeader = validation.header;

  let currency: string | null = null;
  if (body.contractId) {
    const contract = await prisma.contract.findFirst({
      where: { id: body.contractId, clientId },
      select: { contractNumber: true, buyerName: true, contractCurrency: true },
    });
    if (!contract) return { ok: false, status: 400, error: 'Shartnoma topilmadi' };
    header.contract = `${contract.contractNumber}, ${contract.buyerName}`;
    currency = contract.contractCurrency;
  }

  if (body.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: body.branchId, isActive: true }, select: { name: true, regionText: true } });
    if (!branch) return { ok: false, status: 400, error: 'Filial topilmadi' };
    header.shipmentPlace = shipmentPlaceOf(branch);
  }

  const message = formatCargoMessage({ header, items: validation.items }, currency);
  if (!message) return { ok: false, status: 400, error: "Hech narsa kiritilmadi. Kamida bitta maydonni to'ldiring" };

  const sent = await callTelegram<unknown>(botToken, 'sendMessage', { chat_id: chatId, text: message, parse_mode: 'HTML' });
  if (!sent.ok) {
    console.error("[ClientCargoMiniApp] Guruhga yuborib bo'lmadi:", sent.description);
    return { ok: false, status: 502, error: "Xabarni guruhga yuborib bo'lmadi. Bot guruhda ekanini tekshiring" };
  }

  const products = [...new Set(validation.items.map((i) => i.product).filter((p): p is string => !!p))];
  for (const name of products) {
    try {
      await rememberProduct(clientId, name);
    } catch (e) {
      console.error('[ClientCargoMiniApp] Mahsulot nomini saqlashda xatolik:', e instanceof Error ? e.message : e);
    }
  }
  return { ok: true };
}
