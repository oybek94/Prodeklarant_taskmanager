import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { calculateTotalPrice, resolveProductDefaults } from './hooks/useInvoiceItems';
import { createDefaultItem, DEFAULT_COLUMN_LABELS } from './types';
import type { CustomField, InvoiceFormData, InvoiceItem, SpecRow } from './types';

/* ===================== Backend javobi ===================== */

interface CargoLabeledField {
  label: string;
  value: string;
}

interface CargoProduct {
  name: string;
  plu_code: string | null;
  package_type: string | null;
  packages_count: number | null;
  places_count: number | null;
  pallet_weight: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  unit_price: number | null;
  currency: string | null;
  kvant: number | null;
  calibre: string | null;
  distribution_center: string | null;
}

export const KVANT_COLUMN_LABEL = 'Квант';
export const CALIBRE_LABEL = 'Калибр';
export const RC_COLUMN_LABEL = 'РЦ';

export interface CargoTextExtraction {
  invoice_number: string | null;
  vehicle_number: string | null;
  harvest_year: string | null;
  order_number: string | null;
  delivery_terms: string | null;
  customs_address: string | null;
  destination: string | null;
  extra_fields: CargoLabeledField[];
  packing_fields: CargoLabeledField[];
  products: CargoProduct[];
}

/* ===================== Preview qatorlari ===================== */

export interface CargoPreviewRow {
  /** Qo'llashda ishlatiladigan kalit, masalan "form:invoiceNumber" yoki "product:0:netWeight" */
  key: string;
  label: string;
  newValue: string;
  /** Invoysda hozir turgan qiymat (bo'sh bo'lishi mumkin) */
  currentValue: string;
  /** Qiymat yozish emas, invoysdagi eski qiymatni tozalash qatori */
  clear?: boolean;
}

/** Invoysning skalyar maydonlariga to'g'ridan-to'g'ri tushadigan qiymatlar */
const FORM_FIELD_LABELS: Record<string, string> = {
  invoiceNumber: 'Номер инвойса',
  vehicleNumber: 'Номер автотранспорта',
  harvestYear: 'Урожай',
  orderNumber: 'Номер заказа',
  deliveryTerms: 'Условия поставки',
  customsAddress: 'Место там. очистки',
  destination: 'Место назначения',
  currency: 'Валюта',
  notes: 'Особые примечания',
};

/**
 * products elementining maydoni → invoys jadval ustuni yorlig'i.
 * `satisfies` kalitlar haqiqatan InvoiceItem maydoni ekanini tekshiradi va
 * ayni paytda literal kalit turlarini saqlab qoladi (ProductFieldKey).
 */
const PRODUCT_FIELD_LABELS = {
  name: DEFAULT_COLUMN_LABELS.name,
  pluCode: DEFAULT_COLUMN_LABELS.plu,
  packageType: DEFAULT_COLUMN_LABELS.package,
  packagesCount: DEFAULT_COLUMN_LABELS.packagesCount,
  quantity: DEFAULT_COLUMN_LABELS.quantity,
  grossWeight: DEFAULT_COLUMN_LABELS.gross,
  netWeight: DEFAULT_COLUMN_LABELS.net,
  unitPrice: DEFAULT_COLUMN_LABELS.unitPrice,
} satisfies Partial<Record<keyof InvoiceItem, string>>;

type ProductFieldKey = keyof typeof PRODUCT_FIELD_LABELS;

const PRODUCT_FIELD_KEYS = Object.keys(PRODUCT_FIELD_LABELS) as ProductFieldKey[];

const asText = (v: unknown): string =>
  v === null || v === undefined || v === '' ? '' : String(v);

