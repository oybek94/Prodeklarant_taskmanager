/**
 * Prompt builder for document extraction (Stage 1)
 * 
 * CRITICAL: AI ONLY extracts data. NO comparison, NO decisions.
 * All validation happens in Stage 2 (rule engine).
 */

// ==================== TYPE DEFINITIONS ====================

export interface ProductExtraction {
  name: string;
  package_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
}

export interface InvoiceExtraction {
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD format
  seller_name: string | null;
  buyer_name: string | null;
  products: ProductExtraction[];
}

export interface ST1Extraction {
  st_number: string | null; // certificate number (UZRU…)
  exporter_name: string | null;
  importer_name: string | null;
  transport_method: string | null;
  invoice_ref_number: string | null; // ONLY if explicitly written (grafa 10)
  invoice_ref_date: string | null; // ONLY if explicitly written (grafa 10)
  certification_date: string | null; // grafa 11
  declaration_date: string | null; // grafa 12
  products: ProductExtraction[];
}

export interface FitoProductExtraction {
  name: string;
  quantity: number | null;
  unit: string | null;
  net_weight: number | null; // kg
}

export interface FitoExtraction {
  certificate_number: string | null;
  issue_date: string | null; // YYYY-MM-DD format
  exporter: string | null;
  importer: string | null;
  product: string | null;
  origin_country: string | null;
  products: FitoProductExtraction[];
  total_net_weight: number | null; // deklaratsiya qilingan miqdor (kg)
  total_package_count: number | null;
}

export interface CmrExtraction {
  sender_name: string | null; // grafa 1 (yuk jo'natuvchi)
  consignee_name: string | null; // grafa 2 (yuk oluvchi)
  delivery_place: string | null; // grafa 3
  loading_place: string | null; // grafa 4
  attached_documents: string | null; // grafa 5 (ilova hujjatlar)
  invoice_ref_number: string | null; // grafa 5 dan ajratilgan invoys raqami
  total_package_count: number | null; // grafa 7 (joylar soni)
  goods_description: string | null; // grafa 9 (yuk tavsifi)
  total_gross_weight: number | null; // grafa 11 (kg)
  vehicle_number: string | null; // grafa 16/25
  products: ProductExtraction[];
}

export interface TirExtraction {
  tir_carnet_number: string | null; // TIR karnet raqami (masalan XX00000000)
  holder_name: string | null; // karnet egasi (tashuvchi)
  departure_customs: string | null;
  destination_customs: string | null;
  consignee_name: string | null;
  invoice_ref_number: string | null; // ilova hujjatlardan invoys raqami
  total_package_count: number | null; // grafa 9/10
  goods_description: string | null; // grafa 10
  total_gross_weight: number | null; // grafa 11 (kg)
  products: ProductExtraction[];
}

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

/**
 * Build prompt for Invoice document extraction
 * 
 * AI ONLY extracts data. NO comparison, NO validation, NO decisions.
 * CRITICAL: Must extract products from tables, never return empty products array.
 */
export function buildInvoiceExtractionPrompt(): string {
  return `Siz hujjat ma'lumotlarini ajratib oluvchi AI ekansiz.
Invoys matnidan quyidagi maydonlarni AJRATIB OLING.

MUHIM:
- Faqat ma'lumotlarni ajratib oling
- Taqqoslash, tekshirish, xato topish QILMASLIK
- Faqat JSON chiqaring

MAYDONLAR:

{
  "invoice_number": string | null,
  "invoice_date": string | null,          // YYYY-MM-DD formatida
  "seller_name": string | null,
  "buyer_name": string | null,
  "products": [
    {
      "name": string,
      "package_count": number | null,
      "gross_weight": number | null,
      "net_weight": number | null
    }
  ]
}

==================================================
MAHSULOTLAR JADVALINI AJRATIB OLISH (MAJBURIY)
==================================================

MAJBURIY QOIDA:
- Agar invoysda MAHSULOT JADVALI mavjud bo'lsa, products array BO'SH BO'LMAYDI.
- Agar bitta ham mahsulot nomi topilsa → products array kamida 1 ta element bo'lishi KERAK.
- products = [] faqat invoysda umuman mahsulot yo'q bo'lsa ruxsat etiladi.

MAHSULOT JADVALINI QANDAY O'QISH:

1. Jadvalni toping:
   - "Наименование товара" yoki "Товар" yoki "Наименование" ustuni bo'lgan jadval
   - Yoki mahsulotlar ro'yxati ko'rinadigan jadval

2. Har bir qatorni o'qing va products array'ga qo'shing:
   - "Наименование товара" → name
   - "Мест" yoki "Количество мест" → package_count (raqam)
   - "Брутто" yoki "Брутто (кг)" yoki "Вес брутто" → gross_weight (raqam, kg)
   - "Нетто" yoki "Нетто (кг)" yoki "Вес нетто" → net_weight (raqam, kg)

3. Agar qiymat topilmasa:
   - name topilmasa → bu qatorni o'tkazib yubormang, lekin name bo'sh string bo'lmasin
   - package_count topilmasa → null
   - gross_weight topilmasa → null
   - net_weight topilmasa → null
   - LEKIN mahsulot products array'ga qo'shilishi KERAK

4. Jadval formatlarini tan oling:
   - HTML jadvallar
   - Markdown jadvallar (| ustun | ustun |)
   - Matnli jadvallar (bo'shliqlar bilan ajratilgan)
   - PDF'dan extract qilingan jadvallar

MISOL:

Agar invoysda quyidagi jadval bo'lsa:
| Наименование товара | Мест | Брутто | Нетто |
| Хурма свежая сорт Королёк | 3670 | 23130 | 20190 |

Siz quyidagini qaytarishingiz KERAK:
{
  "products": [
    {
      "name": "Хурма свежая сорт Королёк",
      "package_count": 3670,
      "gross_weight": 23130,
      "net_weight": 20190
    }
  ]
}

XATO:
{
  "products": []  // ← BU XATO! Mahsulot mavjud bo'lsa, products bo'sh bo'lmasligi kerak
}

==================================================
QOIDALAR:
- Agar maydon topilmasa → null
- Raqamlar raqam bo'lishi kerak (string emas)
- Sana YYYY-MM-DD formatida bo'lishi kerak
- Faqat JSON chiqaring, izoh yozmang
- Markdown kod bloklari ishlatmang
- Mahsulot jadvalini e'tiborsiz qoldirmang
- products array bo'sh bo'lmasligi kerak agar mahsulotlar mavjud bo'lsa`;
}

