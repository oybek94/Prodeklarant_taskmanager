// Bazadan kelgan invoysdan PDF props'ini yig'ish — invoys sahifasi (pages/Invoice.tsx)
// "pechatsiz PDF" tugmasi bosilganda uzatadigan qiymatlarning aynan o'zi.
// Umumiy qoidalar components/invoice/invoiceViewModel.ts da.

import type { InvoicePDFDocumentProps } from '../components/invoice/pdf/InvoicePDFDocument';
import { sanitizePdfFontSizes } from '../components/invoice/pdf/pdfFontSizes';
import { normalizeItem } from '../components/invoice/invoiceUtils';
import {
  getContractCurrency,
  getPartyRoles,
  getTotalColumnLabel,
  invoiceToFormPatch,
  orderVisibleColumns,
  parseSavedFields,
  restoreColumnState,
  type SavedInvoice,
} from '../components/invoice/invoiceViewModel';
import {
  DEFAULT_COLUMN_LABELS,
  DEFAULT_INVOICE_FORM_STATE,
  normalizeSavedColumnLabels,
  type Contract,
  type InvoiceItem,
  type RegionCode,
  type Task,
} from '../components/invoice/types';

export interface InvoicePdfSource {
  invoice: SavedInvoice & { items: InvoiceItem[] };
  contract: Contract | null;
  task: (Task & { branch?: { defaultRegionCode?: RegionCode | null } | null }) | null;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Server yuborgan JSON tuzilmasini tekshiradi; mos kelmasa xato otadi */
export const parseInvoicePdfSource = (raw: unknown): InvoicePdfSource => {
  if (!isObject(raw) || !isObject(raw.invoice) || !Array.isArray(raw.invoice.items)) {
    throw new Error("Invoys ma'lumoti noto'g'ri");
  }
  return {
    invoice: raw.invoice as unknown as InvoicePdfSource['invoice'],
    contract: isObject(raw.contract) ? (raw.contract as unknown as Contract) : null,
    task: isObject(raw.task) ? (raw.task as unknown as Task) : null,
  };
};

/** Mijozga tekshirish uchun yuboriladigan nusxa: invoys varag'i, ruscha, pechat va imzosiz */
export const buildInvoicePdfProps = ({
  invoice,
  contract,
  task,
}: InvoicePdfSource): Omit<InvoicePDFDocumentProps, 'scaleOverride' | 'onRender'> => {
  const additionalInfo = invoice.additionalInfo ?? null;

  const form = invoiceToFormPatch(invoice, DEFAULT_INVOICE_FORM_STATE, task?.branch?.defaultRegionCode);
  if (contract) {
    form.contractNumber = contract.contractNumber;
    form.gln = form.gln || contract.gln || '';
  }

  const items = invoice.items.map(normalizeItem);
  const { visibleColumns, columnOrder } = restoreColumnState(additionalInfo);
  const savedLabels = additionalInfo?.columnLabels;
  const columnLabels: Record<string, string> = {
    ...DEFAULT_COLUMN_LABELS,
    ...(isObject(savedLabels) ? normalizeSavedColumnLabels(savedLabels as Record<string, string>) : {}),
  };
  const invoiceCurrency = getContractCurrency(contract);
  const savedVisibility = additionalInfo?.visibleAdditionalInfoFields;
  const hidden: Record<string, unknown> = isObject(savedVisibility) ? savedVisibility : {};
  const savedOrder = additionalInfo?.additionalFieldsOrder;

  return {
    viewTab: 'invoice',
    form,
    invoice,
    selectedContract: contract ?? undefined,
    contracts: contract ? [contract] : [],
    task,
    ...getPartyRoles(contract),
    isAdditionalInfoVisible: (key: string) => hidden[key] !== false,
    customFields: parseSavedFields(additionalInfo?.customFields),
    specCustomFields: parseSavedFields(additionalInfo?.specCustomFields),
    packingCustomFields: parseSavedFields(additionalInfo?.packingCustomFields),
    additionalFieldsOrder: Array.isArray(savedOrder) ? (savedOrder as string[]) : [],
    items,
    orderedVisibleColumns: orderVisibleColumns(columnOrder, visibleColumns, items),
    columnLabels,
    totalColumnLabel: getTotalColumnLabel(invoiceCurrency, columnLabels.total),
    invoiceCurrency,
    pdfIncludeSeal: false,
    pdfFontSizes: sanitizePdfFontSizes(additionalInfo?.pdfFontSizes),
    lang: 'ru',
  };
};
