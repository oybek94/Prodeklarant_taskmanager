# Tranzaksiyalar sahifasi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O'tgan yil qarzini tizimdan olib tashlash, Tranzaksiyalar sahifasini tezlashtirish va toza, ixcham ko'rinishga o'tkazish.

**Architecture:** Backend — eski qarz kodini o'chirish, `GET /transactions` query'sini alohida sof modulda (`transactions.query.ts`) Zod bilan tekshirish. Frontend — ma'lumot oqimi `useTransactionsList` hook'iga (debounce + AbortController), formatlash sof `format.ts` ga, UI komponentlar qayta yoziladi; sahifa faqat ularni yig'adi.

**Tech Stack:** Express 5 + Prisma + Zod + Vitest (backend); React 19 + TS + Tailwind + @iconify/react (Solar Bold Duotone) + react-hot-toast + Vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-09-26-transactions-page-redesign-design.md`

## Global Constraints

- Barcha UI yozuvlari o'zbekcha; `alert()` / `confirm()` ishlatilmaydi (toast + `ConfirmDialog`).
- Ikonkalar faqat `solar:*-bold-duotone`.
- Gradient/blur/shisha effektlari yo'q; oq fon, `border-gray-200`, `rounded-xl`.
- Qorong'i rejim: `index.css` dagi override'lar `gray-*`/`white` klasslarini o'zi almashtiradi — yangi kodda faqat `gray-*`, `white`, rang aksentlari (`emerald`, `rose`, `blue`) ishlatiladi, `slate-*`/`dark:` klasslari qo'shilmaydi.
- Summa formati: `1 250 000` (bo'shliq bilan, kasrsiz); so'm yozuvi `so'm`.
- Pul qiymatlari backendda `Decimal`; `any` yangi kodda ishlatilmaydi.
- Virtual karta tanlovi formada qoladi (moliya boti ishlatadi).
- Joriy mavsum hisobi (`SEASON_SPLIT_DATE`) o'zgarmaydi; bazadagi eski yozuvlar/ustunlar o'chirilmaydi.
- Ishchini o'chirishdagi `previousYearWorkerDebt.count` tekshiruvi (`routes/users.ts`) qoladi.

## Review Focus

1. Izoh qidiruvida tez yozish — faqat oxirgi matn natijasi ko'rinishi (eski javob yangisini bosib ketmasligi) → Task 4 testi `buildListParams` + hook'da abort.
2. Yangi tranzaksiyada tanlangan to'lov usuli (Naqd/Karta) saqlanishi — hozir POST'da yuborilmaydi → Task 4 `buildTransactionPayload` testi.
3. Backendga `limit=100000`, `type=FOO`, `clientId=abc` — 400, 500 emas → Task 2 testi.
4. Xodim (admin emas) sahifani ochganda boshqalarning yozuvlari ko'rinmasligi — `workerId` filtri majburiy → Task 2 testi.
5. Eski `isLegacyPayment: true` yuborilsa — yozuv oddiy (joriy mavsum) to'lov sifatida saqlanishi → Task 1 testi.

---

## File Structure

Backend:
- Delete: `backend/src/services/previous-year-debt.ts`, `backend/src/services/previous-year-debt.test.ts`
- Modify: `backend/src/services/worker-payment.ts` — `createWorkerPayment` legacy'siz, `getWorkerPaymentReport` `legacy` bo'limisiz
- Modify: `backend/src/routes/workers.ts` — previous-year endpointlar va `legacyDebt` maydonlari olib tashlanadi
- Modify: `backend/src/routes/worker-payments.ts`, `backend/src/routes/transactions.ts`, `backend/src/routes/transactions.guards.ts` (+test) — `isLegacyPayment` yo'q
- Modify: `backend/src/services/dashboard-stats.service.ts` — `getWorkerDebts` faqat joriy mavsum
- Create: `backend/src/routes/transactions.query.ts` — ro'yxat query'si (sof funksiya)
- Create: `backend/src/__tests__/transactions-query.test.ts`, `backend/src/__tests__/worker-payment-legacy-removed.test.ts`

Frontend:
- Delete: `frontend/src/components/transactions/PreviousYearDebtModal.tsx`
- Create: `frontend/src/components/transactions/format.ts` (+ `format.test.ts`) — summa/tur formatlash
- Create: `frontend/src/components/transactions/listParams.ts` (+ `listParams.test.ts`) — query va payload qurish
- Create: `frontend/src/components/transactions/useTransactionsList.ts` — ro'yxat hook'i
- Create: `frontend/src/components/common/ConfirmDialog.tsx`
- Rewrite: `TransactionsHeader.tsx`, `TransactionsStatsCards.tsx`, `TransactionsFilterPanel.tsx`, `TransactionsTable.tsx`, `TransactionsMobileList.tsx`, `TransactionFormModal.tsx`, `types.ts`, `pages/Transactions.tsx`
- Modify (eski qarz): `components/workers/WorkerCard.tsx`, `components/workers/WorkerFormModal.tsx`, `pages/Workers.tsx`, `components/profile/KpiStats.tsx`, `components/profile/modals/PaymentsModal.tsx`, `hooks/useProfileData.ts`, `pages/WorkerReport.tsx`

---

### Task 1: Backend — o'tgan yil qarzini olib tashlash

**Files:**
- Delete: `backend/src/services/previous-year-debt.ts`, `backend/src/services/previous-year-debt.test.ts`
- Modify: `backend/src/services/worker-payment.ts` (createWorkerPayment ~233-340, getWorkerPaymentReport ~342-422)
- Modify: `backend/src/routes/workers.ts` (import 5-8; `GET /` 67-85; `/:id/stats` ~251-252, 269; `/:id/stage-stats` ~520; previous-year endpointlar 98-160 va 656-752)
- Modify: `backend/src/routes/worker-payments.ts` (schema 19, handler 30, 61, 75)
- Modify: `backend/src/routes/transactions.ts` (schema 67; createWorkerPayment chaqiruvlari ~528, ~739)
- Modify: `backend/src/routes/transactions.guards.ts` (15, 48) + `transactions.guards.test.ts` (56, 65)
- Modify: `backend/src/services/dashboard-stats.service.ts` (`getWorkerDebts` ~551-557)
- Test: `backend/src/__tests__/worker-payment-legacy-removed.test.ts`