/**
 * Build prompt for ST-1 (Certificate of Origin) document extraction
 * 
 * AI ONLY extracts data. NO comparison, NO validation, NO decisions.
 */
export function buildST1ExtractionPrompt(): string {
  return `Siz hujjat ma'lumotlarini ajratib oluvchi AI ekansiz.
ST-1 sertifikat matnidan quyidagi maydonlarni AJRATIB OLING.

MUHIM:
- Faqat ma'lumotlarni ajratib oling
- Taqqoslash, tekshirish, xato topish QILMASLIK
- Faqat JSON chiqaring
- Hech qanday qiymatni taxmin qilmang yoki o'ylab topmang

MAYDONLAR:

{
  "st_number": string | null,              // sertifikat raqami (UZRU…)
  "exporter_name": string | null,
  "importer_name": string | null,
  "transport_method": string | null,
  "invoice_ref_number": string | null,     // FAQAT aniq yozilgan bo'lsa (grafa 10)
  "invoice_ref_date": string | null,       // FAQAT aniq yozilgan bo'lsa (grafa 10)
  "certification_date": string | null,     // grafa 11
  "declaration_date": string | null,       // grafa 12
  "products": [
    {
      "name": string,
      "package_count": number | null,
      "gross_weight": number | null,
      "net_weight": number | null
    }
  ]
}

QOIDALAR:
- Agar maydon topilmasa → null
- invoice_ref_number va invoice_ref_date faqat grafa 10-da aniq yozilgan bo'lsa ajratib oling
- Raqamlar raqam bo'lishi kerak (string emas)
- Sana YYYY-MM-DD formatida bo'lishi kerak
- Faqat JSON chiqaring, izoh yozmang
- Markdown kod bloklari ishlatmang`;
}

/**
 * Build prompt for Fito certificate document extraction
 */
export function buildFitoPrompt(): string {
  return `Siz hujjat ma'lumotlarini ajratib oluvchi AI ekansiz.
Fitosanitar sertifikat matnidan quyidagi maydonlarni AJRATIB OLING.

MUHIM:
- Faqat ma'lumotlarni ajratib oling
- Taqqoslash, tekshirish, xato topish QILMASLIK
- Faqat JSON chiqaring
- Hech qanday qiymatni taxmin qilmang yoki o'ylab topmang

MAYDONLAR:

{
  "certificate_number": string | null,
  "issue_date": string | null,             // YYYY-MM-DD formatida
  "exporter": string | null,               // eksportyor nomi va manzili
  "importer": string | null,               // yuk oluvchi / importyor
  "product": string | null,                // asosiy mahsulot nomi (bitta bo'lsa)
  "origin_country": string | null,
  "products": [                            // barcha mahsulotlar ro'yxati
    {
      "name": string,
      "quantity": number | null,           // miqdor (raqam)
      "unit": string | null,               // o'lchov birligi (kg, dona, ...)
      "net_weight": number | null          // netto og'irlik, kg
    }
  ],
  "total_net_weight": number | null,       // "Deklaratsiya qilingan miqdor" / umumiy netto, kg
  "total_package_count": number | null     // joylar soni (agar ko'rsatilgan bo'lsa)
}

QOIDALAR:
- Agar maydon topilmasa → null (products topilmasa → [])
- Raqamlar raqam bo'lishi kerak (string emas)
- Og'irlik tonnada berilgan bo'lsa kilogrammga o'giring (1 t = 1000 kg)
- Sana YYYY-MM-DD formatida bo'lishi kerak
- Faqat JSON chiqaring, izoh yozmang
- Markdown kod bloklari ishlatmang`;
}

