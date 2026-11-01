// Yuk arizasi (qoralama) yadrosi: majburiy maydonlar, o'zgarishlarni birlashtirish va Mini App ishga tushirish parametri.
// Sof funksiyalar — bazaga va Telegram'ga bog'liq emas, alohida test qilinadi.

import { z } from 'zod';
import { CargoItem, HEADER_FIELDS, HeaderKey, ITEM_FIELDS, ItemKey, parseFieldInput } from './client-cargo-form';
import { FieldErrors, MAX_ITEMS } from './client-cargo-miniapp';

/** Kontrakt va jo'natish joyi qoralamada contractId/branchId orqali saqlanadi, matn sifatida emas */
export type DraftHeaderKey = Exclude<HeaderKey, 'contract' | 'shipmentPlace'>;

export interface DraftItem {
  uid: string;
  fields: CargoItem;
  /** Brutto qo'lda o'zgartirilgan — boshqa odam og'irlikni o'zgartirsa ham qayta hisoblanmaydi */
  bruttoManual: boolean;
}

export interface DraftData {
  contractId: number | null;
  branchId: number | null;
  header: Partial<Record<DraftHeaderKey, string>>;
  items: DraftItem[];
}

export interface FieldAuthor {
  tgUserId: number;
  name: string;
  at: string;
}

/** Kalitlar: `contractId`, `branchId`, `header.<key>`, `items.<uid>.<key>` */
export type AuthorMap = Record<string, FieldAuthor>;

export const EMPTY_DRAFT_DATA: DraftData = { contractId: null, branchId: null, header: {}, items: [] };

export interface MissingField {
  path: string;
  label: string;
  /** Tovar maydoni bo'lsa 1 dan boshlab tovar raqami, sarlavha maydoni uchun null */
  itemNumber: number | null;
}

const HEADER_KEYS: readonly DraftHeaderKey[] = ['invoiceNumber', 'deliveryTerms', 'customsPlace', 'destination', 'vehicleNumber', 'orderNumber', 'temperature', 'sensorSerial'];
const ITEM_KEYS: readonly ItemKey[] = ['product', 'boxCount', 'boxWeight', 'palletCount', 'palletWeight', 'netto', 'brutto', 'price'];

const REQUIRED_HEADER_KEYS: readonly DraftHeaderKey[] = ['deliveryTerms', 'customsPlace'];
const REQUIRED_ITEM_KEYS: readonly ItemKey[] = ['product', 'boxCount', 'netto', 'brutto'];

const headerLabel = (key: HeaderKey): string => HEADER_FIELDS.find((f) => f.key === key)?.label ?? key;
const itemLabel = (key: ItemKey): string => ITEM_FIELDS.find((f) => f.key === key)?.label ?? key;

const isFilled = (value: string | undefined): boolean => typeof value === 'string' && value.trim() !== '';
const isItemBlank = (item: DraftItem): boolean => !ITEM_KEYS.some((k) => isFilled(item.fields[k]));

/** Majburiy maydonlardan hali to'ldirilmaganlari (tartib: filial, sarlavha, tovarlar) */
export function getMissingRequired(data: DraftData): MissingField[] {
  const missing: MissingField[] = [];
  if (data.branchId === null) missing.push({ path: 'branchId', label: headerLabel('shipmentPlace'), itemNumber: null });
  for (const key of REQUIRED_HEADER_KEYS) {
    if (!isFilled(data.header[key])) missing.push({ path: `header.${key}`, label: headerLabel(key), itemNumber: null });
  }

  const filledItems = data.items.filter((item) => !isItemBlank(item));
  if (filledItems.length === 0) {
    for (const key of REQUIRED_ITEM_KEYS) missing.push({ path: `items.*.${key}`, label: itemLabel(key), itemNumber: 1 });
    return missing;
  }
  filledItems.forEach((item, index) => {
    for (const key of REQUIRED_ITEM_KEYS) {
      if (!isFilled(item.fields[key])) missing.push({ path: `items.${item.uid}.${key}`, label: itemLabel(key), itemNumber: index + 1 });
    }
  });
  return missing;
}

const MAX_VALUE_LENGTH = 300;
const textValue = z.string().max(MAX_VALUE_LENGTH).nullable();
const uidSchema = z.string().regex(/^[A-Za-z0-9_-]{1,24}$/);

const headerPatchSchema = z
  .object({
    invoiceNumber: textValue,
    deliveryTerms: textValue,
    customsPlace: textValue,
    destination: textValue,
    vehicleNumber: textValue,
    orderNumber: textValue,
    temperature: textValue,
    sensorSerial: textValue,
  })
  .partial()
  .strict();

const itemFieldsPatchSchema = z
  .object({
    product: textValue,
    boxCount: textValue,
    boxWeight: textValue,
    palletCount: textValue,
    palletWeight: textValue,
    netto: textValue,
    brutto: textValue,
    price: textValue,
  })
  .partial()
  .strict();

const itemPatchSchema = z.object({ fields: itemFieldsPatchSchema.optional(), bruttoManual: z.boolean().optional() }).strict();

