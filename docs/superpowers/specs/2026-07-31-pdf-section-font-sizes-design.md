# Invoys PDF: bo'limlar bo'yicha shrift o'lchamini tanlash

**Sana:** 2026-07-31
**Holat:** tasdiqlangan

## Muammo

Invoys PDF'ida barcha bo'limlar bitta global `scale` bilan boshqariladi.
`renderFittedInvoicePdf` (`frontend/src/components/invoice/pdf/pdfFit.tsx`) hujjatni
avval o'lchaydi, so'ng 1-betga sig'adigan eng katta masshtabni tanlaydi; har bir
bo'lim `scaleFont(base, scale)` orqali o'z shriftini oladi.

Deklarant ayrim bo'limning o'lchamini qo'lda belgilay olmaydi. Amalda kerak
bo'ladi: masalan rekvizitlar bloki mijoz talabiga ko'ra aynan 8pt bo'lishi kerak,
qolgan qismi esa avvalgidek avtomatik moslashaversin.

## Yechim

To'rtta bo'lim uchun alohida-alohida shrift o'lchamini tanlash imkoniyati.
Tanlangan o'lcham **qat'iy** — auto-fit unga tegmaydi. Tanlanmagan bo'lim
"Avto" holatida qoladi va hozirgidek ishlaydi.

### Bo'limlar

| Kalit | UI nomi | Komponent |
|---|---|---|
| `parties` | Rekvizitlar | `pdf/PdfParties.tsx` |
| `additionalInfo` | Qo'shimcha ma'lumotlar | `pdf/PdfAdditionalInfo.tsx` |
| `itemsTable` | Mahsulot ma'lumotlari jadvali | `pdf/PdfItemsTable.tsx` |
| `notes` | Особые примечания | `pdf/PdfNotes.tsx` |

## Ma'lumot modeli

Migratsiya kerak emas — `Invoice.additionalInfo` (Json) ichida saqlanadi:

```ts
type PdfSectionKey = 'parties' | 'additionalInfo' | 'itemsTable' | 'notes';
/** pt; kalit yo'q = "Avto" (hozirgi xatti-harakat) */
type PdfFontSizes = Partial<Record<PdfSectionKey, number>>;
```

Ruxsat etilgan oraliq: **5–14 pt** (butun son).

Yo'l `additionalFieldsOrder` bilan bir xil:

- `useInvoiceModalsState` — `pdfFontSizes` state
- `useInvoiceLoader` — `additionalInfo.pdfFontSizes` dan o'qish (validatsiya bilan:
  noto'g'ri kalit/oraliqdan tashqari qiymat e'tiborsiz qoldiriladi)
- `useInvoiceSave` — `additionalInfo` ichiga yozish
- `backend/src/routes/invoices.ts` — zod sxemasi

## Shrift tanlash mantiqi

Yangi modul `frontend/src/components/invoice/pdf/pdfFontSizes.ts`:

- `PDF_FONT_SECTIONS` — kalit + UI nomi ro'yxati (modal shu ro'yxatdan quriladi)
- `PDF_FONT_MIN = 5`, `PDF_FONT_MAX = 14`
- `sanitizePdfFontSizes(raw): PdfFontSizes` — bazadan kelgan qiymatni tozalash
- `sectionFont(override, base, scale)` — `override ?? scaleFont(base, scale)`

Har bir bo'lim komponenti yangi ixtiyoriy `fontSize?: number` prop oladi.
Sarlavhasi bor bo'limlarda (Дополнительная информация, Примечания) ierarxiya
saqlanadi: **matn = tanlangan o'lcham, sarlavha = +1pt** (`PDF_FONT_MAX` bilan
cheklanadi).

`InvoicePDFDocument` `pdfFontSizes` propini qabul qilib bo'limlarga tarqatadi.

## Auto-fit bilan bog'liqlik

`pdfFit.tsx` mantiqi **o'zgarmaydi**. U hujjatni o'lchab `scale` tanlashda davom
etadi; qat'iy belgilangan bloklar `scale` bilan o'zgarmagani uchun o'lchov ularni
shundayligicha hisobga oladi va qolgan bo'limlar moslashadi. Hech qanday
masshtabda sig'masa — mavjud `READABLE_FALLBACK_SCALE` yo'li ishlaydi va hujjat
bir necha betga bo'linadi. Bu ataylab: foydalanuvchi qat'iy o'lcham tanlagan.

### Jadval — kenglik cheklovi

`PdfItemsTable` da ikki xil moslash bor:

1. **balandlik** bo'yicha — global `scale` (tanlangan o'lcham buni bekor qiladi)
2. **kenglik** bo'yicha — `fitTable`, ustunlar A4 kengligiga sig'ishi

Ikkinchisi fizik cheklov: 13 ustunli jadvalda 12pt matn sig'maydi va ustunlar
bir-biriga yopishadi. Shuning uchun jadvalda tanlangan qiymat `fitTable` uchun
**boshlang'ich (`preferred`)** bo'ladi — u `MAX_TABLE_FONT = 7` shiftini bekor
qiladi, lekin ustunlar sig'masa `fitTable` uni kichraytiraveradi.

Modalda shu haqda bir qatorlik izoh chiqadi.

## UI

Toolbarda (`InvoiceToolbar.tsx`) yangi ikonka-tugma:
`solar:text-field-linear`, `title="PDF shrift o'lchamlari"`. Ikonka `-linear`
variantida — toolbardagi qolgan barcha ikonkalar bilan bir xil bo'lishi uchun.

`Invoys ▾` dropdowniga qo'yilmaydi: u faqat `invoysStageReady` bo'lganda
ko'rinadi, sozlamani esa undan oldin ham qo'yish kerak bo'lishi mumkin.

Modal `PdfFontSizeModal.tsx` — `AddFieldModal` uslubida (framer-motion,
`AnimatePresence` ichida `InvoiceModals.tsx` da):

| Bo'lim | O'lcham |
|---|---|
| Rekvizitlar | `Avto ▾` |
| Qo'shimcha ma'lumotlar | `Avto ▾` |
| Mahsulot ma'lumotlari jadvali | `Avto ▾` |
| Особые примечания | `Avto ▾` |

Har bir qator — `Avto / 5pt … 14pt` selecti. Pastda "Hammasini avtoga qaytarish"
tugmasi. O'zgarish state'ga yoziladi va invoysning odatdagi saqlashi bilan
saqlanadi (`additionalFieldsOrder` kabi).

## Qamrov

**Kiradi:** `invoice`, `spec`, `packing` tablari.

**Kirmaydi:**

- `pricelist` tabi (`PdfPriceList.tsx`) — butunlay boshqa layout, bu 4 bo'lim
  u yerda yo'q
- English PDF (`backend/src/services/invoice-pdf-en.ts`) — alohida PDFKit
  generatori, serverda ishlaydi

## Tekshirish

- "Avto" holatida PDF hozirgidek chiqadi (regressiya yo'q)
- Rekvizitlar 8pt qilinsa — PDF'da aynan 8pt, qolgan bo'limlar moslashadi
- Kichik o'lcham tanlansa qolgan bo'limlar kattalashadi (`scale` oshadi)
- Katta o'lcham tanlansa va sig'masa — hujjat 2-betga chiqadi, shrift saqlanadi
- Jadvalga 12pt qo'yilsa, ko'p ustunli invoysda `fitTable` kichraytiradi
- Sozlama saqlanadi va sahifa qayta ochilganda tiklanadi
