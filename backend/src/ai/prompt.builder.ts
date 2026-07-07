/**
 * Prompt builder for document extraction (Stage 1)
 *
 * CRITICAL: AI ONLY extracts data. NO comparison, NO decisions.
 * All validation happens in Stage 2 (rule engine).
 *
 * JSON format endi promptda emas, OpenAI structured outputs (strict JSON
 * Schema, extraction.schemas.ts) orqali majburlanadi — prompt faqat
 * maydonlarning MAZMUNINI tushuntiradi.
 */

// ==================== TYPES (extraction.schemas.ts dan) ====================

export type {
  ProductExtraction,
  InvoiceProductExtraction,
  InvoiceExtraction,
  ST1Extraction,
  FitoProductExtraction,
  FitoExtraction,
  CmrExtraction,
  TirExtraction,
  AnyExtraction,
} from './extraction.schemas';

export interface ComparisonError {
  field: string;
  invoice: string;
  st: string;
  description: string; // Uzbek language
}

export interface ComparisonResult {
  status: 'OK' | 'ERROR' | 'XATO';
  errors: ComparisonError[];
}

// ==================== EXTRACTION PROMPTS (STAGE 1) ====================

const COMMON_RULES = `MUHIM:
- Faqat ma'lumotlarni ajratib oling
- Taqqoslash, tekshirish, xato topish QILMASLIK
- Hech qanday qiymatni taxmin qilmang yoki o'ylab topmang
- Agar maydon hujjatda topilmasa → null
- Sanalarni YYYY-MM-DD formatida yozing (masalan 15.01.2026 → 2026-01-15)
- Og'irlik tonnada berilgan bo'lsa kilogrammga o'giring (1 t = 1000 kg)
- Raqamlardagi probel/vergul minglik ajratgichlarini olib tashlang (13 232,80 → 13232.80)`;

/**
 * Build prompt for Invoice document extraction
 */
export function buildInvoiceExtractionPrompt(): string {
  return `Siz bojxona hujjatlaridan ma'lumot ajratib oluvchi AI siz.
Invoys matnidan maydonlarni AJRATIB OLING.

${COMMON_RULES}

MAYDONLAR MAZMUNI:
- invoice_number — invoys (счет-фактура) raqami
- invoice_date — invoys sanasi
- seller_name — sotuvchi (Продавец) nomi
- buyer_name — xaridor (Покупатель) nomi
- total_amount — invoysning UMUMIY summasi (Итого/Всего/Общая сумма qatoridan)
- currency — summa valyutasi (USD, EUR, RUB, UZS ...)
- products — mahsulotlar jadvali

MAHSULOTLAR JADVALINI AJRATIB OLISH (MAJBURIY):
- Agar invoysda mahsulot jadvali bo'lsa, products array BO'SH BO'LMAYDI.
- Jadval ustunlari odatda: "Наименование товара" → name, "Мест" → package_count,
  "Брутто" → gross_weight (kg), "Нетто" → net_weight (kg),
  "Цена" → unit_price, "Сумма" / "Общая сумма" → amount.
- Har bir jadval qatorini alohida mahsulot sifatida qo'shing.
- Qiymat topilmasa null qo'ying, lekin mahsulotni o'tkazib YUBORMANG.
- Jadval formati har xil bo'lishi mumkin: HTML, markdown (|...|), probel bilan
  ajratilgan matn — hammasini o'qing.

MISOL: jadvalda «Хурма свежая сорт Королёк | 3670 | 23130 | 20190» qatori bo'lsa:
name="Хурма свежая сорт Королёк", package_count=3670, gross_weight=23130, net_weight=20190.`;
}

/**
 * Build prompt for ST-1 (Certificate of Origin) document extraction
 */
