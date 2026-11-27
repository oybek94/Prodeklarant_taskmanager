// Yuk arizasini invoys kiritmasiga o'girish. Sof funksiyalar — bazaga va Telegram'ga bog'liq emas.

import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { DraftData, DraftItem } from './client-cargo-draft';
import type { invoiceSchema } from './invoice-save.service';
import { findClosestProductName } from './product-name-match';

export type CargoInvoiceInput = z.input<typeof invoiceSchema>;

export interface InvoiceText {
  number?: string;
  /** YYYY-MM-DD */
  date?: string;
  /** Sana yozilgan, lekin o'qib bo'lmadi */
  invalidDate: boolean;
}

const DATE_AFTER_SEPARATOR = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?!\d)/;
/** "от" so'zisiz oxirdagi sana: faqat nuqtali yozuv, invoys raqami sana deb olinmasin */
const TRAILING_DATE = /(?:^|\s)(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})\s*(?:года|год|г\.?)?$/i;
const SEPARATOR = /(?:^|\s)от(?=\s|\d)/i;

function toIsoDate(day: string, month: string, year: string): string | null {
  const y = year.length === 2 ? 2000 + Number(year) : Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

const cleanNumber = (value: string): { number?: string } => {
  const number = value.replace(/[\s,;]+$/, '').trim();
  return number ? { number } : {};
};

/** "Инвойс № 1/26 от 01.02.2026 год" → raqam va sana */
export function parseInvoiceText(raw: string | undefined): InvoiceText {
  const text = (raw ?? '').replace(/инвойс|invoice/gi, ' ').replace(/№/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return { invalidDate: false };

  const separator = SEPARATOR.exec(text);
  if (separator) {
    const number = cleanNumber(text.slice(0, separator.index));
    const match = DATE_AFTER_SEPARATOR.exec(text.slice(separator.index + separator[0].length));
    const date = match ? toIsoDate(match[1], match[2], match[3]) : null;
    return date ? { ...number, date, invalidDate: false } : { ...number, invalidDate: true };
  }

  const trailing = TRAILING_DATE.exec(text);
  if (trailing) {
    const number = cleanNumber(text.slice(0, trailing.index));
    const date = toIsoDate(trailing[1], trailing[2], trailing[3]);
    return date ? { ...number, date, invalidDate: false } : { ...number, invalidDate: true };
  }
  return { ...cleanNumber(text), invalidDate: false };
}

export interface ProductSources {
  /** Sozlamalar → TNVED ro'yxati */
  global: Array<{ name: string; code: string }>;
  /** Shartnoma spetsifikatsiyasi */
  spec: Array<{ productName?: string; tnvedCode?: string; unitPrice?: number }>;
  /** Shu shartnomada avval ishlatilgan tovarlar */
  history: Array<{ name: string; code: string }>;
}

interface ProductDefaults {
  tnvedCode?: string;
  unitPrice?: number;
}

const normalizeName = (value: string): string => value.trim().toLowerCase();

/** Aynan mos nom bo'yicha. Ustuvorlik frontend resolveProductDefaults bilan bir xil: global → spetsifikatsiya → tarix */
function exactDefaults(name: string, sources: ProductSources): ProductDefaults {
  const wanted = normalizeName(name);
  const result: ProductDefaults = {};

  const global = sources.global.find((p) => normalizeName(p.name) === wanted);
  if (global?.code) result.tnvedCode = global.code;

  const spec = sources.spec.find((r) => normalizeName(r.productName ?? '') === wanted);
  if (spec) {
    if (!result.tnvedCode && spec.tnvedCode?.trim()) result.tnvedCode = spec.tnvedCode.trim();
    if (spec.unitPrice != null) result.unitPrice = Number(spec.unitPrice);
  }

  if (!result.tnvedCode) {
    const used = sources.history.find((p) => normalizeName(p.name) === wanted);
    if (used?.code) result.tnvedCode = used.code;
  }
  return result;
}

/** Tovar nomi o'zgartirilmaydi — faqat kod va narx: avval aynan moslik, bo'lmasa umumiy tur so'zi bo'yicha */
export function resolveCargoProductDefaults(name: string, sources: ProductSources): ProductDefaults {
  const direct = exactDefaults(name, sources);
  if (direct.tnvedCode) return direct;

  const closest = findClosestProductName(name, [
    ...sources.spec.map((r) => r.productName ?? ''),
    ...sources.global.map((p) => p.name),
    ...sources.history.map((p) => p.name),
  ]);
  if (!closest) return direct;
  const found = exactDefaults(closest, sources);
  if (!found.tnvedCode) return direct;
  const unitPrice = direct.unitPrice ?? found.unitPrice;
  return unitPrice === undefined ? { tnvedCode: found.tnvedCode } : { tnvedCode: found.tnvedCode, unitPrice };
}

export interface CargoInvoiceContext {
  contract: { id: number; contractNumber: string; contractCurrency: string | null; gln: string | null } | null;
  shipmentPlace: string;
  /** Filialning standart FSS tumani */
  region: { internalCode: string; name: string; externalCode: string } | null;
  /** Shu shartnomaning oxirgi invoysi */
  previousAdditionalInfo: Record<string, unknown> | null;
  packagingTypes: Array<{ name: string; code: string }>;
  sources: ProductSources;
}

/** Oldingi invoysdan ko'chadigan doimiy qiymatlar (yukka xos maydonlar ko'chmaydi) */
const CARRIED_KEYS = [
  'manufacturer',
  'harvestYear',
  'visibleColumns',
  'columnLabels',
  'columnOrder',
  'customColumns',
  'visibleAdditionalInfoFields',
  'additionalFieldsOrder',
  'pdfFontSizes',
] as const;

const ORIGIN = 'Республика Узбекистан';
/** Dasturdagi (AdditionalInfoModal) avtomatik izoh bilan aynan bir xil — keyin tahrirda takrorlanmaydi */
const palletNote = (weight: string): string => `Товары уложены на деревянных паллетах которые не являются товаром весом ${weight} кг.`;

const optionalNumber = (value: string | undefined): number | undefined => (value ? Number(value) : undefined);
const isFilled = (item: DraftItem): boolean => Object.values(item.fields).some((v) => !!v?.trim());
/** undefined va bo'sh qiymatli kalitlarni tashlaydi */
const compact = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ''));

