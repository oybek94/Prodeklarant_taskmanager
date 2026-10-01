# Arxiv tabi redizayn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vazifalar → Arxiv tabini tez seziladigan, filtrlari doim ko'rinadigan, invoys sanasi bo'yicha tartiblangan, mobilda qulay ko'rinishga o'tkazish.

**Architecture:** Backend `GET /tasks` ga `sort=invoiceDate` (ikki segmentli sahifalash: invoysi borlar → yo'qlar) qo'shiladi. Frontendda arxiv `TaskTable`dan ajratilib `components/tasks/archive/` ga ko'chadi (toolbar, jadval, kartochka, mobil filtr oynasi, hisobot modali). Ma'lumot qatlami eskirgan so'rovlarni bekor qiladi, fondagi yangilashda jadvalni xiralashtiradi va keyingi sahifani oldindan yuklaydi.

**Tech Stack:** React 19 + TS + Tailwind + @iconify/react (Solar), axios; Express 5 + Prisma 5.22 + Zod; vitest (backend va frontend).

**Spec:** `docs/superpowers/specs/2026-10-01-tasks-archive-redesign-design.md`

## Global Constraints

- Qamrov — faqat Arxiv tabi. Faol ro'yxat, TaskDetailPanel, modallar ko'rinishi o'zgarmaydi.
- Tartib — invoys sanasi `desc`, keyin `createdAt desc`; invoysi yo'q vazifalar oxirida.
- `any` ishlatmaslik (yangi kodda). Query validatsiyasi Zod.
- Ikonkalar faqat `solar:*-bold-duotone` (yoki mavjud `solar:*-linear` strelkalar).
- Har bir yangi rang klassi `dark:` juftligi bilan.
- SQL qo'lda yozilmaydi — istisno: prod indeks `CREATE INDEX CONCURRENTLY` (loyiha qoidasi bo'yicha qo'lda DDL), **foydalanuvchi tasdig'i bilan**.
- `migrate dev` ishlatilmaydi.
- Matnlar o'zbekcha (lotin).

## Review Focus

1. Sahifa chegarasi segmentlar orasida (masalan 95 ta invoysli, 2-sahifa limit 20 → 5+15) — dublikat/yo'qolgan qator bo'lmasligi kerak. → Task 1 testi.
2. Tez ketma-ket filtr o'zgarishi (qidiruvda yozish) — eski javob yangisini bosib ketmasligi, abort xato toast chiqarmasligi kerak. → Task 2 testi (`isAbortError`) + brauzer tekshiruvi.
3. Oldindan yuklangan sahifa eskirishi — socket yangilanishi/o'chirishdan keyin "›" eski ma'lumot ko'rsatmasligi kerak (TTL + refreshda kesh tozalanadi). → Task 2 testi.
4. Mobil "orqaga" tugmasi filtr oynasini yopishi, sahifani tark etmasligi. → Task 5 brauzer tekshiruvi.
5. Faqat bitta sana chegarasi (faqat "dan" yoki faqat "gacha") — chip to'g'ri yozilishi va filtr ishlashi. → Task 3 testi.

---

## Fayl xaritasi

Backend:
- Modify `backend/src/repositories/task.repository.ts` — `TaskFilters.sort`, `splitSegmentWindow`, segmentli `findManyWithRelations`.
- Modify `backend/src/routes/tasks.ts` — `sort` query; `/archive-report` tartibi.
- Modify `backend/src/__tests__/task-repository.test.ts`.
- Create `backend/prisma/migrations/20261001120000_invoice_date_index/migration.sql`; Modify `backend/prisma/schema.prisma` (`@@index([date])`).

Frontend (`frontend/src/components/tasks/`):
- Create `taskListParams.ts` (+ `.test.ts`) — `buildTaskListParams` shu yerga ko'chadi.
- Create `archive/pageCache.ts` (+ `.test.ts`).
- Modify `useTaskData.ts` — abort, `refreshing`, prefetch.
- Create `archive/types.ts`, `archive/filterChips.ts` (+ `.test.ts`).
- Create `archive/ArchiveFilterFields.tsx`, `archive/ArchiveToolbar.tsx`, `archive/ArchiveFiltersSheet.tsx`.
- Create `archive/ArchiveTable.tsx`, `archive/ArchiveCard.tsx`, `archive/ArchivePagination.tsx`, `archive/ArchiveView.tsx`.
- Create `archive/ArchiveReportModal.tsx`, `archive/ExportMenu.tsx`.
- Modify `TasksView.tsx`, `TasksHeader.tsx`, `TaskTable.tsx` (arxiv tarmoqlari olib tashlanadi), `pages/Tasks.tsx`, `hooks/useTaskExport.ts`, `hooks/useTaskFilters.ts`, `features/serviceAgreement/ClientPicker.tsx` (`placeholder` prop).
- Delete `ArchiveFiltersPanel.tsx`.

---

### Task 1: Backend — invoys sanasi bo'yicha tartib (ikki segment)

**Files:**
- Modify: `backend/src/repositories/task.repository.ts`
- Modify: `backend/src/routes/tasks.ts` (listTasksQuerySchema ~163; `/archive-report` ~78-111)
- Test: `backend/src/__tests__/task-repository.test.ts`

**Interfaces:**
- Produces: `GET /tasks?sort=invoiceDate` (frontend Task 2 yuboradi); `TaskFilters.sort?: 'createdAt' | 'invoiceDate'`; `export function splitSegmentWindow(skip: number, take: number, firstCount: number): { first?: { skip: number; take: number }; second?: { skip: number; take: number } }`.

- [ ] **Step 1: Failing testlar**

`task-repository.test.ts` ni almashtiring (mock prisma endi funksiyalarga ega):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const count = vi.fn();
const findMany = vi.fn();
vi.mock('../prisma', () => ({ prisma: { task: { count: (...a: unknown[]) => count(...a), findMany: (...a: unknown[]) => findMany(...a) } } }));

import { tashkentDayRange, splitSegmentWindow, TaskRepository } from '../repositories/task.repository';

describe('tashkentDayRange — arxiv sana filtri', () => {
  it("filtr yo'q bo'lsa undefined", () => {
    expect(tashkentDayRange()).toBeUndefined();
  });

  it('kun Toshkentda 00:00 da boshlanib 23:59:59.999 da tugaydi (UTC+5)', () => {
    expect(tashkentDayRange('2026-09-01', '2026-09-30')).toEqual({
      gte: new Date('2026-08-31T19:00:00.000Z'),
      lte: new Date('2026-09-30T18:59:59.999Z'),
    });
  });

  it('bitta chegara', () => {
    expect(tashkentDayRange(undefined, '2026-01-01')).toEqual({ lte: new Date('2026-01-01T18:59:59.999Z') });
    expect(tashkentDayRange('2026-01-01')).toEqual({ gte: new Date('2025-12-31T19:00:00.000Z') });
  });
});

describe('splitSegmentWindow — invoysli → invoyssiz segmentlar', () => {
  it('butunlay birinchi segmentda', () => {
    expect(splitSegmentWindow(0, 20, 100)).toEqual({ first: { skip: 0, take: 20 }, second: undefined });
  });
  it('chegarada bo\'linadi', () => {
    expect(splitSegmentWindow(90, 20, 100)).toEqual({ first: { skip: 90, take: 10 }, second: { skip: 0, take: 10 } });
  });
  it('butunlay ikkinchi segmentda', () => {
    expect(splitSegmentWindow(120, 20, 100)).toEqual({ first: undefined, second: { skip: 20, take: 20 } });
  });
  it('birinchi segment bo\'sh', () => {
    expect(splitSegmentWindow(0, 20, 0)).toEqual({ first: undefined, second: { skip: 0, take: 20 } });
  });
  it('aniq chegarada tugaydi', () => {
    expect(splitSegmentWindow(80, 20, 100)).toEqual({ first: { skip: 80, take: 20 }, second: undefined });
  });
});

describe('TaskRepository.findManyWithRelations — sort=invoiceDate', () => {
  beforeEach(() => { count.mockReset(); findMany.mockReset(); });

  it('chegaradagi sahifa: invoyslilar oxiri + invoyssizlar boshi, tartib to\'g\'ri', async () => {
    count.mockResolvedValue(95);
    findMany.mockImplementation(async (args: { orderBy: unknown }) =>
      Array.isArray(args.orderBy) ? [{ id: 1 }] : [{ id: 2 }]);
    const repo = new TaskRepository();
    const rows = await repo.findManyWithRelations({ status: 'YAKUNLANDI', sort: 'invoiceDate' }, 80, 20, 'ADMIN');

    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    const [withInv, withoutInv] = findMany.mock.calls.map((c) => c[0]);
    expect(withInv).toMatchObject({
      skip: 80, take: 15,
      orderBy: [{ invoice: { date: 'desc' } }, { createdAt: 'desc' }],
      where: { AND: [{ status: 'YAKUNLANDI' }, { invoice: { isNot: null } }] },
    });
    expect(withoutInv).toMatchObject({
      skip: 0, take: 5,
      orderBy: { createdAt: 'desc' },
      where: { AND: [{ status: 'YAKUNLANDI' }, { invoice: { is: null } }] },
    });
  });

  it('sort berilmasa bitta so\'rov, createdAt desc', async () => {
    findMany.mockResolvedValue([]);
    await new TaskRepository().findManyWithRelations({ status: 'YAKUNLANDI' }, 0, 20, 'ADMIN');
    expect(count).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0]).toMatchObject({ orderBy: { createdAt: 'desc' }, skip: 0, take: 20 });
  });
});
```

- [ ] **Step 2: Fail ekanini ko'ring**

Run: `cd backend && npx vitest run src/__tests__/task-repository.test.ts`
Expected: FAIL — `splitSegmentWindow is not a function` / `sort` tip xatosi.

- [ ] **Step 3: Implementatsiya — repository**

`task.repository.ts` da:

```ts
export interface TaskFilters {
  // ...mavjud maydonlar...
  /** Ro'yxat tartibi: yaratilgan sana (default) yoki invoys sanasi (invoysi yo'qlar oxirida) */
  sort?: 'createdAt' | 'invoiceDate';
}

