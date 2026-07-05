// db-rule-engine.ts
// Yuklangan hujjat (ST-1 / CMR / TIR / FITO) ma'lumotlarini
// BAZADAGI invoys (Invoice + InvoiceItem + Contract) bilan solishtiruvchi
// deterministik tekshiruv. AI BU YERDA ISHLATILMAYDI.
//
// Farqi rule-engine.ts dan: u yerda ikkala tomon ham AI extraction'dan keladi,
// bu yerda DB tomoni odam tomonidan kiritilgan — shuning uchun nomlar uchun
// fuzzy taqqoslash, og'irliklar uchun tolerans qo'llanadi.

import {
  ST1Extraction,
  CmrExtraction,
  TirExtraction,
  FitoExtraction,
} from './prompt.builder';
import { normalize, sameCompany, extractCompanyName } from './rule-engine';

/* ===================== TYPES ===================== */

export interface DbInvoiceItemSnapshot {
  name: string;
  nameEn: string | null;
  tnvedCode: string | null;
  unit: string;
  quantity: number;
  grossWeight: number | null;
  netWeight: number | null;
  packagesCount: number | null;
}

export interface DbInvoiceSnapshot {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  sellerName: string | null; // Contract'dan
  buyerName: string | null;
  consigneeName: string | null;
  items: DbInvoiceItemSnapshot[];
  totalGrossWeight: number | null; // itemlar yig'indisi
  totalNetWeight: number | null;
  totalPackagesCount: number | null;
}

export interface DocDbMismatch {
  field: string; // masalan: "invoice_number", "gross_weight"
  label: string; // o'zbekcha: "Invoys raqami", "Brutto og'irlik"
  documentValue: string; // hujjatdagi qiymat
  invoiceValue: string; // bazadagi invoys qiymati
  description: string; // o'zbekcha izoh
}

export interface DocDbCheckResult {
  status: 'OK' | 'XATO';
  errors: DocDbMismatch[];
}

/* ===================== TOLERANCE HELPERS ===================== */

/** Og'irliklar: |a-b| <= max(1 kg, 0.5%) — yaxlitlash farqlarini kechiradi */
function weightsMatch(a: number, b: number): boolean {
  const tolerance = Math.max(1, Math.max(Math.abs(a), Math.abs(b)) * 0.005);
  return Math.abs(a - b) <= tolerance;
}