**Interfaces:**
- Produces: `getWorkerPaymentReport(workerId, dateRange?, tx?)` → `{ salaryCurrency, current: { totalEarned, totalPaid, totalErrors, difference }, payments: Array<{ id, earnedAmountUsd, paidAmountUsd, paidAmountUzs, paidCurrency, paymentDate, comment }> }` (`legacy` va `payments[].isLegacyPayment` yo'q). `createWorkerPayment(workerId, paidCurrency, paidAmount, { exchangeRate?, paymentDate?, comment?, tx? })`.
- `/api/workers` javobida `legacyDebt`, `/workers/:id/stats` da `legacyDebt`/`legacyTotalErrors`, `/workers/:id/stage-stats` `totals` da `legacyDebt` bo'lmaydi.

- [ ] **Step 1: Failing test yozish**

`backend/src/__tests__/worker-payment-legacy-removed.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../services/exchange-rate', () => ({ getExchangeRate: vi.fn(async () => new Decimal(12500)) }));

import { createWorkerPayment, getWorkerPaymentReport } from '../services/worker-payment';

function fakeClient() {
  const created: Record<string, unknown>[] = [];
  const paymentWheres: unknown[] = [];
  const client = {
    user: { findUnique: vi.fn(async () => ({ id: 7, salaryCurrency: 'UZS', legacyDebtUsd: new Decimal(500) })) },
    kpiLog: { findMany: vi.fn(async () => []) },
    taskError: { findMany: vi.fn(async () => []) },
    workerPayment: {
      findMany: vi.fn(async (args: { where: unknown }) => { paymentWheres.push(args.where); return []; }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 1, ...data }; }),
    },
    transaction: { findMany: vi.fn(async () => []) },
  };
  return { client, created, paymentWheres };
}

describe('eski (o\'tgan mavsum) qarz olib tashlangan', () => {
  it('hisobotda legacy bo\'limi yo\'q, to\'lovlar ro\'yxati eski mavsum to\'lovlarisiz', async () => {
    const { client, paymentWheres } = fakeClient();
    const report = await getWorkerPaymentReport(7, undefined, client as never);
    expect(report).not.toHaveProperty('legacy');
    expect(report.current).toEqual({ totalEarned: 0, totalPaid: 0, totalErrors: 0, difference: 0 });
    expect(paymentWheres.at(-1)).toMatchObject({ workerId: 7, isLegacyPayment: false });
  });

  it('to\'lov har doim joriy mavsum to\'lovi sifatida yoziladi', async () => {
    const { client, created } = fakeClient();
    await createWorkerPayment(7, 'UZS', 250000, { tx: client as never, paymentDate: new Date('2026-09-20') });
    expect(created[0]).toMatchObject({ isLegacyPayment: false, paidCurrency: 'UZS' });
    expect(Number(created[0].paidAmountUzs)).toBe(250000);
  });
});
```

- [ ] **Step 2: Test yiqilishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/worker-payment-legacy-removed.test.ts`
Expected: FAIL — `report` da `legacy` bor va `paymentWheres` da `isLegacyPayment` yo'q. (Agar `calculateTotal*` boshqa client metodini chaqirsa, xato matnidagi metod nomini `fakeClient` ga `findMany: async () => []` bilan qo'shing.)

- [ ] **Step 3: `worker-payment.ts` ni o'zgartirish**

`createWorkerPayment` options tipidan `isLegacyPayment?: boolean;` ni, tanasidan `const isLegacyPayment = ...` qatorini va `if (isLegacyPayment) { ... } else { ... }` blokini olib tashlang; o'rniga faqat joriy mavsum qismi qoladi:

```ts
  const salaryCurrency = user.salaryCurrency || 'UZS';
  const paymentInTargetCurrency = salaryCurrency === 'UZS' ? paidAmountUzs! : paidAmountUsd;
```

(`totalEarned`/`totalPaid`/`earnedRemaining` hisobi va bo'sh `if` bloki hech narsa qilmagani uchun o'chiriladi.) `workerPayment.create` `data` ida `isLegacyPayment,` o'rniga `isLegacyPayment: false,`.

`getWorkerPaymentReport` dan `// Legacy (USD)` dan `legacyDifference` gacha bo'lgan qatorlarni olib tashlang, `where` ni:

```ts
  const where: Prisma.WorkerPaymentWhereInput = { workerId, isLegacyPayment: false };
```

qaytariladigan obyektdan `legacy: {...}` va `payments[].isLegacyPayment` ni olib tashlang. Funksiya izohi: `Returns current-season balance (salaryCurrency)`.

- [ ] **Step 4: Chaqiruvchilarni moslash**

`routes/workers.ts`:
- 5-8 qatordagi `previous-year-debt` importini o'chiring.
- `GET /` da `legacyDebt: Number(paymentReport.legacy.difference),` va fallback'dagi `legacyDebt: 0,` ni o'chiring.
- `/:id/stats` javobidan `legacyDebt`, `legacyTotalErrors` va `payments[].isLegacyPayment` ni o'chiring.
- `/:id/stage-stats` `totals` dan `legacyDebt` ni o'chiring.
- `// O'tgan yil qarzlarini boshqarish` izohi bilan boshlanadigan `GET /:id/previous-year-debt` handlerini va `GET /previous-year-debts`, `POST /previous-year-debts` handlerlarini to'liq o'chiring.

`routes/worker-payments.ts`: schema'dan `isLegacyPayment`, destructuring'dan `isLegacyPayment`, `createWorkerPayment` options'dan `isLegacyPayment,`, javobdan `isLegacyPayment: payment.isLegacyPayment,` ni o'chiring.

`routes/transactions.ts`: `baseSchema` dan `isLegacyPayment: z.boolean().optional(),` ni; ikki `createWorkerPayment` chaqiruvidan `isLegacyPayment: data.isLegacyPayment,` ni o'chiring. (Zod object sukut bo'yicha noma'lum kalitni tashlab yuboradi — eski mijoz `isLegacyPayment: true` yuborsa ham oddiy to'lov bo'ladi.)

`routes/transactions.guards.ts`: interfeysdan `isLegacyPayment?: boolean;`, funksiyadan `data.isLegacyPayment = false;`, izohdan ", o'tgan mavsum qarzi" ni o'chiring. `transactions.guards.test.ts` dan `isLegacyPayment: true,` va `expect(data.isLegacyPayment).toBe(false);` ni o'chiring.

`services/dashboard-stats.service.ts` `getWorkerDebts`:

```ts
      return {
        userId: worker.id,
        name: worker.name,
        totalEarnedUsd: Number(report.current.totalEarned),
        totalPaidUsd: Number(report.current.totalPaid),
        pendingUsd: Number(report.current.difference),
      };
```

`git rm backend/src/services/previous-year-debt.ts backend/src/services/previous-year-debt.test.ts`

- [ ] **Step 5: Tekshirish**

Run: `cd backend && npx tsc --noEmit -p . && npx vitest run`
Expected: tsc xatosiz; barcha testlar PASS. `grep -rn "previous-year\|legacyDebt\|isLegacyPayment" src` — faqat `worker-payment.ts` dagi `isLegacyPayment: false` (create va where) va `calculateTotalPaid` parametri qoladi.

- [ ] **Step 6: Commit**

```bash
git add -A backend/src
git commit -m "refactor(workers): o'tgan yil (mavsum) qarzi backenddan olib tashlandi"
```

---

### Task 2: Backend — `GET /transactions` query validatsiyasi

**Files:**
- Create: `backend/src/routes/transactions.query.ts`
- Modify: `backend/src/routes/transactions.ts:70-128`
- Test: `backend/src/__tests__/transactions-query.test.ts`

**Interfaces:**
- Produces: `buildTransactionListArgs(query: unknown, user: { id: number; role: string }): { ok: true; page: number; take: number; skip: number; where: Prisma.TransactionWhereInput } | { ok: false; error: string }`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildTransactionListArgs } from '../routes/transactions.query';

const admin = { id: 1, role: 'ADMIN' };
const worker = { id: 7, role: 'DEKLARANT' };

