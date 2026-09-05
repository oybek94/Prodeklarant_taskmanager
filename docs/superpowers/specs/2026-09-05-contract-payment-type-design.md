# Shartnoma to'lov turi — naqt/perechisleniya taqsimoti

**Sana:** 2026-09-05
**Holat:** tasdiqlangan, implementatsiyaga tayyor

## Muammo

Hozirgi tizimda `Client.dealAmount` — mijoz bilan kelishilgan **yagona naqt
summa** deb hisoblanadi, va bu summa ichida sertifikat va bojxona to'lovlari
ham bor deb faraz qilinadi. Har bir Task uchun profit shunday hisoblanadi:

```
netProfit = dealAmount − (statePayment + customsPayment + certifierFee
                           + hiredWorkerPayment + adminEarned)
```

ya'ni kompaniya davlat to'lovlarini (sertifikat, bojxona) o'z hisobidan
to'lab, keyin buni mijozdan olingan naqt puldan qoplaydi deb hisoblanadi.

Endi vaziyat o'zgardi: aksariyat mijozlar sertifikat va bojxona to'lovlarini
**o'zlari to'g'ridan-to'g'ri** to'lamoqda (kompaniya orqali emas). Kompaniya
faqat o'z xizmat haqini oladi, va bu xizmat haqining bir qismi bank orqali
(perechisleniya), bir qismi naqt ko'rinishida to'lanishi mumkin — nisbat
mijozga qarab farq qiladi.

Bu holatni aks ettirish uchun har bir mijoz uchun **shartnoma turi**
belgilanishi va shu turga qarab har bir Task uchun profit hisob-kitobi
avtomatik moslashishi kerak.

## Qarorlar

Foydalanuvchi bilan kelishilgan:

1. **Bog'lanish darajasi — Client.** Shartnoma turi mijoz darajasida
   belgilanadi (`dealAmount` kabi), va har bir Task yaratilganda boshqa
   snapshot maydonlar (`snapshotDealAmount` va h.k.) qatori sifatida
   Task'ga ham snapshot qilinadi — shunda mijozning keyingi sozlamasi
   o'zgarishi eski Tasklar raqamlarini o'zgartirmaydi.
2. **"Aralash" split usuli — qat'iy summa.** Foiz emas, balki har bir Task
   uchun perechisleniya qismi **qat'iy so'm summasi** sifatida beriladi
   (mijoz sozlamasida bitta marta kiritiladi, har bir Task shu summani
   meros qilib oladi). Qolgan qism avtomatik naqt hisoblanadi.
3. **Split summasi valyutasi — doim UZS.** `dealAmount` USD bo'lsa ham,
   perechisleniya summasi alohida, doim so'mda kiritiladigan maydon.
4. **Davlat to'lovlari netProfit'dan ayirilmaydi (legacy turdan tashqari).**
   Yangi 3 turda (pastda) statePayment va customsPayment kompaniya
   to'lamagani uchun netProfit'dan ayirilmaydi. `certifierFee`,
   `hiredWorkerPayment`, `adminEarned` — bular kompaniyaning o'z xodimlariga
   to'lanadigan ichki xarajat, davlat to'lovini kim to'laganidan qat'i
   nazar har doim ayiriladi.
5. **Foydalanish doirasi — faqat ko'rsatish.** Naqt/perechisleniya
   taqsimoti hozircha faqat Task moliyaviy hisobotida (ko'rsatish uchun)
   qo'llaniladi. Avtomatik Transaction (kirim) yozuvi yaratish — keyingi
   bosqich, bu ishga kirmaydi.
6. **3 joydagi profit formulasi — alohida-alohida tuzatiladi.**
   `tasks.ts`, `dashboard.ts`, `finance.ts` da profit/netProfit hisob-kitobi
   bir-biridan farqli formulalar bilan **takrorlangan** (umumiy funksiyaga
   birlashtirilmagan). Har birining mavjud formulasi saqlanadi, faqat
   "davlat/bojxona to'lovini ayirmaslik" sharti alohida-alohida qo'shiladi.
   Bu kichikroq, xavfsizroq o'zgarish — mavjud xatti-harakat (legacy
   mijozlar uchun) buzilmaydi.

## Ma'lumotlar modeli

Yangi enum:

```prisma
enum ContractPaymentType {
  CASH_ALL_INCLUSIVE // Legacy/standart: dealAmount = hammasi (davlat to'lovlari ham) naqt
  TRANSFER_ONLY      // Xizmat haqi 100% perechisleniya
  CASH_ONLY          // Xizmat haqi 100% naqt (lekin davlat to'lovini mijoz o'zi to'laydi)
  MIXED              // Xizmat haqi qisman perechisleniya (qat'iy summa), qolgani naqt
}
```

`Client` modeliga qo'shiladi:

```prisma
contractPaymentType   ContractPaymentType @default(CASH_ALL_INCLUSIVE)
serviceFeeTransferUzs Decimal?            @db.Decimal(18, 2) // faqat MIXED uchun
```

`Task` modeliga (boshqa snapshot maydonlar qatoriga) qo'shiladi:

```prisma
snapshotContractPaymentType   ContractPaymentType?
snapshotServiceFeeTransferUzs Decimal?            @db.Decimal(18, 2)
```

Migratsiya additive: yangi enum, `Client`ga 2 ta default/nullable ustun,
`Task`ga 2 ta nullable ustun. Mavjud barcha mijoz/tasklar
`CASH_ALL_INCLUSIVE` bo'lib qoladi — hech kim uchun xatti-harakat
o'zgarmaydi.

