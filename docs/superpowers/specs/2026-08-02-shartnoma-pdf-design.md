# Shartnoma yaratish va PDF generatsiya — dizayn

**Sana:** 2026-08-02
**Holat:** tasdiqlangan
**Manba hujjat:** `docs/shartnoma-shablon-2026.md`

## Maqsad

Brokerlik xizmat shartnomasining o'zgaruvchi maydonlarini formadan to'ldirib, PDF sifatida yuklab olish. Tuzilgan shartnomalar bazada saqlanadi va qidiriladigan ro'yxatda ko'rinadi.

## Qamrov

**Kiradi:** `ServiceAgreement` modeli, CRUD API, qidiruvli ro'yxat sahifasi, forma + jonli PDF preview, shablon versiyalash, PDF generatsiya.

**Kirmaydi:** shartnomani email orqali yuborish, elektron imzo (ERI) bilan imzolash, qo'shimcha bitimlar (14.7-band), buyurtma-ariza va dalolatnoma generatsiyasi. Bular keyingi bosqichlar.

---

## 1. Ma'lumotlar modeli

### Nom to'qnashuvi

`Contract` modeli allaqachon band — u tashqi savdo kontrakti (seller/buyer/shipper/consignee, `Invoice` ga bog'langan). Yangi model **`ServiceAgreement`** deb nomlanadi.

### `ServiceAgreement`

**Identifikatsiya va holat**

| Maydon | Tur | Izoh |
|---|---|---|
| `id` | Int @id | |
| `clientId` | Int | FK → `Client` |
| `agreementNumber` | String @unique | `2026/014`, yil bo'yicha avtomatik, tahrirlanadi |
| `agreementDate` | DateTime | |
| `templateVersion` | String | `v1` |
| `status` | `AgreementStatus` | `DRAFT` / `ACTIVE` / `TERMINATED` |
| `terminatedAt` | DateTime? | |
| `terminationReason` | String? | 14.3 yoki 14.5 band |

**Tomonlar (snapshot)**

Imzolangan shartnoma rekvizitlari `Client` o'zgarsa ham o'zgarmasligi kerak — huquqiy talab. Shuning uchun qiymatlar ko'chirib yoziladi, havola qilinmaydi.

Buyurtmachi: `customerName`, `customerInn`, `customerAddress`, `customerDirector`, `customerDirectorBasis`, `customerBankName`, `customerBankAccount`, `customerMfo`, `customerOked`, `customerPhone`, `customerEmail`

Bajaruvchi: yuqoridagilarning `executor*` juftligi. `CompanySettings` dan oldindan to'ladi.

`customerName` va `customerInn` indekslanadi — qidiruv shular bo'yicha.

**Tijorat shartlari**

| Maydon | Tur | Band |
|---|---|---|
| `paymentModel` | `PaymentModel` enum: `PREPAID`/`MONTHLY`/`PER_COUNT`/`PER_AMOUNT` | 5.5.1 |
| `monthlyDueDay` | Int? | B |
| `perCountThreshold`, `perCountDueDays` | Int? | C |
| `perAmountThreshold` | Decimal(18,2)? | D |
| `perAmountDueDays` | Int? | D |
| `creditLimit` | Decimal(18,2)? | 5.5.3 |
| `prepaidRevertDays` | Int @default(10) | 5.5.4 |
| `mainTariffBhm` | Decimal(6,2) | ro'yxatdagi "Tarif" ustuni |
| `tariffs` | Json | 1-ilova jadvali (snapshot) |
| `vatPayer` | Boolean @default(false) | 5.4 |
| `jurisdictionCourt` | String? | 13.4 |
| `brokerRegistryNumber` | String? | 2.3 — bo'sh bo'lsa band PDF'dan tushadi |
| `signingPlace` | String @default("Олтиариқ тумани") | |

**PDF va audit:** `includeSeal` (Boolean @default(true)), `createdById`, `updatedById` (FK → `User`), `createdAt`, `updatedAt`.

**Indekslar:** `@@index([clientId])`, `@@index([customerInn])`, `@@index([status])`, `agreementNumber` unique.

### Decimal aniqligi

`creditLimit` va `perAmountThreshold` — `Decimal(18,2)`, `Decimal(12,2)` emas. Sabab: `Client.creditLimit` aynan `Decimal(18,2)` va ular solishtiriladi; bazadagi barcha pul maydonlari 18,2. CLAUDE.md da 12,2 yozilgan — bu ongli chetlanish, mavjud sxemaga moslik uchun.

### `Client` ga qo'shimcha

`director`, `mfo`, `oked` — hozir yo'q, `String?` sifatida qo'shiladi. Formada "Mijoz kartochkasiga ham saqlash" belgisi qo'yilganda to'ldiriladi.

---

## 2. Backend

`backend/src/routes/service-agreements.ts`, Zod validatsiya (`src/utils/error-handler.ts` xato formatida).

```
GET    /service-agreements?q=&status=&page=&limit=
GET    /service-agreements/next-number?year=2026
GET    /service-agreements/:id
POST   /service-agreements
PATCH  /service-agreements/:id
POST   /service-agreements/:id/terminate
```

- `q` bitta maydon, uchta ustun bo'ylab qidiradi: `customerName`, `customerInn`, `agreementNumber` — `contains` + `mode: 'insensitive'`.
- `next-number` — shu yildagi eng katta tartib raqamdan keyingisi (`2026/015`).
- `agreementNumber` unique buzilsa → 409.
- Kirish huquqi cheklanmaydi — barcha autentifikatsiyadan o'tgan foydalanuvchilar uchun ochiq.

Zod sxemalari `paymentModel` ga qarab shartli: `MONTHLY` tanlansa `monthlyDueDay` majburiy, `PER_COUNT` da `perCountThreshold` va h.k.

---

## 3. Shablon versiyalash

`frontend/src/features/serviceAgreement/templates/`

```
templates/
  types.ts      AgreementTemplate, Section, Block, AgreementTokens
  v1.ts         shartnoma matni ma'lumot sifatida
  index.ts      getTemplate(version) → AgreementTemplate
```

Blok turlari: `heading`, `paragraph` (ichida `**qalin**`), `table`, `signature`, `pageBreak`.

Har bir blokda ixtiyoriy `when?: (t: AgreementTokens) => boolean`. Shundan uchta xossa kelib chiqadi:

1. **Shartli bandlar** — `brokerRegistryNumber` bo'sh bo'lsa 2.3 tushadi; `paymentModel === 'PREPAID'` bo'lsa kredit limiti bandi (5.5.3) chiqmaydi.
2. **Versiya muzlashi** — `getTemplate(agreement.templateVersion)` orqali `v1` da imzolangan shartnoma `v2` chiqqach ham `v1` matnida qayta chiqadi.
3. **Matn tahriri kodga tegmaydi** — advokat `v1.ts` ni o'qiy oladi.

Tokenlar `AgreementTokens` interfeysida qat'iy tiplanadi; mavjud bo'lmagan token yozilsa TypeScript ushlaydi.

Shablon frontendda joylashadi, chunki PDF frontendda chiziladi. Kelajakda serverdan email yuborish kerak bo'lsa `shared/` ga ko'chiriladi.

---

## 4. PDF quvuri

`frontend/src/features/serviceAgreement/pdf/`

```
AgreementPdfDocument.tsx   shablon bloklarini chizuvchi universal komponent
agreementPdfStyles.ts      shartnomaga xos uslublar
renderAgreementPdf.ts      normalize → render → glyph check → Blob
```

```
tokens ──▶ getTemplate(version) ──▶ deepNormalizeStrings (NFKC)
       ──▶ <AgreementPdfDocument/> ──▶ findMissingGlyphs
                                          ├─ topildi ──▶ PdfMissingGlyphError
                                          └─ toza    ──▶ Blob
```

### Masshtablash yo'q

Invoysdagi `pdfFit` (5 tagacha qayta render, bir betga sig'dirish) shartnomaga **qo'llanilmaydi**. Shartnoma tabiiy ravishda ko'p betli: shrift 11pt qat'iy, betlar o'zi bo'linadi. Natijada bitta render yetadi.

### Preview

O'ng panelda shu blob `<iframe>` da ko'rsatiladi, 500ms debounce. Ko'rinayotgan narsa — yuklab olinadigan PDF'ning o'zi. Ikkinchi (HTML) renderer yo'q, ajralib ketish xavfi ham yo'q.

### Qayta ishlatiladigan kod

`deepNormalizeStrings`, `findMissingGlyphs`, `PdfMissingGlyphError`, `describeMissingGlyphs` — invoys quvuridan o'zgarishsiz.

### Maqsadli tozalash

`Font.register` hozir `frontend/src/components/invoice/pdf/PdfStyles.ts` ichida. U global va ikki marta har xil konfiguratsiya bilan chaqirilmasligi kerak, shuning uchun `frontend/src/components/pdf/fonts.ts` ga chiqariladi. `PdfStyles.ts` va shartnoma uslublari shu yerdan import qiladi. Invoysning xatti-harakati o'zgarmaydi.

---

## 5. Interfeys

### Ro'yxat — `/shartnomalar`

`frontend/src/pages/ServiceAgreements.tsx`, `App.tsx` da `lazy(() => import(...))`. Yon menyuda `solar:document-text-bold-duotone`.

Ustunlar: Korxona · INN · № / Sana · Tarif (BHM ustida, so'm ekvivalenti ostida) · Kredit limiti · Model (A/B/C/D) · Holat.

- Bitta qidiruv maydoni (nom / INN / raqam), 300ms debounce.
- Holat filtri chip sifatida: Hammasi / Faol / Qoralama / Bekor.
- Har qatorda: PDF (darhol yuklaydi), Ochish.
- `TERMINATED` qatori susaytirilgan.
- Mobil kenglikda jadval kartochkalarga aylanadi.
- Bo'sh holat: "Hali shartnoma yo'q" + yaratish tugmasi.

`ClientDetail` sahifasiga shu mijozning shartnomalari ro'yxati qo'shiladi.

### Muharrir — `/shartnomalar/yangi`, `/shartnomalar/:id`

Ikki panelli: chapda forma (aylanadi), o'ngda jonli PDF (yopishib turadi).

Forma bo'limlari:
1. **Mijoz va rekvizitlar** — mijoz tanlanadi, maydonlar `Client` dan to'ladi va tahrirlanadi (snapshot). Direktor / MFO / OKED qo'lda kiritiladi, "Mijoz kartochkasiga ham saqlash" belgisi bilan qaytib yoziladi.
2. **To'lov modeli** — A/B/C/D. Tanlanganda faqat o'sha modelning maydonlari ochiladi.
3. **Tariflar** — 1-ilova jadvali, qatorlar qo'shiladi/o'chiriladi.
4. **Qo'shimcha shartlar** — sud, broker reestri raqami, imzolash joyi, muhr.

Signature element: to'lov modeli o'zgarganda o'ng paneldagi 5.5-band shu zahoti qayta chiziladi. Foydalanuvchi forma to'ldirayotgandek emas, hujjat yozayotgandek his qiladi.

Mavjud dizayn tizimiga to'liq mos: Tailwind, `index.css` dagi dark mode, Solar Bold Duotone ikonkalar. Alohida vizual identitet qurilmaydi.

---

## 6. Xatolar

| Holat | Xatti-harakat |
|---|---|
| Shriftda glifi yo'q belgi | PDF yaratilmaydi, `describeMissingGlyphs` matni bilan modal |
| `agreementNumber` takrorlandi | Backend 409, "Bu raqam allaqachon band" |
| Shablonda yechilmagan token | Render `Error` tashlaydi, token nomi bilan toast |
| Bekor qilish | Tasdiqlash modali, sabab so'raladi |
| Forma validatsiyasi | `react-hook-form` + Zod (backend bilan bir xil sxema) |

---

## 7. Test

- **Newman** (`backend/openapi/`, `npm run test:integration`): CRUD, `q` bo'yicha qidiruv (nom/INN/raqam), `next-number`, 409, `terminate`.
- **Shablon birlik testi**: to'liq token to'plamida `v1` dagi har bir token yechiladi (yechilmagan `{{...}}` qolmasligi); shartli bloklar to'g'ri yo'qoladi — `brokerRegistryNumber` bo'sh, `paymentModel = PREPAID`.

Shablon testi eng muhimi: matn xatosi to'g'ridan-to'g'ri qog'ozga chiqadi.

---

## 8. Migratsiya

Bazada drift bor (2 ta bo'sh migratsiya papkasi, jadvallar bazada mavjud), shuning uchun `migrate dev` to'g'ridan-to'g'ri ishlatilmaydi:

1. `npx prisma migrate status` — holatni ko'rsatish
2. `npx prisma migrate resolve --applied <bo'sh papkalar>` — driftni yopish
3. `npx prisma migrate dev --name add_service_agreement`

Baza masofaviy va jonli (138.249.7.15). **2 va 3-qadamlardan oldin foydalanuvchidan alohida ruxsat so'raladi.** O'zgarish faqat qo'shiluvchi: yangi jadval, yangi enum'lar, `Client` ga 3 ta nullable ustun. Mavjud jadvallarga tegilmaydi.

---

## Ochiq savollar

Yo'q.
