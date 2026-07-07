// rule-engine.ts
// Invoice-vs-ST deterministik tekshiruv. AI BU YERDA ISHLATILMAYDI.
//
// Taqqoslash funksiyalari matchers.ts dan olinadi — Doc-vs-DB dvigateli
// (db-rule-engine.ts) bilan BIR XIL tolerantlik qo'llanadi: og'irliklarda
// max(1 kg, 0.5%), nomlarda containment/token-Jaccard, sanalarda format
// farqidan mustaqil taqqoslash.

import {
  normalize,
  extractCompanyName,
  sameCompany,
  companiesMatch,
  productNamesMatch,
  weightsMatch,
  countsMatch,
  invoiceNumbersMatch,
  datesMatch,
  dateNotBefore,
} from './matchers';

// Legacy re-export: bu helperlar oldin shu fayldan export qilingan
export { normalize, extractCompanyName, sameCompany };

/* ===================== TYPES ===================== */

export interface Product {
  name: string;
  package_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
}

export interface InvoiceData {
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD
  seller_name: string | null;
  buyer_name: string | null;
  products: Product[];
}

export interface STData {
  st_number: string | null; // UZRU...
  exporter_name: string | null;
  importer_name: string | null;
  transport_method: string | null;
  invoice_ref_number: string | null; // grafa 10
  invoice_ref_date: string | null;   // grafa 10
  certification_date: string | null; // grafa 11
  declaration_date: string | null;   // grafa 12
  products: Product[];
}

export interface ValidationError {
  field: string;
  invoice: string;
  st: string;
  description: string;
}

export interface ValidationResult {
  status: 'OK' | 'XATO';
  errors: ValidationError[];
}

/* ===================== HELPERS ===================== */

function findProduct(products: Product[], name: string): Product | undefined {
  return products.find((p) => productNamesMatch(p.name, name));
}

function isAutotransport(value: string | null): boolean {
  return normalize(value).includes('автотранспорт');
}

/* ===================== MAIN ===================== */

