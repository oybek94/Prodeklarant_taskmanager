// Yuk ma'lumotlari Mini App: Telegram imzosini tekshirish va forma tanasini tekshirish.
// Sof funksiyalar — Telegram va bazaga bog'liq emas, alohida test qilinadi.

import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { CARGO_STEPS, CargoData, CargoFieldKey, parseStepInput } from './client-cargo-form';

export interface TelegramLaunch {
  userId: number;
  startParam: string | null;
}

const MAX_INIT_DATA_AGE_SEC = 24 * 60 * 60;
const CLOCK_SKEW_SEC = 60;

const telegramUserSchema = z.object({ id: z.number().int().positive() });

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

  return { userId: user.data.id, startParam: params.get('start_param') };
}

/** Guruh chat ID si: manfiy butun son (`-1001234567890`). start_param shu ko'rinishda keladi. */
export function parseGroupChatId(startParam: string | null): string | null {
  return startParam && /^-\d{5,20}$/.test(startParam) ? startParam : null;
}

const optionalText = z.string().max(300).optional();

export const submitBodySchema = z.object({
  contractId: z.number().int().positive().nullable().optional(),
  vehicleNumber: optionalText,
  city: optionalText,
  product: optionalText,
  boxCount: optionalText,
  boxWeight: optionalText,
  palletCount: optionalText,
  palletWeight: optionalText,
  netto: optionalText,
  brutto: optionalText,
  price: optionalText,
  customs: optionalText,
  unloading: optionalText,
});

export type SubmitBody = z.infer<typeof submitBodySchema>;

/** `buyer` sotib oluvchi shartnomadan olinadi (contractId), mijoz yuborgan matndan emas */
const FORM_FIELDS: readonly CargoFieldKey[] = CARGO_STEPS.map((s) => s.key).filter((k) => k !== 'buyer');

export type FormValidation = { ok: true; data: CargoData } | { ok: false; errors: Partial<Record<CargoFieldKey, string>> };

/** Bo'sh maydonlar o'tkazib yuboriladi; to'ldirilganlari maydon turiga qarab tekshiriladi va normallashtiriladi */
export function validateFormFields(body: SubmitBody): FormValidation {
  const data: CargoData = {};
  const errors: Partial<Record<CargoFieldKey, string>> = {};
  for (const key of FORM_FIELDS) {
    const raw = body[key as keyof SubmitBody];
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const step = CARGO_STEPS.find((s) => s.key === key);
    if (!step) continue;
    const parsed = parseStepInput(step.kind, key, raw);
    if (parsed.ok) data[key] = parsed.value;
    else errors[key] = parsed.error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}
