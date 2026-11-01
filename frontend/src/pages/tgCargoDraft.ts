// Mini App: yuk arizasi (qoralama) bilan ishlash uchun sof holat qatlami. React'ga bog'liq emas — alohida test qilinadi.
// Turlar backend `client-cargo-draft.ts` / `client-cargo-draft.service.ts` bilan mos.

export type HeaderField = 'invoiceNumber' | 'deliveryTerms' | 'customsPlace' | 'destination' | 'vehicleNumber' | 'orderNumber' | 'temperature' | 'sensorSerial';
export type ItemField = 'product' | 'boxCount' | 'boxWeight' | 'palletCount' | 'palletWeight' | 'netto' | 'brutto' | 'price';
export type ManualKey = 'deliveryTerms' | 'customsPlace' | 'destination';

export const HEADER_FIELDS: readonly HeaderField[] = ['invoiceNumber', 'deliveryTerms', 'customsPlace', 'destination', 'vehicleNumber', 'orderNumber', 'temperature', 'sensorSerial'];
export const ITEM_FIELDS: readonly ItemField[] = ['product', 'boxCount', 'boxWeight', 'palletCount', 'palletWeight', 'netto', 'brutto', 'price'];

export interface FieldAuthor {
  tgUserId: number;
  name: string;
  at: string;
}

export interface MissingField {
  path: string;
  label: string;
  itemNumber: number | null;
}

export type DraftStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface DraftView {
  id: number;
  status: DraftStatus;
  version: number;
  data: {
    contractId: number | null;
    branchId: number | null;
    header: Partial<Record<HeaderField, string>>;
    items: Array<{ uid: string; fields: Partial<Record<ItemField, string>>; bruttoManual: boolean }>;
  };
  authors: Record<string, FieldAuthor>;
  missing: MissingField[];
  complete: boolean;
  messageId: number | null;
  completedByName: string | null;
}

export interface DraftPatch {
  contractId?: number | null;
  branchId?: number | null;
  header?: Partial<Record<HeaderField, string | null>>;
  items?: Record<string, null | { fields?: Partial<Record<ItemField, string | null>>; bruttoManual?: boolean }>;
}

export interface SnapshotItem {
  uid: string;
  fields: Record<ItemField, string>;
  bruttoManual: boolean;
}

/** Formadagi qiymatlarning serverga mos ko'rinishi: saqlangan holat (base) bilan hozirgisini solishtirish uchun */
export interface FormSnapshot {
  contractId: number | null;
  branchId: number | null;
  header: Record<HeaderField, string>;
  items: SnapshotItem[];
}

/** Serverdagi uid qoidasi: `/^[A-Za-z0-9_-]{1,24}$/` */
export function makeUid(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `u${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')}`;
}

const blankItemFields = (): Record<ItemField, string> => ({ product: '', boxCount: '', boxWeight: '', palletCount: '', palletWeight: '', netto: '', brutto: '', price: '' });
const blankHeader = (): Record<HeaderField, string> => ({ invoiceNumber: '', deliveryTerms: '', customsPlace: '', destination: '', vehicleNumber: '', orderNumber: '', temperature: '', sensorSerial: '' });

export function snapshotFromDraft(view: DraftView | null): FormSnapshot {
  if (!view) return { contractId: null, branchId: null, header: blankHeader(), items: [{ uid: makeUid(), fields: blankItemFields(), bruttoManual: false }] };
  const header = blankHeader();
  for (const key of HEADER_FIELDS) header[key] = view.data.header[key] ?? '';
  const items: SnapshotItem[] = view.data.items.map((item) => ({
    uid: item.uid,
    fields: { ...blankItemFields(), ...item.fields },
    bruttoManual: item.bruttoManual,
  }));
  if (items.length === 0) items.push({ uid: makeUid(), fields: blankItemFields(), bruttoManual: false });
  return { contractId: view.data.contractId, branchId: view.data.branchId, header, items };
}

