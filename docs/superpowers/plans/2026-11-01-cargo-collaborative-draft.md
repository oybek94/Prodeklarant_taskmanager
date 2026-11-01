# Yuk ma'lumotlari qoralamasi (hamkorlikda to'ldirish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mijoz guruhidagi bir nechta xodim bitta yuk arizasini (qoralama) navbatma-navbat to'ldiradi; har maydon muallifi guruhdagi bitta jonli xabarda ko'rinadi; majburiy maydonlar to'lgach ariza yakunlanadi.

**Architecture:** Yangi `ClientCargoDraft` jadvali (data + authors JSON, `version` bilan optimistik yozuv). Sof modullar (`client-cargo-draft.ts`, `client-cargo-draft-message.ts`) qoidalarni, birlashtirishni va xabar formatini beradi; `client-cargo-draft.service.ts` bazani va Telegram xabarini (yuborish/tahrirlash, 3 s birlashtirish) boshqaradi; `tg-cargo` router va bot callback'lari shu servisga murojaat qiladi; Mini App faqat o'zgargan maydonlarni `PATCH` qiladi.

**Tech Stack:** Express 5, TypeScript strict, Zod, Prisma, node-telegram-bot-api (polling) + `callTelegram` (fetch), React 19, vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-cargo-collaborative-draft-design.md`

## Global Constraints

- TypeScript strict, `any` yo'q. Kiritish Zod bilan. Faqat Prisma ORM (migratsiya SQL faylidan tashqari qo'lda SQL yo'q).
- Majburiy maydonlar (aniq): sarlavha `deliveryTerms`, `customsPlace`, `shipmentPlace` (= `branchId` tanlangan); har bo'sh bo'lmagan tovar uchun `product`, `boxCount`, `netto`, `brutto`; kamida bitta bo'sh bo'lmagan tovar. Qolganlari ixtiyoriy.
- `ClientCargoDraftStatus { OPEN, COMPLETED, CANCELLED }`. Yakunlangan/bekor qilingan arizani o'zgartirish → HTTP 409.
- `startapp` faqat `A-Za-z0-9_-`: `<chatId>`, `<chatId>_new`, `<chatId>_<draftId>`. Eski `<chatId>` = "yangi ariza".
- Telegram: `callback_data` ≤ 64 bayt; xabar ≤ 4096 belgi; bir ariza xabari tahrirlari orasida ≥ 3 s (birlashtiriladi); "message is not modified" xato emas.
- Muallif ismi faqat tekshirilgan `initData.user` dan (`first_name last_name`, bo'lmasa `@username`, bo'lmasa `ID <id>`); mijozdan kelgan ismga ishonilmaydi.
- Har draft so'rovida `draft.clientId` va `draft.chatId` autentifikatsiyadagi guruhga teng bo'lishi shart, aks holda 404.
- Xabar yorliqlari/markerlari rus tilida (`Не заполнено`, `Заполнил(а)`), tugmalar va bot matnlari o'zbek tilida.
- Migratsiya qo'lda: `migration.sql` → `prisma db execute` → `prisma migrate resolve --applied`; `migrate dev` ishlatilmaydi.
- Commit xabari oxiri: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Eski `POST /api/tg-cargo/submit` va `submitCargo` bu rejada TEGILMAYDI (eski keshlangan bundle uchun; olib tashlash keyingi reliz).

## Review Focus

1. Ikki kishi bir vaqtda saqlaydi (turli va bir xil maydon): birinchisining o'zgarishi yo'qolmasin (T5: versiya to'qnashuvida qayta urinish testi).
2. Boshqa guruh/mijoz arizasining `id` si bilan so'rov: 404, hech narsa o'zgarmaydi (T5).
3. 20 ta tovarli ariza xabari 4096 belgidan oshadi: xabar baribir yuboriladigan uzunlikda chiqadi (T3).
4. Yakunlangan/bekor arizani PATCH qilish 409; "Yakunlash" ikki marta bosilsa ikkinchisi zararsiz (T5, T6).
5. Guruhda jonli xabar o'chirib yuborilgan: tahrir xato beradi → yangi xabar yuboriladi, `messageId` yangilanadi (T5).
6. Ism/maydon qiymatida `<`, `&` belgilari: HTML-escape qilinadi (T3).

---

### Task 1: Prisma schema va migratsiya

**Files:**
- Modify: `backend/prisma/schema.prisma` (Client modeliga `cargoDrafts ClientCargoDraft[]`; yangi enum va model)
- Create: `backend/prisma/migrations/20261101120000_add_client_cargo_draft/migration.sql`

**Interfaces:**
- Produces: Prisma `ClientCargoDraft { id Int; clientId Int; chatId String; status ClientCargoDraftStatus; data Json; authors Json; messageId Int?; version Int @default(1); createdAt; updatedAt @updatedAt; completedAt DateTime?; completedByName String? }`, `@@index([clientId, status, updatedAt])`, `@@index([chatId, status])`, relation `client Client @relation(onDelete: Cascade)`.

- [ ] **Step 1:** `schema.prisma` ga enum, model va `Client.cargoDrafts` relation qo'shing (yuqoridagi maydonlar, `data`/`authors` default `"{}"`/`"{}"` emas — servis to'ldiradi, `Json` majburiy).
- [ ] **Step 2:** `migration.sql` yozing, mavjud `20261101000000_add_client_cargo_bot` uslubida (`CREATE TYPE` enum uchun `DO $$ ... IF NOT EXISTS` bilan, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, FK `DO $$` bilan).
- [ ] **Step 3:** `cd backend && npx prisma generate && npx tsc --noEmit` — xatosiz.
- [ ] **Step 4: Commit** — `feat(bot): ClientCargoDraft jadvali (migratsiya qo'lda qo'llanadi)`.

### Task 2: Sof yadro — majburiylik, birlashtirish, launch param

**Files:**
- Create: `backend/src/services/client-cargo-draft.ts`
- Test: `backend/src/__tests__/client-cargo-draft.test.ts`

**Interfaces:**
- Consumes: `HeaderKey`, `ItemKey`, `CargoHeader`, `CargoItem`, `HEADER_FIELDS`, `ITEM_FIELDS`, `parseFieldInput` (`client-cargo-form.ts`); `FieldErrors`, `MAX_ITEMS` (`client-cargo-miniapp.ts`).
- Produces (barchasi `client-cargo-draft.ts` dan export):
  - `type DraftHeaderKey = Exclude<HeaderKey, 'contract' | 'shipmentPlace'>`
  - `interface DraftItem { uid: string; fields: CargoItem; bruttoManual: boolean }`
  - `interface DraftData { contractId: number | null; branchId: number | null; header: Partial<Record<DraftHeaderKey, string>>; items: DraftItem[] }`
  - `interface FieldAuthor { tgUserId: number; name: string; at: string }`; `type AuthorMap = Record<string, FieldAuthor>` (kalitlar: `contractId`, `branchId`, `header.<key>`, `items.<uid>.<key>`)
  - `const EMPTY_DRAFT_DATA: DraftData`
  - `interface MissingField { path: string; label: string; itemNumber: number | null }`
  - `getMissingRequired(data: DraftData): MissingField[]` — bo'sh bo'lmagan tovar = kamida bitta maydoni to'ldirilgan; bo'sh bloklar e'tiborga olinmaydi; bo'sh bo'lmagan tovar yo'q bo'lsa `itemNumber: 1` uchun to'rt tovar maydoni qaytadi; `label` — `HEADER_FIELDS`/`ITEM_FIELDS` dagi rus yorlig'i; `branchId` yo'q → `{ path: 'branchId', label: 'Место отгрузки груза' }`.
  - `draftPatchSchema` (Zod) va `type DraftPatch = z.infer<...>`: `{ contractId?: number|null; branchId?: number|null; header?: Record<DraftHeaderKey, string|null> (qisman); items?: Record<uid, null | { fields?: Record<ItemKey, string|null> (qisman); bruttoManual?: boolean }> }`; `uid` = `/^[A-Za-z0-9_-]{1,24}$/`, qiymatlar ≤ 300 belgi, `items` ≤ `MAX_ITEMS` kalit.
  - `applyDraftPatch(data: DraftData, authors: AuthorMap, patch: DraftPatch, author: FieldAuthor): { ok: true; data: DraftData; authors: AuthorMap; changedPaths: string[] } | { ok: false; errors: FieldErrors }`
  - `parseLaunchParam(startParam: string | null): { chatId: string; draft: number | 'new' | null } | null`

- [ ] **Step 1: Failing testlar** (`client-cargo-draft.test.ts`), aniq tekshiruvlar:
  - `getMissingRequired(EMPTY_DRAFT_DATA)` — `branchId`, `header.deliveryTerms`, `header.customsPlace` va tovar 1 ning 4 maydoni (jami 7 yozuv).
  - Hamma majburiy to'ldirilgan (bir tovar, `brutto` ham) → `[]`; ikkinchi bo'sh tovar bloki qo'shilsa ham `[]`; ikkinchi tovarda faqat `product` bo'lsa uning `boxCount/netto/brutto` `itemNumber: 2` bilan qaytadi.
  - `applyDraftPatch`: yangi qiymat muallifni yozadi; **bir xil qiymat qayta yuborilsa muallif o'zgarmaydi va `changedPaths` bo'sh**; `''`/`null` maydonni va muallifini o'chiradi; `item: null` tovar va uning mualliflarini o'chiradi; noma'lum `uid` ga `fields` kelsa tovar yaratiladi; 21-tovar → `ok: false`; noto'g'ri `boxCount: 'abc'` → `errors['items.<uid>.boxCount']`, sarlavha xatosi kaliti yalang kalit (`invoiceNumber`); `vehicleNumber: ' 01a 123bc '` → `'01A123BC'` (mavjud `parseFieldInput`); `bruttoManual` muallif yozmaydi.
  - `parseLaunchParam`: `'-1001234567890'` → `{chatId, draft: null}`; `'-1001234567890_new'` → `'new'`; `'-1001234567890_5'` → `5`; `'-100123_abc'`, `'5'`, `null`, `'-1001234567890_0'` → `null`.
- [ ] **Step 2:** `npx vitest run src/__tests__/client-cargo-draft.test.ts` — FAIL (modul yo'q).
- [ ] **Step 3:** `client-cargo-draft.ts` ni yuqoridagi imzolar bilan yozing. `applyDraftPatch` kiruvchi `data`/`authors` ni o'zgartirmasin (yangi obyekt qaytaradi). Xatolar to'planadi (birinchisida to'xtamaydi); xato bo'lsa hech narsa qo'llanmaydi.
- [ ] **Step 4:** testlar PASS; `npx tsc --noEmit` toza.
- [ ] **Step 5: Commit** — `feat(bot): qoralama yadrosi — majburiy maydonlar, birlashtirish, launch param`.

### Task 3: Jonli xabar va tugmalar (sof)

**Files:**
- Create: `backend/src/services/client-cargo-draft-message.ts`
- Test: `backend/src/__tests__/client-cargo-draft-message.test.ts`

**Interfaces:**
- Consumes: `DraftData`, `AuthorMap`, `getMissingRequired` (T2); `HEADER_FIELDS`, `ITEM_FIELDS` (`client-cargo-form.ts`).
- Produces:
  - `type DraftStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED'`
  - `interface DraftMessageContext { contractText: string | null; shipmentPlace: string | null; currency: string | null }`
  - `formatDraftMessage(input: { data: DraftData; authors: AuthorMap; context: DraftMessageContext; status: DraftStatus; actorName?: string | null }): string`
  - `type InlineButton = { text: string; url: string } | { text: string; callback_data: string }`
  - `buildDraftKeyboard(input: { draftId: number; chatId: string; status: DraftStatus; complete: boolean; miniAppLink: string | null; confirmCancel?: boolean }): InlineButton[][]`
  - `draftLabel(data: DraftData): string` — `"<invoiceNumber> | <vehicleNumber>"`, qiymat yo'q bo'lsa `—`; ikkalasi ham yo'q → `—`.
  - `buildDraftLaunchLink(baseLink: string, chatId: string, draft: number | 'new'): string` → `${baseLink}?startapp=${chatId}_${draft}`.

