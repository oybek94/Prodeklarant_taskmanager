/**
 * Inglizcha PDF uchun tarjima qilinadigan matnlar ro'yxati.
 *
 * PDF'ni chizadigan komponentlar matnni `i18n.t(key, source)` orqali oladi —
 * shu yerdagi kalitlar aynan o'sha `key` lar. Ro'yxat FORMA holatidan quriladi
 * (bazadagi saqlangan invoysdan emas), shuning uchun saqlanmagan o'zgarish ham
 * tarjima qilinadi va ruscha PDF bilan bir xil matn chiqadi.
 *
 * Kalitlar backend keshi (`additionalInfo.translatedRequisitesEn`) bilan bir xil
 * nomlanadi — shunda ilgari tarjima qilingan invoyslar qayta tarjima qilinmaydi.
 */

import type { ViewTab } from '../types';
import { buildEffectiveColumnLabels } from './pdfColumnLabels';

/** Tovar nomi/o'lchov birligi kaliti — saqlanmagan qator uchun tartib raqami */
export const itemKeySuffix = (item: { id?: number }, index: number): string | number =>
  item.id || index;

export const itemNameKey = (item: { id?: number }, index: number): string =>
  `item_name_${itemKeySuffix(item, index)}`;

export const itemUnitKey = (item: { id?: number }, index: number): string =>
  `item_unit_${itemKeySuffix(item, index)}`;

export const packageTypeKey = (packageType: string): string => `pkg_${packageType}`;

export const columnLabelKey = (columnKey: string): string => `col_${columnKey}`;

/** Ustun tanlanmaganda ham chiqadigan standart qiymat (ruscha PDF bilan bir xil) */
export const DEFAULT_ORIGIN_RU = 'Республика Узбекистан';

interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface PdfTranslatableTextsInput {
  viewTab: ViewTab;
  form: any;
  selectedContract: any;
  task: any;
  isAdditionalInfoVisible: (key: string) => boolean;
  customFields: CustomField[];
  specCustomFields: CustomField[];
  packingCustomFields: CustomField[];
  items: any[];
  orderedVisibleColumns: string[];
  columnLabels: Record<string, string>;
  totalColumnLabel: string;
}

/**
 * Matnni ro'yxatga qo'shadi — faqat bo'sh bo'lmagan qiymatlar (bo'sh matnni
 * tarjima qilishning ma'nosi yo'q va u AI so'roviga tekin yuk bo'lardi).
 */
const put = (texts: Record<string, string>, key: string, value?: string | null): void => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed) texts[key] = trimmed;
};

