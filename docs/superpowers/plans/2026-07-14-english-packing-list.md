# English Packing List (AI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invoys sahifasidagi "English Invoice (AI)" tarjima funksiyasini tabga bog'liq qilib, Upakovochniy list tabida English packing list (narxsiz/summasiz, `PACKING LIST` sarlavhali) chiqarish.

**Architecture:** Bitta parametrlangan PDFKit generatoriga `mode: 'invoice' | 'packing'` qo'shiladi (kod takrorlanmaydi). Route `?mode=packing` query'ni o'qib uzatadi; AI tarjima keshi (`translatedRequisitesEn`) umumiy qoladi. Frontend `generatePdfEn` aktiv `viewTab` ga qarab `?mode=packing` qo'shadi va tugma matnini almashtiradi.

**Tech Stack:** Backend — Express 5 + TypeScript + PDFKit + Prisma; testlar — vitest. Frontend — React 19 + TypeScript + Vite + axios (`apiClient`).

## Global Constraints

- TypeScript strict, `any` ishlatilmaydi (yangi kodda). Mavjud faylda allaqachon `any` bor — yangi qo'shilgan qismlarda tur aniq bo'lsin.
- Valyuta — hech qachon yangi `number` hisob kiritilmaydi; mavjud logika o'zgarmaydi.
- Secretlar kodga yozilmaydi.
- Backend test buyrug'i: `npm test` (vitest run), bitta fayl: `npx vitest run src/__tests__/<file>.test.ts`.
- Backend type-check: `npx tsc --noEmit` (`backend/` ichida).
- Frontend'da avtomatik test yo'q — verifikatsiya `npx tsc --noEmit` (`frontend/`) + qo'lda tekshirish.
- Commit xabarlari oxiriga: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: `mode` uchun ustun filtri (pure helper, TDD)