- [ ] **Step 1: Failing testlar**, aniq:
  - OPEN xabar: sarlavha `🚛 <b>Данные о грузе</b>`; to'ldirilgan qator `Номер автотранспорта: <b>01A123BC</b> — 👤 Aziz`; majburiy bo'sh maydonlar `⏳ <b>Не заполнено:</b>` ostida `• Условия поставки`, tovar uchun `• Товар 1: Нетто`; `Контракт`/`Место отгрузки груза` qiymati `context` dan, muallifi `contractId`/`branchId` kalitidan; `price` ga `context.currency` qo'shiladi.
  - COMPLETED: sarlavha `✅ <b>Данные о грузе — полные</b>`, `Заполнил(а)`-qatori emas, `Завершил(а): <b>Name</b>`, "Не заполнено" bloki yo'q. CANCELLED: faqat `❌ <b>Отменено</b>`.
  - Ism `A<b>&` HTML-escape qilinadi (`&lt;`, `&amp;`).
  - 20 tovar × to'liq maydon bilan natija ≤ 4096 belgi: avval muallifsiz qayta quriladi, hali uzun bo'lsa `…` bilan 4096 gacha qirqiladi.
  - `buildDraftKeyboard`: OPEN → 1-qator `✏️ To'ldirish` (`url`, `miniAppLink` bo'lsagina), `complete` bo'lsa `✅ Yakunlash` (`cargo:done:<id>`), oxirgi qator `🗑 Bekor qilish` (`cargo:cancel:<id>`); `confirmCancel` → bitta qator `Ha, bekor qilish` (`cargo:cancel-yes:<id>`) + `Yo'q` (`cargo:cancel-no:<id>`); COMPLETED/CANCELLED → `[]`. Barcha `callback_data` ≤ 64 bayt.
- [ ] **Step 2:** testni ishga tushiring — FAIL.
- [ ] **Step 3:** Modulni yozing (HTML escape yordamchisi shu faylda; `formatCargoMessage` ga tegmang).
- [ ] **Step 4:** PASS + `tsc` toza.
- [ ] **Step 5: Commit** — `feat(bot): qoralama xabari va tugmalari`.

### Task 4: initData foydalanuvchi ismi va launch param auth'da

**Files:**
- Modify: `backend/src/services/client-cargo-miniapp.ts` (`TelegramLaunch`, `telegramUserSchema`, `verifyInitData`)
- Modify: `backend/src/routes/tg-cargo.ts` (`TgRequest.tg`, `requireTelegramAuth`)
- Modify: `backend/src/__tests__/client-cargo-miniapp.test.ts`

**Interfaces:**
- Consumes: `parseLaunchParam` (T2).
- Produces: `TelegramLaunch = { userId: number; userName: string; startParam: string | null }`; `req.tg = { botToken; clientId; chatId; userId: number; userName: string; draft: number | 'new' | null }`.

- [ ] **Step 1:** Testni yangilang: mavjud `toEqual({ userId: 777, startParam })` ga `userName` qo'shing (`user` JSON ga `first_name: 'Test'` bor → `'Test'`); yangi testlar: `first_name`+`last_name` → `'Test User'`; faqat `username: 'abc'` → `'@abc'`; hech biri yo'q → `'ID 777'`. Run — FAIL.
- [ ] **Step 2:** `verifyInitData` va auth middleware ni moslang: `chatId`/`draft` `parseLaunchParam(launch.startParam)` dan (null → 400 `Formani guruhdagi tugma orqali oching`); `/context` javobiga `launch: { draft }` qo'shing (`{ ...context, launch: { draft } }`).
- [ ] **Step 3:** `npx vitest run src/__tests__/client-cargo-miniapp.test.ts` PASS; `tsc` toza.
- [ ] **Step 4: Commit** — `feat(bot): Mini App autentifikatsiyasi foydalanuvchi ismi va ariza parametri bilan`.

### Task 5: Qoralama servisi (baza + Telegram)

**Files:**
- Create: `backend/src/services/client-cargo-draft.service.ts`
- Test: `backend/src/__tests__/client-cargo-draft.service.test.ts` (`vi.mock('../prisma')` va `vi.mock('../services/telegram-bot-api')` uslubida, `invoice-save-service.test.ts` kabi)

**Interfaces:**
- Consumes: T2 (`DraftData`, `AuthorMap`, `FieldAuthor`, `DraftPatch`, `applyDraftPatch`, `getMissingRequired`, `EMPTY_DRAFT_DATA`, `MissingField`), T3 (`formatDraftMessage`, `buildDraftKeyboard`, `draftLabel`, `DraftStatus`), `callTelegram`, `shipmentPlaceOf` (`client-cargo-miniapp.service.ts`), `rememberProduct` (shu faylda hozir private — `export` qiling).
- Produces:
  - `interface DraftView { id: number; status: DraftStatus; version: number; data: DraftData; authors: AuthorMap; missing: MissingField[]; complete: boolean; messageId: number | null; completedByName: string | null }`
  - `interface DraftSummary { id: number; label: string; missingCount: number; updatedAt: string }`
  - `type DraftResult = { ok: true; draft: DraftView } | { ok: false; status: 400 | 404 | 409 | 502; error: string; errors?: FieldErrors }`
  - `interface DraftActor { tgUserId: number; name: string }`
  - `interface DraftScope { botToken: string; clientId: number; chatId: string }`
  - `createDraft(scope: DraftScope, actor: DraftActor, patch: DraftPatch): Promise<DraftResult>` — bo'sh patch (hech narsa o'zgarmasa) → 400 `Hech narsa kiritilmadi`; muvaffaqiyatda jonli xabarni yuboradi va `messageId` ni saqlaydi.
  - `getDraft(scope: Pick<DraftScope,'clientId'|'chatId'>, id: number): Promise<DraftView | null>`
  - `listOpenDrafts(scope: Pick<DraftScope,'clientId'|'chatId'>, limit?: number /* 5 */): Promise<DraftSummary[]>` — `updatedAt` kamayish tartibida.
  - `patchDraft(scope: DraftScope, id: number, actor: DraftActor, patch: DraftPatch): Promise<DraftResult>` — OPEN bo'lmasa 409; yozuv `updateMany({ where: { id, version } , data: { ..., version: { increment: 1 } } })`, `count === 0` bo'lsa o'qib qayta hisoblash, ko'pi bilan 3 urinish, keyin 409 `Boshqa foydalanuvchi bir vaqtda o'zgartirdi, qayta urinib ko'ring`.
  - `completeDraft(scope: DraftScope, id: number, actor: DraftActor): Promise<DraftResult>` — to'liq emas → 400 `errors` o'rniga `error` matnida yetishmayotganlar; allaqachon COMPLETED → `ok: true` (idempotent); CANCELLED → 409.
  - `cancelDraft(scope: DraftScope, id: number, actor: DraftActor): Promise<DraftResult>` — COMPLETED → 409; allaqachon CANCELLED → `ok: true`.
  - `syncDraftMessage(botToken: string, draftId: number, options?: { immediate?: boolean }): Promise<void>` — `immediate` bo'lmasa shu ariza uchun oxirgi tahrirdan 3 s o'tmagan bo'lsa bitta kechiktirilgan chaqiruvga birlashtiradi (xotiradagi `Map`).
