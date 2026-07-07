// db-rule-engine.ts
// Yuklangan hujjat (INVOICE / ST-1 / CMR / TIR / FITO) ma'lumotlarini
// BAZADAGI invoys (Invoice + InvoiceItem + Contract) bilan solishtiruvchi
// deterministik tekshiruv. AI BU YERDA ISHLATILMAYDI.
//
// Taqqoslash funksiyalari va tolerantlik matchers.ts / verification.config.ts
// dan olinadi. Har bir nomuvofiqlik severity (critical/warning) bilan
// belgilanadi — natija xaritasi: critical → FAIL, faqat warning → NEEDS_REVIEW.

import {
  InvoiceExtraction,
  ST1Extraction,
  CmrExtraction,
  TirExtraction,
  FitoExtraction,
} from './prompt.builder';
import {
  weightsMatch,
  countsMatch,
  moneyMatch,
  invoiceNumbersMatch,
  productNamesMatch,
  companiesMatch,
  datesMatch,
  dateNotBefore,
} from './matchers';
import { normalizeCurrency } from './normalizers';
import {
  MismatchSeverity,
  VerifiableDocType,
  severityFor,
} from './verification.config';

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
  totalAmount: number | null; // Invoice.totalAmount
  currency: string | null; // Invoice.currency (ISO kod)
}

export interface DocDbMismatch {
  field: string; // masalan: "invoice_number", "gross_weight"
  label: string; // o'zbekcha: "Invoys raqami", "Brutto og'irlik"
  documentValue: string; // hujjatdagi qiymat
  invoiceValue: string; // bazadagi invoys qiymati
  description: string; // o'zbekcha izoh
  severity: MismatchSeverity;
}

export interface DocDbCheckResult {
  status: 'OK' | 'XATO';
  errors: DocDbMismatch[];
}

/* ===================== HELPERS ===================== */

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

class MismatchCollector {
  readonly errors: DocDbMismatch[] = [];

  constructor(private docType: VerifiableDocType) {}

  add(mismatch: Omit<DocDbMismatch, 'severity'>): void {
    this.errors.push({
      ...mismatch,
      severity: severityFor(this.docType, mismatch.field),
    });
  }

  result(): DocDbCheckResult {
    return { status: this.errors.length > 0 ? 'XATO' : 'OK', errors: this.errors };
  }
}

/* ===================== SHARED RULES ===================== */

