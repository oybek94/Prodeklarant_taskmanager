# English Invoice — Sodiq ustun sarlavhalari + to'g'ri valyuta — Dizayn

**Sana:** 2026-07-14
**Holat:** Tasdiqlangan

## Muammo

"English Invoice (AI)" PDF ruscha invoysga sodiq emas:

1. **Ustun sarlavhalari qattiq kodlangan.** `invoice-pdf-en.ts` `englishHeaders` xaritasidan foydalanadi
   (`unitPrice→'Price'`, `total→'Amount'`). Haqiqiy ruscha label ("Цена за кг",
   "Общая сумма в Евро") umuman tarjima qilinmaydi.
2. **Valyuta noto'g'ri.** PDF hamma joyda `invoice.currency` (DB enum, faqat `USD`/`UZS`)
   ishlatadi. Aslida hujjat valyutasi `contract.contractCurrency` (masalan `EUR`) —
   frontendda `selectedContractCurrency || form.currency || 'USD'`. Natijada
   `numberToWordsEn` EUR summasini "US Dollars 76 cents" deb yozadi va EUR/RUB'ni qo'llamaydi.

**Talab:** bu joylar ruscha hujjatda qanday yozilgan bo'lsa, inglizchada ham xuddi shunday
(sodiq) yozilsin.

## Qaror qilingan yondashuvlar (foydalanuvchi tasdiqlagan)

- **Barcha ustun sarlavhalari sodiq:** har bir ustunning haqiqiy ruscha label'i to'liq tarjima
  qilinadi.
- **Valyuta manbai:** `effectiveCurrency = contract.contractCurrency || invoice.currency || 'USD'`
  (frontend mantig'iga mos), EUR/RUB ham to'g'ri.

## Yechim

### A. Effektiv valyuta (`backend/src/services/invoice-pdf-en.ts`)

`generateInvoicePDFEnglish` boshida:

```ts
const effectiveCurrency = String(
  data.contract?.contractCurrency || data.invoice.currency || 'USD'
).trim().toUpperCase();
```

Uchta joyda `data.invoice.currency` o'rniga `effectiveCurrency` ishlatiladi:
- Total katak simvoli (hozir 928-qator): `getCurrencySymbol(effectiveCurrency)`.
- Amount in words (hozir 940-qator): `numberToWordsEn(totalAmount, effectiveCurrency)`.
- "Current account (...)" (hozir 530-qator): `Current account (${effectiveCurrency})`.

`getCurrencySymbol` allaqachon `$`/`€`/`₽` qaytaradi — o'zgarmaydi.

`numberToWordsEn` valyuta bo'yicha kengaytiriladi (uppercase `currency` bilan):

| Valyuta | Butun (1 / ko'p) | Kasr birligi |
|---|---|---|
| USD | US Dollar / US Dollars | cents |
| EUR | Euro / Euros | eurocents |
| RUB | Ruble / Rubles | kopecks |
| UZS yoki boshqa | Sum / Sums | tiyin |

`numberToWordsEn` **export** qilinadi (unit-test uchun).

### B. Ustun sarlavhalarini haqiqiy ruscha label'dan tarjima qilish

**B1. `buildTranslatableTexts` (`backend/src/services/translate.service.ts`)** — effektiv ruscha
ustun label'larini `col_<key>` kalitlar bilan qo'shadi. Funksiya allaqachon `contract`, `invoice`,
`additionalInfo` ni oladi — signatura o'zgarmaydi.

```ts
// additionalInfo bloki ichida:
const columnLabels = (additionalInfo.columnLabels && typeof additionalInfo.columnLabels === 'object')
  ? additionalInfo.columnLabels as Record<string, string> : {};
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

> `total` label frontend `useInvoiceCalculations` bilan bir xil valyutadan hisoblanadi (stored
> `columnLabels.total` emas). Faqat standart ustunlar tarjima qilinadi; custom ustunlar ingliz
> PDF'da avvaldan qo'llab-quvvatlanmagan — qamrovdan tashqari.

**B2. Header render + tarjima (`invoice-pdf-en.ts`)** — header katagida tarjima ishlatiladi,
bo'lmasa hozirgi qisqa `englishHeaders` fallback. Uzun sarlavhalar bir necha qatorga o'ralishi
mumkin, shuning uchun **header balandligi dinamik o'lchanadi** (aks holda ajratuvchi chiziq
sarlavha ustiga tushadi).

Hozirgi (qattiq) kod:
```ts
doc.fontSize(7);
activeFeKeys.forEach(k => {
  doc.text(englishHeaders[k], colPositions[k], tableTop, { width: colWidths[k] });
});
doc.lineWidth(0.5).strokeColor('#4b5563').moveTo(startX, tableTop + 15).lineTo(currentX, tableTop + 15).stroke();
let y = tableTop + 20;
```

Yangi (dinamik + tarjima):
```ts
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

> `tr` (mavjud yordamchi) ™/® belgilarni tozalaydi va fallback beradi. `englishHeaders`
> o'zgarmaydi — faqat fallback sifatida qoladi.

### Kesh

`translatedRequisitesEn` keshi allaqachon "yetishmayotgan kalitlarni" aniqlab qo'shimcha tarjima
qiladi (route mantig'i). Shuning uchun eski invoyslar keyingi yuklashda yangi `col_*` label'larni
avtomatik oladi. Route (`invoices.ts`) o'zgarmaydi.

## Qamrovdan tashqari

- Frontend ruscha PDF (`InvoicePDFDocument`/`PdfItemsTable`) — o'zgarmaydi (allaqachon to'g'ri).
- Custom (`custom_*`) ustunlar ingliz PDF'da — avvalgidek qo'llab-quvvatlanmaydi.
- Packing list rejimi — bu o'zgarishlar undan ham foyda oladi (bir xil funksiya), lekin alohida
  ish talab qilmaydi.
- DB `Currency` enum'iga EUR qo'shish — shart emas (valyuta `contract.contractCurrency` string'da).

## Tekshirish

1. **Unit (vitest):** `numberToWordsEn` — USD→"...US Dollars ... cents", EUR→"...Euros ... eurocents",
   RUB→"...Rubles ... kopecks", UZS→"...Sums ... tiyin"; butun=1 birlik shakli; kasr qismi bilan/siz.
2. **Runtime smoke:** EUR shartnomali mock invoice bilan `generateInvoicePDFEnglish` xatosiz PDF
   chizadi; header ko'p qatorli sarlavhada ham ajratuvchi chiziq to'g'ri joyda.
3. **Qo'lda e2e:** EUR shartnomali real invoysda "English Invoice (AI)" — ustun sarlavhalari
   ruscha label'ga mos ("Price per kg", "Total amount in Euro"), amount-in-words "Euros/eurocents".
4. Backend `tsc --noEmit` toza; barcha vitest testlari o'tadi.