- Qoidalar: `contractId` shu mijozniki bo'lishi, `branchId` faol filial bo'lishi tekshiriladi (aks holda 400, `submitCargo` dagi xabarlar bilan bir xil). `messageId` yo'q → `sendMessage` (HTML, `reply_markup: { inline_keyboard }`), natijadan `message_id` saqlanadi; bor → `editMessageText`; xato matnida `message is not modified` → e'tiborsiz; `message to edit not found`/`message can't be edited` → yangi xabar yuboriladi, `messageId` yangilanadi. `miniAppLink` — `process.env.CLIENT_BOT_MINIAPP_LINK` (oxirgi `/` olib tashlanadi). Yakunlanganda tovar nomlari `rememberProduct` bilan eslab qolinadi.

- [ ] **Step 1: Failing testlar** (mock'langan prisma/callTelegram bilan):
  - boshqa `chatId`/`clientId` ning arizasi: `getDraft` → `null`, `patchDraft`/`completeDraft`/`cancelDraft` → `{ ok: false, status: 404 }`, `update*` chaqirilmaydi.
  - `patchDraft`: birinchi `updateMany` `{count: 0}`, ikkinchisi `{count: 1}` → ikkinchi urinishda boshqa foydalanuvchi qo'shgan maydon saqlanib qoladi (qayta o'qilgan `data` bilan birlashtirilgan); 3 marta `count: 0` → 409.
  - COMPLETED/CANCELLED ariza `patchDraft` → 409.
  - `completeDraft` ikki marta: ikkinchisi `ok: true`, ikkinchi marta xabar tahrirlanmaydi.
  - `syncDraftMessage`: `editMessageText` `message to edit not found` qaytarsa `sendMessage` chaqiriladi va yangi `messageId` yoziladi; `message is not modified` xato sifatida log qilinmaydi.
  - `syncDraftMessage` ketma-ket 2 chaqiruv (fake timers) 3 s ichida bitta tahrirga birlashadi.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Servisni yozing (imzolar yuqorida). `any` yo'q: Prisma `Json` ni `unknown` orqali Zod (`draftDataSchema`/`authorMapSchema` shu faylda) bilan o'qing, buzuq JSON → bo'sh holatga tushmasin, 500 emas `null`/xato qaytsin.