/**
 * Ikki ketma-ket segment (avval firstCount ta, keyin qolgani) bo'ylab skip/take oynasini bo'ladi.
 * Prisma 5 da talab qilinadigan relation maydoni uchun `nulls: 'last'` yo'q — shuning uchun segmentlar.
 */
export function splitSegmentWindow(skip: number, take: number, firstCount: number) {
  const first = skip < firstCount ? { skip, take: Math.min(take, firstCount - skip) } : undefined;
  const secondTake = take - (first?.take ?? 0);
  const second = secondTake > 0 ? { skip: Math.max(0, skip - firstCount), take: secondTake } : undefined;
  return { first, second };
}

/** Ro'yxat jadvali va Excel eksporti uchun kerakli maydonlar */
const TASK_LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  comments: true,
  hasPsr: true,
  driverPhone: true,
  customsPaymentMultiplier: true,
  createdAt: true,
  client: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  // Arxiv jadvalidagi "Sana" ustuni — invoys sanasi
  invoice: { select: { date: true } },
  // Umumiy vaqt (durationMin yig'indisi) uchun
  stages: { select: { durationMin: true } },
} satisfies Prisma.TaskSelect;
```

`findManyWithRelations` ni almashtiring:

```ts
  async findManyWithRelations(filters: TaskFilters, skip?: number, take?: number, userRole?: string, userBranchId?: number) {
    const where = this.buildWhereClause(filters, userRole, userBranchId);

    if (filters.sort === 'invoiceDate') {
      const withInvoice: Prisma.TaskWhereInput = { AND: [where, { invoice: { isNot: null } }] };
      const withoutInvoice: Prisma.TaskWhereInput = { AND: [where, { invoice: { is: null } }] };
      const firstCount = await prisma.task.count({ where: withInvoice });
      const { first, second } = splitSegmentWindow(skip ?? 0, take ?? 500, firstCount);
      const [a, b] = await Promise.all([
        first
          ? prisma.task.findMany({ where: withInvoice, select: TASK_LIST_SELECT, orderBy: [{ invoice: { date: 'desc' } }, { createdAt: 'desc' }], ...first })
          : Promise.resolve([]),
        second
          ? prisma.task.findMany({ where: withoutInvoice, select: TASK_LIST_SELECT, orderBy: { createdAt: 'desc' }, ...second })
          : Promise.resolve([]),
      ]);
      return [...a, ...b];
    }

    // take doim qo'llanadi — pagination bo'lmaganda ham javob hajmi cheklanadi.
    return prisma.task.findMany({
      where,
      select: TASK_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });
  }
```

Agar `orderBy: { invoice: { date: 'desc' } }` tip xatosi bersa (1-1 relationning FK'siz tomoni), STOP va xabar bering — boshqa yo'l: `prisma.invoice.findMany` orqali `taskId` tartibini olish.

- [ ] **Step 4: Implementatsiya — route**

`routes/tasks.ts` `listTasksQuerySchema` ga `dateBy` qatoridan keyin:

```ts
  sort: optionalQuery(z.enum(['createdAt', 'invoiceDate'])),
```

`/archive-report` dagi bitta `prisma.task.findMany({... orderBy: { createdAt: 'desc' }, take: 500 })` ni almashtiring (select obyektini `reportSelect` konstantasiga chiqaring, tarkibi o'zgarmaydi):

```ts
    // Tartib arxiv ro'yxati bilan bir xil: invoys sanasi desc, invoysi yo'qlar oxirida
    const REPORT_LIMIT = 500; // Cheksiz natijalarni oldini olish
    const withInvoice = await prisma.task.findMany({
      where: { AND: [where, { invoice: { isNot: null } }] },
      select: reportSelect,
      orderBy: [{ invoice: { date: 'desc' } }, { createdAt: 'desc' }],
      take: REPORT_LIMIT,
    });
    const withoutInvoice = withInvoice.length < REPORT_LIMIT
      ? await prisma.task.findMany({
        where: { AND: [where, { invoice: { is: null } }] },
        select: reportSelect,
        orderBy: { createdAt: 'desc' },
        take: REPORT_LIMIT - withInvoice.length,
      })
      : [];
    const tasks = [...withInvoice, ...withoutInvoice];
```

`reportSelect` ni `const reportSelect = { ... } satisfies Prisma.TaskSelect;` qilib e'lon qiling (fayl boshida `Prisma` import qilinmagan bo'lsa: `import { Prisma } from '@prisma/client';`).

- [ ] **Step 5: Testlar va tip tekshiruvi**

Run: `cd backend && npx vitest run src/__tests__/task-repository.test.ts && npx tsc --noEmit -p .`
Expected: PASS, tsc chiqishsiz.

- [ ] **Step 6: Butun backend testlari**

Run: `cd backend && npm test`
Expected: barcha testlar PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/repositories/task.repository.ts backend/src/routes/tasks.ts backend/src/__tests__/task-repository.test.ts
git commit -m "feat(tasks): arxiv invoys sanasi bo'yicha tartiblanadi (invoysi yo'qlar oxirida)"
```

---

### Task 2: Frontend ma'lumot qatlami — abort, fondagi yangilash, oldindan yuklash

**Files:**
- Create: `frontend/src/components/tasks/taskListParams.ts`, `taskListParams.test.ts`
- Create: `frontend/src/components/tasks/archive/pageCache.ts`, `archive/pageCache.test.ts`
- Modify: `frontend/src/components/tasks/useTaskData.ts`
- Modify: `frontend/src/pages/Tasks.tsx` (xodimlar faqat modal ochilganda)

**Interfaces:**
- Consumes: `GET /tasks?sort=invoiceDate` (Task 1).
- Produces: `buildTaskListParams(showArchive, query)` (endi `taskListParams.ts` dan; `useTaskData.ts` qayta eksport qiladi); `useTaskData()` qaytaradi qo'shimcha `refreshing: boolean` va `listError: boolean` (birinchi yuklash xato bo'lsa true); `isAbortError(e: unknown): boolean`; `createPageCache<T>(ttlMs, max)`.

- [ ] **Step 1: Failing testlar**

`taskListParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTaskListParams, isAbortError } from './taskListParams';

const archive = { page: 2, limit: 20, search: ' abc ', branchId: '1', clientId: '', startDate: '2026-09-01', endDate: '', hasPsr: '' };

describe('buildTaskListParams', () => {
  it('arxiv: invoys sanasi bo\'yicha tartib va filtr', () => {
    expect(buildTaskListParams(true, { status: '', clientId: '', branchId: '', archive })).toEqual({
      status: 'YAKUNLANDI', page: '2', limit: '20', search: 'abc', branchId: '1',
      startDate: '2026-09-01', dateBy: 'invoice', sort: 'invoiceDate',
    });
  });
  it('arxiv: sana bo\'lmasa dateBy yuborilmaydi, sort doim', () => {
    const p = buildTaskListParams(true, { status: '', clientId: '', branchId: '', archive: { ...archive, startDate: '' } });
    expect(p.dateBy).toBeUndefined();
    expect(p.sort).toBe('invoiceDate');
  });
  it('faol ro\'yxat: sort yuborilmaydi', () => {
    expect(buildTaskListParams(false, { status: '', clientId: '', branchId: '' }).sort).toBeUndefined();
  });
});

describe('isAbortError', () => {
  it('axios bekor qilish xatosini taniydi', () => {
    expect(isAbortError({ name: 'CanceledError', code: 'ERR_CANCELED' })).toBe(true);
    expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('Network'))).toBe(false);
  });
});
```

