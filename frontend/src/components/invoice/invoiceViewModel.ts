// Saqlangan invoysni forma / ustun / PDF holatiga aylantirish qoidalari (sof funksiyalar).
// Invoys sahifasi ham, mijoz guruhiga PDF chizadigan server dasturi (src/server-pdf) ham
// AYNAN shulardan foydalanadi — qoida bir joyda o'zgaradi, ikkala hujjat bir xil qoladi.

import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_VISIBLE_COLUMNS,
  getLocalDateString,
  getVisibleColumnsFromPayload,
  type CustomField,
  type InvoiceFormData,
  type InvoiceItem,
  type RegionCode,
  type VisibleColumns,
} from './types';

export interface SavedInvoice {
  invoiceNumber?: string | null;
  date?: string | null;
  currency?: string | null;
  contractNumber?: string | null;
  notes?: string | null;
  additionalInfo?: Record<string, unknown> | null;
}

/** Saqlangan invoys maydonlarini formaning oldingi holati ustiga yozadi */
export const invoiceToFormPatch = (
  inv: SavedInvoice,
  prev: InvoiceFormData,
  branchDefaultRegion?: RegionCode | null
): InvoiceFormData => {
  const ai = inv.additionalInfo ?? {};
  const saved = <K extends keyof InvoiceFormData & string>(key: K, fallback: InvoiceFormData[K]): InvoiceFormData[K] =>
    (ai[key] ?? fallback) as InvoiceFormData[K];

  return {
    ...prev,
    invoiceNumber: inv.invoiceNumber || undefined,
    date: inv.date ? inv.date.split('T')[0] : getLocalDateString(),
    currency: (inv.currency || 'USD') as InvoiceFormData['currency'],
    contractNumber: inv.contractNumber || '',
    paymentTerms: saved('paymentTerms', prev.paymentTerms),
    dueDate: saved('dueDate', prev.dueDate),
    poNumber: saved('poNumber', prev.poNumber),
    notes: inv.notes ?? prev.notes,
    terms: saved('terms', prev.terms),
    tax: saved('tax', prev.tax),
    discount: saved('discount', prev.discount),
    shipping: saved('shipping', prev.shipping),
    amountPaid: saved('amountPaid', prev.amountPaid),
    deliveryTerms: saved('deliveryTerms', prev.deliveryTerms),
    vehicleNumber: saved('vehicleNumber', prev.vehicleNumber),
    vehicleWeight: saved('vehicleWeight', prev.vehicleWeight),
    fssRegionInternalCode: saved('fssRegionInternalCode', branchDefaultRegion?.internalCode ?? prev.fssRegionInternalCode),
    fssRegionName: saved('fssRegionName', branchDefaultRegion?.name ?? prev.fssRegionName),
    fssRegionExternalCode: saved('fssRegionExternalCode', branchDefaultRegion?.externalCode ?? prev.fssRegionExternalCode),
    loaderWeight: saved('loaderWeight', prev.loaderWeight),
    trailerWeight: saved('trailerWeight', prev.trailerWeight),
    palletWeight: saved('palletWeight', prev.palletWeight),
    trailerNumber: saved('trailerNumber', prev.trailerNumber),
    smrNumber: saved('smrNumber', prev.smrNumber),
    shipmentPlace: saved('shipmentPlace', prev.shipmentPlace),
    customsAddress: saved('customsAddress', prev.customsAddress),
    destination: saved('destination', prev.destination),
    manufacturer: saved('manufacturer', prev.manufacturer),
    orderNumber: saved('orderNumber', prev.orderNumber),
    gln: saved('gln', prev.gln),
    harvestYear: saved('harvestYear', prev.harvestYear),
    documents: saved('documents', prev.documents),
    carrier: saved('carrier', prev.carrier),
    tirNumber: saved('tirNumber', prev.tirNumber),
    temperature: saved('temperature', prev.temperature),
    additionalInfo: {
      ...(prev.additionalInfo || {}),
      tareRules: ai.tareRules ?? [],
    },
  };
};