- [ ] **Step 4:** PASS; `npx vitest run` to'liq to'plam yashil; `tsc` toza.
- [ ] **Step 5: Commit** — `feat(bot): qoralama servisi — saqlash, yakunlash, bekor qilish, jonli xabar`.

### Task 6: API yo'llari

**Files:**
- Modify: `backend/src/routes/tg-cargo.ts`
- Test: `backend/src/__tests__/tg-cargo-drafts-route.test.ts` (supertest bo'lmasa `portal.test.ts` / `public-site-stats-route.test.ts` uslubida servis mock'lari bilan)

**Interfaces:**
- Consumes: T5 servis funksiyalari, `draftPatchSchema` (T2), `req.tg` (T4).
- Produces (barchasi mavjud `requireTelegramAuth` ostida, JSON):
  - `GET /drafts` → `{ drafts: DraftSummary[] }`
  - `GET /drafts/:id` → `DraftView` yoki 404
  - `POST /drafts` (tana `draftPatchSchema`) → `DraftView` | 400 `{ error, errors? }`
  - `PATCH /drafts/:id` → `DraftView` | 400/404/409
  - `POST /drafts/:id/complete` → `DraftView` | 400/404/409
  - `:id` — `z.coerce.number().int().positive()`, noto'g'ri bo'lsa 400.
  - Muallif `{ tgUserId: req.tg.userId, name: req.tg.userName }`.