**Files:**
- Modify: `backend/src/services/invoice-pdf-en.ts` (yangi export qo'shiladi, fayl oxiriga yaqin)
- Test: `backend/src/__tests__/invoice-pdf-en-columns.test.ts` (yangi)

**Interfaces:**
- Consumes: hech narsa (yangi pure funksiya).
- Produces: `export function filterEnglishColumnsForMode(keys: string[], mode: 'invoice' | 'packing'): string[]` — `packing` bo'lsa `unitPrice` va `total` ni olib tashlaydi, aks holda `keys` o'zgarishsiz qaytadi. Task 2 shu funksiyani ishlatadi.

- [ ] **Step 1: Failing testni yozish**

Yaratish: `backend/src/__tests__/invoice-pdf-en-columns.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { filterEnglishColumnsForMode } from '../services/invoice-pdf-en';

describe('filterEnglishColumnsForMode', () => {
  const keys = ['index', 'tnved', 'name', 'unit', 'quantity', 'gross', 'net', 'unitPrice', 'total'];

  it('invoice mode: ustunlar o\'zgarmaydi', () => {
    expect(filterEnglishColumnsForMode(keys, 'invoice')).toEqual(keys);
  });

  it('packing mode: unitPrice va total olib tashlanadi', () => {
    expect(filterEnglishColumnsForMode(keys, 'packing')).toEqual([
      'index', 'tnved', 'name', 'unit', 'quantity', 'gross', 'net',
    ]);
  });

  it('packing mode: narx ustunlari bo\'lmasa ham xatolik yo\'q', () => {
    const noPrice = ['index', 'name', 'gross', 'net'];
    expect(filterEnglishColumnsForMode(noPrice, 'packing')).toEqual(noPrice);
  });

  it('asl massivni o\'zgartirmaydi (immutable)', () => {
    const copy = [...keys];
    filterEnglishColumnsForMode(keys, 'packing');
    expect(keys).toEqual(copy);
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/invoice-pdf-en-columns.test.ts`
Expected: FAIL — `filterEnglishColumnsForMode` eksport qilinmagan (import xatosi).

- [ ] **Step 3: Minimal implementatsiya**

`backend/src/services/invoice-pdf-en.ts` faylida `generateInvoicePDFEnglish` funksiyasidan **oldin** (masalan `getCurrencySymbol` yonига) quyidagini qo'shing:

```ts
export function filterEnglishColumnsForMode(
  keys: string[],
  mode: 'invoice' | 'packing'
): string[] {
  if (mode === 'packing') {
    return keys.filter((k) => k !== 'unitPrice' && k !== 'total');
  }
  return keys;
}
```

- [ ] **Step 4: Test pass bo'lishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/invoice-pdf-en-columns.test.ts`
Expected: PASS (4 ta test).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/invoice-pdf-en.ts backend/src/__tests__/invoice-pdf-en-columns.test.ts
git commit -m "feat(pdf-en): add filterEnglishColumnsForMode column helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `generateInvoicePDFEnglish` ga `mode` + route `?mode=packing`

**Files:**
- Modify: `backend/src/services/invoice-pdf-en.ts` (interfeys, sarlavha, header, ustun filtri, amount-in-words)
- Modify: `backend/src/routes/invoices.ts` (route `?mode` parse + filename)

**Interfaces:**
- Consumes: `filterEnglishColumnsForMode(keys, mode)` (Task 1).
- Produces: `generateInvoicePDFEnglish(data)` endi `data.mode?: 'invoice' | 'packing'` qabul qiladi (default `'invoice'`). Route `GET /invoices/:id/pdf-en?mode=packing` packing PDF qaytaradi. Task 3 shu query'ni ishlatadi.

- [ ] **Step 1: Interfeysga `mode` qo'shish**

`backend/src/services/invoice-pdf-en.ts`, `InvoiceDataEn` interfeysi (6–12-qatorlar). `translatedRequisites` qatoridan keyin qo'shing:

```ts
interface InvoiceDataEn {
  invoice: Invoice & { items: (InvoiceItem & { nameEn?: string | null })[] };
  client: Client;
  company: CompanySettings;
  contract?: any;
  translatedRequisites: Record<string, string>;
  mode?: 'invoice' | 'packing';
}
```

- [ ] **Step 2: Sarlavha (`INVOICE` → mode'ga qarab)**

`generateInvoicePDFEnglish` boshida `t` yonida rejimni bir marta hisoblang. `const t = data.translatedRequisites;` qatoridan keyin qo'shing:

```ts
  const mode = data.mode === 'packing' ? 'packing' : 'invoice';
```

Keyin sarlavha blokini (hozir 150–154-qatorlar) quyidagiga almashtiring:

```ts
  // Document title (right-aligned)
  const titleText = mode === 'packing' ? 'PACKING LIST' : 'INVOICE';
  const titleFontSize = mode === 'packing' ? 20 : 32;
  doc.fontSize(titleFontSize);
  setFont('Helvetica-Bold');
  const titleWidth = doc.widthOfString(titleText);
  doc.text(titleText, rightColumnX - titleWidth, 60);
```

- [ ] **Step 3: Header — birinchi label va packing uchun qo'shimcha "Invoice No" qatori**

Header blokida (hozir 118–148-qatorlar). Birinchi qatordagi `'Invoice No: '` ni o'zgaruvchan qiling va packing bo'lsa ostiga qo'shimcha "Invoice No" qatori qo'shing. Blokni quyidagiga almashtiring (`headerY += 12;` va contract bloki oldiga):

```ts
  const invoiceDate = formatDate(data.invoice.date);
  const firstLabel = mode === 'packing' ? 'Packing List No: ' : 'Invoice No: ';
  setFont('Helvetica-Bold');
  doc.text(firstLabel, leftColumnX, headerY, { continued: true });
  setFont('Helvetica');
  doc.text(ensureUTF8(`${data.invoice.invoiceNumber} `), { continued: true });
  setFont('Helvetica-Bold');
  doc.text('dated ', { continued: true });
  setFont('Helvetica');
  doc.text(ensureUTF8(`${invoiceDate}`));
  headerY += 12;

  if (mode === 'packing') {
    setFont('Helvetica-Bold');
    doc.text('Invoice No: ', leftColumnX, headerY, { continued: true });
    setFont('Helvetica');
    doc.text(ensureUTF8(`${data.invoice.invoiceNumber} `), { continued: true });
    setFont('Helvetica-Bold');
    doc.text('dated ', { continued: true });
    setFont('Helvetica');
    doc.text(ensureUTF8(`${invoiceDate}`));
    headerY += 12;
  }
```

> Diqqat: eski `const invoiceDate = formatDate(data.invoice.date);` (114–126-qatorlar orasidagi asl e'lon) endi shu blokda bir marta e'lon qilinadi — asl e'lonni takrorlamang (ikki marta `const` bo'lmasin). `separatorY = headerY + 20` allaqachon dinamik, o'zgartirilmaydi.

- [ ] **Step 4: Items ustunlarini mode bo'yicha filtrlash**

`activeFeKeys` yakuniy shakllanganidan keyin (hozir 783–789-qatorlardagi `allExpectedKeys.forEach(...)` blokidan **keyin**, `baseWidths` e'lonidan **oldin**) qo'shing:

```ts
  activeFeKeys = filterEnglishColumnsForMode(activeFeKeys, mode);
```

> `activeFeKeys` `let` bilan e'lon qilingan (783-qator), shuning uchun qayta tayinlash mumkin. Total qatoridagi `else if (k === 'total')` shoxi endi packing'da ishlamaydi (kalit yo'q), narx/summa ustunlari tabiiy tarzda chiqmaydi — qo'shimcha o'zgarish shart emas.

- [ ] **Step 5: "Amount in words" ni packing'da o'tkazib yuborish**

"Amount in words (English)" bloki (hozir 903–910-qatorlar) ni quyidagiga almashtiring:

```ts
  // Amount in words (English) — faqat invoice uchun
  if (mode === 'packing') {
    doc.y = totalY + 20;
    doc.moveDown(1);
  } else {
    const nextY = totalY + 30;
    doc.fontSize(8);
    const totalAmount = Number(data.invoice.totalAmount) || 0;
    const amountInWords = numberToWordsEn(totalAmount, data.invoice.currency);
    doc.text(ensureUTF8(`Amount in words: ${amountInWords}`), startX, nextY);
    doc.y = nextY + 12;
    doc.moveDown(1);
  }
```

- [ ] **Step 6: Route — `?mode` parse va funksiyaga uzatish**

`backend/src/routes/invoices.ts`, `router.get('/:id/pdf-en', ...)` (786-qator). `const id = parseInt(...)` dan keyin qo'shing:

```ts
    const mode: 'invoice' | 'packing' = req.query.mode === 'packing' ? 'packing' : 'invoice';
```

`generateInvoicePDFEnglish({ ... })` chaqiruvida (912–929-qatorlar) `translatedRequisites,` dan keyin `mode,` qo'shing:

```ts
    const doc = generateInvoicePDFEnglish({
      invoice: {
        ...invoice,
        totalAmount: new Prisma.Decimal(Number(invoice.totalAmount)),
        items: invoice.items.map(item => ({
          ...item,
          quantity: new Prisma.Decimal(Number(item.quantity) || 0),
          grossWeight: item.grossWeight ? new Prisma.Decimal(Number(item.grossWeight)) : null,
          netWeight: item.netWeight ? new Prisma.Decimal(Number(item.netWeight)) : null,
          unitPrice: new Prisma.Decimal(Number(item.unitPrice) || 0),
          totalPrice: new Prisma.Decimal(Number(item.totalPrice) || 0),
        }))
      },
      client: invoice.client,
      company: companySettings,
      contract,
      translatedRequisites,
      mode,
    });
```

- [ ] **Step 7: Route — filename mode'ga qarab**

`Content-Disposition` sarlavhasini (hozir 932-qator) quyidagiga almashtiring:

```ts
    const fileBase = mode === 'packing'
      ? `packing-${invoice.invoiceNumber}-EN.pdf`
      : `invoice-${invoice.invoiceNumber}-EN.pdf`;
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase}"`);
```

> `res.setHeader('Content-Type', ...)` asl 931-qatorda ham bor — bittasini qoldiring, ikki marta bo'lmasin.

- [ ] **Step 8: Import qo'shish**

`backend/src/routes/invoices.ts` yuqorisidagi importda (6-qator) `generateInvoicePDFEnglish` allaqachon import qilingan. Yangi import shart emas — tekshiring, agar `filterEnglishColumnsForMode` route'da kerak bo'lmasa import qilmang.

- [ ] **Step 9: Backend type-check + testlar**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: type-check xatosisiz; barcha testlar (jumladan Task 1) PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/invoice-pdf-en.ts backend/src/routes/invoices.ts
git commit -m "feat(pdf-en): packing mode uchun PACKING LIST layout va ?mode=packing route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — `generatePdfEn` tabga bog'liq + tugma matni

**Files:**
- Modify: `frontend/src/components/invoice/hooks/useInvoiceDownloads.ts` (params + `generatePdfEn`)
- Modify: `frontend/src/pages/Invoice.tsx` (hookka `viewTab` uzatish)
- Modify: `frontend/src/components/invoice/InvoiceToolbar.tsx` (tugma matni)

**Interfaces:**
- Consumes: backend `GET /invoices/:id/pdf-en?mode=packing` (Task 2); `ViewTab` turi (`../types`).
- Produces: UI o'zgarishi — yakuniy foydalanuvchi funksiyasi.

- [ ] **Step 1: `useInvoiceDownloads` params'ga `viewTab` qo'shish**

`frontend/src/components/invoice/hooks/useInvoiceDownloads.ts`. Yuqoridagi import (3-qator) ga `ViewTab` qo'shing:

```ts
import type { Invoice as InvoiceType, RegionCode, FssFilePrefix, Task, ViewTab } from '../types';
```

`UseInvoiceDownloadsParams` interfeysiga (`setShowFssRegionModal` yonida) qo'shing:

```ts
  setShowFssRegionModal: (v: boolean) => void;
  viewTab: ViewTab;
```

Funksiya destrukturizatsiyasiga (`setShowFssRegionModal,` yonida) qo'shing:

```ts
  setShowFssRegionModal,
  viewTab,
}: UseInvoiceDownloadsParams) {
```

- [ ] **Step 2: `generatePdfEn` ni tabga bog'liq qilish**

`generatePdfEn` (hozir 66–87-qatorlar) ni quyidagiga almashtiring:

```ts
  const generatePdfEn = useCallback(async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const isPacking = viewTab === 'packing';
      const url = `/invoices/${invoice.id}/pdf-en${isPacking ? '?mode=packing' : ''}`;
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });
      const suffix = isPacking ? '_Packing_EN.pdf' : '_EN.pdf';
      const fileName = `${buildInvoiceDownloadBase()}${suffix}`;
      const objectUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading English PDF:', error);
      alert(error instanceof Error ? error.message : 'English PDF yuklab olishda xatolik yuz berdi');
    }
  }, [invoice?.id, buildInvoiceDownloadBase, viewTab]);
