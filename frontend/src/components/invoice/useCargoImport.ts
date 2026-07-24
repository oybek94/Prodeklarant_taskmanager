import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { calculateTotalPrice } from './hooks/useInvoiceItems';
import { createDefaultItem, DEFAULT_COLUMN_LABELS } from './types';
import type { CustomField, InvoiceFormData, InvoiceItem } from './types';

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
  gross_weight: number | null;
  net_weight: number | null;
  unit_price: number | null;
  currency: string | null;
}

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
};

/** products elementining maydoni → invoys jadval ustuni yorlig'i */
const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: DEFAULT_COLUMN_LABELS.name,
  pluCode: DEFAULT_COLUMN_LABELS.plu,
  packageType: DEFAULT_COLUMN_LABELS.package,
  packagesCount: DEFAULT_COLUMN_LABELS.packagesCount,
  quantity: DEFAULT_COLUMN_LABELS.quantity,
  grossWeight: DEFAULT_COLUMN_LABELS.gross,
  netWeight: DEFAULT_COLUMN_LABELS.net,
  unitPrice: DEFAULT_COLUMN_LABELS.unitPrice,
};

const asText = (v: unknown): string =>
  v === null || v === undefined || v === '' ? '' : String(v);

/** Faqat invoys qo'llab-quvvatlaydigan valyutalar tanlanadi */
const normalizeCurrency = (raw: string | null): 'USD' | 'UZS' | null => {
  const v = (raw ?? '').trim().toUpperCase();
  if (v === 'USD') return 'USD';
  if (v === 'UZS') return 'UZS';
  return null;
};

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
  packingCustomFields: CustomField[]
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
      });
      const data = res.data?.data as CargoTextExtraction | undefined;
      if (!data) throw new Error('Bo\'sh javob');

      const previewRows = buildPreviewRows(data, form, items, customFields, packingCustomFields);
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
  }, [text, contractDeliveryTerms, form, items, customFields, packingCustomFields]);

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

    const currency = normalizeCurrency(parsed.products.find((p) => p.currency)?.currency ?? null);
    if (currency && isSelected('form:currency')) formPatch.currency = currency;

    if (Object.keys(formPatch).length > 0) {
      setForm((prev) => ({ ...prev, ...formPatch }));
    }

    /* --- Tovar qatorlari: ro'yxat almashtiriladi, belgilanmagan maydonlar tegilmaydi --- */
    const productKeys = rows.filter((r) => r.key.startsWith('product:') && isSelected(r.key));
    if (productKeys.length > 0) {
      // Hech bir maydoni belgilanmagan va invoysda mos qatori ham yo'q tovar tashlab ketiladi —
      // aks holda bo'sh qator paydo bo'lardi
      const keptProducts = parsed.products
        .map((product, idx) => ({ product, idx }))
        .filter(({ idx }) =>
          items[idx] !== undefined ||
          Object.keys(PRODUCT_FIELD_LABELS).some((field) => isSelected(`product:${idx}:${field}`))
        );

      const nextItems: InvoiceItem[] = keptProducts.map(({ product, idx }) => {
        const base: InvoiceItem = items[idx]
          ? { ...items[idx] }
          : { ...createDefaultItem(), unit: items[0]?.unit ?? 'кг' };
        const fields = productToItemFields(product);
        Object.keys(PRODUCT_FIELD_LABELS).forEach((field) => {
          if (!isSelected(`product:${idx}:${field}`)) return;
          const value = fields[field as keyof InvoiceItem];
          if (value === undefined) return;
          (base as Record<string, unknown>)[field] = value;
        });
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

    const nextCustom = mergeFields(customFields, parsed.extra_fields, 'custom');
    if (nextCustom) setCustomFields(nextCustom);

    const nextPacking = mergeFields(packingCustomFields, parsed.packing_fields, 'packing');
    if (nextPacking) setPackingCustomFields(nextPacking);

    toast.success(`${selectedKeys.size} ta maydon to'ldirildi`);
    reset();
  }, [
    parsed,
    rows,
    selectedKeys,
    items,
    customFields,
    packingCustomFields,
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