/**
 * Build prompt for CMR (international consignment note) document extraction
 *
 * AI ONLY extracts data. NO comparison, NO validation, NO decisions.
 */
export function buildCmrExtractionPrompt(): string {
  return `Siz hujjat ma'lumotlarini ajratib oluvchi AI ekansiz.
CMR (xalqaro yuk xati / международная товарно-транспортная накладная) matnidan quyidagi maydonlarni AJRATIB OLING.

MUHIM:
- Faqat ma'lumotlarni ajratib oling
- Taqqoslash, tekshirish, xato topish QILMASLIK
- Faqat JSON chiqaring
- Hech qanday qiymatni taxmin qilmang yoki o'ylab topmang

MAYDONLAR (CMR grafalari bo'yicha):

{
  "sender_name": string | null,            // grafa 1 — yuk jo'natuvchi (отправитель) nomi
  "consignee_name": string | null,         // grafa 2 — yuk oluvchi (получатель) nomi
  "delivery_place": string | null,         // grafa 3 — yuk yetkazish joyi
  "loading_place": string | null,          // grafa 4 — yuk ortish joyi va sanasi
  "attached_documents": string | null,     // grafa 5 — ilova hujjatlar matni to'liq
  "invoice_ref_number": string | null,     // grafa 5 dagi invoys (инвойс/счет) raqami, FAQAT aniq yozilgan bo'lsa
  "total_package_count": number | null,    // grafa 7 — joylar soni (количество мест)
  "goods_description": string | null,      // grafa 9 — yuk nomi/tavsifi
  "total_gross_weight": number | null,     // grafa 11 — brutto og'irlik, kg
  "vehicle_number": string | null,         // grafa 16/25 — avtomobil davlat raqami
  "products": [                            // agar tovarlar alohida qatorlarda berilgan bo'lsa
    {
      "name": string,
      "package_count": number | null,
      "gross_weight": number | null,
      "net_weight": number | null
    }
  ]
}

QOIDALAR:
- Agar maydon topilmasa → null (products topilmasa → [])
- invoice_ref_number faqat grafa 5 da invoys/счет/инвойс raqami aniq yozilgan bo'lsa ajratib oling
- Raqamlar raqam bo'lishi kerak (string emas)
- Og'irlik tonnada berilgan bo'lsa kilogrammga o'giring (1 t = 1000 kg)
- Faqat JSON chiqaring, izoh yozmang
- Markdown kod bloklari ishlatmang`;
}

/**
 * Build prompt for TIR carnet document extraction
 *
 * AI ONLY extracts data. NO comparison, NO validation, NO decisions.
 */
export function buildTirExtractionPrompt(): string {
  return `Siz hujjat ma'lumotlarini ajratib oluvchi AI ekansiz.
TIR karnet (Carnet TIR) matnidan quyidagi maydonlarni AJRATIB OLING.

MUHIM:
- Faqat ma'lumotlarni ajratib oling
- Taqqoslash, tekshirish, xato topish QILMASLIK
- Faqat JSON chiqaring
- Hech qanday qiymatni taxmin qilmang yoki o'ylab topmang

MAYDONLAR (TIR karnet grafalari bo'yicha):

{
  "tir_carnet_number": string | null,      // karnet raqami (masalan XX00000000)
  "holder_name": string | null,            // karnet egasi (tashuvchi tashkilot)
  "departure_customs": string | null,      // jo'nash bojxonasi
  "destination_customs": string | null,    // manzil bojxonasi
  "consignee_name": string | null,         // yuk oluvchi (agar ko'rsatilgan bo'lsa)
  "invoice_ref_number": string | null,     // ilova hujjatlardagi invoys raqami, FAQAT aniq yozilgan bo'lsa
  "total_package_count": number | null,    // grafa 9/10 — joylar soni
  "goods_description": string | null,      // grafa 10 — yuk tavsifi
  "total_gross_weight": number | null,     // grafa 11 — brutto og'irlik, kg
  "products": [                            // agar tovarlar alohida qatorlarda berilgan bo'lsa
    {
      "name": string,
      "package_count": number | null,
      "gross_weight": number | null,
      "net_weight": number | null
    }
  ]
}

QOIDALAR:
- Agar maydon topilmasa → null (products topilmasa → [])
- Raqamlar raqam bo'lishi kerak (string emas)
- Og'irlik tonnada berilgan bo'lsa kilogrammga o'giring (1 t = 1000 kg)
- Faqat JSON chiqaring, izoh yozmang
- Markdown kod bloklari ishlatmang`;
}

// ==================== LEGACY SUPPORT ====================

/**
 * Legacy function names for backward compatibility
 */
export function buildInvoicePrompt(): string {
  return buildInvoiceExtractionPrompt();
}

export function buildST1Prompt(): string {
  return buildST1ExtractionPrompt();
}

/**
 * Legacy comparison prompt - DEPRECATED
 * This should not be used. Use rule engine instead.
 */
export function buildComparisonPrompt(): string {
  console.warn('[DEPRECATED] buildComparisonPrompt() is deprecated. Use rule engine for validation.');
  return '';
}