- [ ] **Step 1: Failing test:** noto'g'ri tana → 400 (servis chaqirilmaydi); `PATCH` servis `{ok:false,status:409,...}` qaytarsa HTTP 409 va `error` matni; `GET /drafts/abc` → 400; muvaffaqiyatda servis to'g'ri `actor`/`scope` bilan chaqiriladi.
- [ ] **Step 2:** FAIL. **Step 3:** Yo'llarni yozing (mavjud `/submit` ga tegmang). **Step 4:** PASS + `tsc`.
- [ ] **Step 5: Commit** — `feat(bot): qoralama API yo'llari`.

### Task 7: Bot — /yangi, callback'lar

**Files:**
- Modify: `backend/src/services/client-cargo-bot.service.ts` (`buildMiniAppLink`, `/yangi`, yangi `callback_query` tarmoqlari, `/help` matni)
- Modify: `backend/src/__tests__/client-cargo-miniapp.test.ts` yoki `client-cargo-bot-link` testlari `buildMiniAppLink` ni tekshirsa moslang (qidiring: `grep -rn buildMiniAppLink backend/src`)

**Interfaces:**
- Consumes: `listOpenDrafts`, `completeDraft`, `cancelDraft`, `getDraft` (T5), `buildDraftLaunchLink`, `buildDraftKeyboard`, `draftLabel` (T3).
- Produces: `buildMiniAppLink(baseLink: string, chatId: number, draft: number | 'new' = 'new'): string` (`buildDraftLaunchLink` ga tayanadi).