## Snapshot qilish

`backend/src/routes/tasks.ts` da Task yaratilganda (`dealAmount` snapshot
qilinadigan joy, ~340-432 qatorlar atrofida) `contractPaymentType` va
`serviceFeeTransferUzs` ham client'dan o'qib Task'ga yoziladi — xuddi
`snapshotDealAmount` kabi.

## Profit hisob-kitobi

### `backend/src/routes/tasks.ts` (Task financialReport, ~834-1128 qatorlar)

Joriy formula:

```
netProfit = dealAmount − certifierFee − davlatUzsReal − declarationPayment
            − hiredWorkerPayment − localAdminEarned
```

O'zgarish: `task.snapshotContractPaymentType` (yoki client'niki, fallback
sifatida) `CASH_ALL_INCLUSIVE` bo'lmasa, `davlatUzsReal` va
`declarationPayment` netProfit formulasidan chiqarib tashlanadi:

```
netProfit = dealAmount − certifierFee − hiredWorkerPayment − localAdminEarned
```

`financialReport` obyektiga qo'shimcha maydonlar qo'shiladi:

- `contractPaymentType`
- `cashAmount`
- `transferAmount`

Hisoblash (`dealAmount` — UZS'dagi tugallangan summa, ya'ni
`finalDealAmountInUzs`):

| Tur | cashAmount | transferAmount |
|---|---|---|
| `CASH_ALL_INCLUSIVE` | `dealAmount` | `0` |
| `CASH_ONLY` | `dealAmount` | `0` |
| `TRANSFER_ONLY` | `0` | `dealAmount` |
| `MIXED` | `dealAmount − transferAmount` | `min(snapshotServiceFeeTransferUzs, dealAmount)` |

(`MIXED` uchun clamp qilinadi — agar konfiguratsiya qilingan summa
xizmat haqidan katta bo'lsa, naqt qism manfiy bo'lib qolmasin.)

### `backend/src/routes/dashboard.ts` (completed-summary, ~797-816 qatorlar)

Joriy:

```js
const branchPayments = certificatePayment + workerPrice + psrAmount + customsPayment;
const netProfit = dealAmount - branchPayments;
```

O'zgarish: query'dagi `select`ga `client.contractPaymentType` (va
`task.snapshotContractPaymentType` bo'lsa) qo'shiladi. Tur
`CASH_ALL_INCLUSIVE` bo'lmasa:

```js
const branchPayments = workerPrice + psrAmount; // certificatePayment va customsPayment chiqarildi
```

### `backend/src/routes/finance.ts` (revenue/expense overview, ~1029-1075+ qatorlar)

Joriy: har bir tugallangan task uchun `davlatUz` (ST-1+FITO+fumigatsiya+ichki)
va bojxona to'lovi `taskExpenseUzs`ga qo'shilib, `totalExpensesUzs`dan
ayiriladi. O'zgarish: query'ga `client.contractPaymentType` qo'shiladi,
tur `CASH_ALL_INCLUSIVE` bo'lmasa, shu task uchun `davlatUz` va bojxona
qismi `taskExpenseUzs` hisobiga qo'shilmaydi (faqat ichki xodim/sertifikator
xarajatlari qo'shiladi).

### O'zgarmaydigan joylar

`client.service.ts` (`calculateClientBalance`), `finance.ts`/`dashboard.ts`
dagi **qarzdorlik** (`debtors`, `paymentReminders`) hisob-kitoblari —
bularning barchasi "mijoz kompaniyaga qancha to'lashi kerak" (`dealAmount`
jami) va "qancha to'lagan" (`transactions`) solishtiradi. `dealAmount` yangi
turlarda ham "kompaniyaga tegishli xizmat haqi" ma'nosini saqlaydi, shuning
uchun bu hisob-kitoblar o'zgarishsiz to'g'ri qoladi.

## UI

`frontend/src/pages/Clients.tsx` — yaratish va tahrirlash formalarida,
Deal Amount maydoni yonida "Shartnoma turi" select (4 variant). "Aralash"
tanlanganda "Perechisleniya summasi (so'm)" input ko'rinadi
(`serviceFeeTransferUzs`).

`backend/src/routes/clients.ts` — create va update Zod sxemalariga
`contractPaymentType` (enum, optional) va `serviceFeeTransferUzs`
(number, optional, ≥ 0) qo'shiladi.

`frontend/src/components/tasks/TaskDetailPanel.tsx` — moliyaviy blokda,
`financial.rep.transferAmount > 0` bo'lsa, "Kelishuv summasi" qatori
ostida qo'shimcha qator: "Naqt: X · Perechisleniya: Y".

## Testlar

- Backend: `CASH_ALL_INCLUSIVE` uchun eski netProfit natijasi o'zgarmasligini
  tekshiruvchi regression test (tasks.ts financialReport).
- Backend: har 4 tur uchun `cashAmount`/`transferAmount` va netProfit
  hisob-kitobi to'g'riligini tekshiruvchi unit testlar (ayniqsa `MIXED`
  clamp holati).
- `dashboard.ts` va `finance.ts` uchun: `CASH_ALL_INCLUSIVE` bo'lmagan
  mijozning tugallangan task'i umumiy xarajat/foyda hisobiga davlat
  to'lovini qo'shmasligini tekshiruvchi test.