`archive/pageCache.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createPageCache, pageKey } from './pageCache';

describe('pageKey', () => {
  it('kalitlar tartibiga bog\'liq emas', () => {
    expect(pageKey({ a: '1', b: '2' })).toBe(pageKey({ b: '2', a: '1' }));
  });
});

describe('createPageCache', () => {
  it('take bir marta qaytaradi (ishlatilgach o\'chadi)', () => {
    const c = createPageCache<number>(30_000, 5);
    c.set('k', 1, 0);
    expect(c.take('k', 10)).toBe(1);
    expect(c.take('k', 10)).toBeUndefined();
  });
  it('TTL o\'tgach eskirgan yozuv qaytmaydi', () => {
    const c = createPageCache<number>(30_000, 5);
    c.set('k', 1, 0);
    expect(c.take('k', 30_001)).toBeUndefined();
  });
  it('has — TTL hisobga olinadi', () => {
    const c = createPageCache<number>(1000, 5);
    c.set('k', 1, 0);
    expect(c.has('k', 500)).toBe(true);
    expect(c.has('k', 1500)).toBe(false);
  });
  it('max oshsa eng eskisi chiqadi; clear hammasini tozalaydi', () => {
    const c = createPageCache<number>(30_000, 2);
    c.set('a', 1, 0); c.set('b', 2, 0); c.set('c', 3, 0);
    expect(c.take('a', 1)).toBeUndefined();
    expect(c.take('c', 1)).toBe(3);
    c.clear();
    expect(c.take('b', 1)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Fail ekanini ko'ring**

Run: `cd frontend && npx vitest run src/components/tasks/taskListParams.test.ts src/components/tasks/archive/pageCache.test.ts`
Expected: FAIL — modullar topilmaydi.

- [ ] **Step 3: `taskListParams.ts` yarating**

`useTaskData.ts` dagi `ArchiveQuery`, `TaskListQuery`, `buildTaskListParams` ni shu faylga ko'chiring (`ACTIVE_FETCH_LIMIT` ham — uni `useTaskData.ts` qayerdan olayotganini tekshiring va ikkalasi ham shu fayldan import qilsin). Arxiv tarmog'ini quyidagicha yangilang va `isAbortError` qo'shing:

```ts
  if (showArchive) {
    const a = query.archive;
    params.status = 'YAKUNLANDI';
    set('page', a?.page ?? 1);
    set('limit', a?.limit ?? 20);
    set('search', a?.search.trim());
    set('branchId', a?.branchId);
    set('clientId', a?.clientId);
    set('startDate', a?.startDate);
    set('endDate', a?.endDate);
    // Arxivda sana oralig'i invoys sanasiga qo'llanadi (vazifa yaratilgan sanaga emas)
    if (a?.startDate || a?.endDate) params.dateBy = 'invoice';
    set('hasPsr', a?.hasPsr);
    // Ro'yxat invoys sanasi bo'yicha (yangisi tepada, invoysi yo'qlar oxirida)
    params.sort = 'invoiceDate';
  }
```

```ts
/** axios/fetch so'rovi AbortController bilan bekor qilinganmi */
export function isAbortError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const { name, code } = e as { name?: string; code?: string };
  return name === 'CanceledError' || name === 'AbortError' || code === 'ERR_CANCELED';
}
```

`useTaskData.ts` da: `export { buildTaskListParams, type ArchiveQuery, type TaskListQuery } from './taskListParams';` (mavjud importchilar buzilmasin).

- [ ] **Step 4: `archive/pageCache.ts` yarating**

```ts
/** So'rov parametrlari → barqaror kalit */
export const pageKey = (params: Record<string, string>): string =>
  JSON.stringify(Object.keys(params).sort().map((k) => [k, params[k]]));

/** Oldindan yuklangan sahifalar keshi: bir martalik (take), TTL va hajm chegarasi bilan */
export function createPageCache<T>(ttlMs: number, max: number) {
  const map = new Map<string, { value: T; at: number }>();
  const fresh = (key: string, now: number) => {
    const e = map.get(key);
    if (!e) return undefined;
    if (now - e.at > ttlMs) { map.delete(key); return undefined; }
    return e;
  };
  return {
    has: (key: string, now = Date.now()) => fresh(key, now) !== undefined,
    take(key: string, now = Date.now()): T | undefined {
      const e = fresh(key, now);
      map.delete(key);
      return e?.value;
    },
    set(key: string, value: T, now = Date.now()) {
      map.delete(key);
      map.set(key, { value, at: now });
      if (map.size > max) map.delete(map.keys().next().value as string);
    },
    clear: () => map.clear(),
  };
}
```

- [ ] **Step 5: Testlar PASS**

Run: `cd frontend && npx vitest run src/components/tasks/taskListParams.test.ts src/components/tasks/archive/pageCache.test.ts`
Expected: PASS.

- [ ] **Step 6: `useTaskData.loadTasks` — abort, refreshing, prefetch**

`useTaskData.ts` da importlar: `import { createPageCache, pageKey } from './archive/pageCache';` va `import { isAbortError } from './taskListParams';`. Hook ichida:

```ts
  const [refreshing, setRefreshing] = useState(false);
  // Rejim almashgandagi (birinchi) yuklash xato bo'ldi — "Qayta urinish" ko'rsatiladi
  const [listError, setListError] = useState(false);
  const listAbortRef = useRef<AbortController | null>(null);
  const lastListKeyRef = useRef<string | null>(null);
  // Oldindan yuklangan keyingi arxiv sahifasi (30 s yashaydi, bir marta ishlatiladi)
  const pageCacheRef = useRef(createPageCache<{ tasks: Task[]; total: number; totalPages: number }>(30_000, 4));
