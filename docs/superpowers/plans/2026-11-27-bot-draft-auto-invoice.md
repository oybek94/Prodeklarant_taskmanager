# Yuk arizasidan invoys avtomatik yaratish — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Yuk botida ariza yakunlanganda vazifa (PSR yo'q) va invoys avtomatik yaratilsin.

**Architecture:** Sof moslashtirish (ariza → invoys kiritmasi) alohida modulda; DB'dan o'qish va tranzaksiyada yozish alohida servisda; `completeDraft` ariza holati, vazifa va invoysni bitta tranzaksiyada yozadi.

**Tech Stack:** TypeScript, Prisma 5, Zod, Vitest. Buyruqlar `backend/` ichida.

**Spec:** `docs/superpowers/specs/2026-11-27-bot-draft-auto-invoice-design.md`

## Global Constraints

- TypeScript strict, `any` yo'q. Pul va og'irlik hisobi `Decimal` bilan.
- `prisma migrate dev` va `prisma format` ISHLATILMAYDI. Migratsiya: qo'lda `migration.sql` → `db execute` → `migrate resolve --applied`.
- Repo ochiq: testlarda haqiqiy mijoz, shartnoma, manzil yo'q.
- `hasPsr = false`, `afterHoursDeclaration = false`. "Invoys" bosqichi belgilanmaydi.

## Review Focus