function toItem(item: DraftItem, index: number, sources: ProductSources) {
  const { fields } = item;
  const name = fields.product ?? '';
  const defaults = resolveCargoProductDefaults(name, sources);
  const unitPrice = optionalNumber(fields.price) ?? defaults.unitPrice ?? 0;
  const totalPrice = new Prisma.Decimal(fields.netto || 0).mul(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return {
    name,
    tnvedCode: defaults.tnvedCode,
    packageType: fields.packagingType,
    unit: 'кг',
    quantity: Number(fields.palletCount || 0),
    packagesCount: optionalNumber(fields.boxCount),
    netWeight: optionalNumber(fields.netto),
    grossWeight: optionalNumber(fields.brutto),
    unitPrice,
    totalPrice: totalPrice.toNumber(),
    orderIndex: index,
  };
}

/**
 * Arizadan invoys kiritmasi. taskId/clientId bu yerda qo'yilmaydi.
 * @param today matnda sana bo'lmasa ishlatiladigan kun (YYYY-MM-DD, Toshkent)
 */
export function buildCargoInvoiceInput(data: DraftData, ctx: CargoInvoiceContext, today: string): CargoInvoiceInput {
  const text = parseInvoiceText(data.header.invoiceNumber);
  const filled = data.items.filter(isFilled);
  const items = filled.map((item, index) => toItem(item, index, ctx.sources));
  const totalAmount = items.reduce((sum, item) => sum.plus(item.totalPrice), new Prisma.Decimal(0)).toNumber();

  const palletWeights = filled.flatMap((item) => (item.fields.palletWeight ? [item.fields.palletWeight] : []));
  const palletWeight = palletWeights.length
    ? palletWeights.reduce((sum, w) => sum.plus(w), new Prisma.Decimal(0)).toString()
    : undefined;

  const previous = ctx.previousAdditionalInfo ?? {};
  const carried = Object.fromEntries(CARRIED_KEYS.flatMap((key) => (previous[key] === undefined ? [] : [[key, previous[key]]])));
  const { header } = data;

  const additionalInfo = {
    ...carried,
    ...compact({
      deliveryTerms: header.deliveryTerms,
      customsAddress: header.customsPlace,
      destination: header.destination,
      vehicleNumber: header.vehicleNumber,
      orderNumber: header.orderNumber,
      temperature: header.temperature,
      shipmentPlace: ctx.shipmentPlace,
      origin: ORIGIN,
      gln: ctx.contract?.gln,
      palletWeight,
      fssRegionInternalCode: ctx.region?.internalCode,
      fssRegionName: ctx.region?.name,
      fssRegionExternalCode: ctx.region?.externalCode,
    }),
    packagingTypeCodes: ctx.packagingTypes,
    ...(header.sensorSerial
      ? { customFields: [{ id: 'cargo_sensor', label: 'Серийный номер датчика', value: header.sensorSerial }] }
      : {}),
  };

  return {
    invoiceNumber: text.number,
    date: text.date ?? today,
    contractId: ctx.contract?.id,
    contractNumber: ctx.contract?.contractNumber,
    currency: ctx.contract?.contractCurrency === 'UZS' ? 'UZS' : 'USD',
    totalAmount,
    notes: palletWeight ? palletNote(palletWeight) : undefined,
    // Oldingi invoysdan ko'chgan qiymatlar tipi noma'lum — servis invoiceSchema bilan tekshiradi
    additionalInfo: additionalInfo as CargoInvoiceInput['additionalInfo'],
    items,
  };
}

/** Vazifa nomi — dasturdagi buildTaskTitle bilan bir xil ("<raqam> АВТО <davlat raqami>") */
export function cargoTaskTitle(invoiceNumber: string, vehicleNumber: string | undefined, contractNumber: string | undefined): string {
  const plate = vehicleNumber?.split(/[/_+,]/)[0].trim();
  if (invoiceNumber && plate) return `${invoiceNumber} АВТО ${plate}`;
  return `Invoice - ${contractNumber || 'yangi'}`;
}