/** Joylar soni: aniq butun son tengligi */
function countsMatch(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

/** Invoys raqami: "№", probel, registr, boshidagi nollarni olib tashlab solishtirish */
function invoiceNumbersMatch(a: string, b: string): boolean {
  const clean = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[№#]/g, '')
      .replace(/\s+/g, '')
      .replace(/^0+(?=\w)/, '');
  return clean(a) !== '' && clean(a) === clean(b);
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-zа-яё0-9']+/i)
    .filter((t) => t.length > 1);
}

/** Token-Jaccard o'xshashligi (0..1) */
function tokenJaccard(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

/**
 * Mahsulot nomi: normalize + containment yoki token-Jaccard >= 0.6.
 * DB tomoni qo'lda kiritilgani uchun qat'iy tenglik ishlamaydi.
 */
function productNamesMatch(docName: string, dbName: string): boolean {
  const a = normalize(docName);
  const b = normalize(dbName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return tokenJaccard(a, b) >= 0.6;
}

/** Hujjatdagi mahsulot nomiga mos invoys itemini topish (name va nameEn bo'yicha) */
function findInvoiceItem(
  items: DbInvoiceItemSnapshot[],
  docName: string
): DbInvoiceItemSnapshot | undefined {
  return items.find(
    (item) =>
      productNamesMatch(docName, item.name) ||
      (item.nameEn !== null && productNamesMatch(docName, item.nameEn))
  );
}

/** Kompaniya nomi: qat'iy sameCompany yoki token-overlap fallback */
function companiesMatch(docValue: string, dbValue: string): boolean {
  if (sameCompany(docValue, dbValue)) return true;
  const a = extractCompanyName(docValue);
  const b = extractCompanyName(dbValue);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  return tokenJaccard(a, b) >= 0.5;
}

/** Yuk tavsifi kamida bitta invoys mahsulotiga mos keladimi */
function descriptionMentionsAnyItem(
  description: string,
  items: DbInvoiceItemSnapshot[]
): boolean {
  return items.some(
    (item) =>
      productNamesMatch(description, item.name) ||
      (item.nameEn !== null && productNamesMatch(description, item.nameEn))
  );
}

function fmt(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "ko'rsatilmagan";
  return String(value);
}

/* ===================== SHARED RULES ===================== */

function checkInvoiceRef(
  docRef: string | null,
  inv: DbInvoiceSnapshot,
  errors: DocDbMismatch[],
  sourceLabel: string
): void {
  if (docRef && !invoiceNumbersMatch(docRef, inv.invoiceNumber)) {
    errors.push({
      field: 'invoice_number',
      label: 'Invoys raqami',
      documentValue: docRef,
      invoiceValue: inv.invoiceNumber,
      description: `${sourceLabel}dagi invoys raqami bazadagi invoys bilan mos kelmaydi`,
    });
  }
}

function checkTotalGrossWeight(
  docWeight: number | null,
  inv: DbInvoiceSnapshot,
  errors: DocDbMismatch[]
): void {
  if (docWeight !== null && inv.totalGrossWeight !== null) {
    if (!weightsMatch(docWeight, inv.totalGrossWeight)) {
      errors.push({
        field: 'gross_weight',
        label: "Brutto og'irlik",
        documentValue: `${docWeight} kg`,
        invoiceValue: `${inv.totalGrossWeight} kg`,
        description: "Hujjatdagi umumiy brutto og'irlik invoys bilan mos kelmaydi",
      });
    }
  }
}

function checkTotalPackageCount(
  docCount: number | null,
  inv: DbInvoiceSnapshot,
  errors: DocDbMismatch[]
): void {
  if (docCount !== null && inv.totalPackagesCount !== null) {
    if (!countsMatch(docCount, inv.totalPackagesCount)) {
      errors.push({
        field: 'package_count',
        label: 'Joylar soni',
        documentValue: String(docCount),
        invoiceValue: String(inv.totalPackagesCount),
        description: 'Hujjatdagi joylar soni invoys bilan mos kelmaydi',
      });
    }
  }
}

function emptyExtractionResult(): DocDbCheckResult {
  return {
    status: 'XATO',
    errors: [
      {
        field: 'extraction',
        label: 'Hujjat mazmuni',
        documentValue: '',
        invoiceValue: '',
        description: "Hujjatdan tekshirish uchun ma'lumot ajratib olinmadi",
      },
    ],
  };
}

/* ===================== ST-1 ===================== */

export function compareStWithDb(
  st: ST1Extraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const errors: DocDbMismatch[] = [];

  const hasAnything =
    st.products.length > 0 ||
    st.invoice_ref_number !== null ||
    st.exporter_name !== null ||
    st.importer_name !== null;
  if (!hasAnything) return emptyExtractionResult();

  // Invoys raqami / sanasi (grafa 10)
  checkInvoiceRef(st.invoice_ref_number, inv, errors, 'ST-1 (10-grafa)');
  if (st.invoice_ref_date && st.invoice_ref_date !== inv.invoiceDate) {
    errors.push({
      field: 'invoice_date',
      label: 'Invoys sanasi',
      documentValue: st.invoice_ref_date,
      invoiceValue: inv.invoiceDate,
      description: 'ST-1 (10-grafa)dagi invoys sanasi bazadagi invoys bilan mos kelmaydi',
    });
  }

  // Tomonlar
  if (st.exporter_name && inv.sellerName && !companiesMatch(st.exporter_name, inv.sellerName)) {
    errors.push({
      field: 'exporter',
      label: 'Eksportyor',
      documentValue: st.exporter_name,
      invoiceValue: inv.sellerName,
      description: 'ST-1dagi eksportyor invoysdagi sotuvchi bilan mos kelmaydi',
    });
  }
  if (st.importer_name && inv.buyerName && !companiesMatch(st.importer_name, inv.buyerName)) {
    errors.push({
      field: 'importer',
      label: 'Importyor',
      documentValue: st.importer_name,
      invoiceValue: inv.buyerName,
      description: 'ST-1dagi importyor invoysdagi xaridor bilan mos kelmaydi',
    });
  }

  // Mahsulotlar
  if (st.products.length === 1 && inv.items.length > 1) {
    // Hujjatda jamlangan bitta qator — umumiy ko'rsatkichlar bilan solishtiramiz
    const p = st.products[0];
    checkTotalGrossWeight(p.gross_weight, inv, errors);
    checkTotalPackageCount(p.package_count, inv, errors);
    if (p.net_weight !== null && inv.totalNetWeight !== null && !weightsMatch(p.net_weight, inv.totalNetWeight)) {
      errors.push({
        field: 'net_weight',
        label: "Netto og'irlik",
        documentValue: `${p.net_weight} kg`,
        invoiceValue: `${inv.totalNetWeight} kg`,
        description: "ST-1dagi netto og'irlik invoysning umumiy nettosi bilan mos kelmaydi",
      });
    }
  } else {
    for (const p of st.products) {
      const item = findInvoiceItem(inv.items, p.name);
      if (!item) {
        errors.push({
          field: 'product_name',
          label: 'Mahsulot',
          documentValue: p.name,
          invoiceValue: '',
          description: 'ST-1dagi mahsulot bazadagi invoysda topilmadi',
        });
        continue;
      }
      if (p.package_count !== null && item.packagesCount !== null && !countsMatch(p.package_count, item.packagesCount)) {
        errors.push({
          field: 'package_count',
          label: 'Joylar soni',
          documentValue: String(p.package_count),
          invoiceValue: String(item.packagesCount),
          description: `«${item.name}» bo'yicha joylar soni invoys bilan mos kelmaydi`,
        });
      }
      if (p.gross_weight !== null && item.grossWeight !== null && !weightsMatch(p.gross_weight, item.grossWeight)) {
        errors.push({
          field: 'gross_weight',
          label: "Brutto og'irlik",
          documentValue: `${p.gross_weight} kg`,
          invoiceValue: `${item.grossWeight} kg`,
          description: `«${item.name}» bo'yicha brutto og'irlik invoys bilan mos kelmaydi`,
        });
      }
      if (p.net_weight !== null && item.netWeight !== null && !weightsMatch(p.net_weight, item.netWeight)) {
        errors.push({
          field: 'net_weight',
          label: "Netto og'irlik",
          documentValue: `${p.net_weight} kg`,
          invoiceValue: `${item.netWeight} kg`,
          description: `«${item.name}» bo'yicha netto og'irlik invoys bilan mos kelmaydi`,
        });
      }
    }
  }

  // Sanalar: sertifikat invoysdan oldin bo'lishi mumkin emas
  if (st.certification_date && st.certification_date < inv.invoiceDate) {
    errors.push({
      field: 'certification_date',
      label: 'Sertifikat sanasi',
      documentValue: st.certification_date,
      invoiceValue: inv.invoiceDate,
      description: "Sertifikat sanasi invoys sanasidan oldin bo'lishi mumkin emas",
    });
  }
  if (st.declaration_date && st.declaration_date < inv.invoiceDate) {
    errors.push({
      field: 'declaration_date',
      label: 'Deklaratsiya sanasi',
      documentValue: st.declaration_date,
      invoiceValue: inv.invoiceDate,
      description: "Deklaratsiya sanasi invoys sanasidan oldin bo'lishi mumkin emas",
    });
  }

  return { status: errors.length > 0 ? 'XATO' : 'OK', errors };
}

/* ===================== CMR ===================== */

export function compareCmrWithDb(
  cmr: CmrExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const errors: DocDbMismatch[] = [];

  const hasAnything =
    cmr.sender_name !== null ||
    cmr.consignee_name !== null ||
    cmr.invoice_ref_number !== null ||
    cmr.total_gross_weight !== null ||
    cmr.total_package_count !== null ||
    cmr.goods_description !== null;
  if (!hasAnything) return emptyExtractionResult();

  if (cmr.sender_name && inv.sellerName && !companiesMatch(cmr.sender_name, inv.sellerName)) {
    errors.push({
      field: 'sender',
      label: "Yuk jo'natuvchi",
      documentValue: cmr.sender_name,
      invoiceValue: inv.sellerName,
      description: "CMR (1-grafa)dagi yuk jo'natuvchi invoysdagi sotuvchi bilan mos kelmaydi",
    });
  }

  const dbConsignee = inv.consigneeName ?? inv.buyerName;
  if (cmr.consignee_name && dbConsignee && !companiesMatch(cmr.consignee_name, dbConsignee)) {
    errors.push({
      field: 'consignee',
      label: 'Yuk oluvchi',
      documentValue: cmr.consignee_name,
      invoiceValue: dbConsignee,
      description: 'CMR (2-grafa)dagi yuk oluvchi invoysdagi qabul qiluvchi bilan mos kelmaydi',
    });
  }

  checkInvoiceRef(cmr.invoice_ref_number, inv, errors, 'CMR (5-grafa)');
  checkTotalGrossWeight(cmr.total_gross_weight, inv, errors);
  checkTotalPackageCount(cmr.total_package_count, inv, errors);

  if (
    cmr.goods_description &&
    inv.items.length > 0 &&
    !descriptionMentionsAnyItem(cmr.goods_description, inv.items)
  ) {
    errors.push({
      field: 'goods_description',
      label: 'Yuk tavsifi',
      documentValue: cmr.goods_description,
      invoiceValue: inv.items.map((i) => i.name).join(', '),
      description: 'CMR (9-grafa)dagi yuk tavsifi invoys mahsulotlariga mos kelmaydi',
    });
  }

  return { status: errors.length > 0 ? 'XATO' : 'OK', errors };
}

/* ===================== TIR ===================== */

export function compareTirWithDb(
  tir: TirExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const errors: DocDbMismatch[] = [];

  const hasAnything =
    tir.consignee_name !== null ||
    tir.invoice_ref_number !== null ||
    tir.total_gross_weight !== null ||
    tir.total_package_count !== null ||
    tir.goods_description !== null;
  if (!hasAnything) return emptyExtractionResult();

  // Karnet egasi = tashuvchi, shartnoma tomoni emas — solishtirilmaydi
  const dbConsignee = inv.consigneeName ?? inv.buyerName;
  if (tir.consignee_name && dbConsignee && !companiesMatch(tir.consignee_name, dbConsignee)) {
    errors.push({
      field: 'consignee',
      label: 'Yuk oluvchi',
      documentValue: tir.consignee_name,
      invoiceValue: dbConsignee,
      description: 'TIR karnetdagi yuk oluvchi invoysdagi qabul qiluvchi bilan mos kelmaydi',
    });
  }

  checkInvoiceRef(tir.invoice_ref_number, inv, errors, 'TIR karnet');
  checkTotalGrossWeight(tir.total_gross_weight, inv, errors);
  checkTotalPackageCount(tir.total_package_count, inv, errors);

  if (
    tir.goods_description &&
    inv.items.length > 0 &&
    !descriptionMentionsAnyItem(tir.goods_description, inv.items)
  ) {
    errors.push({
      field: 'goods_description',
      label: 'Yuk tavsifi',
      documentValue: tir.goods_description,
      invoiceValue: inv.items.map((i) => i.name).join(', '),
      description: 'TIR karnet (10-grafa)dagi yuk tavsifi invoys mahsulotlariga mos kelmaydi',
    });
  }

  return { status: errors.length > 0 ? 'XATO' : 'OK', errors };
}

/* ===================== FITO ===================== */

export function compareFitoWithDb(
  fito: FitoExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const errors: DocDbMismatch[] = [];

  const hasAnything =
    fito.exporter !== null ||
    fito.importer !== null ||
    fito.product !== null ||
    fito.products.length > 0 ||
    fito.total_net_weight !== null;
  if (!hasAnything) return emptyExtractionResult();

  if (fito.exporter && inv.sellerName && !companiesMatch(fito.exporter, inv.sellerName)) {
    errors.push({
      field: 'exporter',
      label: 'Eksportyor',
      documentValue: fito.exporter,
      invoiceValue: inv.sellerName,
      description: 'FITOdagi eksportyor invoysdagi sotuvchi bilan mos kelmaydi',
    });
  }

  const dbConsignee = inv.consigneeName ?? inv.buyerName;
  if (fito.importer && dbConsignee && !companiesMatch(fito.importer, dbConsignee)) {
    errors.push({
      field: 'importer',
      label: 'Importyor',
      documentValue: fito.importer,
      invoiceValue: dbConsignee,
      description: 'FITOdagi yuk oluvchi invoysdagi qabul qiluvchi bilan mos kelmaydi',
    });
  }

  // Mahsulot nomlari: products[] yoki eski yagona product maydoni
  const docProductNames =
    fito.products.length > 0 ? fito.products.map((p) => p.name) : fito.product ? [fito.product] : [];
  for (const name of docProductNames) {
    if (inv.items.length > 0 && !findInvoiceItem(inv.items, name)) {
      errors.push({
        field: 'product_name',
        label: 'Mahsulot',
        documentValue: name,
        invoiceValue: inv.items.map((i) => i.name).join(', '),
        description: 'FITOdagi mahsulot bazadagi invoysda topilmadi',
      });
    }
  }

  // Har bir hujjat mahsuloti bo'yicha netto (mos item topilganda)
  for (const p of fito.products) {
    const item = findInvoiceItem(inv.items, p.name);
    if (item && p.net_weight !== null && item.netWeight !== null && !weightsMatch(p.net_weight, item.netWeight)) {
      errors.push({
        field: 'net_weight',
        label: "Netto og'irlik",
        documentValue: `${p.net_weight} kg`,
        invoiceValue: `${item.netWeight} kg`,
        description: `«${item.name}» bo'yicha netto og'irlik invoys bilan mos kelmaydi`,
      });
    }
  }

  if (
    fito.total_net_weight !== null &&
    inv.totalNetWeight !== null &&
    !weightsMatch(fito.total_net_weight, inv.totalNetWeight)
  ) {
    errors.push({
      field: 'total_net_weight',
      label: "Umumiy netto og'irlik",
      documentValue: `${fito.total_net_weight} kg`,
      invoiceValue: `${fmt(inv.totalNetWeight)} kg`,
      description: "FITOdagi deklaratsiya qilingan miqdor invoysning umumiy nettosi bilan mos kelmaydi",
    });
  }

  checkTotalPackageCount(fito.total_package_count, inv, errors);

  return { status: errors.length > 0 ? 'XATO' : 'OK', errors };
}