/** additionalInfo dagi qo'shimcha maydonlar ro'yxati; id yo'q bo'lsa beriladi */
export const parseSavedFields = (raw: unknown): CustomField[] =>
  Array.isArray(raw)
    ? raw.map((f: { id?: string; label?: string; value?: string }, idx: number) => ({
        id: f?.id && String(f.id).trim() !== '' ? String(f.id) : `loaded_${Date.now()}_${idx}`,
        label: String(f?.label ?? ''),
        value: String(f?.value ?? ''),
      }))
    : [];

export interface ColumnState {
  visibleColumns: VisibleColumns;
  columnOrder: string[];
  customColumns: string[];
}

/** Saqlangan ustun ko'rinishi va tartibi. Ko'rinish saqlanmagan bo'lsa hammasi standart. */
export const restoreColumnState = (additionalInfo: Record<string, unknown> | null | undefined): ColumnState => {
  const visible = getVisibleColumnsFromPayload(additionalInfo);
  if (!additionalInfo || !visible) {
    return { visibleColumns: DEFAULT_VISIBLE_COLUMNS, columnOrder: DEFAULT_COLUMN_ORDER, customColumns: [] };
  }

  let columnOrder = DEFAULT_COLUMN_ORDER;
  if (Array.isArray(additionalInfo.columnOrder)) {
    const savedOrder = [...(additionalInfo.columnOrder as string[])];
    const missing = DEFAULT_COLUMN_ORDER.filter((c) => !savedOrder.includes(c));
    if (missing.includes('shtCount')) {
      const qIdx = savedOrder.indexOf('quantity');
      if (qIdx !== -1) {
        savedOrder.splice(qIdx + 1, 0, 'shtCount');
        missing.splice(missing.indexOf('shtCount'), 1);
      }
    }
    columnOrder = [...savedOrder, ...missing];
  }

  return {
    visibleColumns: visible,
    columnOrder,
    customColumns: Array.isArray(additionalInfo.customColumns) ? (additionalInfo.customColumns as string[]) : [],
  };
};

/** PDF'da chiqadigan ustunlar tartib bo'yicha */
export const orderVisibleColumns = (columnOrder: string[], effectiveColumns: VisibleColumns, items: InvoiceItem[]): string[] => {
  const hasSht = items.some((i) => i.unit === 'шт' || i.unit === 'шт.');
  return columnOrder.filter((key) => {
    if (key === 'actions') return false; // PDF da actions umuman chiqmaydi
    if (key === 'shtCount') return hasSht && effectiveColumns['shtCount'];
    return effectiveColumns[key];
  });
};

interface PartyNames {
  sellerName?: string | null;
  shipperName?: string | null;
  buyerName?: string | null;
  consigneeName?: string | null;
}

export const getPartyRoles = (contract: PartyNames | null | undefined) => ({
  isSellerShipper:
    !!contract?.sellerName && (!contract.shipperName || contract.shipperName.trim() === contract.sellerName.trim()),
  // isSellerShipper bilan bir xil mantiq: yuk qabul qiluvchi umuman ko'rsatilmagan
  // bo'lsa ham sotib oluvchi o'zi yuk qabul qiluvchi hisoblanadi
  // (sarlavha "Покупатель/Грузополучатель" bo'ladi).
  isBuyerConsignee:
    !!contract?.buyerName && (!contract.consigneeName || contract.consigneeName.trim() === contract.buyerName.trim()),
});

const SUPPORTED_CURRENCIES = ['USD', 'UZS', 'RUB', 'EUR'];

/** Shartnoma valyutasi; yo'q yoki noma'lum bo'lsa USD */
export const getContractCurrency = (contract: { contractCurrency?: string | null } | null | undefined): string =>
  contract?.contractCurrency && SUPPORTED_CURRENCIES.includes(contract.contractCurrency) ? contract.contractCurrency : 'USD';

export const getTotalColumnLabel = (currency: string, fallback: string): string => {
  if (currency === 'USD') return 'Общая сумма в Долл. США';
  if (currency === 'RUB') return 'Общая сумма Рубли РФ';
  if (currency === 'EUR') return 'Общая сумма в Евро';
  if (currency === 'UZS') return 'Стоимость поставки в узбекских сумах';
  return fallback;
};
