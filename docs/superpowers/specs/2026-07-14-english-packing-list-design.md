# English Packing List (AI) — Dizayn

**Sana:** 2026-07-14
**Holat:** Tasdiqlangan

## Muammo / Maqsad

Invoys sahifasidagi **"English Invoice (AI)"** funksiyasi hozir faqat invoice hujjatini
inglizchaga tarjima qiladi va aktiv tabni e'tiborsiz qoldiradi. Foydalanuvchi shu funksiyani
**Upakovochniy list** (`viewTab === 'packing'`) tabida ham istaydi: packing list aynan
o'zining ko'rinishida (narxsiz, summasiz) inglizchaga tarjima qilinsin.

Talab: English packing list **Upakovochniy list tabida qanday ko'rinsa, shundayligicha**
tarjima qilinishi kerak.

## Mavjud arxitektura (o'zgarmaydigan qism)

- Frontend `generatePdfEn` (`useInvoiceDownloads.ts`) → `GET /invoices/:id/pdf-en`.
- Backend route (`routes/invoices.ts`) rekvizitlarni `buildTranslatableTexts` +
  `translateRequisites` orqali tarjima qiladi va natijani
  `invoice.additionalInfo.translatedRequisitesEn` ga keshlaydi.
- `generateInvoicePDFEnglish` (`services/invoice-pdf-en.ts`, PDFKit) INVOICE layoutini chizadi.
- Frontend `generatePdf` (oddiy ruscha PDF) allaqachon tabga bog'liq — packing tabida packing
  hujjatini yaratadi.
- Frontend `getEffectiveColumns` (`useInvoiceColumns.ts:81`) packing view uchun `unitPrice`
  va `total` ustunlarini majburan `false` qiladi.

## Invoice ↔ Packing list farqlari (ruscha ko'rinishga asosan)

| Element | Invoice | Packing list |
|---|---|---|
| Sarlavha | `INVOICE` | `PACKING LIST` |
| Header raqamlari | Invoice No | Packing List No + Invoice No |
| `unitPrice`, `total` ustunlari | bor | yo'q |
| Yakuniy `Total: $…` summa | bor | yo'q |
| Amount in words | bor | yo'q |
| Parties / Additional info / Notes / Signatures | bor | bir xil (bor) |
| AI tarjima manbasi | rekvizitlar, item nomlari, notes | **aynan bir xil** |

## Yechim

Bitta parametrlangan generator. ~900 qatorli PDF kodini takrorlamaymiz.

### 1. Backend: `generateInvoicePDFEnglish` ga `mode`

- `InvoiceDataEn` ga: `mode?: 'invoice' | 'packing'` (default `'invoice'`).
- `mode === 'packing'` bo'lganda:
  - Sarlavha `PACKING LIST`.
  - Header: `Packing List No: … dated …` va ostiga `Invoice No: … dated …` qatori.
  - Items jadvalidan `unitPrice` va `total` ustunlari chiqarib tashlanadi
    (`activeFeKeys` dan `unitPrice`/`total` filtrlanadi — frontend qoidasiga mos).
  - Yakuniy qatorda `Total: $…` chizilmaydi (places/pcs/gross/net yig'indilari qoladi).
  - "Amount in words" bloki o'tkazib yuboriladi.
  - Parties, Additional Information, Special Notes, Signatures — o'zgarishsiz.
- `mode === 'invoice'` (default) — hozirgi xatti-harakat, tegilmaydi.

### 2. Backend: route `GET /invoices/:id/pdf-en?mode=packing`

- `const mode = req.query.mode === 'packing' ? 'packing' : 'invoice'`.
- Tarjima mantiqi va `translatedRequisitesEn` keshi umumiy qoladi (rekvizitlar bir xil,
  qo'shimcha OpenAI chaqiruvi yo'q).
- `generateInvoicePDFEnglish({ …, mode })`.
- `Content-Disposition` fayl nomi: packing uchun `packing-<invoiceNumber>-EN.pdf`,
  aks holda `invoice-<invoiceNumber>-EN.pdf`.

### 3. Frontend: `generatePdfEn` tabga bog'liq

- `useInvoiceDownloads` propslariga `viewTab: ViewTab` qo'shiladi.
- `generatePdfEn`:
  - `const mode = viewTab === 'packing' ? 'packing' : 'invoice'`.
  - URL: `/invoices/${invoice.id}/pdf-en${mode === 'packing' ? '?mode=packing' : ''}`.
  - Fayl nomi: packing uchun `${buildInvoiceDownloadBase()}_Packing_EN.pdf`, aks holda
    `${buildInvoiceDownloadBase()}_EN.pdf`.
- `Invoice.tsx`: `useInvoiceDownloads` ga `viewTab` uzatiladi.

### 4. Frontend: `InvoiceToolbar` tugma matni

- Dropdowndagi English tugma matni:
  - `viewTab === 'packing'` → **"English Packing List (AI)"**.
  - aks holda → **"English Invoice (AI)"**.
- Ikonka bir xil: `solar:translation-bold-duotone`.
- `onClick` bir xil `generatePdfEn()` (endi tabga bog'liq).
- `InvoiceToolbar` propslariga `viewTab` allaqachon bor.

## Qamrovdan tashqari (Non-goals)

- Spec / pricelist tablari uchun English varianti — o'zgarishsiz (bu tablarda tugma
  hozirgidek invoice hujjatini beradi).
- Yangi tarjima maydonlari yoki OpenAI prompt o'zgarishi yo'q.
- Ruscha packing list PDF (`InvoicePDFDocument`) — tegilmaydi.

## Tekshirish (Verification)

1. Invoys tabi: "English Invoice (AI)" — avvalgidek to'liq invoice English PDF (regressiya yo'q).
2. Upakovochniy list tabi: tugma "English Packing List (AI)" ko'rsatadi; bosilganda
   `PACKING LIST` sarlavhali, narxsiz/summasiz, amount-in-words'siz English PDF yuklanadi;
   parties/notes/imzolar tarjima qilingan holda joyida.
3. Backend `tsc` type-check toza (PreToolUse/PostToolUse hooklar).