describe('buildTransactionListArgs', () => {
  it('sukut: 1-sahifa, 15 ta, filtr yo\'q', () => {
    const r = buildTransactionListArgs({}, admin);
    expect(r).toEqual({ ok: true, page: 1, take: 15, skip: 0, where: {} });
  });

  it('filtrlar where ga aylanadi, endDate kun oxirigacha', () => {
    const r = buildTransactionListArgs({
      type: 'EXPENSE', paymentMethod: 'CARD', clientId: '3', workerId: '4',
      startDate: '2026-09-01', endDate: '2026-09-30', search: ' benzin ', page: '2', limit: '20',
    }, admin);
    if (!r.ok) throw new Error(r.error);
    expect(r.skip).toBe(20);
    expect(r.where).toMatchObject({
      type: 'EXPENSE', paymentMethod: 'CARD', clientId: 3, workerId: 4,
      comment: { contains: 'benzin', mode: 'insensitive' },
    });
    const date = r.where.date as { gte: Date; lte: Date };
    expect(date.gte.toISOString().slice(0, 10)).toBe('2026-09-01');
    expect(date.lte.getHours()).toBe(23);
  });

  it('noto\'g\'ri qiymatlar rad etiladi', () => {
    expect(buildTransactionListArgs({ limit: '100000' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ type: 'FOO' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ clientId: 'abc' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ page: '0' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ startDate: 'kecha' }, admin).ok).toBe(false);
  });

  it('bo\'sh satrlar filtr hisoblanmaydi', () => {
    const r = buildTransactionListArgs({ type: '', search: '   ', clientId: '' }, admin);
    expect(r).toMatchObject({ ok: true, where: {} });
  });

  it('xodim faqat o\'z yozuvlarini ko\'radi (workerId filtri e\'tiborsiz)', () => {
    const r = buildTransactionListArgs({ workerId: '4', clientId: '3' }, worker);
    if (!r.ok) throw new Error(r.error);
    expect(r.where.workerId).toBe(7);
    expect(r.where.clientId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Yiqilishini tekshirish**

Run: `cd backend && npx vitest run src/__tests__/transactions-query.test.ts`
Expected: FAIL — `Cannot find module '../routes/transactions.query'`.

- [ ] **Step 3: Implementatsiya — `backend/src/routes/transactions.query.ts`**

```ts
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /transactions query'si: tekshiruv + Prisma where/sahifalash.
 * Alohida sof modul — DB'siz testlanadi.
 */

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD formatida bo\'lishi kerak');

const listQuerySchema = z.object({
  page: optional(z.coerce.number().int().min(1)),
  limit: optional(z.coerce.number().int().min(1).max(100)),
  type: optional(z.enum(['INCOME', 'EXPENSE', 'SALARY'])),
  paymentMethod: optional(z.enum(['CASH', 'CARD'])),
  clientId: optional(z.coerce.number().int().positive()),
  workerId: optional(z.coerce.number().int().positive()),
  startDate: optional(isoDate),
  endDate: optional(isoDate),
  search: optional(z.string().trim().max(200)),
});

export type TransactionListArgs =
  | { ok: true; page: number; take: number; skip: number; where: Prisma.TransactionWhereInput }
  | { ok: false; error: string };

export function buildTransactionListArgs(query: unknown, user: { id: number; role: string }): TransactionListArgs {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  const q = parsed.data;
  const isAdmin = user.role === 'ADMIN';
  const where: Prisma.TransactionWhereInput = {};

  if (q.type) where.type = q.type;
  if (q.paymentMethod) where.paymentMethod = q.paymentMethod;
  if (isAdmin && q.clientId) where.clientId = q.clientId;
  if (isAdmin && q.workerId) where.workerId = q.workerId;
  if (!isAdmin) where.workerId = user.id; // xodim faqat o'zini ko'radi

  if (q.startDate || q.endDate) {
    const date: Prisma.DateTimeFilter = {};
    if (q.startDate) date.gte = new Date(q.startDate);
    if (q.endDate) {
      const end = new Date(q.endDate);
      end.setHours(23, 59, 59, 999);
      date.lte = end;
    }
    where.date = date;
  }
  if (q.search) where.comment = { contains: q.search, mode: 'insensitive' };

  const page = q.page ?? 1;
  const take = q.limit ?? 15;
  return { ok: true, page, take, skip: (page - 1) * take, where };
}
```

- [ ] **Step 4: Route'ni ulash — `transactions.ts` `router.get('/', ...)` tanasi**

```ts
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const args = buildTransactionListArgs(req.query, req.user);
  if (!args.ok) return res.status(400).json({ error: args.error });

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: args.where,
      include: {
        client: { select: { id: true, name: true } },
        worker: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip: args.skip,
      take: args.take,
    }),
    prisma.transaction.count({ where: args.where }),
  ]);

  res.json({ data: items, total, page: args.page, totalPages: Math.max(1, Math.ceil(total / args.take)) });
});
```

Faylning boshiga: `import { buildTransactionListArgs } from './transactions.query';`

- [ ] **Step 5: Tekshirish**

Run: `cd backend && npx tsc --noEmit -p . && npx vitest run`
Expected: hammasi PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/transactions.query.ts backend/src/routes/transactions.ts backend/src/__tests__/transactions-query.test.ts
git commit -m "fix(transactions): ro'yxat query'si Zod bilan tekshiriladi, limit ≤ 100"
```

---

### Task 3: Frontend — eski qarzni ishchi/profil/hisobotdan olib tashlash

**Files:**
- Modify: `frontend/src/components/workers/WorkerCard.tsx` (17, 152-159), `frontend/src/components/workers/WorkerFormModal.tsx:14`, `frontend/src/pages/Workers.tsx:20`
- Modify: `frontend/src/components/profile/KpiStats.tsx` (84-95 blok), `frontend/src/components/profile/modals/PaymentsModal.tsx:11`, `frontend/src/hooks/useProfileData.ts` (12, 25)
- Modify: `frontend/src/pages/WorkerReport.tsx` (56-60, 70-71, 112-113, 149-160, 226-259)

**Interfaces:**
- Consumes: Task 1 dagi javob shakli (`legacyDebt`, `isLegacyPayment` endi kelmaydi).

- [ ] **Step 1: Ishchi kartochkasi va tiplar**

`WorkerCard.tsx`: `legacyDebt?: number;` qatorini va `{worker.legacyDebt !== undefined && worker.legacyDebt > 0 && ( ... "Eski qarz" ... )}` blokini o'chiring. `WorkerFormModal.tsx:14` va `pages/Workers.tsx:20` dagi `legacyDebt?: number;` ni o'chiring.

- [ ] **Step 2: Profil**

`KpiStats.tsx`: `{/* Legacy Debt */}` izohidan keyingi "O'tgan mavsum" kartochkasi `<div>...</div>` ni to'liq o'chiring; shu komponentning grid konteyneridagi ustunlar sonini bittaga kamaytiring (masalan `lg:grid-cols-5` → `lg:grid-cols-4` — faylda qaysi bo'lsa). `useProfileData.ts`: `legacyDebt: number;` va `isLegacyPayment: boolean;` ni o'chiring. `PaymentsModal.tsx:11`:

```tsx
  const filteredPayments = payments;
```

(keyin `useMemo` importi ishlatilmay qolsa, uni ham olib tashlang.)

- [ ] **Step 3: Ishchi hisoboti**

`WorkerReport.tsx`: `const legacy = ...` (56-60), `const legacyPayments = ...` va `const currentPayments = ...` (70-71) ni o'chiring va `currentPayments` ishlatilgan joylarda `finStats?.payments || []` dan foydalaning (`const currentPayments = finStats?.payments || [];` qilib qoldiring). `legacyPaidPct` (112-113), `{/* Legacy Debt */}` kartochkasi (149-160) va `{/* Legacy Debt Progress */}` bloki (226-259) ni o'chiring. Moliyaviy kartochkalar gridi `lg:grid-cols-4` → `lg:grid-cols-3`. `fmtUsd` ishlatilmay qolsa — o'chiring.

- [ ] **Step 4: Tekshirish**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -v "Clients.tsx(1338" ; grep -rn "legacyDebt\|isLegacyPayment\|O'tgan mavsum\|Eski qarz" src`
Expected: tsc faqat eski `Clients.tsx(1338)` xatosi; grep bo'sh (Transactions fayllari Task 5–6 da tozalanadi, ular hozircha chiqishi mumkin).

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src/components/workers frontend/src/components/profile frontend/src/hooks/useProfileData.ts frontend/src/pages/WorkerReport.tsx frontend/src/pages/Workers.tsx
git commit -m "refactor(workers): eski qarz ko'rsatkichlari ishchi, profil va hisobotdan olib tashlandi"
```

---

### Task 4: Frontend — formatlash, query/payload qurish, ro'yxat hook'i

**Files:**
- Create: `frontend/src/components/transactions/format.ts`, `format.test.ts`
- Create: `frontend/src/components/transactions/listParams.ts`, `listParams.test.ts`
- Create: `frontend/src/components/transactions/useTransactionsList.ts`
- Modify: `frontend/src/components/transactions/types.ts`

**Interfaces:**
- Produces:
  - `formatSom(value: number | string): string` → `"1 250 000"`
  - `TYPE_META: Record<TransactionType, { label: string; sign: '+' | '−'; tone: 'income' | 'expense' | 'salary' }>`
  - `counterpartyOf(t: Transaction): string`
  - `buildListParams(filters: TransactionFilters, page: number, pageSize: number): URLSearchParams`
  - `hasActiveFilters(filters: TransactionFilters): boolean`
  - `EMPTY_FILTERS: TransactionFilters`
  - `buildTransactionPayload(form: TransactionFormData, ctx: { isAdmin: boolean; userId: number | null }): { ok: true; payload: TransactionPayload } | { ok: false; error: string }`
  - `useTransactionsList(filters, page, pageSize)` → `{ items: Transaction[]; total: number; totalPages: number; loading: boolean; reload: () => void }`
  - `types.ts`: `TransactionType = 'INCOME' | 'EXPENSE' | 'SALARY'`, `TransactionPayload`; `TransactionFormData` dan `isLegacyPayment` o'chiriladi; `WorkerStats`, `PreviousYearDebt`, `PreviousYearDebtFormData` o'chiriladi.

- [ ] **Step 1: `types.ts` ni yangilash**

```ts
export type TransactionType = 'INCOME' | 'EXPENSE' | 'SALARY';
export type PaymentMethod = 'CASH' | 'CARD';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number | string;
  currency: string;
  paymentMethod?: PaymentMethod | null;
  comment?: string | null;
  date: string;
  createdAt?: string;
  client?: { id: number; name: string } | null;
  worker?: { id: number; name: string } | null;
  expenseCategory?: string | null;
  virtualCardId?: number | null;
}

export interface Client { id: number; name: string }
export interface User { id: number; name: string }

export interface MonthlyStats {
  currency?: string;
  income: { current: number; change: number };
  expense: { current: number; change: number };
  net: { current: number; change: number };
}

export interface TransactionFilters {
  startDate: string;
  endDate: string;
  type: '' | TransactionType;
  clientId: string;
  workerId: string;
  paymentMethod: '' | PaymentMethod;
  search: string;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  currency: 'USD' | 'UZS';
  exchangeRate: string;
  paymentMethod: '' | PaymentMethod;
  comment: string;
  date: string;
  clientId: string;
  workerId: string;
  expenseCategory: string;
  virtualCardId: string;
}

export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  currency: 'USD' | 'UZS';
  paymentMethod?: PaymentMethod;
  comment: string;
  date: string;
  clientId?: number;
  workerId?: number;
  expenseCategory?: string;
  virtualCardId?: number;
}
```

- [ ] **Step 2: Failing testlar**

`format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatSom, TYPE_META, counterpartyOf } from './format';

describe('formatSom', () => {
  it('bo\'shliq bilan, kasrsiz', () => {
    expect(formatSom(1250000)).toBe('1 250 000');
    expect(formatSom('1250000.00')).toBe('1 250 000');
    expect(formatSom(999.6)).toBe('1 000');
    expect(formatSom(0)).toBe('0');
    expect(formatSom('abc')).toBe('0');
  });
});

describe('TYPE_META / counterpartyOf', () => {
  it('tur yozuvlari o\'zbekcha', () => {
    expect(TYPE_META.INCOME).toEqual({ label: 'Kirim', sign: '+', tone: 'income' });
    expect(TYPE_META.EXPENSE.label).toBe('Chiqim');
    expect(TYPE_META.SALARY.label).toBe('Ish haqi');
  });
  it('kim/nima ustuni', () => {
    const base = { id: 1, amount: 1, currency: 'UZS', date: '2026-09-26' };
    expect(counterpartyOf({ ...base, type: 'INCOME', client: { id: 1, name: 'Agro' } })).toBe('Agro');
    expect(counterpartyOf({ ...base, type: 'SALARY', worker: { id: 2, name: 'Ali' } })).toBe('Ali');
    expect(counterpartyOf({ ...base, type: 'EXPENSE', expenseCategory: 'Transport' })).toBe('Transport');
    expect(counterpartyOf({ ...base, type: 'EXPENSE' })).toBe('—');
  });
});
```

`listParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildListParams, hasActiveFilters, EMPTY_FILTERS, buildTransactionPayload } from './listParams';
import type { TransactionFormData } from './types';

const form = (p: Partial<TransactionFormData> = {}): TransactionFormData => ({
  type: 'INCOME', amount: '1 250 000', currency: 'UZS', exchangeRate: '', paymentMethod: 'CARD',
  comment: ' 2-to\'lov ', date: '2026-09-26', clientId: '3', workerId: '', expenseCategory: '', virtualCardId: '', ...p,
});

describe('buildListParams', () => {
  it('faqat to\'ldirilgan filtrlar, qidiruv qirqilgan', () => {
    const p = buildListParams({ ...EMPTY_FILTERS, type: 'EXPENSE', search: '  benzin ' }, 2, 15);
    expect(p.toString()).toBe('page=2&limit=15&type=EXPENSE&search=benzin');
  });
  it('hasActiveFilters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, clientId: '3' })).toBe(true);
  });
});

