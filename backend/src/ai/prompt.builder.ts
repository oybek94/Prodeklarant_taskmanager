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

export interface FitoExtraction {
  certificate_number: string | null;
  issue_date: string | null; // YYYY-MM-DD format
  exporter: string | null;
  importer: string | null;
  product: string | null;
  origin_country: string | null;
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
  return `Extract the following information from the Fito (Phytosanitary Certificate) text and return ONLY valid JSON (no markdown, no explanations):

{
  "certificate_number": string,
  "issue_date": string (YYYY-MM-DD format),
  "exporter": string,
  "importer": string,
  "product": string,
  "origin_country": string
}

Rules:
- If any field is not found, use null
- Dates must be in YYYY-MM-DD format
- Return ONLY the JSON object, no markdown code blocks, no explanations`;
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