function checkInvoiceRef(
  docRef: string | null,
  inv: DbInvoiceSnapshot,
  c: MismatchCollector,
  sourceLabel: string
): void {
  if (docRef && !invoiceNumbersMatch(docRef, inv.invoiceNumber)) {
    c.add({
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
  c: MismatchCollector
): void {
  if (docWeight !== null && inv.totalGrossWeight !== null) {
    if (!weightsMatch(docWeight, inv.totalGrossWeight)) {
      c.add({
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
  c: MismatchCollector
): void {
  if (docCount !== null && inv.totalPackagesCount !== null) {
    if (!countsMatch(docCount, inv.totalPackagesCount)) {
      c.add({
        field: 'package_count',
        label: 'Joylar soni',
        documentValue: String(docCount),
        invoiceValue: String(inv.totalPackagesCount),
        description: 'Hujjatdagi joylar soni invoys bilan mos kelmaydi',
      });
    }
  }
}

/**
 * Hujjatdan tekshirish uchun hech narsa ajratilmagan holat.
 * severity=warning → natija NEEDS_REVIEW bo'ladi (avtomatik FAIL emas,
 * chunki bu hujjat xatosi emas, extraction muvaffaqiyatsizligi).
 */
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
        severity: 'warning',
      },
    ],
  };
}

/* ===================== INVOICE (hujjat) vs DB ===================== */

export function compareInvoiceWithDb(
  doc: InvoiceExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const c = new MismatchCollector('INVOICE');

  const hasAnything =
    doc.invoice_number !== null ||
    doc.seller_name !== null ||
    doc.buyer_name !== null ||
    doc.total_amount !== null ||
    doc.products.length > 0;
  if (!hasAnything) return emptyExtractionResult();

  checkInvoiceRef(doc.invoice_number, inv, c, 'Yuklangan invoys');

  if (doc.invoice_date && !datesMatch(doc.invoice_date, inv.invoiceDate)) {
    c.add({
      field: 'invoice_date',
      label: 'Invoys sanasi',
      documentValue: doc.invoice_date,
      invoiceValue: inv.invoiceDate,
      description: 'Yuklangan invoysdagi sana bazadagi invoys sanasi bilan mos kelmaydi',
    });
  }

  if (doc.seller_name && inv.sellerName && !companiesMatch(doc.seller_name, inv.sellerName)) {
    c.add({
      field: 'seller',
      label: 'Sotuvchi',
      documentValue: doc.seller_name,
      invoiceValue: inv.sellerName,
      description: 'Yuklangan invoysdagi sotuvchi bazadagi sotuvchi bilan mos kelmaydi',
    });
  }

  if (doc.buyer_name && inv.buyerName && !companiesMatch(doc.buyer_name, inv.buyerName)) {
    c.add({
      field: 'buyer',
      label: 'Xaridor',
      documentValue: doc.buyer_name,
      invoiceValue: inv.buyerName,
      description: 'Yuklangan invoysdagi xaridor bazadagi xaridor bilan mos kelmaydi',
    });
  }

  // Pul: umumiy summa va valyuta
  if (doc.total_amount !== null && inv.totalAmount !== null) {
    if (!moneyMatch(doc.total_amount, inv.totalAmount)) {
      c.add({
        field: 'total_amount',
        label: 'Umumiy summa',
        documentValue: String(doc.total_amount),
        invoiceValue: String(inv.totalAmount),
        description: 'Yuklangan invoysdagi umumiy summa bazadagi invoys summasi bilan mos kelmaydi',
      });
    }
  }
  const docCurrency = normalizeCurrency(doc.currency);
  const dbCurrency = normalizeCurrency(inv.currency);
  if (docCurrency && dbCurrency && docCurrency !== dbCurrency) {
    c.add({
      field: 'currency',
      label: 'Valyuta',
      documentValue: docCurrency,
      invoiceValue: dbCurrency,
      description: 'Yuklangan invoysdagi valyuta bazadagi invoys valyutasi bilan mos kelmaydi',
    });
  }

  // Mahsulotlar
  for (const p of doc.products) {
    const item = findInvoiceItem(inv.items, p.name);
    if (!item) {
      if (inv.items.length > 0) {
        c.add({
          field: 'product_name',
          label: 'Mahsulot',
          documentValue: p.name,
          invoiceValue: inv.items.map((i) => i.name).join(', '),
          description: 'Yuklangan invoysdagi mahsulot bazadagi invoysda topilmadi',
        });
      }
      continue;
    }
    if (p.package_count !== null && item.packagesCount !== null && !countsMatch(p.package_count, item.packagesCount)) {
      c.add({
        field: 'package_count',
        label: 'Joylar soni',
        documentValue: String(p.package_count),
        invoiceValue: String(item.packagesCount),
        description: `«${item.name}» bo'yicha joylar soni bazadagi invoys bilan mos kelmaydi`,
      });
    }
    if (p.gross_weight !== null && item.grossWeight !== null && !weightsMatch(p.gross_weight, item.grossWeight)) {
      c.add({
        field: 'gross_weight',
        label: "Brutto og'irlik",
        documentValue: `${p.gross_weight} kg`,
        invoiceValue: `${item.grossWeight} kg`,
        description: `«${item.name}» bo'yicha brutto og'irlik bazadagi invoys bilan mos kelmaydi`,
      });
    }
    if (p.net_weight !== null && item.netWeight !== null && !weightsMatch(p.net_weight, item.netWeight)) {
      c.add({
        field: 'net_weight',
        label: "Netto og'irlik",
        documentValue: `${p.net_weight} kg`,
        invoiceValue: `${item.netWeight} kg`,
        description: `«${item.name}» bo'yicha netto og'irlik bazadagi invoys bilan mos kelmaydi`,
      });
    }
  }

  return c.result();
}

/* ===================== ST-1 ===================== */

export function compareStWithDb(
  st: ST1Extraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const c = new MismatchCollector('ST');

  const hasAnything =
    st.products.length > 0 ||
    st.invoice_ref_number !== null ||
    st.exporter_name !== null ||
    st.importer_name !== null;
  if (!hasAnything) return emptyExtractionResult();

  // Invoys raqami / sanasi (grafa 10)
  checkInvoiceRef(st.invoice_ref_number, inv, c, 'ST-1 (10-grafa)');
  if (st.invoice_ref_date && !datesMatch(st.invoice_ref_date, inv.invoiceDate)) {
    c.add({
      field: 'invoice_date',
      label: 'Invoys sanasi',
      documentValue: st.invoice_ref_date,
      invoiceValue: inv.invoiceDate,
      description: 'ST-1 (10-grafa)dagi invoys sanasi bazadagi invoys bilan mos kelmaydi',
    });
  }

  // Tomonlar
  if (st.exporter_name && inv.sellerName && !companiesMatch(st.exporter_name, inv.sellerName)) {
    c.add({
      field: 'exporter',
      label: 'Eksportyor',
      documentValue: st.exporter_name,
      invoiceValue: inv.sellerName,
      description: 'ST-1dagi eksportyor invoysdagi sotuvchi bilan mos kelmaydi',
    });
  }
  if (st.importer_name && inv.buyerName && !companiesMatch(st.importer_name, inv.buyerName)) {
    c.add({
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
    checkTotalGrossWeight(p.gross_weight, inv, c);
    checkTotalPackageCount(p.package_count, inv, c);
    if (p.net_weight !== null && inv.totalNetWeight !== null && !weightsMatch(p.net_weight, inv.totalNetWeight)) {
      c.add({
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
        c.add({
          field: 'product_name',
          label: 'Mahsulot',
          documentValue: p.name,
          invoiceValue: '',
          description: 'ST-1dagi mahsulot bazadagi invoysda topilmadi',
        });
        continue;
      }
      if (p.package_count !== null && item.packagesCount !== null && !countsMatch(p.package_count, item.packagesCount)) {
        c.add({
          field: 'package_count',
          label: 'Joylar soni',
          documentValue: String(p.package_count),
          invoiceValue: String(item.packagesCount),
          description: `«${item.name}» bo'yicha joylar soni invoys bilan mos kelmaydi`,
        });
      }
      if (p.gross_weight !== null && item.grossWeight !== null && !weightsMatch(p.gross_weight, item.grossWeight)) {
        c.add({
          field: 'gross_weight',
          label: "Brutto og'irlik",
          documentValue: `${p.gross_weight} kg`,
          invoiceValue: `${item.grossWeight} kg`,
          description: `«${item.name}» bo'yicha brutto og'irlik invoys bilan mos kelmaydi`,
        });
      }
      if (p.net_weight !== null && item.netWeight !== null && !weightsMatch(p.net_weight, item.netWeight)) {
        c.add({
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
  if (st.certification_date && !dateNotBefore(st.certification_date, inv.invoiceDate)) {
    c.add({
      field: 'certification_date',
      label: 'Sertifikat sanasi',
      documentValue: st.certification_date,
      invoiceValue: inv.invoiceDate,
      description: "Sertifikat sanasi invoys sanasidan oldin bo'lishi mumkin emas",
    });
  }
  if (st.declaration_date && !dateNotBefore(st.declaration_date, inv.invoiceDate)) {
    c.add({
      field: 'declaration_date',
      label: 'Deklaratsiya sanasi',
      documentValue: st.declaration_date,
      invoiceValue: inv.invoiceDate,
      description: "Deklaratsiya sanasi invoys sanasidan oldin bo'lishi mumkin emas",
    });
  }

  return c.result();
}

/* ===================== CMR ===================== */

export function compareCmrWithDb(
  cmr: CmrExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const c = new MismatchCollector('CMR');

  const hasAnything =
    cmr.sender_name !== null ||
    cmr.consignee_name !== null ||
    cmr.invoice_ref_number !== null ||
    cmr.total_gross_weight !== null ||
    cmr.total_package_count !== null ||
    cmr.goods_description !== null;
  if (!hasAnything) return emptyExtractionResult();

  if (cmr.sender_name && inv.sellerName && !companiesMatch(cmr.sender_name, inv.sellerName)) {
    c.add({
      field: 'sender',
      label: "Yuk jo'natuvchi",
      documentValue: cmr.sender_name,
      invoiceValue: inv.sellerName,
      description: "CMR (1-grafa)dagi yuk jo'natuvchi invoysdagi sotuvchi bilan mos kelmaydi",
    });
  }

  const dbConsignee = inv.consigneeName ?? inv.buyerName;
  if (cmr.consignee_name && dbConsignee && !companiesMatch(cmr.consignee_name, dbConsignee)) {
    c.add({
      field: 'consignee',
      label: 'Yuk oluvchi',
      documentValue: cmr.consignee_name,
      invoiceValue: dbConsignee,
      description: 'CMR (2-grafa)dagi yuk oluvchi invoysdagi qabul qiluvchi bilan mos kelmaydi',
    });
  }

  checkInvoiceRef(cmr.invoice_ref_number, inv, c, 'CMR (5-grafa)');
  checkTotalGrossWeight(cmr.total_gross_weight, inv, c);
  checkTotalPackageCount(cmr.total_package_count, inv, c);

  if (
    cmr.goods_description &&
    inv.items.length > 0 &&
    !descriptionMentionsAnyItem(cmr.goods_description, inv.items)
  ) {
    c.add({
      field: 'goods_description',
      label: 'Yuk tavsifi',
      documentValue: cmr.goods_description,
      invoiceValue: inv.items.map((i) => i.name).join(', '),
      description: 'CMR (9-grafa)dagi yuk tavsifi invoys mahsulotlariga mos kelmaydi',
    });
  }

  return c.result();
}

/* ===================== TIR ===================== */

export function compareTirWithDb(
  tir: TirExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const c = new MismatchCollector('TIR');

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
    c.add({
      field: 'consignee',
      label: 'Yuk oluvchi',
      documentValue: tir.consignee_name,
      invoiceValue: dbConsignee,
      description: 'TIR karnetdagi yuk oluvchi invoysdagi qabul qiluvchi bilan mos kelmaydi',
    });
  }

  checkInvoiceRef(tir.invoice_ref_number, inv, c, 'TIR karnet');
  checkTotalGrossWeight(tir.total_gross_weight, inv, c);
  checkTotalPackageCount(tir.total_package_count, inv, c);

  if (
    tir.goods_description &&
    inv.items.length > 0 &&
    !descriptionMentionsAnyItem(tir.goods_description, inv.items)
  ) {
    c.add({
      field: 'goods_description',
      label: 'Yuk tavsifi',
      documentValue: tir.goods_description,
      invoiceValue: inv.items.map((i) => i.name).join(', '),
      description: 'TIR karnet (10-grafa)dagi yuk tavsifi invoys mahsulotlariga mos kelmaydi',
    });
  }

  return c.result();
}

/* ===================== FITO ===================== */

export function compareFitoWithDb(
  fito: FitoExtraction,
  inv: DbInvoiceSnapshot
): DocDbCheckResult {
  const c = new MismatchCollector('FITO');

  const hasAnything =
    fito.exporter !== null ||
    fito.importer !== null ||
    fito.product !== null ||
    fito.products.length > 0 ||
    fito.total_net_weight !== null;
  if (!hasAnything) return emptyExtractionResult();

  if (fito.exporter && inv.sellerName && !companiesMatch(fito.exporter, inv.sellerName)) {
    c.add({
      field: 'exporter',
      label: 'Eksportyor',
      documentValue: fito.exporter,
      invoiceValue: inv.sellerName,
      description: 'FITOdagi eksportyor invoysdagi sotuvchi bilan mos kelmaydi',
    });
  }

  const dbConsignee = inv.consigneeName ?? inv.buyerName;
  if (fito.importer && dbConsignee && !companiesMatch(fito.importer, dbConsignee)) {
    c.add({
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
      c.add({
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
      c.add({
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
    c.add({
      field: 'total_net_weight',
      label: "Umumiy netto og'irlik",
      documentValue: `${fito.total_net_weight} kg`,
      invoiceValue: `${fmt(inv.totalNetWeight)} kg`,
      description: "FITOdagi deklaratsiya qilingan miqdor invoysning umumiy nettosi bilan mos kelmaydi",
    });
  }

  checkTotalPackageCount(fito.total_package_count, inv, c);

  return c.result();
}