describe('buildTransactionPayload', () => {
  it('to\'lov usuli yangi yozuvda ham yuboriladi, summa bo\'shliqsiz son', () => {
    const r = buildTransactionPayload(form(), { isAdmin: true, userId: 1 });
    expect(r).toEqual({ ok: true, payload: {
      type: 'INCOME', amount: 1250000, currency: 'UZS', paymentMethod: 'CARD', comment: '2-to\'lov',
      date: '2026-09-26', clientId: 3,
    } });
  });
  it('majburiy maydonlar', () => {
    expect(buildTransactionPayload(form({ clientId: '' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Mijozni tanlang' });
    expect(buildTransactionPayload(form({ type: 'EXPENSE' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Xarajat kategoriyasini tanlang' });
    expect(buildTransactionPayload(form({ type: 'SALARY' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Ishchini tanlang' });
    expect(buildTransactionPayload(form({ amount: '0' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Summani kiriting' });
  });
  it('xodim uchun har doim o\'z ish haqi', () => {
    const r = buildTransactionPayload(form({ type: 'INCOME', clientId: '3', virtualCardId: '2' }), { isAdmin: false, userId: 7 });
    expect(r).toMatchObject({ ok: true, payload: { type: 'SALARY', workerId: 7 } });
    if (r.ok) {
      expect(r.payload.clientId).toBeUndefined();
      expect(r.payload.virtualCardId).toBeUndefined();
    }
  });
  it('virtual karta faqat chiqim/ish haqida', () => {
    const r = buildTransactionPayload(form({ type: 'EXPENSE', expenseCategory: 'Ofis', virtualCardId: '3' }), { isAdmin: true, userId: 1 });
    expect(r).toMatchObject({ ok: true, payload: { expenseCategory: 'Ofis', virtualCardId: 3 } });
  });
});
```

- [ ] **Step 3: Yiqilishini tekshirish**

Run: `cd frontend && npx vitest run src/components/transactions`
Expected: FAIL — modullar topilmadi.

- [ ] **Step 4: `format.ts`**

```ts
import type { Transaction, TransactionType } from './types';

/** 1 250 000 — bo'shliq bilan, kasrsiz */
export function formatSom(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const TYPE_META: Record<TransactionType, { label: string; sign: '+' | '−'; tone: 'income' | 'expense' | 'salary' }> = {
  INCOME: { label: 'Kirim', sign: '+', tone: 'income' },
  EXPENSE: { label: 'Chiqim', sign: '−', tone: 'expense' },
  SALARY: { label: 'Ish haqi', sign: '−', tone: 'salary' },
};

export const TONE_CLASSES: Record<'income' | 'expense' | 'salary', { dot: string; amount: string }> = {
  income: { dot: 'bg-emerald-500', amount: 'text-emerald-600' },
  expense: { dot: 'bg-rose-500', amount: 'text-rose-600' },
  salary: { dot: 'bg-blue-500', amount: 'text-gray-900' },
};

export function counterpartyOf(t: Transaction): string {
  if (t.type === 'INCOME') return t.client?.name || '—';
  if (t.type === 'SALARY') return t.worker?.name || '—';
  return t.expenseCategory?.trim() || '—';
}

export const PAYMENT_LABEL: Record<'CASH' | 'CARD', string> = { CASH: 'Naqd', CARD: 'Karta' };
```

- [ ] **Step 5: `listParams.ts`**

```ts
import type { TransactionFilters, TransactionFormData, TransactionPayload } from './types';

export const EMPTY_FILTERS: TransactionFilters = {
  startDate: '', endDate: '', type: '', clientId: '', workerId: '', paymentMethod: '', search: '',
};

export function buildListParams(filters: TransactionFilters, page: number, pageSize: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  (Object.keys(filters) as (keyof TransactionFilters)[]).forEach((key) => {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  });
  return params;
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Object.values(filters).some((v) => v.trim() !== '');
}

export function buildTransactionPayload(
  form: TransactionFormData,
  ctx: { isAdmin: boolean; userId: number | null },
): { ok: true; payload: TransactionPayload } | { ok: false; error: string } {
  const amount = Number(form.amount.replace(/\s+/g, '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Summani kiriting' };

  const payload: TransactionPayload = {
    type: form.type,
    amount,
    currency: form.currency || 'UZS',
    comment: form.comment.trim(),
    date: form.date,
  };
  if (form.paymentMethod) payload.paymentMethod = form.paymentMethod;

  if (!ctx.isAdmin) {
    if (ctx.userId == null) return { ok: false, error: 'Foydalanuvchi aniqlanmadi' };
    return { ok: true, payload: { ...payload, type: 'SALARY', workerId: ctx.userId } };
  }

  if (form.type === 'INCOME') {
    if (!form.clientId) return { ok: false, error: 'Mijozni tanlang' };
    payload.clientId = Number(form.clientId);
  } else if (form.type === 'EXPENSE') {
    if (!form.expenseCategory.trim()) return { ok: false, error: 'Xarajat kategoriyasini tanlang' };
    payload.expenseCategory = form.expenseCategory.trim();
  } else {
    if (!form.workerId) return { ok: false, error: 'Ishchini tanlang' };
    payload.workerId = Number(form.workerId);
  }
  if (form.type !== 'INCOME' && form.virtualCardId) payload.virtualCardId = Number(form.virtualCardId);
  return { ok: true, payload };
}
```

- [ ] **Step 6: Testlar o'tishini tekshirish**

Run: `cd frontend && npx vitest run src/components/transactions`
Expected: PASS.

- [ ] **Step 7: `useTransactionsList.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import apiClient from '../../lib/api';
import { buildListParams } from './listParams';
import type { Transaction, TransactionFilters } from './types';

const SEARCH_DEBOUNCE_MS = 350;

/** Ro'yxat: izoh qidiruvi debounce qilinadi, eski so'rov yangisi kelganda bekor qilinadi. */
export function useTransactionsList(filters: TransactionFilters, page: number, pageSize: number) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filters.search);
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [filters.search]);

  const { startDate, endDate, type, clientId, workerId, paymentMethod } = filters;
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = buildListParams({ startDate, endDate, type, clientId, workerId, paymentMethod, search }, page, pageSize);
    apiClient
      .get(`/transactions?${params.toString()}`, { signal: controller.signal })
      .then(({ data }) => {
        setItems(Array.isArray(data?.data) ? data.data : []);
        setTotal(Number(data?.total ?? 0));
        setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) return;
        console.error('Tranzaksiyalarni yuklashda xato:', error);
        setItems([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [startDate, endDate, type, clientId, workerId, paymentMethod, search, page, pageSize, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { items, total, totalPages, loading, reload };
}
```

(Agar `frontend/package.json` da `axios` bevosita dependency bo'lmasa, `axios.isCancel(error)` o'rniga `error instanceof Error && error.name === 'CanceledError'` ishlating.)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/transactions/types.ts frontend/src/components/transactions/format.ts frontend/src/components/transactions/format.test.ts frontend/src/components/transactions/listParams.ts frontend/src/components/transactions/listParams.test.ts frontend/src/components/transactions/useTransactionsList.ts
git commit -m "feat(transactions): formatlash, query/payload qurish va debounce'li ro'yxat hook'i"
```

---

### Task 5: Frontend — yangi ko'rinishdagi komponentlar

**Files:**
- Create: `frontend/src/components/common/ConfirmDialog.tsx`
- Rewrite: `frontend/src/components/transactions/TransactionsHeader.tsx`, `TransactionsStatsCards.tsx`, `TransactionsFilterPanel.tsx`, `TransactionsTable.tsx`, `TransactionsMobileList.tsx`, `TransactionFormModal.tsx`
- Delete: `frontend/src/components/transactions/PreviousYearDebtModal.tsx`

**Interfaces:**
- Consumes: Task 4 dagi `formatSom`, `TYPE_META`, `TONE_CLASSES`, `counterpartyOf`, `PAYMENT_LABEL`, `hasActiveFilters`, tiplar.
- Produces (props):
  - `ConfirmDialog({ open, title, message, confirmLabel?, loading?, onConfirm, onCancel })`
  - `TransactionsHeader({ isAdmin, onNew })`
  - `TransactionsStatsCards({ stats: MonthlyStats })`
  - `TransactionsFilterPanel({ filters, onChange: (key, value) => void, onReset, isAdmin, workers, clients })`
  - `TransactionsTable({ items, loading, total, page, totalPages, pageSize, canEdit, canDelete, onEdit, onDelete, onPageChange })`
  - `TransactionsMobileList({ items, loading, canEdit, canDelete, onEdit, onDelete })`
  - `TransactionFormModal({ open, fullScreen, isEditing, isAdmin, currentUserName, form, onFormChange, clients, workers, expenseCategories, saving, onSubmit, onClose })`

- [ ] **Step 1: `ConfirmDialog.tsx`**

```tsx
import { useEffect } from 'react';
import { Icon } from '@iconify/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "O'chirish", loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50">
            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Bekor qilish</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60">
            {loading ? 'Kuting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `TransactionsHeader.tsx`**

```tsx
import { Icon } from '@iconify/react';

interface TransactionsHeaderProps {
  isAdmin: boolean;
  onNew: () => void;
}

export function TransactionsHeader({ isAdmin, onNew }: TransactionsHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tranzaksiyalar</h1>
        <p className="text-sm text-gray-500">{isAdmin ? "Kirim, chiqim va ish haqi to'lovlari" : "Olgan pullaringiz tarixi"}</p>
      </div>
      <button type="button" onClick={onNew} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        <Icon icon="solar:add-circle-bold-duotone" className="h-4 w-4" />
        {isAdmin ? 'Yangi tranzaksiya' : "Olgan pulimni qo'shish"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `TransactionsStatsCards.tsx`**

```tsx
import { Icon } from '@iconify/react';
import { formatSom } from './format';
import type { MonthlyStats } from './types';

interface TransactionsStatsCardsProps {
  stats: MonthlyStats;
}

type Metric = { label: string; value: number; change: number; goodWhenUp: boolean };

function Change({ change, goodWhenUp }: { change: number; goodWhenUp: boolean }) {
  const up = change >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-emerald-600' : 'text-rose-600'}`}>
      <Icon icon={up ? 'solar:arrow-up-bold-duotone' : 'solar:arrow-down-bold-duotone'} className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(1).replace('.', ',')}%
      <span className="ml-1 font-normal text-gray-400">o'tgan oyga</span>
    </span>
  );
}

export function TransactionsStatsCards({ stats }: TransactionsStatsCardsProps) {
  const metrics: Metric[] = [
    { label: 'Oylik kirim', value: stats.income?.current ?? 0, change: stats.income?.change ?? 0, goodWhenUp: true },
    { label: 'Oylik chiqim', value: stats.expense?.current ?? 0, change: stats.expense?.change ?? 0, goodWhenUp: false },
    { label: 'Sof foyda', value: stats.net?.current ?? 0, change: stats.net?.change ?? 0, goodWhenUp: true },
  ];
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500">{m.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
            {m.value < 0 ? '−' : ''}{formatSom(Math.abs(m.value))} <span className="text-sm font-normal text-gray-400">so'm</span>
          </p>
          <div className="mt-1"><Change change={m.change} goodWhenUp={m.goodWhenUp} /></div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `TransactionsFilterPanel.tsx`**

```tsx
import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import { hasActiveFilters } from './listParams';
import type { Client, TransactionFilters, User } from './types';

interface TransactionsFilterPanelProps {
  filters: TransactionFilters;
  onChange: (key: keyof TransactionFilters, value: string) => void;
  onReset: () => void;
  isAdmin: boolean;
  workers: User[];
  clients: Client[];
}

const TYPES: { value: TransactionFilters['type']; label: string }[] = [
  { value: '', label: 'Hammasi' },
  { value: 'INCOME', label: 'Kirim' },
  { value: 'EXPENSE', label: 'Chiqim' },
  { value: 'SALARY', label: 'Ish haqi' },
];

const field = 'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export function TransactionsFilterPanel({ filters, onChange, onReset, isAdmin, workers, clients }: TransactionsFilterPanelProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {isAdmin && (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onChange('type', t.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${filters.type === t.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="relative min-w-[180px] flex-1">
        <Icon icon="solar:magnifer-bold-duotone" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          placeholder="Izoh bo'yicha qidirish"
          className={`${field} w-full pl-8`}
        />
      </div>
      {isAdmin && (
        <select value={filters.clientId} onChange={(e) => onChange('clientId', e.target.value)} className={`${field} max-w-[180px]`}>
          <option value="">Barcha mijozlar</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {isAdmin && (
        <select value={filters.workerId} onChange={(e) => onChange('workerId', e.target.value)} className={`${field} max-w-[160px]`}>
          <option value="">Barcha xodimlar</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      )}
      <select value={filters.paymentMethod} onChange={(e) => onChange('paymentMethod', e.target.value)} className={field}>
        <option value="">Naqd va karta</option>
        <option value="CASH">Naqd</option>
        <option value="CARD">Karta</option>
      </select>
      <div className="flex items-center gap-1">
        <DateInput value={filters.startDate} onChange={(v) => onChange('startDate', v)} placeholder="Dan" className={`${field} w-[124px]`} />
        <span className="text-gray-400">–</span>
        <DateInput value={filters.endDate} onChange={(v) => onChange('endDate', v)} placeholder="Gacha" className={`${field} w-[124px]`} />
      </div>
      {hasActiveFilters(filters) && (
        <button type="button" onClick={onReset} className="h-9 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100">Tozalash</button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `TransactionsTable.tsx`**

```tsx
import { Icon } from '@iconify/react';
import { TableSkeleton } from '../common/Skeleton';
import { formatDateTime } from '../../utils/dateFormatting';
import { counterpartyOf, formatSom, PAYMENT_LABEL, TONE_CLASSES, TYPE_META } from './format';
import type { Transaction } from './types';

interface TransactionsTableProps {
  items: Transaction[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  canEdit: (t: Transaction) => boolean;
  canDelete: (t: Transaction) => boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onPageChange: (page: number) => void;
}

function pageList(page: number, totalPages: number): (number | '…')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => { if (i > 0 && p - sorted[i - 1] > 1) out.push('…'); out.push(p); });
  return out;
}

export function TransactionsTable({ items, loading, total, page, totalPages, pageSize, canEdit, canDelete, onEdit, onDelete, onPageChange }: TransactionsTableProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {loading ? (
        <div className="p-4"><TableSkeleton columns={6} rows={8} /></div>
      ) : items.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <Icon icon="solar:bill-list-bold-duotone" className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">Tranzaksiya topilmadi</p>
          <p className="mt-1 text-sm text-gray-500">Filtrlarni o'zgartirib ko'ring</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-2.5">Sana</th>
                <th className="px-4 py-2.5">Tur</th>
                <th className="px-4 py-2.5">Kim / nima</th>
                <th className="px-4 py-2.5">Izoh</th>
                <th className="px-4 py-2.5">To'lov</th>
                <th className="px-4 py-2.5 text-right">Summa, so'm</th>
                <th className="w-20 px-2 py-2.5"><span className="sr-only">Amallar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => {
                const meta = TYPE_META[t.type];
                const tone = TONE_CLASSES[meta.tone];
                return (
                  <tr key={t.id} className="group hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600">{formatDateTime(t.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-gray-700"><span className={`h-2 w-2 rounded-full ${tone.dot}`} />{meta.label}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-gray-900" title={counterpartyOf(t)}>{counterpartyOf(t)}</td>
                    <td className="max-w-[260px] truncate px-4 py-2.5 text-gray-500" title={t.comment || undefined}>{t.comment || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{t.paymentMethod ? PAYMENT_LABEL[t.paymentMethod] : '—'}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${tone.amount}`}>
                      {meta.sign}{formatSom(t.amount)}{t.currency !== 'UZS' && <span className="ml-1 text-xs text-gray-400">{t.currency}</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        {canEdit(t) && (
                          <button type="button" onClick={() => onEdit(t)} title="Tahrirlash" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                            <Icon icon="solar:pen-bold-duotone" className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete(t) && (
                          <button type="button" onClick={() => onDelete(t)} title="O'chirish" className="rounded-md p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600">
                            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-500">
          <span className="tabular-nums">{from}–{to} / {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40" title="Oldingi">
                <Icon icon="solar:alt-arrow-left-bold-duotone" className="h-4 w-4" />
              </button>
              {pageList(page, totalPages).map((p, i) => p === '…'
                ? <span key={`gap-${i}`} className="px-1">…</span>
                : <button key={p} type="button" onClick={() => onPageChange(p)} className={`min-w-8 rounded-md px-2 py-1 tabular-nums ${p === page ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>{p}</button>)}
              <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40" title="Keyingi">
                <Icon icon="solar:alt-arrow-right-bold-duotone" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: `TransactionsMobileList.tsx`**

```tsx
import { Icon } from '@iconify/react';
import { Skeleton } from '../common/Skeleton';
import { formatDateTime } from '../../utils/dateFormatting';
import { counterpartyOf, formatSom, PAYMENT_LABEL, TONE_CLASSES, TYPE_META } from './format';
import type { Transaction } from './types';

interface TransactionsMobileListProps {
  items: Transaction[];
  loading: boolean;
  canEdit: (t: Transaction) => boolean;
  canDelete: (t: Transaction) => boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export function TransactionsMobileList({ items, loading, canEdit, canDelete, onEdit, onDelete }: TransactionsMobileListProps) {
  if (loading) {
    return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  }
  if (items.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">Tranzaksiya topilmadi</div>;
  }
  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {items.map((t) => {
        const meta = TYPE_META[t.type];
        const tone = TONE_CLASSES[meta.tone];
        return (
          <div key={t.id} className="flex items-start gap-3 px-3.5 py-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-medium text-gray-900">{counterpartyOf(t)}</p>
                <p className={`shrink-0 font-semibold tabular-nums ${tone.amount}`}>{meta.sign}{formatSom(t.amount)}</p>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {meta.label} · {formatDateTime(t.date)}{t.paymentMethod ? ` · ${PAYMENT_LABEL[t.paymentMethod]}` : ''}
              </p>
              {t.comment && <p className="mt-1 truncate text-xs text-gray-500">{t.comment}</p>}
            </div>
            {(canEdit(t) || canDelete(t)) && (
              <div className="flex shrink-0 gap-1">
                {canEdit(t) && (
                  <button type="button" onClick={() => onEdit(t)} className="rounded-md p-2 text-gray-500 active:bg-gray-100" aria-label="Tahrirlash">
                    <Icon icon="solar:pen-bold-duotone" className="h-4 w-4" />
                  </button>
                )}
                {canDelete(t) && (
                  <button type="button" onClick={() => onDelete(t)} className="rounded-md p-2 text-rose-500 active:bg-rose-50" aria-label="O'chirish">
                    <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

(Agar `Skeleton` `className` qabul qilmasa — `Skeleton.tsx` dagi `SkeletonProps` ga qarang; u `className` oladi.)

- [ ] **Step 7: `TransactionFormModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import MonetaryInput from '../MonetaryInput';
import type { MonetaryValidationErrors } from '../../utils/validation';
import type { Client, TransactionFormData, TransactionType, User } from './types';

interface TransactionFormModalProps {
  open: boolean;
  fullScreen: boolean;
  isEditing: boolean;
  isAdmin: boolean;
  currentUserName: string;
  form: TransactionFormData;
  onFormChange: (patch: Partial<TransactionFormData>) => void;
  clients: Client[];
  workers: User[];
  expenseCategories: string[];
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: TransactionType; label: string; active: string }[] = [
  { value: 'INCOME', label: 'Kirim', active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'EXPENSE', label: 'Chiqim', active: 'border-rose-500 bg-rose-50 text-rose-700' },
  { value: 'SALARY', label: 'Ish haqi', active: 'border-blue-500 bg-blue-50 text-blue-700' },
];

const VIRTUAL_CARDS = [
  { value: '1', label: '1-karta: Operatsion xarajatlar' },
  { value: '2', label: '2-karta: Qarzlar kartasi' },
  { value: '3', label: '3-karta: Korxona xarajatlari' },
  { value: '4', label: '4-karta: Maosh kartam' },
];

const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

export function TransactionFormModal({
  open, fullScreen, isEditing, isAdmin, currentUserName, form, onFormChange,
  clients, workers, expenseCategories, saving, onSubmit, onClose,
}: TransactionFormModalProps) {
  const [monetaryErrors, setMonetaryErrors] = useState<MonetaryValidationErrors>({});
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = isEditing ? 'Tranzaksiyani tahrirlash' : isAdmin ? 'Yangi tranzaksiya' : "Olgan pulimni qo'shish";
  const categories = form.expenseCategory && !expenseCategories.includes(form.expenseCategory)
    ? [...expenseCategories, form.expenseCategory]
    : expenseCategories;

  return (
    <div
      className={fullScreen ? 'fixed inset-0 z-50 bg-white' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'}
      onClick={(e) => { if (!fullScreen && e.target === e.currentTarget) onClose(); }}
    >
      <div className={fullScreen ? 'h-full overflow-y-auto p-4' : 'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl'}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Yopish">
            <Icon icon="solar:close-circle-bold-duotone" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          {!isAdmin && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
              <p className="text-sm font-medium text-blue-900">{currentUserName}</p>
              <p className="mt-0.5 text-xs text-blue-700">Bu yozuv ish haqingizdan olingan pul sifatida qayd etiladi</p>
            </div>
          )}

          {isAdmin && (
            <div>
              <span className={labelCls}>Tur</span>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => onFormChange({ type: o.value })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${form.type === o.value ? o.active : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isAdmin && form.type === 'INCOME' && (
            <div>
              <label className={labelCls} htmlFor="tx-client">Mijoz</label>
              <select id="tx-client" value={form.clientId} onChange={(e) => onFormChange({ clientId: e.target.value })} className={input} required>
                <option value="">Tanlang</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {isAdmin && form.type === 'EXPENSE' && (
            <div>
              <label className={labelCls} htmlFor="tx-category">Xarajat kategoriyasi</label>
              <select id="tx-category" value={form.expenseCategory} onChange={(e) => onFormChange({ expenseCategory: e.target.value })} className={input} required>
                <option value="">Tanlang</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="mt-2 flex gap-2">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Yangi kategoriya" className={input} />
                <button type="button" onClick={() => { const v = newCategory.trim(); if (v) { onFormChange({ expenseCategory: v }); setNewCategory(''); } }}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Qo'shish</button>
              </div>
            </div>
          )}

          {isAdmin && form.type === 'SALARY' && (
            <div>
              <label className={labelCls} htmlFor="tx-worker">Ishchi</label>
              <select id="tx-worker" value={form.workerId} onChange={(e) => onFormChange({ workerId: e.target.value })} className={input} required>
                <option value="">Tanlang</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Sana</label>
              <DateInput value={form.date} onChange={(v) => onFormChange({ date: v })} required className={input} />
            </div>
            <div>
              <span className={labelCls}>To'lov usuli</span>
              <div className="grid grid-cols-2 gap-2">
                {(['CASH', 'CARD'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => onFormChange({ paymentMethod: m })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${form.paymentMethod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {m === 'CASH' ? 'Naqd' : 'Karta'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <MonetaryInput
            amount={form.amount}
            currency={form.currency || 'UZS'}
            date={form.date}
            onAmountChange={(value) => { onFormChange({ amount: value }); setMonetaryErrors((e) => ({ ...e, amount: undefined })); }}
            onCurrencyChange={(curr) => onFormChange({ currency: curr as 'USD' | 'UZS' })}
            label="Summa"
            required
            showLabels
            currencyRules={undefined}
            errors={monetaryErrors}
          />

          {isAdmin && form.type !== 'INCOME' && (
            <div>
              <label className={labelCls} htmlFor="tx-card">Virtual karta <span className="font-normal text-gray-400">(ixtiyoriy)</span></label>
              <select id="tx-card" value={form.virtualCardId} onChange={(e) => onFormChange({ virtualCardId: e.target.value })} className={input}>
                <option value="">Tanlanmagan</option>
                {VIRTUAL_CARDS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="tx-comment">Izoh</label>
            <textarea id="tx-comment" value={form.comment} onChange={(e) => onFormChange({ comment: e.target.value })} rows={2} className={input} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Bekor qilish</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Eski modalni o'chirish**

`git rm frontend/src/components/transactions/PreviousYearDebtModal.tsx`

- [ ] **Step 9: Commit** (sahifa hali eski prop'lar bilan — build Task 6 da tiklanadi, shuning uchun Task 5 va 6 bitta commit bo'lishi ham mumkin; alohida commit qilinsa, commit xabarida "WIP: sahifa Task 6 da ulanadi" yozing)

```bash
git add -A frontend/src/components/transactions frontend/src/components/common/ConfirmDialog.tsx
git commit -m "feat(transactions): yangi ko'rinishdagi komponentlar va tasdiqlash oynasi (WIP: sahifa keyingi commitda ulanadi)"
```

---

### Task 6: Frontend — sahifani yig'ish

**Files:**
- Rewrite: `frontend/src/pages/Transactions.tsx`

**Interfaces:**
- Consumes: Task 4 (`useTransactionsList`, `buildTransactionPayload`, `EMPTY_FILTERS`), Task 5 komponentlari.

- [ ] **Step 1: `pages/Transactions.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TransactionsHeader } from '../components/transactions/TransactionsHeader';
import { TransactionsFilterPanel } from '../components/transactions/TransactionsFilterPanel';
import { TransactionsStatsCards } from '../components/transactions/TransactionsStatsCards';
import { TransactionsTable } from '../components/transactions/TransactionsTable';
import { TransactionsMobileList } from '../components/transactions/TransactionsMobileList';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { useTransactionsList } from '../components/transactions/useTransactionsList';
import { buildTransactionPayload, EMPTY_FILTERS } from '../components/transactions/listParams';
import type { Client, MonthlyStats, Transaction, TransactionFilters, TransactionFormData, User } from '../components/transactions/types';

const PAGE_SIZE = 15;
const DEFAULT_CATEGORIES = ['Transport', 'Ofis', 'Boshqa', 'ST-1', 'FITO', 'AKT'];
const today = () => new Date().toISOString().split('T')[0];

function emptyForm(isAdmin: boolean, userId: number | null): TransactionFormData {
  return {
    type: isAdmin ? 'INCOME' : 'SALARY', amount: '', currency: 'UZS', exchangeRate: '', paymentMethod: '',
    comment: '', date: today(), clientId: '', workerId: isAdmin || userId == null ? '' : String(userId),
    expenseCategory: '', virtualCardId: '',
  };
}

function errorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof data === 'string' ? data : 'Xatolik yuz berdi';
}

const Transactions = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const userId = user?.id ?? null;

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const list = useTransactionsList(filters, page, PAGE_SIZE);

  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);

  const [form, setForm] = useState<TransactionFormData>(() => emptyForm(isAdmin, userId));
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isNewRoute = location.pathname === '/transactions/new';
  const editMatch = location.pathname.match(/^\/transactions\/(\d+)\/edit$/);
  const editRouteId = editMatch ? Number(editMatch[1]) : null;

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await apiClient.get('/transactions/stats/monthly');
      setStats(data?.accounting ?? data ?? null);
    } catch {
      setStats(null);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
    apiClient.get('/clients?selectList=true').then(({ data }) => setClients(Array.isArray(data) ? data : [])).catch(() => setClients([]));
    apiClient.get('/workers?forDropdown=true')
      .then(({ data }) => setWorkers(Array.isArray(data) ? data.filter((u: { role?: string }) => u.role === 'DEKLARANT' || u.role === 'ADMIN' || u.role === 'MANAGER') : []))
      .catch(() => setWorkers([]));
  }, [isAdmin, loadStats]);

  const expenseCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    list.items.forEach((t) => { const c = t.expenseCategory?.trim(); if (c) set.add(c); });
    return [...set];
  }, [list.items]);

  const changeFilter = useCallback((key: keyof TransactionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);
  const resetFilters = useCallback(() => { setFilters(EMPTY_FILTERS); setPage(1); }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    setForm(emptyForm(isAdmin, userId));
    if (isMobile) navigate('/transactions/new'); else setFormOpen(true);
  }, [isAdmin, userId, isMobile, navigate]);

  const openEdit = useCallback((t: Transaction) => {
    setEditing(t);
    setForm({
      type: t.type, amount: String(t.amount), currency: 'UZS', exchangeRate: '',
      paymentMethod: t.paymentMethod ?? '', comment: t.comment ?? '',
      date: new Date(t.date).toISOString().split('T')[0],
      clientId: t.client?.id ? String(t.client.id) : '', workerId: t.worker?.id ? String(t.worker.id) : '',
      expenseCategory: t.expenseCategory ?? '', virtualCardId: t.virtualCardId ? String(t.virtualCardId) : '',
    });
    if (isMobile) navigate(`/transactions/${t.id}/edit`); else setFormOpen(true);
  }, [isMobile, navigate]);

  // Mobil tahrirlash havolasi to'g'ridan ochilsa
  useEffect(() => {
    if (!isMobile || !editRouteId || editing?.id === editRouteId) return;
    const t = list.items.find((x) => x.id === editRouteId);
    if (t) openEdit(t);
  }, [isMobile, editRouteId, editing, list.items, openEdit]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    if (isMobile && (isNewRoute || editRouteId)) navigate('/transactions');
  }, [isMobile, isNewRoute, editRouteId, navigate]);

  const refresh = useCallback(() => { list.reload(); void loadStats(); }, [list, loadStats]);

  const submit = useCallback(async () => {
    const built = buildTransactionPayload(form, { isAdmin, userId });
    if (!built.ok) { toast.error(built.error); return; }
    setSaving(true);
    try {
      const { data } = editing
        ? await apiClient.put(`/transactions/${editing.id}`, built.payload)
        : await apiClient.post('/transactions', built.payload);
      if (data?.workerPaymentWarning) toast.error(data.workerPaymentWarning, { duration: 8000 });
      else toast.success(editing ? 'Saqlandi' : "Qo'shildi");
      closeForm();
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [form, isAdmin, userId, editing, closeForm, refresh]);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/transactions/${toDelete.id}`);
      toast.success("O'chirildi");
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }, [toDelete, refresh]);

  const canEdit = useCallback(() => isAdmin, [isAdmin]);
  const canDelete = useCallback((t: Transaction) => {
    if (isAdmin) return true;
    if (userId == null || t.type !== 'SALARY' || t.worker?.id !== userId || !t.createdAt) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(t.createdAt) >= startOfToday;
  }, [isAdmin, userId]);

  const formVisible = formOpen || (isMobile && (isNewRoute || (!!editRouteId && !!editing)));

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 pb-24 sm:px-6">
      <TransactionsHeader isAdmin={isAdmin} onNew={openNew} />
      {isAdmin && stats?.income && <TransactionsStatsCards stats={stats} />}
      <TransactionsFilterPanel filters={filters} onChange={changeFilter} onReset={resetFilters} isAdmin={isAdmin} workers={workers} clients={clients} />

      {isMobile ? (
        <TransactionsMobileList items={list.items} loading={list.loading} canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={setToDelete} />
      ) : (
        <TransactionsTable
          items={list.items} loading={list.loading} total={list.total} page={page} totalPages={list.totalPages} pageSize={PAGE_SIZE}
          canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={setToDelete} onPageChange={setPage}
        />
      )}
      {isMobile && list.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40">Oldingi</button>
          <span className="tabular-nums">{page} / {list.totalPages}</span>
          <button type="button" disabled={page >= list.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40">Keyingi</button>
        </div>
      )}

      <TransactionFormModal
        open={formVisible}
        fullScreen={isMobile}
        isEditing={!!editing}
        isAdmin={isAdmin}
        currentUserName={user?.name ?? ''}
        form={form}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        clients={clients}
        workers={workers}
        expenseCategories={expenseCategories}
        saving={saving}
        onSubmit={submit}
        onClose={closeForm}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Tranzaksiyani o'chirish"
        message="Bu yozuv butunlay o'chiriladi. Davom etasizmi?"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default Transactions;
```

Eslatma: `workers?forDropdown=true` — backend `GET /workers` da har ishchi uchun `getWorkerPaymentReport` chaqirilmaydi (dropdown yo'li), bu sahifani sezilarli tezlashtiradi; `role` maydoni ham qaytadi.

- [ ] **Step 2: Tekshirish**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -v "Clients.tsx(1338"; npx vitest run; npx vite build 2>&1 | tail -2`
Expected: tsc — faqat eski Clients.tsx xatosi; vitest PASS; build muvaffaqiyatli.
`grep -rn "PreviousYear\|previous-year\|isLegacyPayment\|legacyDebt\|alert(\|confirm(" src/pages/Transactions.tsx src/components/transactions` — bo'sh.

- [ ] **Step 3: Brauzerda tekshirish**

Lokal backend (`cd backend && npm run dev`) va frontend (`cd frontend && npm run dev`) ni ishga tushiring, `http://localhost:5173/transactions` ni oching:
- Admin: kartochkalar, tur tugmalari, qidiruvda tez yozish — Network'da faqat oxirgi so'rov yakunlanadi; Naqd/Karta tanlab yangi yozuv qo'shish → jadvalda "To'lov" ustunida ko'rinadi; o'chirish → tasdiqlash oynasi.
- Mobil kenglik (390px): ro'yxat, "Yangi tranzaksiya" to'liq ekranli forma.
- Qorong'i rejim: matn o'qiladi, fonlar to'q.
Skrinshotlarni foydalanuvchiga ko'rsating.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Transactions.tsx
git commit -m "feat(transactions): sahifa yangi komponentlar va debounce'li ro'yxat bilan; to'lov usuli endi yangi yozuvda ham saqlanadi"
```

---

## Deploy (foydalanuvchi tasdig'idan keyin)

`git push origin main`; serverda `/var/www/app` → `git pull --ff-only origin main`, `backend: npm run build`, `rm -f dist/services/previous-year-debt.*`, `pm2 restart prodeklarant-backend`, `frontend: npm run build`; health tekshiruvi.