export function buildST1ExtractionPrompt(): string {
  return `Siz bojxona hujjatlaridan ma'lumot ajratib oluvchi AI siz.
ST-1 sertifikat matnidan maydonlarni AJRATIB OLING.

${COMMON_RULES}

MAYDONLAR MAZMUNI (ST-1 grafalari bo'yicha):
- st_number — sertifikat raqami (UZRU…)
- exporter_name — eksportyor (1-grafa)
- importer_name — importyor (2-grafa)
- transport_method — transport turi (3-grafa)
- invoice_ref_number, invoice_ref_date — FAQAT 10-grafada aniq yozilgan bo'lsa
- certification_date — 11-grafa sanasi
- declaration_date — 12-grafa sanasi
- products — 9-grafadagi mahsulotlar (name, package_count, gross_weight kg, net_weight kg)`;
}

/**
 * Build prompt for Fito certificate document extraction
 */
export function buildFitoPrompt(): string {
  return `Siz bojxona hujjatlaridan ma'lumot ajratib oluvchi AI siz.
Fitosanitar sertifikat matnidan maydonlarni AJRATIB OLING.

${COMMON_RULES}

MAYDONLAR MAZMUNI:
- certificate_number — sertifikat raqami
- issue_date — berilgan sana
- exporter — eksportyor nomi va manzili
- importer — yuk oluvchi / importyor
- product — asosiy mahsulot nomi (bitta bo'lsa)
- origin_country — kelib chiqish mamlakati
- products — barcha mahsulotlar (name, quantity, unit, net_weight kg)
- total_net_weight — «Deklaratsiya qilingan miqdor» / umumiy netto, kg
- total_package_count — joylar soni (ko'rsatilgan bo'lsa)`;
}

/**
 * Build prompt for CMR (international consignment note) document extraction
 */
export function buildCmrExtractionPrompt(): string {
  return `Siz bojxona hujjatlaridan ma'lumot ajratib oluvchi AI siz.
CMR (xalqaro yuk xati / международная товарно-транспортная накладная) matnidan maydonlarni AJRATIB OLING.

${COMMON_RULES}

MAYDONLAR MAZMUNI (CMR grafalari bo'yicha):
- sender_name — grafa 1, yuk jo'natuvchi (отправитель)
- consignee_name — grafa 2, yuk oluvchi (получатель)
- delivery_place — grafa 3, yuk yetkazish joyi
- loading_place — grafa 4, yuk ortish joyi va sanasi
- attached_documents — grafa 5, ilova hujjatlar matni to'liq
- invoice_ref_number — grafa 5 dagi invoys (инвойс/счет) raqami, FAQAT aniq yozilgan bo'lsa
- total_package_count — grafa 7, joylar soni
- goods_description — grafa 9, yuk nomi/tavsifi
- total_gross_weight — grafa 11, brutto og'irlik (kg)
- vehicle_number — grafa 16/25, avtomobil davlat raqami
- products — tovarlar alohida qatorlarda berilgan bo'lsa`;
}

/**
 * Build prompt for TIR carnet document extraction
 */
export function buildTirExtractionPrompt(): string {
  return `Siz bojxona hujjatlaridan ma'lumot ajratib oluvchi AI siz.
TIR karnet (Carnet TIR) matnidan maydonlarni AJRATIB OLING.

${COMMON_RULES}

MAYDONLAR MAZMUNI (TIR karnet grafalari bo'yicha):
- tir_carnet_number — karnet raqami (masalan XX00000000)
- holder_name — karnet egasi (tashuvchi tashkilot)
- departure_customs — jo'nash bojxonasi
- destination_customs — manzil bojxonasi
- consignee_name — yuk oluvchi (ko'rsatilgan bo'lsa)
- invoice_ref_number — ilova hujjatlardagi invoys raqami, FAQAT aniq yozilgan bo'lsa
- total_package_count — grafa 9/10, joylar soni
- goods_description — grafa 10, yuk tavsifi
- total_gross_weight — grafa 11, brutto og'irlik (kg)
- products — tovarlar alohida qatorlarda berilgan bo'lsa`;
}

// ==================== LEGACY SUPPORT ====================

export function buildInvoicePrompt(): string {
  return buildInvoiceExtractionPrompt();
}

export function buildST1Prompt(): string {
  return buildST1ExtractionPrompt();
}
