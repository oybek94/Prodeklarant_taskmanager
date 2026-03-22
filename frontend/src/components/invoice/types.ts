// Invoice moduli uchun barcha tiplar va konstantalar

import apiClient from '../../lib/api';

// --- Interfaces ---

export interface InvoiceItem {
  id?: number;
  tnvedCode?: string;
  pluCode?: string;
  name: string;
  packageType?: string;
  unit: string;
  quantity: number;
  packagesCount?: number;
  grossWeight?: number;
  netWeight?: number;
  /** Netto formulasi, masalan "*1.2" — Brutto/Кол-во упаковки o'zgarganda shu bo'yicha qayta hisoblanadi */
  netWeightFormula?: string;
  unitPrice: number;
  totalPrice: number;
  orderIndex?: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  contractNumber?: string;
  taskId: number;
  clientId: number;
  branchId: number;
  date: string;
  currency: 'USD' | 'UZS';
  totalAmount: number;
  notes?: string;
  additionalInfo?: any;
}

export interface RegionCode {
  id: number;
  name: string;
  internalCode: string;
  externalCode: string;
}

export interface Contract {
  id: number;
  contractNumber: string;
  contractDate: string;
  sellerName: string;
  sellerLegalAddress: string;
  sellerDetails?: string;
  sellerInn?: string;
  sellerOgrn?: string;
  sellerBankName?: string;
  sellerBankAddress?: string;
  sellerBankAccount?: string;
  sellerBankSwift?: string;
  sellerCorrespondentBank?: string;
  sellerCorrespondentBankAccount?: string;
  sellerCorrespondentBankSwift?: string;
  buyerName: string;
  buyerAddress: string;
  buyerDetails?: string;
  buyerInn?: string;
  buyerOgrn?: string;
  buyerBankName?: string;
  buyerBankAddress?: string;
  buyerBankAccount?: string;
  buyerBankSwift?: string;
  buyerCorrespondentBank?: string;
  buyerCorrespondentBankAccount?: string;
  buyerCorrespondentBankSwift?: string;
  shipperName?: string;
  shipperAddress?: string;
  shipperDetails?: string;
  shipperInn?: string;
  shipperOgrn?: string;
  shipperBankName?: string;
  shipperBankAddress?: string;
  shipperBankAccount?: string;
  shipperBankSwift?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeDetails?: string;
  consigneeInn?: string;
  consigneeOgrn?: string;
  consigneeBankName?: string;
  consigneeBankAddress?: string;
  consigneeBankAccount?: string;
  consigneeBankSwift?: string;
  deliveryTerms?: string;
  customsAddress?: string;
  paymentMethod?: string;
  contractCurrency?: string;
  supplierDirector?: string;
  goodsReleasedBy?: string;
  signatureUrl?: string;
  sealUrl?: string;
  sellerSignatureUrl?: string;
  sellerSealUrl?: string;
  buyerSignatureUrl?: string;
  buyerSealUrl?: string;
  consigneeSignatureUrl?: string;
  consigneeSealUrl?: string;
  companyLogoUrl?: string;
  gln?: string;
  specification?: Array<{ productName?: string; quantity?: number; unit?: string; unitPrice?: number; totalPrice?: number }>;
}

export interface Task {
  id: number;
  title: string;
  client: {
    id: number;
    name: string;
    address?: string;
    inn?: string;
    phone?: string;
    email?: string;
    bankName?: string;
    bankAddress?: string;
    bankAccount?: string;
    transitAccount?: string;
    bankSwift?: string;
    correspondentBank?: string;
    correspondentBankAccount?: string;
    correspondentBankSwift?: string;
    contractNumber?: string;
  };
  branch?: {
    id: number;
    name: string;
  };
}

// --- Type Aliases ---

export type SpecRow = {
  productName?: string;
  tnvedCode?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
};

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export type ChangeLogEntry = {
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  changedAt?: string;
};

export type ViewTab = 'invoice' | 'spec' | 'packing';

export type FssFilePrefix = 'Ichki' | 'Tashqi';

// --- Constants ---

export const UNIT_OPTIONS = ['кг', 'шт', 'л', 'м', 'т', 'упак.', 'ящ.', 'кор.', 'меш.', 'бут.', 'банк.'];

export const DEFAULT_VISIBLE_COLUMNS = {
  index: true,
  tnved: true,
  plu: true,
  name: true,
  package: true,
  packagesCount: true,
  unit: true,
  quantity: true,
  gross: true,
  net: true,
  unitPrice: true,
  total: true,
  actions: true,
};

export type VisibleColumns = typeof DEFAULT_VISIBLE_COLUMNS;

export const DEFAULT_COLUMN_LABELS = {
  index: '№',
  tnved: 'Код ТН ВЭД',
  plu: 'Код PLU',
  name: 'Наименование товара',
  package: 'Вид упаковки',
  packagesCount: 'Кол-во упаковки',
  unit: 'Ед. изм.',
  quantity: 'Мест',
  gross: 'Брутто (кг)',
  net: 'Нетто (кг)',
  unitPrice: 'Цена за ед.изм.',
  total: 'Сумма с НДС',
  actions: 'Amallar',
};

export type ColumnLabels = typeof DEFAULT_COLUMN_LABELS;
export type ColumnLabelKey = keyof typeof DEFAULT_COLUMN_LABELS;

// --- Utility Functions ---

/** Backend upload URL ni to'liq URL ga aylantirish */
export const resolveUploadUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = apiClient.defaults.baseURL || '';
  if (!base || base.startsWith('/')) return url;
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${url}`;
};

/** Foydalanuvchi roli invoys tahrirlash uchun yetarlimi */
export const canEditInvoices = (role: string | undefined) => role === 'ADMIN' || role === 'MANAGER' || role === 'DEKLARANT';

/** Invoice additionalInfo dan visibleColumns ni olish */
export const getVisibleColumnsFromPayload = (
  payload: Record<string, unknown> | null | undefined
): VisibleColumns | null => {
  if (!payload || typeof payload !== 'object' || !payload.visibleColumns || typeof payload.visibleColumns !== 'object')
    return null;
  const v = payload.visibleColumns as Record<string, boolean>;
  return { ...DEFAULT_VISIBLE_COLUMNS, ...v };
};

/** Default invoys item (yangi qator qo'shishda) */
export const createDefaultItem = (): InvoiceItem => ({
  name: '',
  unit: 'кг',
  quantity: 0,
  packagesCount: undefined,
  unitPrice: 0,
  totalPrice: 0,
});