- [ ] **Step 1:** `/yangi`: ochiq arizalar bo'lmasa avvalgidek bitta tugma (`startapp=<chatId>_new`). Bo'lsa — har ariza uchun `url` tugma `"📝 <label> — to'ldirilmagan: N"` (`startapp=<chatId>_<id>`) va oxirida `➕ Yangi yuk`. Tugma matni `truncateButtonText` (client-cargo-archive.service) bilan qisqartiriladi.
- [ ] **Step 2:** `callback_query` da `cargo:` prefiksli ma'lumotlar: mavjud `/arxiv` tarmog'ining `startsWith` filtri `cargo:` ni ham o'tkazsin. `cargo:done:<id>` → `completeDraft` (yetarli emas bo'lsa `answerCallbackQuery(show_alert: true)` bilan yetishmayotganlar ro'yxati); `cargo:cancel:<id>` → `editMessageReplyMarkup` bilan `confirmCancel: true` klaviatura; `cargo:cancel-no:<id>` → oddiy klaviatura qaytadi; `cargo:cancel-yes:<id>` → `cancelDraft`. Har birida `chatId` = `query.message.chat.id`, scope `clientId` `getClientIdByGroup` dan, `actor` = `query.from` (ism: `first_name last_name` | `@username` | `ID`). Egalik tekshiruvi servisda (404 → `answerCallbackQuery` "Ariza topilmadi").
- [ ] **Step 3:** `tsc` toza, `npx vitest run` yashil.
- [ ] **Step 4: Commit** — `feat(bot): /yangi ochiq arizalar ro'yxati va Yakunlash/Bekor qilish tugmalari`.