```

- [ ] **Step 3: `Invoice.tsx` — hookka `viewTab` uzatish**

`frontend/src/pages/Invoice.tsx`, `useInvoiceDownloads({ ... })` chaqiruvi (285–300-qatorlar). `setShowFssRegionModal,` dan keyin qo'shing:

```ts
    setShowFssRegionModal,
    viewTab,
  });
```

> `viewTab` 173-qatorda e'lon qilingan (`useState<ViewTab>('invoice')`) — 285-qatorda mavjud, qo'shimcha o'zgarish shart emas.

- [ ] **Step 4: `InvoiceToolbar` — tugma matni tabga qarab**

`frontend/src/components/invoice/InvoiceToolbar.tsx`. English tugma matni (hozir 338-qator `English Invoice (AI)`). Tugma blokini (328–339-qatorlar) quyidagiga almashtiring:

```tsx
                <button
                  type="button"
                  onClick={() => {
                    generatePdfEn();
                    setInvoysDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon icon="solar:translation-bold-duotone" className="w-4 h-4" />
                  {viewTab === 'packing' ? 'English Packing List (AI)' : 'English Invoice (AI)'}
                </button>
```

> `viewTab` allaqachon `InvoiceToolbar` propsida bor (10-qator interfeysi, `viewTab: ViewTab`) va destrukturizatsiyada mavjud — qo'shimcha prop shart emas.

- [ ] **Step 5: Frontend type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 6: Qo'lda verifikatsiya (backend + frontend dev)**

1. Backend va frontend'ni ishga tushiring (`npm run dev` har birida) yoki mavjud dev muhitidan foydalaning.
2. Ma'lumotli invoice bor taskni oching → Invoice sahifasi.
3. **Invoys** tabi: Invoys dropdown → "English Invoice (AI)" → avvalgidek to'liq invoice English PDF (regressiya yo'q, narx/Total/Amount in words bor).
4. **Upakovochniy list** tabi: dropdownda tugma "English Packing List (AI)" ko'rsatilishini tasdiqlang → bosing → `PACKING LIST` sarlavhali, narx/Total/Amount-in-words'siz, header'da `Packing List No` + `Invoice No`, parties/notes/imzolar tarjima qilingan English PDF yuklanadi (`..._Packing_EN.pdf`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/invoice/hooks/useInvoiceDownloads.ts frontend/src/pages/Invoice.tsx frontend/src/components/invoice/InvoiceToolbar.tsx
git commit -m "feat(invoice): English tarjima tugmasi tabga bog'liq (packing list qo'llab-quvvatlash)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review natijalari

- **Spec coverage:** Spec 1-bo'lim (`mode` + packing branching) → Task 2 Step 1–5; 2-bo'lim (route `?mode` + filename) → Task 2 Step 6–7; 3-bo'lim (`generatePdfEn` tabga bog'liq + `Invoice.tsx`) → Task 3 Step 1–3; 4-bo'lim (toolbar tugma matni) → Task 3 Step 4. Verification bo'limi → Task 3 Step 6. Ustun filtri (spec 1-bo'lim `unitPrice`/`total`) → Task 1. Barcha talablar qoplangan.
- **Placeholder scan:** "TBD"/"TODO"/mavhum qadamlar yo'q — har bir kod qadami to'liq kod bilan.
- **Type consistency:** `filterEnglishColumnsForMode(keys: string[], mode: 'invoice' | 'packing'): string[]` — Task 1'da e'lon, Task 2 Step 4'da bir xil signatura bilan ishlatilgan. `mode` turi (`'invoice' | 'packing'`) hamma joyda bir xil. `ViewTab` `../types` dan import qilinadi (mavjud tur).
