# English Invoice — Sodiq label + valyuta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "English Invoice (AI)" PDF ruscha invoysga sodiq bo'lsin — ustun sarlavhalari haqiqiy ruscha label'dan tarjima qilinsin va valyuta (amount-in-words, total) `contract.contractCurrency` (EUR/RUB/USD/UZS) dan olinsin.

**Architecture:** Uch nuqta: (1) `numberToWordsEn` valyuta bo'yicha kengaytiriladi; (2) `buildTranslatableTexts` effektiv ruscha ustun label'larini `col_*` kalitlar bilan qo'shadi (AI tarjima quvuri qayta ishlatiladi); (3) `invoice-pdf-en.ts` effektiv valyutani hisoblaydi va header'da tarjima qilingan label'ni dinamik balandlik bilan chizadi. Route o'zgarmaydi — kesh yetishmayotgan kalitlarni avtomatik oladi.

**Tech Stack:** Backend Express 5 + TypeScript + PDFKit + Prisma; testlar vitest.

## Global Constraints

- TypeScript strict, yangi kodda `any` ishlatilmaydi.
- Backend test: `npm test` (vitest run); bitta fayl: `npx vitest run src/__tests__/<file>.test.ts` (Bash tool, POSIX shell).
- Backend type-check: `npx tsc --noEmit` (`backend/` ichida), exit 0 bo'lishi shart.
- Dev server ishga tushirilmaydi.
- Valyuta wording aynan: USD→`US Dollar`/`US Dollars`/`cents`; EUR→`Euro`/`Euros`/`eurocents`; RUB→`Ruble`/`Rubles`/`kopecks`; UZS va boshqa→`Sum`/`Sums`/`tiyin`.
- Effektiv valyuta: `contract.contractCurrency || invoice.currency || 'USD'`, `.trim().toUpperCase()`.
- Ruscha total label valyutadan: USD→`Общая сумма в Долл. США`, EUR→`Общая сумма в Евро`, RUB→`Общая сумма Рубли РФ`, aks holda `columnLabels.total` yoki default.
- Commit oxiriga: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: `numberToWordsEn` valyuta qo'llab-quvvatlashi (TDD)

**Files:**
- Modify: `backend/src/services/invoice-pdf-en.ts` (1014–1047-qatorlar: export + valyuta bloki)
- Test: `backend/src/__tests__/invoice-pdf-en-currency.test.ts` (yangi)