/** Solishtirish uchun registr va ortiqcha bo'shliqlarni bir xillashtiradi */
const collapse = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Matnda yorlig'i turgan, lekin qiymati yozilmagan qatorlarning yorliqlari
 * ("Серийный номер датчика -", "Пломба:", yoki yolg'iz turgan yorliq).
 *
 * Mijoz bunday maydonni ataylab bo'sh qoldirgan bo'ladi. Invoysda esa oldingi
 * yuk yoki nusxa olingan invoysdan qolgan eski qiymat turishi mumkin — u
 * tozalanmasa hujjatga boshqa yukning ma'lumoti tushib ketadi.
 */
export const findBlankLabels = (rawText: string, labels: string[]): Set<string> => {
  const lines = rawText.split(/\r?\n/).map(collapse).filter(Boolean);
  const blank = new Set<string>();
  labels.forEach((label) => {
    const target = collapse(label);
    if (!target) return;
    const isBlank = lines.some(
      (line) =>
        line.startsWith(target) && line.slice(target.length).replace(/[-–—:.\s]/g, '') === ''
    );
    if (isBlank) blank.add(label);
  });
  return blank;
};

/** Faqat invoys qo'llab-quvvatlaydigan valyutalar tanlanadi */
const normalizeCurrency = (raw: string | null): 'USD' | 'UZS' | null => {
  const v = (raw ?? '').trim().toUpperCase();
  if (v === 'USD') return 'USD';
  if (v === 'UZS') return 'UZS';
  return null;
};

/**
 * Tovarga xos qiymat (Квант, Калибр) qayerga tushishini hal qiladi.
 *
 * Ikki va undan ortiq tovar bo'lib qiymatlari bir-biridan FARQ qilsa — har
 * tovarga alohida (Квант uchun jadval ustuni, Калибр uchun tovar nomiga
 * qo'shimcha); aks holda bitta qiymat Дополнительная информация bo'limiga.
 */
export const decidePerProductPlacement = (
  products: CargoProduct[],
  pick: (p: CargoProduct) => string | number | null
): 'per-product' | 'info' | 'none' => {
  const values = products.map(pick).filter((v): v is string | number => v != null && v !== '');
  if (values.length === 0) return 'none';
  if (products.length >= 2 && new Set(values.map(String)).size > 1) return 'per-product';
  return 'info';
};

/** Kasr qismi bo'lmasa butun ko'rinishda: 495 → "495", 15.5 → "15.5" */
const formatKg = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

/**
 * "Особые примечания" uchun palet izohini yasaydi:
 * "Вес одного паллета составляет 15 кг, общее количество 33 паллет,
 *  общий вес паллет составляет 495 кг, общий вес вместе с паллетами 20390 кг."
 *
 * Palet og'irligi matndagi "22 паллет х 15 кг" qatoridan, palet soni — barcha
 * tovarlar Мест yig'indisidan, umumiy palet og'irligi — ko'paytmadan, oxirgi
 * son esa jami bruttodan olinadi.
 *
 * Tovarlarda palet og'irligi har xil bo'lsa bitta son keltirib bo'lmaydi —
 * u holda birinchi jumla tushiriladi, qolgan sonlar tovarlar bo'yicha
 * yig'indi sifatida to'g'ri hisoblanadi.
 */
export const buildPalletNote = (products: CargoProduct[]): string | null => {
  const withPallets = products.filter(
    (p) => p.pallet_weight != null && p.pallet_weight > 0 && p.places_count != null && p.places_count > 0
  );
  if (withPallets.length === 0) return null;

  const totalPallets = withPallets.reduce((sum, p) => sum + (p.places_count as number), 0);
  const totalPalletWeight = withPallets.reduce(
    (sum, p) => sum + (p.places_count as number) * (p.pallet_weight as number),
    0
  );
  const totalGross = products.reduce((sum, p) => sum + (p.gross_weight ?? 0), 0);

  const weights = new Set(withPallets.map((p) => p.pallet_weight as number));
  const parts: string[] = [];
  if (weights.size === 1) {
    parts.push(`Вес одного паллета составляет ${formatKg([...weights][0])} кг`);
    parts.push(`общее количество ${formatKg(totalPallets)} паллет`);
  } else {
    parts.push(`Общее количество ${formatKg(totalPallets)} паллет`);
  }
  parts.push(`общий вес паллет составляет ${formatKg(totalPalletWeight)} кг`);
  if (totalGross > 0) parts.push(`общий вес вместе с паллетами ${formatKg(totalGross)} кг`);

  return `${parts.join(', ')}.`;
};

/** Tovar nomiga kalibrni qo'shadi: "Нектарины свежие, калибр: 40mm+" */
export const appendCalibreToName = (name: string, calibre: string): string =>
  `${name.trim()}, калибр: ${calibre.trim()}`;

/** Bitta product elementini invoys qatori maydonlariga o'giradi */
const productToItemFields = (p: CargoProduct): Partial<InvoiceItem> => ({
  name: p.name,
  pluCode: p.plu_code ?? undefined,
  packageType: p.package_type ?? undefined,
  packagesCount: p.packages_count ?? undefined,
  quantity: p.places_count ?? 0,
  grossWeight: p.gross_weight ?? undefined,
  netWeight: p.net_weight ?? undefined,
  unitPrice: p.unit_price ?? 0,
});

/**
 * Tahlil natijasidan preview qatorlarini yig'adi — har biri alohida
 * belgilanadigan "maydon ← qiymat" juftligi.
 */
export const buildPreviewRows = (
  parsed: CargoTextExtraction,
  form: InvoiceFormData,
  items: InvoiceItem[],
  customFields: CustomField[],
  packingCustomFields: CustomField[],
  /** Mijozning asl matni — bo'sh qoldirilgan maydonlarni aniqlash uchun */
  rawText: string
): CargoPreviewRow[] => {
  const rows: CargoPreviewRow[] = [];

  const pushForm = (field: string, value: string | null) => {
    const next = asText(value);
    if (!next) return;
    rows.push({
      key: `form:${field}`,
      label: FORM_FIELD_LABELS[field] ?? field,
      newValue: next,
      currentValue: asText(form[field]),
    });
  };

  pushForm('invoiceNumber', parsed.invoice_number);
  pushForm('vehicleNumber', parsed.vehicle_number);
  pushForm('harvestYear', parsed.harvest_year);
  pushForm('orderNumber', parsed.order_number);
  pushForm('deliveryTerms', parsed.delivery_terms);
  pushForm('customsAddress', parsed.customs_address);
  pushForm('destination', parsed.destination);

  const currency = normalizeCurrency(parsed.products.find((p) => p.currency)?.currency ?? null);
  if (currency) pushForm('currency', currency);

  // Palet izohi tovarlar sonidan hisoblanadi, matnda tayyor holda turmaydi
  pushForm('notes', buildPalletNote(parsed.products));

  parsed.products.forEach((product, idx) => {
    const fields = productToItemFields(product);
    const existing = items[idx];
    Object.entries(PRODUCT_FIELD_LABELS).forEach(([field, label]) => {
      const next = asText(fields[field as keyof InvoiceItem]);
      if (!next || next === '0') return;
      rows.push({
        key: `product:${idx}:${field}`,
        label: `Товар ${idx + 1} — ${label}`,
        newValue: next,
        currentValue: asText(existing?.[field as keyof InvoiceItem]),
      });
    });
  });

  // Квант — farq qilsa jadval ustuni, aks holda Доп. информация
  const kvantPlacement = decidePerProductPlacement(parsed.products, (p) => p.kvant);
  if (kvantPlacement === 'per-product') {
    parsed.products.forEach((product, idx) => {
      if (product.kvant == null) return;
      rows.push({
        key: `product:${idx}:kvant`,
        label: `Товар ${idx + 1} — ${KVANT_COLUMN_LABEL} (yangi ustun)`,
        newValue: String(product.kvant),
        currentValue: '',
      });
    });
  } else if (kvantPlacement === 'info') {
    const kvant = parsed.products.find((p) => p.kvant != null)?.kvant;
    rows.push({
      key: `custom:${KVANT_COLUMN_LABEL}`,
      label: `${KVANT_COLUMN_LABEL} (Доп. информация)`,
      newValue: String(kvant),
      currentValue: asText(customFields.find((f) => f.label === KVANT_COLUMN_LABEL)?.value),
    });
  }

  // Калибр — farq qilsa tovar nomiga qo'shiladi, aks holda Доп. информация
  const calibrePlacement = decidePerProductPlacement(parsed.products, (p) => p.calibre);
  if (calibrePlacement === 'per-product') {
    parsed.products.forEach((product, idx) => {
      if (!product.calibre?.trim()) return;
      rows.push({
        key: `product:${idx}:calibre`,
        label: `Товар ${idx + 1} — ${CALIBRE_LABEL} (nomga qo'shiladi)`,
        newValue: appendCalibreToName(product.name, product.calibre),
        currentValue: '',
      });
    });
  } else if (calibrePlacement === 'info') {
    const calibre = parsed.products.find((p) => p.calibre?.trim())?.calibre;
    rows.push({
      key: `custom:${CALIBRE_LABEL}`,
      label: `${CALIBRE_LABEL} (Доп. информация)`,
      newValue: String(calibre),
      currentValue: asText(customFields.find((f) => f.label === CALIBRE_LABEL)?.value),
    });
  }

  // РЦ — har doim jadval ustuni, har tovarga o'ziniki
  parsed.products.forEach((product, idx) => {
    if (!product.distribution_center?.trim()) return;
    rows.push({
      key: `product:${idx}:rc`,
      label: `Товар ${idx + 1} — ${RC_COLUMN_LABEL} (yangi ustun)`,
      newValue: product.distribution_center.trim(),
      currentValue: '',
    });
  });

  parsed.extra_fields.forEach((field) => {
    if (!field.label.trim() || !field.value.trim()) return;
    rows.push({
      key: `custom:${field.label}`,
      label: `${field.label} (Доп. информация)`,
      newValue: field.value,
      currentValue: asText(customFields.find((f) => f.label === field.label)?.value),
    });
  });

  parsed.packing_fields.forEach((field) => {
    if (!field.label.trim() || !field.value.trim()) return;
    rows.push({
      key: `packing:${field.label}`,
      label: `${field.label} (Упаковочный лист)`,
      newValue: field.value,
      currentValue: asText(packingCustomFields.find((f) => f.label === field.label)?.value),
    });
  });

  /*
   * Matnda bo'sh qoldirilgan maydonlar — invoysdagi eski qiymat tozalanadi.
   * Faqat matnda ochiq-oydin yorlig'i turib qiymati yozilmagan maydonlarga
   * tegiladi; matnda umuman eslatilmagan maydonlar joyida qoladi.
   */
  const pushClearRows = (existing: CustomField[], prefix: 'custom' | 'packing', section: string) => {
    const filled = new Set(
      rows
        .filter((row) => row.key.startsWith(`${prefix}:`))
        .map((row) => collapse(row.key.slice(prefix.length + 1)))
    );
    const candidates = existing.filter(
      (field) => field.value.trim() && !filled.has(collapse(field.label))
    );
    const blank = findBlankLabels(rawText, candidates.map((field) => field.label));
    candidates.forEach((field) => {
      if (!blank.has(field.label)) return;
      rows.push({
        key: `${prefix}-clear:${field.label}`,
        label: `${field.label} (${section})`,
        newValue: '',
        currentValue: field.value,
        clear: true,
      });
    });
  };

  pushClearRows(customFields, 'custom', 'Доп. информация');
  pushClearRows(packingCustomFields, 'packing', 'Упаковочный лист');

  return rows;
};

/* ===================== Hook ===================== */

interface UseCargoImportProps {
  form: InvoiceFormData;
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>;
  items: InvoiceItem[];
  setItems: (items: InvoiceItem[]) => void;
  customFields: CustomField[];
  setCustomFields: (fields: CustomField[]) => void;
  packingCustomFields: CustomField[];
  setPackingCustomFields: (fields: CustomField[]) => void;
  /** Shartnomadagi "Условия поставки" variantlari — AI eng yaqinini tanlaydi */
  contractDeliveryTerms: string[];
  /** Bazadagi qadoq turlari — AI "Вид упаковки" uchun mosini tanlaydi */
  packagingTypes: Array<{ name: string }>;
  /** Bazadagi tovar nomlari — tanlanganda Код ТН ВЭД avtomatik to'ladi */
  invoiceProductOptions: Array<{ name: string; code: string }>;
  /** Shartnoma spetsifikatsiyasi — nom bo'yicha narx/TNVED fallback */
  selectedContractSpec: SpecRow[];
  /**
   * Berilgan yorliqli custom ustun kalitini qaytaradi — ustun shu invoysda
   * mavjud bo'lsa o'shanikini, aks holda yangi ustun yaratib.
   */
  ensureColumn: (label: string, afterKey?: string) => string;
}

export const useCargoImport = ({
  form,
  setForm,
  items,
  setItems,
  customFields,
  setCustomFields,
  packingCustomFields,
  setPackingCustomFields,
  contractDeliveryTerms,
  packagingTypes,
  invoiceProductOptions,
  selectedContractSpec,
  ensureColumn,
}: UseCargoImportProps) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<CargoTextExtraction | null>(null);
  const [rows, setRows] = useState<CargoPreviewRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const reset = useCallback(() => {
    setText('');
    setParsed(null);
    setRows([]);
    setSelectedKeys(new Set());
  }, []);

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setSelectedKeys(checked ? new Set(rows.map((r) => r.key)) : new Set());
  }, [rows]);

  const analyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/ai/parse/cargo-text', {
        text,
        deliveryTermsOptions: contractDeliveryTerms,
        packagingTypeOptions: packagingTypes.map((p) => p.name).filter(Boolean),
        productNameOptions: invoiceProductOptions.map((p) => p.name).filter(Boolean),
      });
      const data = res.data?.data as CargoTextExtraction | undefined;
      if (!data) throw new Error('Bo\'sh javob');

      const previewRows = buildPreviewRows(data, form, items, customFields, packingCustomFields, text);
      if (previewRows.length === 0) {
        toast.error("Matndan hech qanday maydon ajratib olinmadi");
        return;
      }
      setParsed(data);
      setRows(previewRows);
      setSelectedKeys(new Set(previewRows.map((r) => r.key)));
    } catch (error: unknown) {
      console.error(error);
      toast.error('Matnni tahlil qilishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [
    text,
    contractDeliveryTerms,
    packagingTypes,
    invoiceProductOptions,
    form,
    items,
    customFields,
    packingCustomFields,
  ]);

  /** Belgilangan qatorlarni formaga, jadvalga va custom maydonlarga yozadi */
  const applyCargo = useCallback(() => {
    if (!parsed) return;
    const isSelected = (key: string) => selectedKeys.has(key);

    /* --- Skalyar maydonlar --- */
    const formPatch: Partial<InvoiceFormData> = {};
    const setIf = (field: keyof InvoiceFormData, value: string | null) => {
      if (value && isSelected(`form:${field}`)) formPatch[field] = value;
    };
    setIf('invoiceNumber', parsed.invoice_number);
    setIf('vehicleNumber', parsed.vehicle_number);
    setIf('harvestYear', parsed.harvest_year);
    setIf('orderNumber', parsed.order_number);
    setIf('deliveryTerms', parsed.delivery_terms);
    setIf('destination', parsed.destination);
    // Matndan kelgan bojxona manzili shartnoma avtomatik qiymatidan ustun turadi
    setIf('customsAddress', parsed.customs_address);
    setIf('notes', buildPalletNote(parsed.products));

    const currency = normalizeCurrency(parsed.products.find((p) => p.currency)?.currency ?? null);
    if (currency && isSelected('form:currency')) formPatch.currency = currency;

    if (Object.keys(formPatch).length > 0) {
      setForm((prev) => ({ ...prev, ...formPatch }));
    }

    /* --- Квант / РЦ ustunlari: kerak bo'lsa yaratiladi, bori qayta ishlatiladi --- */
    const kvantPlacement = decidePerProductPlacement(parsed.products, (p) => p.kvant);
    const calibrePlacement = decidePerProductPlacement(parsed.products, (p) => p.calibre);
    const kvantSelected = parsed.products.some((_, idx) => isSelected(`product:${idx}:kvant`));
    // Квант ustuni Нетто'dan keyin turadi
    const kvantColumnKey =
      kvantPlacement === 'per-product' && kvantSelected ? ensureColumn(KVANT_COLUMN_LABEL, 'net') : null;

    const rcSelected = parsed.products.some((_, idx) => isSelected(`product:${idx}:rc`));
    // РЦ ustuni "Общая сумма в Долл. США" (total) dan keyin turadi
    const rcColumnKey = rcSelected ? ensureColumn(RC_COLUMN_LABEL, 'total') : null;

    // Kalibr tovar nomiga qo'shilganda Доп. информация da takrorlanmaydi
    const calibreAppliedToName =
      calibrePlacement === 'per-product' &&
      parsed.products.some((_, idx) => isSelected(`product:${idx}:calibre`));

    /* --- Tovar qatorlari: ro'yxat almashtiriladi, belgilanmagan maydonlar tegilmaydi --- */
    const productKeys = rows.filter((r) => r.key.startsWith('product:') && isSelected(r.key));
    if (productKeys.length > 0) {
      const hasSelectedField = (idx: number) =>
        PRODUCT_FIELD_KEYS.some((field) => isSelected(`product:${idx}:${field}`)) ||
        isSelected(`product:${idx}:kvant`) ||
        isSelected(`product:${idx}:calibre`) ||
        isSelected(`product:${idx}:rc`);

      // Hech bir maydoni belgilanmagan va invoysda mos qatori ham yo'q tovar tashlab ketiladi —
      // aks holda bo'sh qator paydo bo'lardi
      const keptProducts = parsed.products
        .map((product, idx) => ({ product, idx }))
        .filter(({ idx }) => items[idx] !== undefined || hasSelectedField(idx));

      const nextItems: InvoiceItem[] = keptProducts.map(({ product, idx }) => {
        const base: InvoiceItem = items[idx]
          ? { ...items[idx] }
          : { ...createDefaultItem(), unit: items[0]?.unit ?? 'кг' };
        const fields = productToItemFields(product);
        PRODUCT_FIELD_KEYS.forEach((field) => {
          if (!isSelected(`product:${idx}:${field}`)) return;
          const value = fields[field];
          if (value === undefined) return;
          Object.assign(base, { [field]: value });
        });

        // Nom bazadagi variant bilan mos kelsa Код ТН ВЭД (va narx) avtomatik to'ladi —
        // qo'lda tanlanganidagi bilan bir xil qoida. Kalibr qo'shilishidan OLDIN
        // bajariladi, aks holda nom ro'yxatga mos kelmay kod bo'sh qolardi.
        const defaults = resolveProductDefaults(base.name, invoiceProductOptions, selectedContractSpec);
        if (defaults.tnvedCode) base.tnvedCode = defaults.tnvedCode;
        // Matnda narx berilgan bo'lsa u ustun turadi; bo'lmasa shartnoma narxi olinadi
        if (!base.unitPrice && defaults.unitPrice != null) base.unitPrice = defaults.unitPrice;

        // Kalibrlar har xil bo'lsa tovar nomiga qo'shiladi
        if (
          calibrePlacement === 'per-product' &&
          product.calibre?.trim() &&
          isSelected(`product:${idx}:calibre`)
        ) {
          base.name = appendCalibreToName(base.name, product.calibre);
        }

        // Квант / РЦ — jadval ustuni sifatida item.customFields ichiga
        if (kvantColumnKey && product.kvant != null && isSelected(`product:${idx}:kvant`)) {
          base.customFields = { ...base.customFields, [kvantColumnKey]: String(product.kvant) };
        }
        if (rcColumnKey && product.distribution_center?.trim() && isSelected(`product:${idx}:rc`)) {
          base.customFields = { ...base.customFields, [rcColumnKey]: product.distribution_center.trim() };
        }

        // Brutto/netto qo'lda kelgani uchun eski formulalar kuchini yo'qotadi
        base.netWeightFormula = undefined;
        base.grossWeightFormula = undefined;
        base.packagesCountFormula = undefined;
        base.totalPrice = calculateTotalPrice(base);
        return base;
      });
      setItems(nextItems);
    }

    /* --- Custom maydonlar: bir xil yorliq yangilanadi, yo'g'i qo'shiladi --- */
    const mergeFields = (existing: CustomField[], incoming: CargoLabeledField[], prefix: string) => {
      const selected = incoming.filter((f) => isSelected(`${prefix}:${f.label}`));
      if (selected.length === 0) return null;
      const merged = [...existing];
      selected.forEach((field, idx) => {
        const at = merged.findIndex((f) => f.label === field.label);
        if (at >= 0) merged[at] = { ...merged[at], value: field.value };
        else merged.push({ id: `${Date.now()}_${idx}`, label: field.label, value: field.value });
      });
      return merged;
    };

    // Квант / Калибр har tovarga alohida tushmagan holatda Доп. информация maydoni bo'ladi
    const infoFields: CargoLabeledField[] = [...parsed.extra_fields];
    if (kvantPlacement === 'info') {
      const kvant = parsed.products.find((p) => p.kvant != null)?.kvant;
      if (kvant != null) infoFields.push({ label: KVANT_COLUMN_LABEL, value: String(kvant) });
    }
    if (calibrePlacement === 'info') {
      const calibre = parsed.products.find((p) => p.calibre?.trim())?.calibre;
      if (calibre) infoFields.push({ label: CALIBRE_LABEL, value: calibre.trim() });
    }

    /*
     * Har tovarga alohida tushgan qiymat Доп. информация da turmasligi kerak:
     * Квант jadval ustuniga, Калибр esa tovar nomiga yozilgan bo'lsa, o'sha
     * yorliq bu bo'limda takror bo'lardi. mergeFields faqat qo'shadi/yangilaydi,
     * shuning uchun oldingi importdan qolgan maydonni bu yerda olib tashlaymiz.
     */
    const perProductLabels = new Set<string>();
    if (kvantColumnKey) perProductLabels.add(KVANT_COLUMN_LABEL);
    if (calibreAppliedToName) perProductLabels.add(CALIBRE_LABEL);

    /*
     * Matnda bo'sh qoldirilgan maydonlar: yorlig'i saqlanadi, qiymati tozalanadi.
     * Bo'sh qiymatli maydon hujjatda ham, PDF'da ham ko'rinmaydi, lekin
     * "Qo'shimcha ma'lumot" oynasida qo'lda to'ldirish uchun turaveradi.
     */
    const clearedLabels = (prefix: 'custom' | 'packing'): Set<string> => {
      const keyPrefix = `${prefix}-clear:`;
      return new Set(
        rows
          .filter((row) => row.clear && row.key.startsWith(keyPrefix) && isSelected(row.key))
          .map((row) => row.key.slice(keyPrefix.length))
      );
    };
    const clearValues = (fields: CustomField[], labels: Set<string>): CustomField[] =>
      labels.size === 0
        ? fields
        : fields.map((field) => (labels.has(field.label) ? { ...field, value: '' } : field));

    const customClears = clearedLabels('custom');
    const mergedCustom = mergeFields(customFields, infoFields, 'custom');
    const baseCustom = clearValues(mergedCustom ?? customFields, customClears);
    const nextCustom =
      perProductLabels.size > 0
        ? baseCustom.filter((field) => !perProductLabels.has(field.label))
        : baseCustom;
    if (mergedCustom || customClears.size > 0 || nextCustom.length !== customFields.length) {
      setCustomFields(nextCustom);
    }

    const packingClears = clearedLabels('packing');
    const mergedPacking = mergeFields(packingCustomFields, parsed.packing_fields, 'packing');
    const nextPacking = clearValues(mergedPacking ?? packingCustomFields, packingClears);
    if (mergedPacking || packingClears.size > 0) setPackingCustomFields(nextPacking);

    toast.success(`${selectedKeys.size} ta maydon to'ldirildi`);
    reset();
  }, [
    parsed,
    rows,
    selectedKeys,
    items,
    customFields,
    packingCustomFields,
    invoiceProductOptions,
    selectedContractSpec,
    ensureColumn,
    setForm,
    setItems,
    setCustomFields,
    setPackingCustomFields,
    reset,
  ]);

  return {
    text,
    setText,
    loading,
    parsed,
    rows,
    selectedKeys,
    toggleKey,
    toggleAll,
    analyze,
    applyCargo,
    reset,
  };
};