export const buildPdfTranslatableTexts = ({
  viewTab,
  form,
  selectedContract,
  task,
  isAdditionalInfoVisible,
  customFields,
  specCustomFields,
  packingCustomFields,
  items,
  orderedVisibleColumns,
  columnLabels,
  totalColumnLabel,
}: PdfTranslatableTextsInput): Record<string, string> => {
  const texts: Record<string, string> = {};
  const c = selectedContract;

  // --- Tomonlar ---
  if (c) {
    put(texts, 'sellerName', c.sellerName);
    put(texts, 'sellerAddress', c.sellerLegalAddress);
    put(texts, 'sellerDetails', c.sellerDetails);
    put(texts, 'buyerName', c.buyerName);
    put(texts, 'buyerAddress', c.buyerAddress);
    put(texts, 'buyerDetails', c.buyerDetails);
    put(texts, 'shipperName', c.shipperName);
    put(texts, 'shipperAddress', c.shipperAddress);
    put(texts, 'shipperDetails', c.shipperDetails);
    put(texts, 'consigneeName', c.consigneeName);
    put(texts, 'consigneeAddress', c.consigneeAddress);
    put(texts, 'consigneeDetails', c.consigneeDetails);

    // Bank ma'lumotlari faqat "Реквизиты" matni bo'lmaganda alohida chiziladi
    if (!c.sellerDetails) {
      put(texts, 'sellerBankName', c.sellerBankName);
      put(texts, 'sellerBankAddress', c.sellerBankAddress);
      put(texts, 'sellerCorrespondentBank', c.sellerCorrespondentBank);
    }
    if (!c.buyerDetails) {
      put(texts, 'buyerBankName', c.buyerBankName);
      put(texts, 'buyerBankAddress', c.buyerBankAddress);
      put(texts, 'buyerCorrespondentBank', c.buyerCorrespondentBank);
    }
    if (!c.shipperDetails) {
      put(texts, 'shipperBankName', c.shipperBankName);
      put(texts, 'shipperBankAddress', c.shipperBankAddress);
    }
    if (!c.consigneeDetails) {
      put(texts, 'consigneeBankName', c.consigneeBankName);
      put(texts, 'consigneeBankAddress', c.consigneeBankAddress);
    }

    put(texts, 'supplierDirector', c.supplierDirector);
    put(texts, 'goodsReleasedBy', c.goodsReleasedBy);
    put(texts, 'buyerDirector', c.buyerDirector);
    put(texts, 'consigneeDirector', c.consigneeDirector);
  } else {
    // Shartnoma tanlanmagan — rekvizitlar mijoz kartochkasidan chiziladi
    put(texts, 'clientName', task?.client?.name);
    put(texts, 'clientAddress', task?.client?.address);
    put(texts, 'clientBankName', task?.client?.bankName);
    put(texts, 'clientBankAddress', task?.client?.bankAddress);
  }

  // --- Qo'shimcha ma'lumot ---
  const visible = (key: string) => isAdditionalInfoVisible(key);
  if (visible('deliveryTerms')) put(texts, 'deliveryTerms', form.deliveryTerms);
  if (visible('customsAddress')) put(texts, 'customsAddress', form.customsAddress);
  if (visible('shipmentPlace')) put(texts, 'shipmentPlace', form.shipmentPlace);
  if (visible('destination')) put(texts, 'destination', form.destination);
  if (visible('manufacturer')) put(texts, 'manufacturer', form.manufacturer);
  if (visible('temperature')) put(texts, 'temperature', form.temperature);
  if (visible('harvestYear')) put(texts, 'harvestYear', form.harvestYear);
  // Kelib chiqish maydoni bo'sh bo'lsa ham hujjatda standart qiymat chiqadi
  if (visible('origin')) put(texts, 'origin', form.origin || DEFAULT_ORIGIN_RU);

  customFields.forEach((field) => {
    if (!field?.id || !visible(`custom_${field.id}`)) return;
    put(texts, `custom_label_${field.id}`, field.label);
    put(texts, `custom_value_${field.id}`, field.value);
  });
  specCustomFields.forEach((field) => {
    if (!field?.id || !visible(`spec_${field.id}`)) return;
    put(texts, `spec_label_${field.id}`, field.label);
    put(texts, `spec_value_${field.id}`, field.value);
  });
  if (viewTab === 'packing') {
    packingCustomFields.forEach((field) => {
      if (!field?.id || !visible(`packing_${field.id}`)) return;
      put(texts, `packing_label_${field.id}`, field.label);
      put(texts, `packing_value_${field.id}`, field.value);
    });
  }

  // --- Jadval ---
  const effectiveColumnLabels = buildEffectiveColumnLabels(items, columnLabels, totalColumnLabel);
  orderedVisibleColumns.forEach((key) => {
    put(texts, columnLabelKey(key), effectiveColumnLabels[key]);
  });

  items.forEach((item, index) => {
    put(texts, itemNameKey(item, index), item.name);
    put(texts, itemUnitKey(item, index), item.unit);
    if (item.packageType) put(texts, packageTypeKey(item.packageType), item.packageType);
  });

  // --- Izohlar ---
  if (viewTab !== 'spec') put(texts, 'notes', form.notes);

  return texts;
};