**Interfaces:**
- Consumes: hech narsa.
- Produces: `export function numberToWordsEn(num: number, currency: string): string` — valyutaga qarab birlik nomi va kasr birligini yozadi (USD/EUR/RUB/UZS). Task 3 shu funksiyani `effectiveCurrency` bilan chaqiradi (o'sha faylda).

- [ ] **Step 1: Failing testni yozish**

Yaratish: `backend/src/__tests__/invoice-pdf-en-currency.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { numberToWordsEn } from '../services/invoice-pdf-en';

describe('numberToWordsEn — currency wording', () => {
  it('EUR: Euros + eurocents', () => {
    expect(numberToWordsEn(22929.76, 'EUR')).toBe(
      'Twenty-two thousand nine hundred twenty-nine Euros 76 eurocents'
    );
  });

  it('EUR: singular Euro', () => {
    expect(numberToWordsEn(1, 'EUR')).toBe('One Euro');
  });

  it('USD: US Dollars + cents', () => {
    expect(numberToWordsEn(1.5, 'USD')).toBe('One US Dollar 50 cents');
    expect(numberToWordsEn(5, 'USD')).toBe('Five US Dollars');
  });

  it('RUB: Rubles + kopecks', () => {
    expect(numberToWordsEn(2, 'RUB')).toBe('Two Rubles');
    expect(numberToWordsEn(2.03, 'RUB')).toBe('Two Rubles 3 kopecks');
  });

  it('UZS va noma\'lum valyuta: Sums + tiyin (default)', () => {
    expect(numberToWordsEn(3, 'UZS')).toBe('Three Sums');
    expect(numberToWordsEn(3, '')).toBe('Three Sums');
  });

  it('kichik harfli valyuta ham ishlaydi (case-insensitive)', () => {
    expect(numberToWordsEn(1, 'eur')).toBe('One Euro');
  });

  it('nol', () => {
    expect(numberToWordsEn(0, 'EUR')).toBe('zero');
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/invoice-pdf-en-currency.test.ts`
Expected: FAIL — `numberToWordsEn` eksport qilinmagan (import xatosi).

- [ ] **Step 3: `numberToWordsEn` ni export qilib, valyuta blokini almashtirish**

`backend/src/services/invoice-pdf-en.ts`, 1014-qator signaturasini `export` qiling:

```ts
export function numberToWordsEn(num: number, currency: string): string {
```

Keyin hozirgi valyuta blokini (1036–1044-qatorlar: `if (currency === 'USD') { ... } else { ... }` va `if (decimalPart > 0) { ... }`) quyidagiga almashtiring:

```ts
  const cur = String(currency || '').trim().toUpperCase();
  const units: Record<string, { one: string; many: string; sub: string }> = {
    USD: { one: 'US Dollar', many: 'US Dollars', sub: 'cents' },
    EUR: { one: 'Euro', many: 'Euros', sub: 'eurocents' },
    RUB: { one: 'Ruble', many: 'Rubles', sub: 'kopecks' },
    UZS: { one: 'Sum', many: 'Sums', sub: 'tiyin' },
  };
  const u = units[cur] || units.UZS;
  result += wholePart === 1 ? ` ${u.one}` : ` ${u.many}`;

  if (decimalPart > 0) {
    result += ` ${decimalPart} ${u.sub}`;
  }
```

> `let result = convert(wholePart);` qatori (1034) va `return result.charAt(0)...` (1046) o'zgarmaydi. `num === 0 → return 'zero'` ham o'zgarmaydi.

- [ ] **Step 4: Test pass bo'lishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/invoice-pdf-en-currency.test.ts`
Expected: PASS (7 ta test).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/invoice-pdf-en.ts backend/src/__tests__/invoice-pdf-en-currency.test.ts
git commit -m "feat(pdf-en): numberToWordsEn EUR/RUB/UZS valyuta qo'llab-quvvatlashi

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `buildTranslatableTexts` — `col_*` ustun label'lari (TDD)

**Files:**
- Modify: `backend/src/services/translate.service.ts` (`if (additionalInfo)` bloki ichida, specCustomFields'dan keyin)
- Test: `backend/src/__tests__/translate-column-labels.test.ts` (yangi)

**Interfaces:**
- Consumes: hech narsa (mavjud eksport `buildTranslatableTexts`).
- Produces: `buildTranslatableTexts` endi `col_<key>` kalitlarini qaytaradi (ruscha effektiv ustun label'lari). Task 3 PDF header'da `tr(t, 'col_<key>', fallback)` orqali ularning tarjimasini ishlatadi.

- [ ] **Step 1: Failing testni yozish**

Yaratish: `backend/src/__tests__/translate-column-labels.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildTranslatableTexts } from '../services/translate.service';

describe('buildTranslatableTexts — col_* labels', () => {
  it('custom unitPrice label va EUR total label', () => {
    const texts = buildTranslatableTexts({
      contract: { contractCurrency: 'EUR' },
      additionalInfo: { columnLabels: { unitPrice: 'Цена за кг' } },
    });
    expect(texts.col_unitPrice).toBe('Цена за кг');
    expect(texts.col_total).toBe('Общая сумма в Евро');
    expect(texts.col_name).toBe('Наименование товара'); // default
  });

  it('valyutasiz: total default USD label', () => {
    const texts = buildTranslatableTexts({ additionalInfo: {} });
    expect(texts.col_total).toBe('Общая сумма в Долл. США');
  });

  it('RUB total label', () => {
    const texts = buildTranslatableTexts({
      contract: { contractCurrency: 'RUB' },
      additionalInfo: {},
    });
    expect(texts.col_total).toBe('Общая сумма Рубли РФ');
  });

  it('additionalInfo yo\'q bo\'lsa col_* qo\'shilmaydi', () => {
    const texts = buildTranslatableTexts({ contract: { sellerName: 'ООО Тест' } });
    expect(texts.col_total).toBeUndefined();
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/translate-column-labels.test.ts`
Expected: FAIL — `col_*` kalitlar mavjud emas (`undefined`).

- [ ] **Step 3: `buildTranslatableTexts` ga `col_*` label'larini qo'shish**

`backend/src/services/translate.service.ts`, `if (additionalInfo) { ... }` bloki ichida,
`// Spec custom fields` forEach blokidan **keyin**, lekin `if (additionalInfo)` yopilishidan
**oldin** (hozir ~209-qator) qo'shing:

```ts
    // Column labels (effektiv ruscha label'lar — ingliz PDF sarlavhalari uchun)
    const columnLabels = (additionalInfo.columnLabels && typeof additionalInfo.columnLabels === 'object')
      ? (additionalInfo.columnLabels as Record<string, string>) : {};
    const DEFAULT_COLUMN_LABELS_RU: Record<string, string> = {
      index: '№', tnved: 'Код ТН ВЭД', plu: 'Код PLU', name: 'Наименование товара',
      package: 'Вид упаковки', packagesCount: 'Кол-во упаковки', unit: 'Ед. изм.',
      quantity: 'Мест', shtCount: 'шт', gross: 'Брутто (кг)', net: 'Нетто (кг)',
      unitPrice: 'Цена за ед.изм.', total: 'Сумма с НДС',
    };
    const cur = String(contract?.contractCurrency || invoice?.currency || 'USD').trim().toUpperCase();
    const totalLabelRu =
      cur === 'USD' ? 'Общая сумма в Долл. США' :
      cur === 'RUB' ? 'Общая сумма Рубли РФ' :
      cur === 'EUR' ? 'Общая сумма в Евро' :
      (columnLabels.total || DEFAULT_COLUMN_LABELS_RU.total);
    for (const key of Object.keys(DEFAULT_COLUMN_LABELS_RU)) {
      const ru = key === 'total' ? totalLabelRu : (columnLabels[key] || DEFAULT_COLUMN_LABELS_RU[key]);
      if (ru && ru.trim()) texts[`col_${key}`] = ru;
    }
```

> `contract` va `invoice` funksiya boshida (97-qator) allaqachon destrukturizatsiya qilingan —
> qamrovda. `additionalInfo` `if` sharti ichidamiz.

- [ ] **Step 4: Test pass bo'lishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/translate-column-labels.test.ts`
Expected: PASS (4 ta test).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/translate.service.ts backend/src/__tests__/translate-column-labels.test.ts
git commit -m "feat(translate): buildTranslatableTexts col_* ustun label'lari (valyutali total)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `invoice-pdf-en.ts` — effektiv valyuta + header tarjimasi + dinamik balandlik

**Files:**
- Modify: `backend/src/services/invoice-pdf-en.ts` (effectiveCurrency; 530, 928, 940-qatorlar; header render 852–859)

**Interfaces:**
- Consumes: `numberToWordsEn` (Task 1, kengaytirilgan); `col_*` tarjimalar `data.translatedRequisites` ichida (Task 2 orqali route tomonidan to'ldiriladi).
- Produces: sodiq ingliz invoice PDF. Yakuniy foydalanuvchi natijasi.

- [ ] **Step 1: `effectiveCurrency` hisoblash**

`generateInvoicePDFEnglish` boshida, `const mode = ...` qatoridan (60-qator) **keyin** qo'shing:

```ts
  const effectiveCurrency = String(
    data.contract?.contractCurrency || data.invoice.currency || 'USD'
  ).trim().toUpperCase();
```

- [ ] **Step 2: "Current account" valyutasi (530-qator)**

Almashtiring:
```ts
      const _txt25 = ensureUTF8(`Current account (${data.invoice.currency}): ${data.client.bankAccount}`);
```
bilan:
```ts
      const _txt25 = ensureUTF8(`Current account (${effectiveCurrency}): ${data.client.bankAccount}`);
```

- [ ] **Step 3: Total katak simvoli (928-qator)**

Almashtiring:
```ts
    else if (k === 'total') doc.text(`${getCurrencySymbol(data.invoice.currency)} ${Number(data.invoice.totalAmount || 0).toFixed(2)}`, x, totalY, { width: w });
```
bilan:
```ts
    else if (k === 'total') doc.text(`${getCurrencySymbol(effectiveCurrency)} ${Number(data.invoice.totalAmount || 0).toFixed(2)}`, x, totalY, { width: w });
```

- [ ] **Step 4: Amount in words valyutasi (940-qator)**

Almashtiring:
```ts
    const amountInWords = numberToWordsEn(totalAmount, data.invoice.currency);
```
bilan:
```ts
    const amountInWords = numberToWordsEn(totalAmount, effectiveCurrency);
```

- [ ] **Step 5: Header render — tarjima + dinamik balandlik (852–859-qatorlar)**

Almashtiring:
```ts
  // Table header
  doc.fontSize(7);
  activeFeKeys.forEach(k => {
    doc.text(englishHeaders[k], colPositions[k], tableTop, { width: colWidths[k] });
  });

  doc.lineWidth(0.5).strokeColor('#4b5563').moveTo(startX, tableTop + 15).lineTo(currentX, tableTop + 15).stroke();

  let y = tableTop + 20;
```
bilan:
```ts
  // Table header (haqiqiy ruscha label'dan tarjima; uzun sarlavhalar uchun dinamik balandlik)
  doc.fontSize(7);
  let headerHeight = 0;
  activeFeKeys.forEach(k => {
    const label = ensureUTF8(tr(t, `col_${k}`, englishHeaders[k]));
    const h = doc.heightOfString(label, { width: colWidths[k] });
    if (h > headerHeight) headerHeight = h;
    doc.text(label, colPositions[k], tableTop, { width: colWidths[k] });
  });

  const headerBottom = tableTop + Math.max(15, headerHeight + 3);
  doc.lineWidth(0.5).strokeColor('#4b5563').moveTo(startX, headerBottom).lineTo(currentX, headerBottom).stroke();

  let y = headerBottom + 5;
```

> `tr` va `t` (`= data.translatedRequisites`) allaqachon funksiya qamrovida. `englishHeaders`
> o'zgarmaydi — endi fallback sifatida ishlatiladi.

- [ ] **Step 6: Type-check + testlar**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: type-check exit 0; barcha vitest testlari (Task 1 va Task 2 dagilar ham) PASS.

- [ ] **Step 7: Runtime smoke (EUR mock invoice)**

Yaratish: `backend/tmp-smoke-en-currency.mjs` emas — o'rniga vaqtinchalik tsx skript scratchpad'da. Quyidagini bajaring (Bash):

```bash
cd backend && cat > /tmp/smoke-en-cur.ts <<'EOF'
import { pathToFileURL } from 'node:url';
(async () => {
  const mod: any = await import(pathToFileURL(process.cwd() + '/src/services/invoice-pdf-en.ts').href);
  const data = {
    invoice: { id: 1, invoiceNumber: 'INV-1', contractNumber: 'C-1', date: new Date('2026-07-14'),
      currency: 'USD', totalAmount: 22929.76, notes: '',
      additionalInfo: { columnLabels: { unitPrice: 'Цена за кг' }, visibleColumns: {},
        columnOrder: ['index','name','unit','quantity','unitPrice','total'] },
      items: [{ id: 1, name: 'Товар', unit: 'кг', quantity: 100, unitPrice: 229.29, totalPrice: 22929.76,
        tnvedCode: '', pluCode: '', customFields: {} }] },
    client: { id: 1, name: 'Buyer', address: 'Moscow', inn: '1', bankName: 'Bank', bankAccount: 'ACC' },
    company: { id: 0, name: 'Seller', legalAddress: 'Tashkent', inn: '2' },
    contract: { contractCurrency: 'EUR', sellerName: 'Seller LLC', sellerLegalAddress: 'Tashkent',
      sellerInn: '2', buyerName: 'Buyer', buyerAddress: 'Moscow', buyerInn: '1',
      contractDate: new Date('2026-01-01') },
    translatedRequisites: {},
  };
  await new Promise<void>((res, rej) => {
    const doc = mod.generateInvoicePDFEnglish(data);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => { console.log('EUR invoice PDF OK,', Buffer.concat(chunks).length, 'bytes'); res(); });
    doc.on('error', rej);
    doc.end();
  });
  console.log('numberToWordsEn EUR:', mod.numberToWordsEn(22929.76, 'EUR'));
})().catch((e) => { console.error('SMOKE FAIL:', e); process.exit(1); });
EOF
npx tsx /tmp/smoke-en-cur.ts
```

Expected: `EUR invoice PDF OK, <N> bytes` va `numberToWordsEn EUR: Twenty-two thousand nine hundred twenty-nine Euros 76 eurocents` — xatosiz. So'ng: `rm /tmp/smoke-en-cur.ts`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/invoice-pdf-en.ts
git commit -m "feat(pdf-en): effektiv valyuta (contractCurrency) + sarlavhalarni ruscha label'dan tarjima

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review natijalari

- **Spec coverage:** Spec A (effektiv valyuta + numberToWordsEn) → Task 1 (wording) + Task 3 Step 1–4 (wiring); Spec B1 (buildTranslatableTexts col_*) → Task 2; Spec B2 (header tarjima + dinamik balandlik) → Task 3 Step 5; Kesh (route o'zgarmaydi) → hech qanday task route'ni tegmaydi (to'g'ri). Tekshirish 1 → Task 1/Task 2 unit testlari; 2 → Task 3 Step 7 smoke; 4 → Task 3 Step 6.
- **Placeholder scan:** mavhum qadam yo'q — har bir kod qadami to'liq kod bilan.
- **Type consistency:** `numberToWordsEn(num: number, currency: string): string` — Task 1'da export, Task 3 Step 4'da bir xil signatura bilan chaqiriladi. `col_<key>` kalitlar Task 2'da ishlab chiqariladi, Task 3 Step 5'da `tr(t, \`col_${k}\`, englishHeaders[k])` bilan o'qiladi — bir xil format. `effectiveCurrency` (string, uppercase) Task 3 Step 1'da e'lon, 2–4 qadamlarda ishlatiladi.