- Ikki kishi bir vaqtda "Yakunlash" bossa — bitta vazifa (Task 3 testi).
- Invoys yozishda xato — ariza OPEN qoladi, vazifa qolmaydi (Task 3 testi: tranzaksiya ichida otiladi).
- "Инвойс №" erkin matn: `31.02` kabi sana yoki "от"dan keyin tushunarsiz matn — rad etiladi (Task 1).
- Bot 300 belgigacha qabul qiladi, invoys sxemasi qisqaroq — yaratishdan oldin rad etiladi (Task 2).
- Brutto = netto (yashik og'irligi kiritilmagan) — tushunarli sabab bilan rad etiladi (Task 2).

---

### Task 1: Sof moslashtirish

**Files:**
- Create: `backend/src/services/product-name-match.ts` (`frontend/src/components/invoice/productNameMatch.ts` nusxasi, boshida manba izohi)
- Create: `backend/src/services/client-cargo-invoice.ts`
- Test: `backend/src/__tests__/client-cargo-invoice.test.ts`

**Produces:**

```ts
export interface InvoiceText { number?: string; date?: string; invalidDate: boolean }
export function parseInvoiceText(raw: string | undefined): InvoiceText
export interface ProductSources {
  global: Array<{ name: string; code: string }>;
  spec: Array<{ productName?: string; tnvedCode?: string; unitPrice?: number }>;
  history: Array<{ name: string; code: string }>;
}
export function resolveCargoProductDefaults(name: string, sources: ProductSources): { tnvedCode?: string; unitPrice?: number }
export interface CargoInvoiceContext {
  contract: { id: number; contractNumber: string; contractCurrency: string | null; gln: string | null } | null;
  shipmentPlace: string;
  region: { internalCode: string; name: string; externalCode: string } | null;
  previousAdditionalInfo: Record<string, unknown> | null;
  packagingTypes: Array<{ name: string; code: string }>;
  sources: ProductSources;
}
export function buildCargoInvoiceInput(data: DraftData, ctx: CargoInvoiceContext, today: string): InvoiceInput  // invoiceNumber/date matndan; date yo'q bo'lsa today
export function cargoTaskTitle(invoiceNumber: string, vehicleNumber: string | undefined, contractNumber: string | undefined): string
```

`InvoiceInput` — `invoice-save.service.ts` dan; `taskId`/`clientId` bu yerda qo'yilmaydi.

- [ ] **Step 1:** Testlar:
  - `parseInvoiceText`: `'Инвойс № 1/26 от 01.02.2026 год'` → `{number:'1/26', date:'2026-02-01', invalidDate:false}`; `'№12 от 1.2.26г.'` → `12`, `2026-02-01`; `'INV-7'` → number `INV-7`, date yo'q; `'15 01.02.2026'` → `15`; `undefined` va `''` → `{invalidDate:false}`; `'3 от 31.02.2026'` va `'3 от 5 ноября'` → `invalidDate:true`.
  - `resolveCargoProductDefaults`: aynan global kod spec koddan ustun, narx spec'dan; `'Яблоки Гала свежие'` + spec `'Яблоки свежие'` → shu kod va narx; faqat "свежий" mos → `{}`.
  - `buildCargoInvoiceInput`: fields `{product:'Хурма свежая', boxCount:'100', packagingType:'пласт.ящик', palletCount:'3', palletWeight:'45', netto:'1900', brutto:'2070', price:'1.28'}` → item `{unit:'кг', quantity:3, packagesCount:100, packageType:'пласт.ящик', netWeight:1900, grossWeight:2070, unitPrice:1.28, totalPrice:2432}`, `totalAmount:2432`; ikki poddon og'irligi `45` + `0.5` → `additionalInfo.palletWeight:'45.5'`, `notes:'Товары уложены на деревянных паллетах которые не являются товаром весом 45.5 кг.'`; poddon yo'q → notes undefined; narx bo'sh → spec narxi, yo'q → 0; bo'sh tovar bloki tushib qoladi; shartnomasiz → `contractId` undefined, `currency:'USD'`; `contractCurrency:'RUB'` → `USD`; oldingi invoysdan faqat `manufacturer, harvestYear, visibleColumns, columnLabels, columnOrder, customColumns, visibleAdditionalInfoFields, additionalFieldsOrder, pdfFontSizes` ko'chadi (`vehicleNumber`, `orderNumber`, `customFields` emas); sensor → `customFields:[{id:'cargo_sensor', label:'Серийный номер датчика', value:'SN1'}]`; `origin:'Республика Узбекистан'`; `customsPlace` → `customsAddress`; `region` → `fssRegionInternalCode/Name/ExternalCode`.
  - `cargoTaskTitle('1/26','01A111AA/012222BA', 'K-1')` → `'1/26 АВТО 01A111AA'`; avtosiz → `'Invoice - K-1'`; ikkalasiz → `'Invoice - yangi'`.
- [ ] **Step 2:** `npx vitest run src/__tests__/client-cargo-invoice.test.ts` → FAIL (modul yo'q).
- [ ] **Step 3:** Modullarni yozish. `resolveCargoProductDefaults` — frontend `resolveProductDefaults` + `resolveImportedProductDefaults` (AI ishorasisiz); nomzodlar tartibi spec → global → history.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat(cargo-bot): arizani invoysga o'girish`.

### Task 2: Baza servisi

**Files:**
- Create: `backend/src/services/client-cargo-invoice.service.ts`
- Modify: `backend/src/services/task-create.service.ts` (`createTaskInTx` ajratiladi)
- Modify: `backend/src/services/invoice-save.service.ts` (`insertInvoiceInTx`; `assertNumberFree`, `nextAutoNumber` eksport; `broadcastInvoiceSaved(invoice: Pick<SavedInvoice,'id'|'taskId'>, …)`)
- Test: `backend/src/__tests__/client-cargo-invoice.service.test.ts`

**Produces:**

```ts
export function createTaskInTx(tx: Prisma.TransactionClient, input: CreateTaskInput, actorId: number): Promise<Task>
export function insertInvoiceInTx(tx, params: { input: InvoiceInput; invoiceNumber: string; task: { id: number; clientId: number; branchId: number } }): Promise<{ id: number; taskId: number; invoiceNumber: string }>

export interface CargoInvoicePlan { task: CreateTaskInput; creatorId: number; input: InvoiceInput; invoiceNumber: string }
export type PrepareResult = { ok: true; plan: CargoInvoicePlan } | { ok: false; error: string }
export function prepareCargoInvoice(params: { clientId: number; data: DraftData; authors: AuthorMap; now?: Date }): Promise<PrepareResult>
export interface CreatedCargoInvoice { task: Task; invoice: { id: number; taskId: number; invoiceNumber: string } }
export function createCargoInvoiceInTx(tx, plan: CargoInvoicePlan): Promise<CreatedCargoInvoice>
export function announceCargoInvoice(created: CreatedCargoInvoice, completedByName: string): void
```

- Barcha xato matnlari `Invoys yaratilmadi: <sabab>`.
- Muallif: `authors` birinchi kiritish vaqti bo'yicha → `User.telegramChatId` mos, `active`; topilmasa birinchi faol ADMIN (`id asc`).
- Tarix kodlari: shu shartnoma `InvoiceItem` (tnvedCode bor). Oldingi invoys: shu shartnoma, `createdAt desc`.
- `announceCargoInvoice`: `afterTaskCreated` va `broadcastInvoiceSaved`, actor `{ id: 0, name: 'Yuk boti (<ism>)' }` (hech kim chetlab o'tilmaydi).

- [ ] **Step 1:** Testlar (prisma mock): muvaffaqiyatli reja (`task.hasPsr:false`, `branchId`, title, `creatorId` = ikkinchi muallif Telegram bo'yicha topilgani); xodim topilmasa ADMIN; raqam band → `ok:false`, matnda `allaqachon mavjud`; kelajak sana → `ok:false`; `brutto === netto` → `ok:false`, matnda `netto`; 101 belgili `orderNumber` → `ok:false`; raqam bo'sh + oldingi invoys `7` → `8`.
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Yozish. Tekshiruvlar: `invoiceSchema.safeParse` (clientId bilan), `validateItemWeights`, `validateInvoiceDate`, `assertNumberFree`.
- [ ] **Step 4:** `npx vitest run` → PASS (mavjud task/invoice testlari ham).
- [ ] **Step 5:** Commit `feat(cargo-bot): vazifa va invoysni tranzaksiyada yaratish servisi`.

### Task 3: Yakunlashga ulash, xabar, haydovchi kodi, baza

**Files:**
- Modify: `backend/prisma/schema.prisma` (`ClientCargoDraft.taskId Int? @unique`, `task Task? … onDelete: SetNull`; `Task.cargoDraft`)
- Create: `backend/prisma/migrations/20261127120000_add_cargo_draft_task_id/migration.sql`
- Modify: `backend/src/services/client-cargo-draft.service.ts`, `client-cargo-draft-message.ts`, `client-cargo-bot.service.ts` (`trk:d`: `draft.taskId ?? matchDraftToRecentTask(...)`)
- Test: mavjud `client-cargo-draft.service.test.ts`, `client-cargo-draft-message.test.ts`

**Interfaces:** Task 2 funksiyalari. `DraftView.taskId: number | null`; `DraftMessageContext.invoiceNumber?: string | null`.

- [ ] **Step 1:** Testlar: yakunlashda `$transaction` ichida claim → `createCargoInvoiceInTx` → `draft.update({taskId})`, keyin `announceCargoInvoice`; `prepare` xatosi → 400, `updateMany` chaqirilmaydi; claim `count:0` (poyga) → `createCargoInvoiceInTx` chaqirilmaydi, qayta o'qib COMPLETED → ok; create xato otsa → natija `ok:false` 502, `announce` chaqirilmaydi. Xabar: COMPLETED + `invoiceNumber:'1/26'` → `📥 Invoys yaratildi: № <b>1/26</b>`; OPEN yoki raqamsiz → qator yo'q.
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** `Decision` ning `write` turiga ixtiyoriy `inTransaction(tx)`; bo'lsa claim va u bitta `prisma.$transaction(…, { timeout: 20000 })` ichida. Xato ushlanib `Invoys yaratilmadi…` qaytariladi, logga faqat `message`.
- [ ] **Step 4:** `npx prisma generate && npx tsc --noEmit && npx vitest run` → xatosiz.
- [ ] **Step 5:** Commit `feat(cargo-bot): yakunlanganda invoys avtomatik yaratiladi`.

### Task 4: Deploy

- [ ] **Step 1:** Yangi commitlarni `git push`.
- [ ] **Step 2:** Xotiradagi deploy tartibi bo'yicha serverda: `git pull` → `npx prisma db execute --file …/migration.sql --schema prisma/schema.prisma` → `npx prisma migrate resolve --applied 20261127120000_add_cargo_draft_task_id` → `npm run build` → `pm2 restart prodeklarant-backend`.
- [ ] **Step 3:** `pm2` holati online, logda yangi xato yo'q.