### Task 8: Frontend — sof holat qatlami

**Files:**
- Create: `frontend/src/pages/tgCargoDraft.ts`
- Test: `frontend/src/pages/tgCargoDraft.test.ts`
- Modify: `frontend/src/pages/TgCargo.tsx` (faqat `ItemState.uid` turini `string` ga o'tkazish va `newItem`)

**Interfaces:**
- Produces (`tgCargoDraft.ts`):
  - serverga mos turlar: `DraftView`, `DraftData`, `DraftItem`, `FieldAuthor`, `MissingField` (T2/T5 bilan bir xil maydonlar)
  - `interface FormSnapshot { contractId: number | null; branchId: number | null; header: Record<HeaderField, string>; items: Array<{ uid: string; fields: Record<ItemField | 'brutto', string>; bruttoManual: boolean }> }`
  - `makeUid(): string` (`'u' + 7 ta tasodifiy base36`, `/^[A-Za-z0-9_-]{1,24}$/` ga mos)
  - `snapshotFromDraft(view: DraftView | null): FormSnapshot` (`null` → bo'sh forma, bitta bo'sh tovar)
  - `buildPatch(base: FormSnapshot, current: FormSnapshot): DraftPatch | null` — faqat farq qilgan maydonlar; o'chirilgan tovar `null`; yangi tovar to'liq `fields`; hech narsa o'zgarmagan bo'lsa `null`.
  - `deriveManualFlags(header, contract: { cities: Array<{text:string}>; customs: string[]; destinations: string[] } | null): ManualFlags` — qiymat bor va shartnoma variantlarida yo'q bo'lsa `true`.
  - `authorOf(view: DraftView | null, path: string): FieldAuthor | null`

- [ ] **Step 1: Failing testlar:** `buildPatch` — bitta maydon o'zgarsa faqat shu maydon; hech o'zgarmasa `null`; tovar o'chirilsa `items[uid] === null`; yangi tovar `fields` bilan; maydon bo'shatilsa `null` qiymat; `bruttoManual` o'zgarishi yuboriladi. `snapshotFromDraft(null)` bitta bo'sh tovar beradi. `deriveManualFlags` shartnoma variantidagi qiymat uchun `false`, boshqasi uchun `true`. `makeUid()` regex ga mos va ketma-ket 100 chaqiruvda takrorlanmaydi.
- [ ] **Step 2:** `cd frontend && npx vitest run src/pages/tgCargoDraft.test.ts` — FAIL. **Step 3:** Yozing. **Step 4:** PASS; `npx tsc --noEmit -p tsconfig.app.json` toza.
- [ ] **Step 5: Commit** — `feat(bot): Mini App qoralama holat qatlami`.

### Task 9: Frontend — TgCargo.tsx ni qoralamaga ulash

**Files:**
- Modify: `frontend/src/pages/TgCargo.tsx`, `frontend/src/pages/TgCargo.css`

**Interfaces:**
- Consumes: T8 modul; API T6; `/context` javobidagi `launch.draft`.

- [ ] **Step 1:** Yuklashda `launch.draft` raqam bo'lsa `GET /drafts/:id` → `snapshotFromDraft` bilan forma holatini to'ldiring (`manual` — `deriveManualFlags`; `bruttoOverride` = `bruttoManual ? brutto : null`); `'new'`/`null` → bo'sh forma. `base` snapshot'ni ref'da saqlang.
- [ ] **Step 2:** "Guruhga yuborish" tugmasi → **"Saqlash"**: ariza yo'q bo'lsa `POST /drafts` (patch = `buildPatch(emptySnapshot, current)`), bor bo'lsa `PATCH /drafts/:id` (`buildPatch(base, current)`; `null` bo'lsa so'rov yuborilmaydi, "O'zgarish yo'q"). Javobdagi `DraftView` bilan butun forma qayta to'ldiriladi (boshqalar kiritgani ko'rinadi, server normallashtirgan qiymatlar), `base` yangilanadi. Server `errors` kalitlari: sarlavha — yalang kalit, tovar — `items.<uid>.<field>` (`errorKey` shu formatga o'tkazing, `removeItem` dagi "indekslar siljiydi" tozalash endi shart emas).
- [ ] **Step 3:** Saqlangandan keyin tugma: javobda `complete` bo'lsa tasdiq ekrani "Hammasi to'ldirilgan" + **✅ Yakunlash** (`POST /drafts/:id/complete`) va **Keyin**; aks holda ekran "Saqlandi" + yetishmayotgan majburiy maydonlar ro'yxati (`missing[].label`, tovar uchun `Товар N: label`) va **Yopish**. 409 (boshqa foydalanuvchi o'zgartirdi / yakunlangan) → xato matni ko'rsatilib ariza qayta yuklanadi.
- [ ] **Step 4:** Maydonlar ostida muallif belgisi: `authorOf(view, path)` bor bo'lsa kichik `👤 <name>` matni (`tgc-hint` uslubida, matn sifatida — `dangerouslySetInnerHTML` yo'q). Yakunlangan/bekor qilingan ariza ochilsa forma o'rniga "Bu ariza yopilgan" ekrani.
- [ ] **Step 5:** `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src/pages/TgCargo.tsx src/pages/tgCargoDraft.ts`, `npx vitest run` — toza; `npm run build` — muvaffaqiyatli.
- [ ] **Step 6: Commit** — `feat(bot): Mini App qoralamani saqlash/yakunlash va mualliflarni ko'rsatish`.