/** Faqat o'zgargan maydonlar. null/'' — maydonni tozalash; items[uid] = null — tovarni o'chirish. */
export const draftPatchSchema = z
  .object({
    contractId: z.number().int().positive().nullable().optional(),
    branchId: z.number().int().positive().nullable().optional(),
    header: headerPatchSchema.optional(),
    items: z
      .record(uidSchema, z.union([z.null(), itemPatchSchema]))
      .refine((items) => Object.keys(items).length <= MAX_ITEMS, { message: `Ko'pi bilan ${MAX_ITEMS} ta tovar` })
      .optional(),
  })
  .strict();

export type DraftPatch = z.infer<typeof draftPatchSchema>;

export type ApplyPatchResult =
  | { ok: true; data: DraftData; authors: AuthorMap; changedPaths: string[] }
  | { ok: false; errors: FieldErrors };

const cloneData = (data: DraftData): DraftData => ({
  contractId: data.contractId,
  branchId: data.branchId,
  header: { ...data.header },
  items: data.items.map((item) => ({ uid: item.uid, fields: { ...item.fields }, bruttoManual: item.bruttoManual })),
});

/**
 * Qoralamaga o'zgarishlarni qo'llaydi. Faqat haqiqatan o'zgargan maydonlar muallifini yangilaydi:
 * bir xil qiymat qayta yuborilsa avvalgi muallif qoladi. Xato bo'lsa hech narsa qo'llanmaydi.
 */
export function applyDraftPatch(data: DraftData, authors: AuthorMap, patch: DraftPatch, author: FieldAuthor): ApplyPatchResult {
  const next = cloneData(data);
  const nextAuthors: AuthorMap = { ...authors };
  const changedPaths: string[] = [];
  const errors: FieldErrors = {};
  const stamp = (path: string) => {
    nextAuthors[path] = { tgUserId: author.tgUserId, name: author.name, at: author.at };
  };

  /** Bitta matnli maydonni qo'llaydi; qiymat yangilangan yoki tozalangan bo'lsa true */
  const applyText = (
    store: Partial<Record<string, string>>,
    key: string,
    kind: 'text' | 'count' | 'decimal',
    raw: string | null,
    path: string,
    errorKey: string
  ): void => {
    if (raw === null || raw.trim() === '') {
      if (store[key] !== undefined) {
        delete store[key];
        delete nextAuthors[path];
        changedPaths.push(path);
      }
      return;
    }
    const parsed = parseFieldInput(kind, key as HeaderKey | ItemKey, raw);
    if (!parsed.ok) {
      errors[errorKey] = parsed.error;
      return;
    }
    if (store[key] === parsed.value) return;
    store[key] = parsed.value;
    stamp(path);
    changedPaths.push(path);
  };

  for (const key of ['contractId', 'branchId'] as const) {
    const value = patch[key];
    if (value === undefined || value === next[key]) continue;
    next[key] = value;
    if (value === null) delete nextAuthors[key];
    else stamp(key);
    changedPaths.push(key);
  }

  for (const key of HEADER_KEYS) {
    const raw = patch.header?.[key];
    if (raw === undefined) continue;
    const spec = HEADER_FIELDS.find((f) => f.key === key);
    applyText(next.header, key, spec?.kind ?? 'text', raw, `header.${key}`, key);
  }

  for (const [uid, entry] of Object.entries(patch.items ?? {})) {
    if (entry === null) {
      const before = next.items.length;
      next.items = next.items.filter((item) => item.uid !== uid);
      for (const path of Object.keys(nextAuthors)) {
        if (path.startsWith(`items.${uid}.`)) delete nextAuthors[path];
      }
      if (next.items.length !== before) changedPaths.push(`items.${uid}`);
      continue;
    }
    let item = next.items.find((it) => it.uid === uid);
    if (!item) {
      item = { uid, fields: {}, bruttoManual: false };
      next.items.push(item);
      changedPaths.push(`items.${uid}`);
    }
    for (const key of ITEM_KEYS) {
      const raw = entry.fields?.[key];
      if (raw === undefined) continue;
      const spec = ITEM_FIELDS.find((f) => f.key === key);
      applyText(item.fields, key, spec?.kind ?? 'text', raw, `items.${uid}.${key}`, `items.${uid}.${key}`);
    }
    if (entry.bruttoManual !== undefined) item.bruttoManual = entry.bruttoManual;
  }

  if (next.items.length > MAX_ITEMS) errors.items = `Ko'pi bilan ${MAX_ITEMS} ta tovar bo'lishi mumkin`;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: next, authors: nextAuthors, changedPaths };
}

export interface LaunchParam {
  chatId: string;
  /** Mavjud ariza raqami, 'new' — yangi ariza, null — eski tugma (yangi ariza sifatida ochiladi) */
  draft: number | 'new' | null;
}

/** Mini App start_param: `-100...`, `-100..._new` yoki `-100..._<arizaId>` */
export function parseLaunchParam(startParam: string | null): LaunchParam | null {
  if (!startParam) return null;
  const match = /^(-\d{5,20})(?:_(new|[1-9]\d{0,9}))?$/.exec(startParam);
  if (!match) return null;
  const [, chatId, draft] = match;
  if (draft === undefined) return { chatId, draft: null };
  return { chatId, draft: draft === 'new' ? 'new' : Number(draft) };
}