```

`loadTasks` ni almashtiring:

```ts
  const loadTasks = useCallback(async (
    showArchive: boolean,
    query: TaskListQuery
  ) => {
    const seq = ++tasksRequestSeqRef.current;
    // Skeleton faqat rejim almashganda; fondagi yangilashda jadval joyida qoladi (xiralashadi)
    const isModeChange = loadedArchiveModeRef.current !== showArchive;
    const params = buildTaskListParams(showArchive, query);
    const key = pageKey(params);
    const apply = (tasksData: Task[], total: number, pages: number) => {
      setListError(false);
      setTasks(tasksData);
      setTotalPages(Math.max(1, pages));
      setTotalTasks(total);
      loadedArchiveModeRef.current = showArchive;
      lastListKeyRef.current = key;
    };

    // Bir xil so'rovni qayta yuklash (socket, saqlash, o'chirish) — oldindan yuklangan sahifalar eskirgan bo'lishi mumkin
    if (key === lastListKeyRef.current) pageCacheRef.current.clear();

    listAbortRef.current?.abort();
    const cached = showArchive ? pageCacheRef.current.take(key) : undefined;
    if (cached) {
      listAbortRef.current = null;
      apply(cached.tasks, cached.total, cached.totalPages);
      setLoading(false);
      setRefreshing(false);
      prefetchNext(showArchive, query, cached.totalPages);
      return;
    }

    const controller = new AbortController();
    listAbortRef.current = controller;
    try {
      if (isModeChange) setLoading(true);
      else setRefreshing(true);
      const response = await apiClient.get('/tasks', { params, signal: controller.signal });
      if (seq !== tasksRequestSeqRef.current) return;

      const tasksData: Task[] = Array.isArray(response.data?.tasks) ? response.data.tasks : [];
      const pagination = response.data?.pagination as { total: number; totalPages: number } | undefined;
      if (!showArchive && pagination && pagination.total > tasksData.length) {
        console.warn(`[Tasks] ${pagination.total} ta faol vazifadan ${tasksData.length} tasi ko'rsatilmoqda`);
      }
      apply(tasksData, pagination?.total ?? tasksData.length, pagination?.totalPages ?? 1);
      prefetchNext(showArchive, query, pagination?.totalPages ?? 1);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error loading tasks:', error);
      if (seq !== tasksRequestSeqRef.current) return;
      if (isModeChange) {
        setTasks([]);
        setTotalPages(1);
        setTotalTasks(0);
        setListError(true);
      } else if (showArchive) {
        // Fondagi yangilash xatosida ko'rinib turgan ro'yxat o'chirilmaydi
        toast.error('Arxivni yuklashda xatolik');
      }
    } finally {
      if (seq === tasksRequestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [prefetchNext]);
```

`loadTasks` dan OLDIN `prefetchNext` ni e'lon qiling:

```ts
  /** Arxivda keyingi sahifani fonda yuklab qo'yadi — "›" bosilganda darhol ochiladi */
  const prefetchNext = useCallback((showArchive: boolean, query: TaskListQuery, pages: number) => {
    const a = query.archive;
    if (!showArchive || !a || a.page >= pages) return;
    const nextParams = buildTaskListParams(true, { ...query, archive: { ...a, page: a.page + 1 } });
    const nextKey = pageKey(nextParams);
    if (pageCacheRef.current.has(nextKey)) return;
    apiClient.get('/tasks', { params: nextParams })
      .then((res) => {
        const tasksData: Task[] = Array.isArray(res.data?.tasks) ? res.data.tasks : [];
        const p = res.data?.pagination as { total: number; totalPages: number } | undefined;
        pageCacheRef.current.set(nextKey, { tasks: tasksData, total: p?.total ?? tasksData.length, totalPages: p?.totalPages ?? 1 });
      })
      .catch(() => { /* oldindan yuklash ixtiyoriy — xato e'tiborsiz */ });
  }, []);
```

`toast` import qilinmagan bo'lsa: `import toast from 'react-hot-toast';`. Hook return obyektiga `refreshing` va `listError` ni qo'shing.

- [ ] **Step 7: Xodimlar faqat modal ochilganda (`pages/Tasks.tsx`)**

```ts
  // Ma'lumotnomalar: mijozlar va filiallar darhol; xodimlar faqat vazifa kartochkasi ochilganda kerak
  useEffect(() => {
    loadClients(); loadBranches();
  }, [loadClients, loadBranches]);

  const workersRequestedRef = useRef(false);
  useEffect(() => {
    if (workersRequestedRef.current) return;
    if (modals.showTaskModal || modals.showErrorModal || modals.showEditModal || editTaskId) {
      workersRequestedRef.current = true;
      loadWorkers();
    }
  }, [modals.showTaskModal, modals.showErrorModal, modals.showEditModal, editTaskId, loadWorkers]);
```

(oldingi `loadClients(); loadBranches(); loadWorkers();` effektini olib tashlang). `useTaskData` destrukturizatsiyasiga `refreshing`, `listError` qo'shing.

- [ ] **Step 8: Tip tekshiruvi va testlar**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json && npm test`
Expected: tsc chiqishsiz, barcha testlar PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/tasks/taskListParams.ts frontend/src/components/tasks/taskListParams.test.ts frontend/src/components/tasks/archive/pageCache.ts frontend/src/components/tasks/archive/pageCache.test.ts frontend/src/components/tasks/useTaskData.ts frontend/src/pages/Tasks.tsx
git commit -m "perf(tasks): arxiv so'rovlari bekor qilinadi, keyingi sahifa oldindan yuklanadi"
```

---

### Task 3: Arxiv tiplari va filtr chiplari

**Files:**
- Create: `frontend/src/components/tasks/archive/types.ts`
- Create: `frontend/src/components/tasks/archive/filterChips.ts`, `archive/filterChips.test.ts`

**Interfaces:**
- Produces:
  - `interface ArchiveFiltersState { branchId: string; clientId: string; startDate: string; endDate: string; hasPsr: string }`
  - `const EMPTY_ARCHIVE_FILTERS: ArchiveFiltersState`
  - `const REPORT_COLUMNS` (mavjud ro'yxat, `invoiceDate: 'Sana'`), `type ReportColumnKey`
  - `type ChipKey = 'date' | 'branchId' | 'clientId' | 'hasPsr'`; `interface FilterChip { key: ChipKey; label: string }`
  - `buildFilterChips(f: ArchiveFiltersState, branches: { id: number; name: string }[], clients: { id: number; name: string }[]): FilterChip[]`
  - `removeFilterChip(f: ArchiveFiltersState, key: ChipKey): ArchiveFiltersState`
  - `countActiveFilters(f: ArchiveFiltersState): number`

- [ ] **Step 1: Failing test** — `archive/filterChips.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildFilterChips, removeFilterChip, countActiveFilters } from './filterChips';
import { EMPTY_ARCHIVE_FILTERS } from './types';

const branches = [{ id: 1, name: 'Oltiariq' }];
const clients = [{ id: 7, name: 'Agro LLC' }];

describe('buildFilterChips', () => {
  it('bo\'sh filtr — chip yo\'q', () => {
    expect(buildFilterChips(EMPTY_ARCHIVE_FILTERS, branches, clients)).toEqual([]);
  });
  it('to\'liq oraliq va boshqa filtrlar', () => {
    const f = { branchId: '1', clientId: '7', startDate: '2026-09-01', endDate: '2026-09-30', hasPsr: 'false' };
    expect(buildFilterChips(f, branches, clients)).toEqual([
      { key: 'date', label: '01.09.2026 – 30.09.2026' },
      { key: 'branchId', label: 'Oltiariq' },
      { key: 'clientId', label: 'Agro LLC' },
      { key: 'hasPsr', label: 'PSR yo\'q' },
    ]);
  });
  it('faqat bitta sana chegarasi', () => {
    expect(buildFilterChips({ ...EMPTY_ARCHIVE_FILTERS, startDate: '2026-09-01' }, [], [])[0].label).toBe('01.09.2026 dan');
    expect(buildFilterChips({ ...EMPTY_ARCHIVE_FILTERS, endDate: '2026-09-30' }, [], [])[0].label).toBe('30.09.2026 gacha');
  });
  it('ro\'yxatda yo\'q filial/mijoz — id bilan', () => {
    const chips = buildFilterChips({ ...EMPTY_ARCHIVE_FILTERS, branchId: '9', clientId: '8' }, [], []);
    expect(chips.map((c) => c.label)).toEqual(['Filial #9', 'Mijoz #8']);
  });
});

describe('removeFilterChip / countActiveFilters', () => {
  const f = { branchId: '1', clientId: '', startDate: '2026-09-01', endDate: '2026-09-30', hasPsr: 'true' };
  it('sana chipi ikkala chegarani tozalaydi', () => {
    expect(removeFilterChip(f, 'date')).toEqual({ ...f, startDate: '', endDate: '' });
  });
  it('sana oralig\'i bitta filtr sanaladi', () => {
    expect(countActiveFilters(f)).toBe(3);
    expect(countActiveFilters(EMPTY_ARCHIVE_FILTERS)).toBe(0);
  });
});
```

- [ ] **Step 2: Fail**

Run: `cd frontend && npx vitest run src/components/tasks/archive/filterChips.test.ts`
Expected: FAIL — modul topilmaydi.

- [ ] **Step 3: `archive/types.ts`**

```ts
export interface ArchiveFiltersState {
  branchId: string;
  clientId: string;
  /** "YYYY-MM-DD" — invoys sanasi oralig'i */
  startDate: string;
  endDate: string;
  hasPsr: string;
}

export const EMPTY_ARCHIVE_FILTERS: ArchiveFiltersState = {
  branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '',
};

// Hisobot ustunlari ro'yxati
export const REPORT_COLUMNS = {
  taskName: 'Task nomi',
  clientName: 'Mijoz',
  sellerName: 'Sotuvchi nomi',
  buyerName: 'Sotib oluvchi nomi',
  contractNumber: 'Shartnoma raqami',
  invoiceNumber: 'Invoys raqami',
  invoiceDate: 'Sana',
  deliveryTerms: 'Условия поставки',
  vehicleNumber: 'Номер автотранспорта',
  customsAddress: 'Место там. очистки',
  productNames: 'Наименование товара',
  totalAmount: 'Общая сумма',
} as const;

export type ReportColumnKey = keyof typeof REPORT_COLUMNS;
```

- [ ] **Step 4: `archive/filterChips.ts`**

```ts
import type { ArchiveFiltersState } from './types';

export type ChipKey = 'date' | 'branchId' | 'clientId' | 'hasPsr';
export interface FilterChip { key: ChipKey; label: string }
type Named = { id: number; name: string };

const isoToDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export function buildFilterChips(f: ArchiveFiltersState, branches: Named[], clients: Named[]): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.startDate && f.endDate) chips.push({ key: 'date', label: `${isoToDisplay(f.startDate)} – ${isoToDisplay(f.endDate)}` });
  else if (f.startDate) chips.push({ key: 'date', label: `${isoToDisplay(f.startDate)} dan` });
  else if (f.endDate) chips.push({ key: 'date', label: `${isoToDisplay(f.endDate)} gacha` });
  if (f.branchId) {
    const name = branches.find((b) => String(b.id) === f.branchId)?.name;
    chips.push({ key: 'branchId', label: name ?? `Filial #${f.branchId}` });
  }
  if (f.clientId) {
    const name = clients.find((c) => String(c.id) === f.clientId)?.name;
    chips.push({ key: 'clientId', label: name ?? `Mijoz #${f.clientId}` });
  }
  if (f.hasPsr) chips.push({ key: 'hasPsr', label: f.hasPsr === 'true' ? 'PSR bor' : 'PSR yo\'q' });
  return chips;
}