### Task 10: Deploy (faqat foydalanuvchi tasdiqlagandan keyin)

- [ ] **Step 1:** `git push origin main`.
- [ ] **Step 2:** Yangi serverda (`root@46.8.114.92`, kalit `~/.ssh/prodeklarant_deploy`) migratsiyani qo'lda qo'llash: `git pull --ff-only` → `cd backend && npx prisma db execute --file prisma/migrations/20261101120000_add_client_cargo_draft/migration.sql --schema prisma/schema.prisma` → `npx prisma migrate resolve --applied 20261101120000_add_client_cargo_draft`.
- [ ] **Step 3:** `npm run build` → `pm2 restart prodeklarant-backend`; `git log --oneline -1` va `dist` ichida `client-cargo-draft` fayllari borligini tekshiring.
- [ ] **Step 4:** Frontend lokal build → `tar | ssh` bilan `dist` almashtirish (`dist.bak` saqlanadi); `index-*.js` nomi lokal bilan bir xil ekanini tekshiring.
- [ ] **Step 5:** Qo'lda sinov (ikki Telegram akkaunti): birinchi odam sarlavhani, ikkinchisi tovarni to'ldiradi; xabar bitta bo'lib tahrirlanadi, mualliflar ko'rinadi; `Yakunlash`; `Bekor qilish`; eski `/yangi` tugmasi.
