// Yuk ma'lumotlari Mini App: Telegram imzosini tekshirish va forma tanasini tekshirish.
// Sof funksiyalar — Telegram va bazaga bog'liq emas, alohida test qilinadi.

import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { CargoHeader, CargoItem, HEADER_FIELDS, ITEM_FIELDS, parseFieldInput } from './client-cargo-form';

export interface TelegramLaunch {
  userId: number;
  /** Imzolangan initData'dagi ko'rsatiladigan ism (mijozdan kelgan ixtiyoriy matnga ishonilmaydi) */
  userName: string;
  startParam: string | null;
}

const MAX_INIT_DATA_AGE_SEC = 24 * 60 * 60;
const CLOCK_SKEW_SEC = 60;
export const MAX_ITEMS = 20;

const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

const MAX_USER_NAME_LENGTH = 64;

/** "Ism Familiya", bo'lmasa "@username", bo'lmasa "ID <id>" */
export function telegramDisplayName(user: z.infer<typeof telegramUserSchema>): string {
  const fullName = [user.first_name, user.last_name]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .join(' ');
  const name = fullName || (user.username?.trim() ? `@${user.username.trim()}` : `ID ${user.id}`);
  return name.slice(0, MAX_USER_NAME_LENGTH);
}

/**
 * Mini App `initData` imzosini bot tokeni bilan tekshiradi (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * Yaroqsiz, soxta yoki 24 soatdan eski bo'lsa null.
 */
export function verifyInitData(initData: string, botToken: string, nowSec: number): TelegramLaunch | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate > nowSec + CLOCK_SKEW_SEC || nowSec - authDate > MAX_INIT_DATA_AGE_SEC) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;
  let userJson: unknown;
  try {
    userJson = JSON.parse(userRaw);
  } catch {
    return null;
  }
  const user = telegramUserSchema.safeParse(userJson);
  if (!user.success) return null;

  return { userId: user.data.id, userName: telegramDisplayName(user.data), startParam: params.get('start_param') };
}

/** Guruh chat ID si: manfiy butun son (`-1001234567890`). start_param shu ko'rinishda keladi. */
export function parseGroupChatId(startParam: string | null): string | null {
  return startParam && /^-\d{5,20}$/.test(startParam) ? startParam : null;
}

const optionalText = z.string().max(300).optional();

const itemSchema = z.object({
  product: optionalText,
  boxCount: optionalText,
  boxWeight: optionalText,
  palletCount: optionalText,
  palletWeight: optionalText,
  netto: optionalText,
  brutto: optionalText,
  price: optionalText,
});

export const submitBodySchema = z.object({
  contractId: z.number().int().positive().nullable().optional(),
  branchId: z.number().int().positive().nullable().optional(),
  invoiceNumber: optionalText,
  deliveryTerms: optionalText,
  customsPlace: optionalText,
  destination: optionalText,
  vehicleNumber: optionalText,
  orderNumber: optionalText,
  temperature: optionalText,
  sensorSerial: optionalText,
  items: z.array(itemSchema).max(MAX_ITEMS).default([]),
});

export type SubmitBody = z.infer<typeof submitBodySchema>;

/** Kontrakt va jo'natish joyi mijoz matnidan emas, shartnoma/filial yozuvidan olinadi (contractId, branchId) */
const SERVER_DERIVED: ReadonlySet<string> = new Set(['contract', 'shipmentPlace']);

/** Xato kaliti: sarlavha maydoni uchun maydon nomi, tovar maydoni uchun `items.<indeks>.<maydon>` */
export type FieldErrors = Record<string, string>;

export type FormValidation = { ok: true; header: CargoHeader; items: CargoItem[] } | { ok: false; errors: FieldErrors };

/** Bo'sh maydonlar o'tkazib yuboriladi; to'ldirilganlari maydon turiga qarab tekshiriladi va normallashtiriladi */
export function validateFormFields(body: SubmitBody): FormValidation {
  const errors: FieldErrors = {};
  const header: CargoHeader = {};
  for (const spec of HEADER_FIELDS) {
    if (SERVER_DERIVED.has(spec.key)) continue;
    const raw = body[spec.key as keyof SubmitBody];
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const parsed = parseFieldInput(spec.kind, spec.key, raw);
    if (parsed.ok) header[spec.key] = parsed.value;
    else errors[spec.key] = parsed.error;
  }

  const items: CargoItem[] = body.items.map((rawItem, index) => {
    const item: CargoItem = {};
    for (const spec of ITEM_FIELDS) {
      const raw = rawItem[spec.key];
      if (typeof raw !== 'string' || raw.trim() === '') continue;
      const parsed = parseFieldInput(spec.kind, spec.key, raw);
      if (parsed.ok) item[spec.key] = parsed.value;
      else errors[`items.${index}.${spec.key}`] = parsed.error;
    }
    return item;
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, header, items };
}
