// verification.config.ts
// Hujjat tekshiruvi uchun barcha tolerantlik chegaralari va maydon
// jiddiylik (severity) xaritasi bitta joyda. Rule-engine'lardagi
// "sehrli raqamlar" shu yerdan olinadi — sozlash uchun kod qidirish shart emas.

export type MismatchSeverity = 'critical' | 'warning';

export type VerifiableDocType = 'INVOICE' | 'ST' | 'CMR' | 'TIR' | 'FITO';

export const VERIFICATION_CONFIG = {
  /** Og'irliklar: |a-b| <= max(absoluteKg, relative * max(|a|,|b|)) */
  weight: { absoluteKg: 1, relative: 0.005 },
  /** Mahsulot nomi: token-Jaccard shu chegaradan yuqori bo'lsa mos deb olinadi */
  productName: { jaccardThreshold: 0.6 },
  /** Kompaniya nomi: token-Jaccard chegarasi (manzil shovqini ko'p bo'lgani uchun pastroq) */
  company: { jaccardThreshold: 0.5 },
  /** Pul summalari: |a-b| <= max(absolute, relative * max(|a|,|b|)) */
  money: { absolute: 0.01, relative: 0.001 },
  /** Extraction ishonch bali shu chegaradan past bo'lsa natija maksimum NEEDS_REVIEW */
  confidence: { needsReviewBelow: 0.7 },
} as const;

/**
 * Hujjat turi bo'yicha maydon jiddiyligi.
 * critical — nomuvofiqlik aniq xato (FAIL), warning — odam ko'rib chiqishi
 * kerak bo'lgan shubha (NEEDS_REVIEW). Xaritada yo'q maydon warning deb olinadi.
 */
export const SEVERITY_MAP: Record<VerifiableDocType, Record<string, MismatchSeverity>> = {
  INVOICE: {
    invoice_number: 'critical',
    invoice_date: 'warning',
    seller: 'warning',
    buyer: 'warning',
    product_name: 'critical',
    package_count: 'critical',
    gross_weight: 'critical',
    net_weight: 'critical',
    total_amount: 'critical',
    currency: 'critical',
  },
  ST: {
    invoice_number: 'critical',
    invoice_date: 'warning',
    exporter: 'warning',
    importer: 'warning',
    product_name: 'critical',
    package_count: 'critical',
    gross_weight: 'critical',
    net_weight: 'critical',
    certification_date: 'warning',
    declaration_date: 'warning',
  },
  CMR: {
    sender: 'warning',
    consignee: 'warning',
    invoice_number: 'critical',
    package_count: 'critical',
    gross_weight: 'critical',
    goods_description: 'warning',
  },
  TIR: {
    consignee: 'warning',
    invoice_number: 'critical',
    package_count: 'critical',
    gross_weight: 'critical',
    goods_description: 'warning',
  },
  FITO: {
    exporter: 'warning',
    importer: 'warning',
    product_name: 'critical',
    net_weight: 'critical',
    total_net_weight: 'critical',
    package_count: 'critical',
    origin_country: 'warning',
  },
};

export function severityFor(docType: VerifiableDocType, field: string): MismatchSeverity {
  return SEVERITY_MAP[docType]?.[field] ?? 'warning';
}