export function removeFilterChip(f: ArchiveFiltersState, key: ChipKey): ArchiveFiltersState {
  if (key === 'date') return { ...f, startDate: '', endDate: '' };
  return { ...f, [key]: '' };
}

export function countActiveFilters(f: ArchiveFiltersState): number {
  return [f.startDate || f.endDate, f.branchId, f.clientId, f.hasPsr].filter(Boolean).length;
}
```

- [ ] **Step 5: PASS**

Run: `cd frontend && npx vitest run src/components/tasks/archive/filterChips.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/tasks/archive/types.ts frontend/src/components/tasks/archive/filterChips.ts frontend/src/components/tasks/archive/filterChips.test.ts
git commit -m "feat(tasks): arxiv filtr tiplari va chiplar"
```

---

### Task 4: Arxiv UI komponentlari (toolbar, jadval, kartochka, sahifalash, mobil oyna, eksport)

**Files:**
- Modify: `frontend/src/features/serviceAgreement/ClientPicker.tsx` (`placeholder?: string` prop)
- Create: `archive/ArchiveFilterFields.tsx`, `archive/ArchiveToolbar.tsx`, `archive/ArchiveFiltersSheet.tsx`, `archive/ArchiveTable.tsx`, `archive/ArchiveCard.tsx`, `archive/ArchivePagination.tsx`, `archive/ArchiveView.tsx`, `archive/ArchiveReportModal.tsx`, `archive/ExportMenu.tsx`

**Interfaces:**
- Consumes: Task 3 tiplari va funksiyalari; `calculateTotalDuration`, `getBXMColor` (`../TaskTable`); `getAvatarColor`, `getInitials` (`../taskHelpers`); `formatDateOnly` (`../../../utils/dateFormatting`); `DateInput` (`../../DateInput`); `TaskTableSkeleton` (`../Skeletons`); `Task`, `Branch`, `Client` (`../types`).
- Produces:
  - `ArchiveView` props: `{ tasks: Task[]; loading: boolean; refreshing: boolean; error: boolean; onRetry: () => void; total: number; page: number; totalPages: number; pageSize: number; setPage: (p: number) => void; isMobile: boolean; onTaskClick: (id: number) => void; search: string; setSearch: (s: string) => void; filters: ArchiveFiltersState; setFilters: (f: ArchiveFiltersState) => void; branches: Branch[]; clients: Client[]; isFiltersRoute: boolean; openFilters: () => void; closeFilters: () => void }`
  - `ExportMenu` props: `{ onExcel: () => void; onReport: () => void }`
  - `ArchiveReportModal` props: `{ open: boolean; onClose: () => void; onGenerate: (cols: Record<ReportColumnKey, boolean>) => void; loading: boolean }`

Bu task UI — avtomatik test o'rniga `tsc` va Task 5 dagi brauzer tekshiruvi.

- [ ] **Step 1: ClientPicker'ga `placeholder`**

`ClientPickerProps` ga `placeholder?: string;` qo'shing, destrukturizatsiyaga `placeholder = 'Mijozni tanlang'` va tugma matnida `'Mijozni tanlang'` o'rniga `placeholder`.

- [ ] **Step 2: `ArchiveFilterFields.tsx`** (desktop inline + mobil ustma-ust)

```tsx
import { Icon } from '@iconify/react';
import DateInput from '../../DateInput';
import ClientPicker from '../../../features/serviceAgreement/ClientPicker';
import type { Branch, Client } from '../types';
import type { ArchiveFiltersState } from './types';

interface Props {
  layout: 'inline' | 'stacked';
  filters: ArchiveFiltersState;
  setFilters: (f: ArchiveFiltersState) => void;
  branches: Branch[];
  clients: Client[];
}

const control = 'h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

function Field({ label, stacked, children }: { label: string; stacked: boolean; children: React.ReactNode }) {
  if (!stacked) return <>{children}</>;
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-gray-600 dark:text-slate-300">{label}</div>
      {children}
    </div>
  );
}