const isBlankItem = (item: SnapshotItem): boolean => !item.bruttoManual && ITEM_FIELDS.every((k) => item.fields[k] === '');
const valueOrNull = (value: string): string | null => (value === '' ? null : value);

/** Faqat saqlangan holatdan farq qilgan maydonlar; hech narsa o'zgarmagan bo'lsa null (so'rov yuborilmaydi) */
export function buildPatch(base: FormSnapshot, current: FormSnapshot): DraftPatch | null {
  const patch: DraftPatch = {};
  if (base.contractId !== current.contractId) patch.contractId = current.contractId;
  if (base.branchId !== current.branchId) patch.branchId = current.branchId;

  const header: Partial<Record<HeaderField, string | null>> = {};
  for (const key of HEADER_FIELDS) {
    if (base.header[key] !== current.header[key]) header[key] = valueOrNull(current.header[key]);
  }
  if (Object.keys(header).length > 0) patch.header = header;

  const items: NonNullable<DraftPatch['items']> = {};
  const baseByUid = new Map(base.items.map((item) => [item.uid, item]));
  const currentUids = new Set(current.items.map((item) => item.uid));
  for (const item of base.items) {
    // Bo'sh tovar serverda saqlanmagan (yoki zararsiz) — o'chirish so'rovi kalitlar chegarasini ortiqcha band qilmasin
    if (!currentUids.has(item.uid) && !isBlankItem(item)) items[item.uid] = null;
  }
  for (const item of current.items) {
    const before = baseByUid.get(item.uid);
    if (!before && isBlankItem(item)) continue;
    const fields: Partial<Record<ItemField, string | null>> = {};
    for (const key of ITEM_FIELDS) {
      // Qo'lda emas Brutto serverda hisoblanadi: eskirgan brauzer o'z hisobini yuborib boshqa odam qiymatini buzmasin
      if (key === 'brutto' && !item.bruttoManual) continue;
      const previous = before?.fields[key] ?? '';
      if (previous !== item.fields[key]) fields[key] = valueOrNull(item.fields[key]);
    }
    const manualChanged = (before?.bruttoManual ?? false) !== item.bruttoManual;
    if (Object.keys(fields).length === 0 && !manualChanged) continue;
    // Qo'lda Brutto serverda faqat bruttoManual:true bilan birga qabul qilinadi
    const sendManual = manualChanged || (item.bruttoManual && 'brutto' in fields);
    items[item.uid] = {
      ...(Object.keys(fields).length > 0 ? { fields } : {}),
      ...(sendManual ? { bruttoManual: item.bruttoManual } : {}),
    };
  }
  if (Object.keys(items).length > 0) patch.items = items;

  return Object.keys(patch).length > 0 ? patch : null;
}

export type ManualFlags = Record<ManualKey, boolean>;

/** Qiymat bor-u, shartnoma variantlarida yo'q bo'lsa — foydalanuvchi uni qo'lda yozgan */
export function deriveManualFlags(
  header: Record<HeaderField, string>,
  contract: { cities: Array<{ text: string }>; customs: string[]; destinations: string[] } | null
): ManualFlags {
  const isManual = (value: string, options: string[] | null): boolean => value !== '' && (options === null || !options.includes(value));
  return {
    deliveryTerms: isManual(header.deliveryTerms, contract ? contract.cities.map((c) => c.text) : null),
    customsPlace: isManual(header.customsPlace, contract ? contract.customs : null),
    destination: isManual(header.destination, contract ? contract.destinations : null),
  };
}

/** Avto raqami faqat lotin alifbosida (invoys dasturidagi qoida bilan bir xil): kirill belgilari (U+0400–U+04FF) o'chiriladi */
export function stripCyrillic(raw: string): { value: string; stripped: boolean } {
  const value = raw.replace(/[Ѐ-ӿ]/g, '');
  return { value, stripped: value !== raw };
}