export function validateInvoiceWithST(
  invoice: InvoiceData,
  st: STData
): ValidationResult {
  const errors: ValidationError[] = [];

  // ---------- FAIL FAST ----------
  if (!Array.isArray(invoice.products) || invoice.products.length === 0) {
    return {
      status: 'XATO',
      errors: [
        {
          field: 'products',
          invoice: '',
          st: '',
          description:
            'Invoysdan mahsulotlar ajratib olinmadi. Tekshiruv imkonsiz.',
        },
      ],
    };
  }

  if (!Array.isArray(st.products) || st.products.length === 0) {
    return {
      status: 'XATO',
      errors: [
        {
          field: 'products',
          invoice: '',
          st: '',
          description:
            'ST hujjatidan mahsulotlar ajratib olinmadi. Tekshiruv imkonsiz.',
        },
      ],
    };
  }

  // ---------- EXPORTER / IMPORTER ----------
  if (
    invoice.seller_name &&
    st.exporter_name &&
    !companiesMatch(st.exporter_name, invoice.seller_name)
  ) {
    errors.push({
      field: 'exporter',
      invoice: invoice.seller_name,
      st: st.exporter_name,
      description: 'Eksporter kompaniya nomi mos kelmaydi',
    });
  }

  if (
    invoice.buyer_name &&
    st.importer_name &&
    !companiesMatch(st.importer_name, invoice.buyer_name)
  ) {
    errors.push({
      field: 'importer',
      invoice: invoice.buyer_name,
      st: st.importer_name,
      description: 'Importer kompaniya nomi mos kelmaydi',
    });
  }

  // ---------- TRANSPORT ----------
  if (!st.transport_method) {
    errors.push({
      field: 'transport_method',
      invoice: '',
      st: '',
      description: 'Transport turi ST hujjatida ko‘rsatilmagan',
    });
  } else if (!isAutotransport(st.transport_method)) {
    errors.push({
      field: 'transport_method',
      invoice: '',
      st: st.transport_method,
      description: 'Transport turi "Avtotransportom" bo‘lishi shart',
    });
  }

  // ---------- PRODUCTS / PACKAGE / WEIGHT ----------
  for (const inv of invoice.products) {
    const stProd = findProduct(st.products, inv.name);

    if (!stProd) {
      errors.push({
        field: 'product_name',
        invoice: inv.name,
        st: '',
        description: 'Invoysdagi mahsulot ST hujjatida mavjud emas',
      });
      continue;
    }

    // package count (mandatory)
    if (inv.package_count === null || stProd.package_count === null) {
      errors.push({
        field: 'package_count',
        invoice: inv.package_count?.toString() ?? 'ko‘rsatilmagan',
        st: stProd.package_count?.toString() ?? 'ko‘rsatilmagan',
        description:
          'Mahsulot bo‘yicha joylar soni to‘liq ko‘rsatilmagan',
      });
    } else if (!countsMatch(inv.package_count, stProd.package_count)) {
      errors.push({
        field: 'package_count',
        invoice: String(inv.package_count),
        st: String(stProd.package_count),
        description:
          'Mahsulot bo‘yicha joylar soni invoys bilan mos kelmaydi',
      });
    }

    // gross (tolerantlik bilan: max(1 kg, 0.5%))
    if (
      inv.gross_weight !== null &&
      stProd.gross_weight !== null &&
      !weightsMatch(inv.gross_weight, stProd.gross_weight)
    ) {
      errors.push({
        field: 'gross_weight',
        invoice: String(inv.gross_weight),
        st: String(stProd.gross_weight),
        description: 'Brutto og‘irlik invoys bilan mos kelmaydi',
      });
    }

    // net (tolerantlik bilan)
    if (
      inv.net_weight !== null &&
      stProd.net_weight !== null &&
      !weightsMatch(inv.net_weight, stProd.net_weight)
    ) {
      errors.push({
        field: 'net_weight',
        invoice: String(inv.net_weight),
        st: String(stProd.net_weight),
        description: 'Netto og‘irlik invoys bilan mos kelmaydi',
      });
    }
  }

  // ---------- INVOICE REF (GRAFA 10) ----------
  if (
    invoice.invoice_number &&
    st.invoice_ref_number &&
    !invoiceNumbersMatch(invoice.invoice_number, st.invoice_ref_number)
  ) {
    errors.push({
      field: 'invoice_number',
      invoice: invoice.invoice_number,
      st: st.invoice_ref_number,
      description: 'Invoys raqami ST (10-grafa) bilan mos kelmaydi',
    });
  }

  if (
    invoice.invoice_date &&
    st.invoice_ref_date &&
    !datesMatch(invoice.invoice_date, st.invoice_ref_date)
  ) {
    errors.push({
      field: 'invoice_date',
      invoice: invoice.invoice_date,
      st: st.invoice_ref_date,
      description: 'Invoys sanasi ST (10-grafa) bilan mos kelmaydi',
    });
  }

  // ---------- DATES (11–12) ----------
  if (
    invoice.invoice_date &&
    st.certification_date &&
    !dateNotBefore(st.certification_date, invoice.invoice_date)
  ) {
    errors.push({
      field: 'certification_date',
      invoice: invoice.invoice_date,
      st: st.certification_date,
      description:
        'Sertifikat sanasi invoys sanasidan oldin bo‘lishi mumkin emas',
    });
  }

  if (
    invoice.invoice_date &&
    st.declaration_date &&
    !dateNotBefore(st.declaration_date, invoice.invoice_date)
  ) {
    errors.push({
      field: 'declaration_date',
      invoice: invoice.invoice_date,
      st: st.declaration_date,
      description:
        'Deklaratsiya sanasi invoys sanasidan oldin bo‘lishi mumkin emas',
    });
  }

  // ---------- RESULT ----------
  return {
    status: errors.length > 0 ? 'XATO' : 'OK',
    errors,
  };
}