export default function ArchiveFilterFields({ layout, filters, setFilters, branches, clients }: Props) {
  const stacked = layout === 'stacked';
  const set = (patch: Partial<ArchiveFiltersState>) => setFilters({ ...filters, ...patch });
  return (
    <div className={stacked ? 'space-y-4' : 'flex flex-wrap items-center gap-2'}>
      <Field label="Invoys sanasi" stacked={stacked}>
        <div className={`flex items-center gap-1.5 ${stacked ? '' : 'rounded-lg'}`} title="Invoys sanasi oralig'i">
          {!stacked && <Icon icon="solar:calendar-bold-duotone" className="w-4 h-4 text-gray-400 shrink-0" />}
          <DateInput value={filters.startDate} onChange={(v) => set({ startDate: v })} placeholder="Dan" className={`${control} ${stacked ? 'flex-1 min-w-0' : 'w-[118px]'}`} />
          <span className="text-gray-400">–</span>
          <DateInput value={filters.endDate} onChange={(v) => set({ endDate: v })} placeholder="Gacha" className={`${control} ${stacked ? 'flex-1 min-w-0' : 'w-[118px]'}`} />
        </div>
      </Field>
      <Field label="Filial" stacked={stacked}>
        <select value={filters.branchId} onChange={(e) => set({ branchId: e.target.value })} className={`${control} ${stacked ? 'w-full' : 'w-36'}`}>
          <option value="">Barcha filiallar</option>
          {branches.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
      </Field>
      <Field label="Mijoz" stacked={stacked}>
        <div className={stacked ? 'w-full' : 'w-56'}>
          <ClientPicker
            clients={clients}
            value={filters.clientId ? Number(filters.clientId) : 0}
            placeholder="Barcha mijozlar"
            onChange={(id) => set({ clientId: id ? String(id) : '' })}
          />
        </div>
      </Field>
      <Field label="PSR" stacked={stacked}>
        <select value={filters.hasPsr} onChange={(e) => set({ hasPsr: e.target.value })} className={`${control} ${stacked ? 'w-full' : 'w-32'}`}>
          <option value="">PSR: barchasi</option>
          <option value="true">PSR bor</option>
          <option value="false">PSR yo'q</option>
        </select>
      </Field>
    </div>
  );
}
```

`Client` tipida `id`/`name` borligini `../types` dan tekshiring; `ClientPicker` `ClientOption[]` kutadi — mos kelmasa `clients.map(({ id, name }) => ({ id, name }))` bering.

- [ ] **Step 3: `ArchiveToolbar.tsx`**

```tsx
import { Icon } from '@iconify/react';
import type { Branch, Client } from '../types';
import type { ArchiveFiltersState } from './types';
import { EMPTY_ARCHIVE_FILTERS } from './types';
import { buildFilterChips, removeFilterChip, countActiveFilters } from './filterChips';
import ArchiveFilterFields from './ArchiveFilterFields';

interface Props {
  isMobile: boolean;
  search: string;
  setSearch: (s: string) => void;
  filters: ArchiveFiltersState;
  setFilters: (f: ArchiveFiltersState) => void;
  branches: Branch[];
  clients: Client[];
  total: number;
  openFilters: () => void;
}

export default function ArchiveToolbar({ isMobile, search, setSearch, filters, setFilters, branches, clients, total, openFilters }: Props) {
  const chips = buildFilterChips(filters, branches, clients);
  const activeCount = countActiveFilters(filters);
  const hasAny = activeCount > 0 || search.trim() !== '';

  const searchBox = (
    <div className="relative flex-1 min-w-[200px] md:max-w-xs">
      <Icon icon="solar:magnifer-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Task yoki mijoz…"
        className="w-full h-10 pl-9 pr-8 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400"
      />
      {search && (
        <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Qidiruvni tozalash">
          <Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {searchBox}
        {isMobile ? (
          <button type="button" onClick={openFilters} className="h-10 px-3.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <Icon icon="solar:filter-bold-duotone" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Filtrlar{activeCount > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-blue-600 text-white text-[11px]">{activeCount}</span>}
          </button>
        ) : (
          <ArchiveFilterFields layout="inline" filters={filters} setFilters={setFilters} branches={branches} clients={clients} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
        {chips.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium">
            {c.label}
            <button type="button" onClick={() => setFilters(removeFilterChip(filters, c.key))} className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/50" aria-label={`${c.label} filtrini olib tashlash`}>
              <Icon icon="solar:close-circle-bold-duotone" className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        {hasAny && (
          <button type="button" onClick={() => { setSearch(''); setFilters(EMPTY_ARCHIVE_FILTERS); }} className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 px-1.5">
            Tozalash
          </button>
        )}
        <span className="ml-auto text-xs text-gray-500 dark:text-slate-400">
          <span className="font-bold text-gray-800 dark:text-gray-100">{total}</span> ta natija
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `ArchiveFiltersSheet.tsx`** (mobil, pastdan)

```tsx
import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { Branch, Client } from '../types';
import type { ArchiveFiltersState } from './types';
import { EMPTY_ARCHIVE_FILTERS } from './types';
import ArchiveFilterFields from './ArchiveFilterFields';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: ArchiveFiltersState;
  setFilters: (f: ArchiveFiltersState) => void;
  branches: Branch[];
  clients: Client[];
  total: number;
}

export default function ArchiveFiltersSheet({ open, onClose, filters, setFilters, branches, clients, total }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-900 p-4 pb-6 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-slate-700" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Filtrlar</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Yopish">
            <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5" />
          </button>
        </div>
        <ArchiveFilterFields layout="stacked" filters={filters} setFilters={setFilters} branches={branches} clients={clients} />
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setFilters(EMPTY_ARCHIVE_FILTERS)} className="flex-1 h-11 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Tozalash
          </button>
          <button type="button" onClick={onClose} className="flex-[2] h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
            {total} ta natijani ko'rsatish
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `ArchiveTable.tsx`** (desktop)

```tsx
import { Icon } from '@iconify/react';
import type { Task } from '../types';
import { calculateTotalDuration, getBXMColor } from '../TaskTable';
import { getAvatarColor, getInitials } from '../taskHelpers';
import { formatDateOnly } from '../../../utils/dateFormatting';

const th = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-[1]';
const td = 'px-3 py-2 border-b border-gray-100 dark:border-slate-800 whitespace-nowrap';

export default function ArchiveTable({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (id: number) => void }) {
  return (
    <div className="overflow-auto max-h-[calc(100vh-260px)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Sana</th>
            <th className={th}>Task</th>
            <th className={th}>Mijoz</th>
            <th className={th}>Filial</th>
            <th className={`${th} text-center`}>PSR</th>
            <th className={`${th} text-center`}>BXM</th>
            <th className={th}>Vaqt</th>
            <th className={th}>Izoh</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const duration = calculateTotalDuration(task);
            return (
              <tr key={task.id} onClick={() => onTaskClick(task.id)} className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className={`${td} text-xs font-semibold tabular-nums text-gray-800 dark:text-gray-200`}>{formatDateOnly(task.invoice?.date)}</td>
                <td className={`${td} font-medium text-gray-900 dark:text-white`}>{task.title}</td>
                <td className={td}>
                  <div className="flex items-center gap-2 max-w-[260px]">
                    <div className={`w-7 h-7 rounded-full ${getAvatarColor(task.client.name)} flex items-center justify-center text-[10px] font-semibold shrink-0`}>
                      {getInitials(task.client.name)}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{task.client.name}</span>
                  </div>
                </td>
                <td className={`${td} text-xs text-gray-600 dark:text-slate-300`}>{task.branch.name}</td>
                <td className={`${td} text-center`}>
                  {task.hasPsr
                    ? <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400">Bor</span>
                    : <span className="text-xs text-gray-400 dark:text-slate-500">—</span>}
                </td>
                <td className={`${td} text-center`}>
                  {task.customsPaymentMultiplier
                    ? <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${getBXMColor(task.customsPaymentMultiplier)}`}>{task.customsPaymentMultiplier} BXM</span>
                    : <span className="text-xs text-gray-400 dark:text-slate-500">—</span>}
                </td>
                <td className={td}>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${duration.color}`}>
                    <Icon icon="solar:clock-circle-bold-duotone" className="w-3.5 h-3.5" />
                    {duration.text}
                  </span>
                </td>
                <td className={`${td} text-xs text-gray-500 dark:text-slate-400 max-w-[220px]`}>
                  <div className="truncate" title={task.comments || undefined}>{task.comments || '—'}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: `ArchiveCard.tsx`** (mobil)

```tsx
import { Icon } from '@iconify/react';
import type { Task } from '../types';
import { calculateTotalDuration, getBXMColor } from '../TaskTable';
import { getAvatarColor, getInitials } from '../taskHelpers';
import { formatDateOnly } from '../../../utils/dateFormatting';

export default function ArchiveCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const duration = calculateTotalDuration(task);
  return (
    <button type="button" onClick={onClick} className="w-full text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 active:scale-[0.99] transition-transform">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</h3>
        <span className="text-xs font-semibold tabular-nums text-gray-600 dark:text-slate-300 shrink-0">{formatDateOnly(task.invoice?.date)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 min-w-0">
        <div className={`w-6 h-6 rounded-full ${getAvatarColor(task.client.name)} flex items-center justify-center text-[10px] font-bold shrink-0`}>{getInitials(task.client.name)}</div>
        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.client.name}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{task.branch.name}</span>
        {task.hasPsr && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400">PSR</span>}
        {task.customsPaymentMultiplier && <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getBXMColor(task.customsPaymentMultiplier)}`}>{task.customsPaymentMultiplier} BXM</span>}
        <span className={`ml-auto inline-flex items-center gap-1 text-[10px] font-medium ${duration.color}`}>
          <Icon icon="solar:clock-circle-bold-duotone" className="w-3 h-3" />{duration.text}
        </span>
      </div>
    </button>
  );
}
```

- [ ] **Step 7: `ArchivePagination.tsx`**

`useTaskFilters.getPageNumbers` mantiqini shu faylga ko'chiring (`export function getPageNumbers(current: number, total: number): (number | '...')[]`), keyin `useTaskFilters` dan olib tashlang va undagi `getPageNumbers` qaytarilishini o'chiring.

```tsx
import { Icon } from '@iconify/react';

export function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

interface Props { page: number; totalPages: number; total: number; pageSize: number; setPage: (p: number) => void }

export default function ArchivePagination({ page, totalPages, total, pageSize, setPage }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'h-8 min-w-8 px-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-t border-gray-200 dark:border-slate-800">
      <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">{from}–{to} / {total}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={`${btn} text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800`} disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Oldingi sahifa">
            <Icon icon="solar:alt-arrow-left-linear" className="w-4 h-4" />
          </button>
          {getPageNumbers(page, totalPages).map((p, i) => p === '...'
            ? <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
            : (
              <button key={p} type="button" onClick={() => setPage(p)} className={`${btn} ${p === page ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                {p}
              </button>
            ))}
          <button type="button" className={`${btn} text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800`} disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label="Keyingi sahifa">
            <Icon icon="solar:alt-arrow-right-linear" className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: `ArchiveView.tsx`**

```tsx
import { Icon } from '@iconify/react';
import type { Branch, Client, Task } from '../types';
import type { ArchiveFiltersState } from './types';
import { EMPTY_ARCHIVE_FILTERS } from './types';
import { countActiveFilters } from './filterChips';
import { TaskTableSkeleton } from '../Skeletons';
import ArchiveToolbar from './ArchiveToolbar';
import ArchiveFiltersSheet from './ArchiveFiltersSheet';
import ArchiveTable from './ArchiveTable';
import ArchiveCard from './ArchiveCard';
import ArchivePagination from './ArchivePagination';

export interface ArchiveViewProps {
  tasks: Task[];
  loading: boolean;
  refreshing: boolean;
  /** Birinchi yuklash xato bo'ldi */
  error: boolean;
  onRetry: () => void;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  setPage: (p: number) => void;
  isMobile: boolean;
  onTaskClick: (id: number) => void;
  search: string;
  setSearch: (s: string) => void;
  filters: ArchiveFiltersState;
  setFilters: (f: ArchiveFiltersState) => void;
  branches: Branch[];
  clients: Client[];
  isFiltersRoute: boolean;
  openFilters: () => void;
  closeFilters: () => void;
}

export default function ArchiveView(p: ArchiveViewProps) {
  const hasFilters = countActiveFilters(p.filters) > 0 || p.search.trim() !== '';
  return (
    <div className="space-y-3">
      <ArchiveToolbar
        isMobile={p.isMobile} search={p.search} setSearch={p.setSearch}
        filters={p.filters} setFilters={p.setFilters} branches={p.branches} clients={p.clients}
        total={p.total} openFilters={p.openFilters}
      />
      {p.isMobile && (
        <ArchiveFiltersSheet
          open={p.isFiltersRoute} onClose={p.closeFilters} filters={p.filters} setFilters={p.setFilters}
          branches={p.branches} clients={p.clients} total={p.total}
        />
      )}

      {p.loading ? (
        <TaskTableSkeleton rows={8} />
      ) : p.error ? (
        <div className="flex flex-col items-center gap-3 py-16 px-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
          <Icon icon="solar:danger-triangle-bold-duotone" className="w-10 h-10 text-red-400" />
          <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Arxivni yuklab bo'lmadi</p>
          <button type="button" onClick={p.onRetry} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2">
            <Icon icon="solar:refresh-bold-duotone" className="w-4 h-4" />Qayta urinish
          </button>
        </div>
      ) : (
        <div className="relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {p.refreshing && (
            <div className="absolute inset-x-0 top-0 h-0.5 z-10 overflow-hidden bg-indigo-100 dark:bg-slate-800">
              <div className="h-full w-1/3 bg-indigo-500 animate-[archive-progress_1s_ease-in-out_infinite]" />
            </div>
          )}
          <div className={`transition-opacity ${p.refreshing ? 'opacity-60' : ''}`}>
            {p.tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
                <div className="p-5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl">
                  <Icon icon="solar:archive-minimalistic-bold-duotone" className="w-10 h-10 text-gray-300 dark:text-slate-600" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm">Arxivda vazifalar topilmadi</p>
                {hasFilters && (
                  <button type="button" onClick={() => { p.setSearch(''); p.setFilters(EMPTY_ARCHIVE_FILTERS); }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                    Filtrlarni tozalash
                  </button>
                )}
              </div>
            ) : p.isMobile ? (
              <div className="p-2 space-y-2">
                {p.tasks.map((t) => <ArchiveCard key={t.id} task={t} onClick={() => p.onTaskClick(t.id)} />)}
              </div>
            ) : (
              <ArchiveTable tasks={p.tasks} onTaskClick={p.onTaskClick} />
            )}
          </div>
          <ArchivePagination page={p.page} totalPages={p.totalPages} total={p.total} pageSize={p.pageSize} setPage={p.setPage} />
        </div>
      )}
    </div>
  );
}
```

`frontend/src/index.css` oxiriga progress animatsiyasini qo'shing:

```css
@keyframes archive-progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
```

- [ ] **Step 9: `ArchiveReportModal.tsx`**

`ArchiveFiltersPanel.tsx` dagi ustun tanlash mantiqini (state, `toggleColumn`, `toggleAll`, `selectedCount`, ro'yxat va "Hisobot olish (N ustun)" tugmasi) shu modalga ko'chiring:

```tsx
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { REPORT_COLUMNS, type ReportColumnKey } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (cols: Record<ReportColumnKey, boolean>) => void;
  loading: boolean;
}

const allColumns = (value: boolean) =>
  Object.fromEntries(Object.keys(REPORT_COLUMNS).map((k) => [k, value])) as Record<ReportColumnKey, boolean>;

export default function ArchiveReportModal({ open, onClose, onGenerate, loading }: Props) {
  const [cols, setCols] = useState<Record<ReportColumnKey, boolean>>(() => allColumns(true));
  const selectedCount = Object.values(cols).filter(Boolean).length;
  const total = Object.keys(REPORT_COLUMNS).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="solar:file-text-bold-duotone" className="w-5 h-5 text-emerald-600" />
            Hisobot ustunlari
          </h2>
          <button type="button" onClick={() => setCols(allColumns(selectedCount !== total))} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {selectedCount === total ? 'Barchasini yechish' : 'Barchasini tanlash'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Joriy qidiruv va filtrlar bo'yicha invoys ma'lumotlari Excel'ga chiqariladi.</p>
        <div className="grid grid-cols-2 gap-1 max-h-[50vh] overflow-y-auto">
          {(Object.entries(REPORT_COLUMNS) as [ReportColumnKey, string][]).map(([key, label]) => (
            <label key={key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[13px] select-none ${cols[key] ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              <input type="checkbox" checked={cols[key]} onChange={() => setCols((c) => ({ ...c, [key]: !c[key] }))} className="w-3.5 h-3.5 rounded text-emerald-600" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-gray-200">Bekor qilish</button>
          <button
            type="button"
            disabled={selectedCount === 0 || loading}
            onClick={() => onGenerate(cols)}
            className="flex-[2] h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {loading
              ? <><Icon icon="solar:refresh-bold-duotone" className="w-4 h-4 animate-spin" />Tayyorlanmoqda…</>
              : <><Icon icon="solar:download-bold-duotone" className="w-4 h-4" />Hisobot olish ({selectedCount} ustun)</>}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: `ExportMenu.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export default function ExportMenu({ onExcel, onReport }: { onExcel: () => void; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm">
        <Icon icon="solar:download-bold-duotone" className="w-4.5 h-4.5" />
        Eksport
        <Icon icon="solar:alt-arrow-down-linear" className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-56 z-30 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1">
          <button type="button" className={item} onClick={() => { setOpen(false); onExcel(); }}>
            <Icon icon="solar:document-bold-duotone" className="w-4 h-4 text-emerald-600" />Excel (jadval)
          </button>
          <button type="button" className={item} onClick={() => { setOpen(false); onReport(); }}>
            <Icon icon="solar:file-text-bold-duotone" className="w-4 h-4 text-indigo-600" />Hisobot (invoys)…
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Tip tekshiruvi**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: chiqishsiz (komponentlar hali ulanmagan bo'lsa ham kompilyatsiya bo'ladi; `getPageNumbers` ko'chirilgani uchun `useTaskFilters`/`TasksView` xatolari Task 5 da tuzatiladi — agar bu xato bersa, Step 7 dagi `useTaskFilters` o'zgarishini Task 5 ga qoldiring).

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/tasks/archive frontend/src/features/serviceAgreement/ClientPicker.tsx frontend/src/index.css frontend/src/hooks/useTaskFilters.ts
git commit -m "feat(tasks): arxiv UI komponentlari (toolbar, jadval, kartochka, mobil filtr, eksport)"
```

---

### Task 5: Ulash, eskisini olib tashlash, brauzerda tekshirish

**Files:**
- Modify: `frontend/src/components/tasks/TasksView.tsx`, `TasksHeader.tsx`, `TaskTable.tsx`, `frontend/src/pages/Tasks.tsx`, `frontend/src/hooks/useTaskExport.ts`, `frontend/src/hooks/useTaskFilters.ts`
- Delete: `frontend/src/components/tasks/ArchiveFiltersPanel.tsx`

**Interfaces:**
- Consumes: `ArchiveView` / `ArchiveViewProps`, `ExportMenu`, `ArchiveReportModal` (Task 4); `refreshing` (Task 2); `ArchiveFiltersState`, `EMPTY_ARCHIVE_FILTERS`, `ReportColumnKey`, `REPORT_COLUMNS` (Task 3).

- [ ] **Step 1: Importlarni yangi tiplarga o'tkazing**

`ArchiveFiltersPanel` dan import qilayotgan barcha joylar (`pages/Tasks.tsx`, `hooks/useTaskExport.ts`, `TasksHeader.tsx`) — `../components/tasks/archive/types` (yoki `./archive/types`) ga. Tekshirish: `grep -rn "ArchiveFiltersPanel" frontend/src` faqat o'chiriladigan faylning o'zini ko'rsatsin.

`pages/Tasks.tsx` da `{ branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '' }` literallarini `EMPTY_ARCHIVE_FILTERS` bilan almashtiring.

- [ ] **Step 2: `TasksView` — arxiv tarmog'i `ArchiveView`**

`TasksView` propslaridan `archivePageTasks, archiveTotalPages, archiveTotalTasks, page, setPage, getPageNumbers` ni olib tashlang, o'rniga `archive: ArchiveViewProps` qo'shing. Arxiv tarmog'i:

```tsx
      ) : showArchive ? (
        <ArchiveView {...archive} />
```

va `loading ? <TaskTableSkeleton/> : showArchive ? ...` tartibini shunday o'zgartiring: `showArchive` birinchi tekshirilsin (ArchiveView o'z skeletonini ko'rsatadi, toolbar yuklanish paytida ham ko'rinib turadi):

```tsx
    <div className="order-1 md:order-2">
      {showArchive ? (
        <ArchiveView {...archive} />
      ) : loading ? (
        <TaskTableSkeleton rows={6} />
      ) : (
        /* ...faol ro'yxat tarmog'i o'zgarishsiz... */
      )}
    </div>
```

- [ ] **Step 3: `pages/Tasks.tsx` — propslarni ulash**

`useTaskFilters` dan endi `archiveTotalTasks, archiveTotalPages, archivePageTasks` olinadi (`getPageNumbers` olib tashlangan). `TasksView` ga:

```tsx
          archive={{
            tasks: archivePageTasks,
            loading,
            refreshing,
            error: listError,
            onRetry: () => loadTasks(true, filters),
            total: archiveTotalTasks,
            page,
            totalPages: archiveTotalPages,
            pageSize: ARCHIVE_PAGE_SIZE,
            setPage,
            isMobile,
            onTaskClick: handleTaskClick,
            search: archiveSearchQuery,
            setSearch: setArchiveSearchQuery,
            filters: archiveFilters,
            setFilters: setArchiveFilters,
            branches,
            clients,
            isFiltersRoute: isArchiveFiltersRoute,
            openFilters: () => navigate('/tasks/archive/filters'),
            closeFilters: () => navigate('/tasks/archive'),
          }}
```

`showArchiveFilters` state, `showArchiveFiltersPanel`, Escape handleridagi `showArchiveFilters || isArchiveFiltersRoute` tarmog'i va ikkinchi `isArchiveFiltersRoute` effekti olib tashlanadi; Escape'da mobil filtr route ochiq bo'lsa `navigate('/tasks/archive')` qoladi:

```ts
        } else if (isMobile && isArchiveFiltersRoute) {
          navigate('/tasks/archive');
        }
```

Hisobot modali state: `const [showReportModal, setShowReportModal] = useState(false);` va JSX'da (TasksHeader yonida, `!isModalMode` ichida):

```tsx
        <ArchiveReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          loading={reportLoading}
          onGenerate={async (cols) => { await exportArchiveReport(cols); setShowReportModal(false); }}
        />
```

- [ ] **Step 4: `TasksHeader` — faqat tablar + tugmalar**

Propslardan olib tashlang: `showArchiveFilters, setShowArchiveFilters, isArchiveFiltersRoute, archiveSearchQuery, setArchiveSearchQuery, archiveFilters, setArchiveFilters, branches, clients, filteredArchiveTasksLength, exportArchiveReport, reportLoading, showArchiveFiltersPanel`. Qo'shing: `onOpenReport: () => void`. Arxiv tugmalari bloki:

```tsx
        {showArchive && <ExportMenu onExcel={exportToExcel} onReport={onOpenReport} />}
```

`Tasks.tsx` da `onOpenReport={() => setShowReportModal(true)}` bering.

- [ ] **Step 5: `TaskTable` dan arxivni olib tashlang**

`TaskTable.tsx` da: `archiveTheme` va `getThemeForBranch` dagi `'Arxiv'` qatori; `const isArchive = ...` va barcha `isArchive &&` / `isArchive ? … : …` tarmoqlari (faol variant qoladi: ustun "Start Date", qiymat `formatRelativeTime(task.createdAt)`, `colSpan={5}`, sarlavha `${branchName} filiali`, ikonka `solar:buildings-3-bold-duotone`); `TaskCard` dagi `isArchive` prop. `formatDateOnly` importi endi kerak emas — olib tashlang. `calculateTotalDuration` va `getBXMColor` eksportlari QOLADI (arxiv va eksport ishlatadi).

- [ ] **Step 6: `ArchiveFiltersPanel.tsx` ni o'chiring**

```bash
git rm frontend/src/components/tasks/ArchiveFiltersPanel.tsx
```

- [ ] **Step 7: Tip tekshiruvi, testlar, build**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json && npm test && npm run build`
Expected: hammasi xatosiz.

- [ ] **Step 8: Brauzerda tekshirish** (lokal: backend `npm run dev` :3001, frontend `npm run dev` :5173; claude-in-chrome yoki `run` skill)

Desktop (`/tasks/archive`), har biri uchun natijani yozib boring:
1. Birinchi ochilish — skeleton, keyin jadval; ustunlar: Sana · Task · Mijoz · Filial · PSR · BXM · Vaqt · Izoh; "Status" yo'q; sanalar yuqoridan pastga kamayadi.
2. Qidiruvga tez yozing ("ab", "abc") — jadval o'chmaydi, xiralashadi + progress chizig'i; konsolda abort xatosi/toast yo'q.
3. Invoys sanasi "dan" ni tanlang — chip `dd.mm.yyyy dan`; ikkalasini — `… – …`; chip × — ikkalasi tozalanadi.
4. Filial, Mijoz (qidiruvli), PSR — chiplar, natija soni o'zgaradi; "Tozalash" hammasini tozalaydi.
5. Sahifalash: "›" — Network panelda keyingi sahifa so'rovi oldindan ketgan, bosilganda yangi so'rov yo'q; "1–20 / N" to'g'ri.
6. Oxirgi sahifalar — invoysi yo'q vazifalar (Sana "-") oxirida, dublikat yo'q.
7. Qatorni bosing — vazifa kartochkasi ochiladi; Network'da `/workers` (yoki `/users`) faqat shu paytda so'raladi.
8. Eksport ▾ → Excel (jadval) — fayl yuklanadi, "Invoys sanasi" ustuni bor; Hisobot… → modal, ustunlar, fayl yuklanadi, modal yopiladi.
9. Dark mode — toolbar, jadval, chiplar, modal, menyu o'qiladigan.
10. Faol tab ("Barcha ishlar") — o'zgarmagan: filial jadvallari, "Start Date", "Yangi vazifa".

Mobil (DevTools 390×844):
11. Qidiruv + "Filtrlar (n)" → pastdan oyna; URL `/tasks/archive/filters`; brauzer "orqaga" — oyna yopiladi, arxivda qoladi.
12. Kartochkalar: nom + sana, mijoz, filial/PSR/BXM, vaqt.
13. Xato holati: DevTools → Network → Offline, sahifani yangilab arxivga kiring — "Arxivni yuklab bo'lmadi" + "Qayta urinish"; Online qilib bosing — jadval chiqadi. Online paytda sahifa almashtirib, keyin Offline'da filtr o'zgartiring — jadval qoladi, "Arxivni yuklashda xatolik" toast.

Topilgan xatolarni tuzating va shu qadamlarni qaytaring.

- [ ] **Step 9: Commit**

```bash
git add -A frontend/src
git commit -m "feat(tasks): arxiv tabi yangi ko'rinishga o'tkazildi"
```

---

### Task 6: `Invoice.date` indeksi va deploy

**Files:**
- Modify: `backend/prisma/schema.prisma` (`model Invoice` ichida `@@index([date])`)
- Create: `backend/prisma/migrations/20261001120000_invoice_date_index/migration.sql`

- [ ] **Step 1: Schema va migratsiya fayli**

`model Invoice` ga `@@index([date])` qo'shing. `migration.sql`:

```sql
-- Prod'da qo'lda CONCURRENTLY bilan qo'llangan (2026-10-01); bu fayl tarix uchun
CREATE INDEX IF NOT EXISTS "Invoice_date_idx" ON "Invoice"("date");
```

Run: `cd backend && npx prisma validate && npx prisma generate`
Expected: "The schema ... is valid".

- [ ] **Step 2: Commit + push**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20261001120000_invoice_date_index
git commit -m "perf(db): Invoice.date indeksi (arxiv tartibi va filtri)"
git push origin main
```

- [ ] **Step 3: STOP — foydalanuvchidan prod DB tasdig'i**

Foydalanuvchiga quyidagini ko'rsating va ruxsat so'rang. Ruxsatsiz bajarmang:

```bash
ssh -i ~/.ssh/prodeklarant_deploy -o BatchMode=yes root@138.249.7.15 \
  'cd /var/www/app/backend && echo "CREATE INDEX CONCURRENTLY IF NOT EXISTS \"Invoice_date_idx\" ON \"Invoice\"(\"date\");" | npx prisma db execute --stdin --schema prisma/schema.prisma && npx prisma migrate resolve --applied 20261001120000_invoice_date_index'
```

(`CONCURRENTLY` tranzaksiya ichida ishlamaydi — agar `db execute` xato bersa, `CONCURRENTLY` siz qayta urinish uchun yana ruxsat so'rang: jadval bir necha soniya qulflanadi.)

- [ ] **Step 4: Deploy**

```bash
ssh -i ~/.ssh/prodeklarant_deploy -o BatchMode=yes root@138.249.7.15 'cd /var/www/app && git stash push -q -- backend/package-lock.json frontend/package-lock.json 2>/dev/null; git pull --ff-only origin main 2>&1 | tail -2; git log --oneline -1'
```

Expected: HEAD = oxirgi commit. Keyin:

```bash
ssh -i ~/.ssh/prodeklarant_deploy -o BatchMode=yes root@138.249.7.15 'cd /var/www/app/backend && npm run build 2>&1 | tail -1 && grep -c splitSegmentWindow dist/repositories/task.repository.js && pm2 restart prodeklarant-backend >/dev/null && cd ../frontend && npm run build 2>&1 | tail -1 && grep -l "Hisobot (invoys)" dist/assets/*.js | head -1 && sleep 3 && pm2 list | grep prodeklarant-backend && curl -s -o /dev/null -w "%{http_code}\n" localhost:3001/api/tasks'
```

Expected: grep 1, bundle fayl nomi, `online`, `401`.
