# Shartnoma (ServiceAgreement) + PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brokerlik xizmat shartnomasini formadan to'ldirib PDF qilib yuklab olish; tuzilgan shartnomalar bazada saqlanib, qidiriladigan ro'yxatda ko'rinadi.

**Architecture:** Yangi `ServiceAgreement` Prisma modeli rekvizitlarni snapshot sifatida saqlaydi. Shartnoma matni frontendda `templates/v1.ts` faylida **ma'lumot** ko'rinishida yashaydi (bloklar + `{{token}}`), universal `AgreementPdfDocument` uni chizadi. PDF frontendda `@react-pdf/renderer` bilan yaratiladi va invoysning glif-tekshiruvi qayta ishlatiladi.

**Tech Stack:** Prisma + PostgreSQL, Express 5, Zod, React 19, React Router v7, `@react-pdf/renderer` 4.5, Tailwind v4, Vitest, axios (`frontend/src/lib/api.ts`), react-hot-toast, `@iconify/react` (Solar Bold Duotone).

**Spec:** `docs/superpowers/specs/2026-08-02-shartnoma-pdf-design.md`
**Shartnoma matni manbasi:** `docs/shartnoma-shablon-2026.md`

## Global Constraints

- TypeScript strict. `any` ishlatilmaydi.
- Pul maydonlari — Prisma `Decimal`. `creditLimit` va `perAmountThreshold` uchun `Decimal(18,2)` (CLAUDE.md da 12,2 yozilgan; bu ongli chetlanish — `Client.creditLimit` 18,2 va ular solishtiriladi).
- Backend validatsiya — Zod, `safeParse` → `res.status(400).json({ error: parsed.error.flatten() })` (mavjud pattern: `backend/src/routes/packaging-types.ts`).
- Frontend formalar — oddiy `useState` + qo'lda validatsiya. `react-hook-form` va `zod` frontendda **yo'q** va qo'shilmaydi; spec'da eslatilgan bo'lsa ham, mavjud sahifalar patterni shu.
- Frontend sahifalar `App.tsx` da `lazy(() => import(...))`.
- Ikonkalar — `@iconify/react`, `solar:*-bold-duotone`.
- Kirish huquqi cheklanmaydi: `requireAuth()` (rol argumentisiz), `ProtectedRoute` da `allowedRoles` berilmaydi.
- Shartnoma matni — o'zbek kirill alifbosida (`ҳ`, `қ`, `ғ`, `ў`). Kodning izohlari — o'zbek lotin, mavjud fayllar kabi.
- Yangi Prisma model nomi `ServiceAgreement` — `Contract` band (tashqi savdo kontrakti).
- **Baseline TypeScript xatosi.** Repoda bu reja boshlanishidan OLDIN ham mavjud bo'lgan bitta xato bor:

  ```
  src/components/invoice/hooks/useInvoiceSave.ts(294,46): error TS2345:
    Argument of type '{ name: string; code?: string | undefined; }[]' is not
    assignable to parameter of type 'PackagingTypeItem[]'.
  ```

  Bu xato ushbu rejaning ishi emas va **tuzatilmaydi** (invoys kodiga tegilmaydi). Har qanday `tsc` tekshiruvida u chiqadi. Shuning uchun barcha TypeScript darvozalarining mezoni: **shu bitta ma'lum xatodan boshqa yangi xato qo'shilmasin**. Boshqa fayldan yoki boshqa qatordan xato chiqsa — u sizning o'zgarishingizdan, tuzatilishi shart.

---

## File Structure

**Backend**

| Fayl | Mas'uliyat |
|---|---|
| `backend/prisma/schema.prisma` (modify) | `ServiceAgreement`, `AgreementStatus`, `PaymentModel`, `Client` ga 3 ustun |
| `backend/src/routes/service-agreements.helpers.ts` (create) | Sof funksiyalar: keyingi raqam, DTO map |
| `backend/src/routes/service-agreements.helpers.test.ts` (create) | Yuqoridagining testi |
| `backend/src/routes/service-agreements.schema.ts` (create) | Zod sxemalari (shartli maydonlar) |
| `backend/src/routes/service-agreements.schema.test.ts` (create) | Sxema testi |
| `backend/src/routes/service-agreements.ts` (create) | Express router |
| `backend/src/server.ts` (modify) | Router registratsiyasi |
| `backend/openapi/service-agreements-postman-collection.json` (create) | Newman integratsiya testi |
| `backend/package.json` (modify) | `test:integration:agreements` skripti |

**Frontend**

| Fayl | Mas'uliyat |
|---|---|
| `frontend/package.json`, `frontend/vitest.config.ts` | Vitest sozlamasi |
| `frontend/src/components/pdf/fonts.ts` (create) | `Font.register` — yagona joy |
| `frontend/src/components/invoice/pdf/PdfStyles.ts` (modify) | Shrift registratsiyasini `fonts.ts` dan oladi |
| `frontend/src/features/serviceAgreement/types.ts` | DTO va enum turlari |
| `frontend/src/features/serviceAgreement/api.ts` | HTTP chaqiruvlari |
| `frontend/src/features/serviceAgreement/tokens.ts` + test | `ServiceAgreement` → `AgreementTokens` |
| `frontend/src/features/serviceAgreement/templates/types.ts` | Blok va shablon turlari, `resolveText` |
| `frontend/src/features/serviceAgreement/templates/v1.ts` | Shartnoma matni |
| `frontend/src/features/serviceAgreement/templates/index.ts` | `getTemplate(version)` |
| `frontend/src/features/serviceAgreement/templates/v1.test.ts` | Token va shartli bloklar testi |
| `frontend/src/features/serviceAgreement/pdf/agreementPdfStyles.ts` | Uslublar |
| `frontend/src/features/serviceAgreement/pdf/AgreementPdfDocument.tsx` | Universal renderer |
| `frontend/src/features/serviceAgreement/pdf/renderAgreementPdf.ts` | normalize → render → glyph check → Blob |
| `frontend/src/pages/ServiceAgreements.tsx` | Ro'yxat sahifasi |
| `frontend/src/pages/ServiceAgreementEditor.tsx` | Forma + preview |
| `frontend/src/components/serviceAgreement/AgreementPreview.tsx` | Debounce'li PDF iframe |
| `frontend/src/App.tsx` (modify) | 2 ta route |
| `frontend/src/components/Layout.tsx` (modify) | Yon menyu elementi |
| `frontend/src/pages/ClientDetail.tsx` (modify) | Mijozning shartnomalari bo'limi |

---

### Task 1: Frontend Vitest sozlash

Shablon testi bu rejadagi eng muhim test, lekin frontendda test runner yo'q. Shuni qo'shamiz.

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/features/serviceAgreement/smoke.test.ts`

**Interfaces:**
- Consumes: hech narsa
- Produces: `npm run test` (frontend) — `vitest run`

- [ ] **Step 1: Vitest o'rnatish**

```bash
cd frontend && npm install -D vitest@^4.1.10
```

- [ ] **Step 2: `frontend/vitest.config.ts` yaratish**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Izoh: `environment: 'node'` — bu rejadagi testlar sof funksiyalarni tekshiradi, DOM kerak emas.

- [ ] **Step 3: `frontend/package.json` scripts blokiga qo'shish**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Failing smoke test yozish**

`frontend/src/features/serviceAgreement/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest sozlamasi', () => {
  it('ishlaydi', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Testni ishga tushirish**

Run: `cd frontend && npm run test`
Expected: PASS — 1 test.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/features/serviceAgreement/smoke.test.ts
git commit -m "chore(frontend): add vitest test runner"
```

---

### Task 2: Prisma modeli va migratsiya

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `prisma.serviceAgreement`, `AgreementStatus`, `PaymentModel` enum'lari; `Client.director`, `Client.mfo`, `Client.oked`

- [ ] **Step 1: Enum'larni qo'shish**

`schema.prisma` oxiriga (boshqa enum'lar yoniga):

```prisma
enum AgreementStatus {
  DRAFT
  ACTIVE
  TERMINATED
}

enum PaymentModel {
  PREPAID
  MONTHLY
  PER_COUNT
  PER_AMOUNT
}
```

- [ ] **Step 2: `ServiceAgreement` modelini qo'shish**

```prisma
model ServiceAgreement {
  id              Int             @id @default(autoincrement())
  clientId        Int
  agreementNumber String          @unique
  agreementDate   DateTime
  templateVersion String          @default("v1")
  status          AgreementStatus @default(DRAFT)
  terminatedAt      DateTime?
  terminationReason String?

  // Buyurtmachi rekvizitlari — SNAPSHOT. Client o'zgarsa ham bu o'zgarmaydi.
  customerName          String
  customerInn           String?
  customerAddress       String?
  customerDirector      String?
  customerDirectorBasis String?
  customerBankName      String?
  customerBankAccount   String?
  customerMfo           String?
  customerOked          String?
  customerPhone         String?
  customerEmail         String?

  // Bajaruvchi rekvizitlari — SNAPSHOT (CompanySettings dan ko'chiriladi)
  executorName        String
  executorInn         String?
  executorAddress     String?
  executorDirector    String?
  executorBankName    String?
  executorBankAccount String?
  executorMfo         String?
  executorOked        String?
  executorPhone       String?
  executorEmail       String?

  // Tijorat shartlari
  paymentModel        PaymentModel @default(PREPAID)
  monthlyDueDay       Int?
  perCountThreshold   Int?
  perCountDueDays     Int?
  perAmountThreshold  Decimal?     @db.Decimal(18, 2)
  perAmountDueDays    Int?
  creditLimit         Decimal?     @db.Decimal(18, 2)
  prepaidRevertDays   Int          @default(10)
  mainTariffBhm       Decimal      @db.Decimal(6, 2)
  tariffs             Json         @default("[]")
  vatPayer            Boolean      @default(false)
  jurisdictionCourt   String?
  brokerRegistryNumber String?
  signingPlace        String       @default("Олтиариқ тумани")

  includeSeal Boolean @default(true)

  createdById Int?
  updatedById Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([customerInn])
  @@index([status])
}
```

- [ ] **Step 3: `Client` modelini kengaytirish**

`model Client` ichiga (`contracts Contract[]` qatoridan oldin) qo'shing:

```prisma
  director          String?
  mfo               String?
  oked              String?
  serviceAgreements ServiceAgreement[]
```

- [ ] **Step 4: Schema sintaksisini tekshirish (bazaga tegmasdan)**

Run: `cd backend && npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 5: Migratsiya holatini ko'rish**

Run: `cd backend && npx prisma migrate status`
Expected: drift haqida ogohlantirish — bazada 2 ta bo'sh migratsiya papkasi bor.

- [ ] **Step 6: STOP — foydalanuvchidan ruxsat so'rang**

Baza masofaviy va **jonli** (138.249.7.15). Keyingi ikki buyruq bazaga yozadi. 5-qadam natijasini foydalanuvchiga ko'rsating va aniq ruxsat oling. Ruxsatsiz davom etmang.

- [ ] **Step 7: Driftni yopish va migratsiya (ruxsat olingandan keyin)**

```bash
cd backend
npx prisma migrate resolve --applied <5-qadamda ko'rsatilgan bo'sh papka nomi>
npx prisma migrate dev --name add_service_agreement
```

Expected: yangi migratsiya qo'llandi, `prisma generate` avtomatik ishladi.

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(db): add ServiceAgreement model and client requisite fields"
```

---

### Task 3: Backend sof mantiq (helpers + Zod sxemalari)

**Files:**
- Create: `backend/src/routes/service-agreements.helpers.ts`
- Create: `backend/src/routes/service-agreements.helpers.test.ts`
- Create: `backend/src/routes/service-agreements.schema.ts`
- Create: `backend/src/routes/service-agreements.schema.test.ts`

**Interfaces:**
- Produces:
  - `nextAgreementNumber(year: number, existing: string[]): string`
  - `agreementCreateSchema`, `agreementUpdateSchema`, `terminateSchema` (Zod)
  - `AgreementCreateInput` (`z.infer<typeof agreementCreateSchema>`)

- [ ] **Step 1: Helper testini yozish**

`backend/src/routes/service-agreements.helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextAgreementNumber } from './service-agreements.helpers';

describe('nextAgreementNumber', () => {
  it('bo\'sh ro\'yxatda birinchi raqamni beradi', () => {
    expect(nextAgreementNumber(2026, [])).toBe('2026/001');
  });

  it('eng katta tartib raqamdan keyingisini beradi', () => {
    expect(nextAgreementNumber(2026, ['2026/001', '2026/014', '2026/007'])).toBe('2026/015');
  });

  it('boshqa yil raqamlarini hisobga olmaydi', () => {
    expect(nextAgreementNumber(2026, ['2025/099', '2026/002'])).toBe('2026/003');
  });

  it('notanish formatdagi raqamlarni e\'tiborsiz qoldiradi', () => {
    expect(nextAgreementNumber(2026, ['qo\'lda-1', '2026/004'])).toBe('2026/005');
  });

  it('999 dan oshsa ham to\'g\'ri davom etadi', () => {
    expect(nextAgreementNumber(2026, ['2026/999'])).toBe('2026/1000');
  });
});
```

- [ ] **Step 2: Testni ishga tushirib, yiqilishini ko'rish**

Run: `cd backend && npx vitest run src/routes/service-agreements.helpers.test.ts`
Expected: FAIL — `Failed to resolve import "./service-agreements.helpers"`

- [ ] **Step 3: Helperni yozish**

`backend/src/routes/service-agreements.helpers.ts`:

```ts
/** `2026/014` ko'rinishidagi raqamdan tartib qismini ajratadi. Mos kelmasa null. */
function sequenceOf(number: string, year: number): number | null {
  const match = /^(\d{4})\/(\d+)$/.exec(number.trim());
  if (!match) return null;
  if (Number(match[1]) !== year) return null;
  return Number(match[2]);
}

/**
 * Shu yildagi eng katta tartib raqamdan keyingisini qaytaradi.
 * Tartib qismi kamida 3 xonali qilib to'ldiriladi (`2026/007`).
 */
export function nextAgreementNumber(year: number, existing: string[]): string {
  const max = existing.reduce((acc, n) => {
    const seq = sequenceOf(n, year);
    return seq !== null && seq > acc ? seq : acc;
  }, 0);
  return `${year}/${String(max + 1).padStart(3, '0')}`;
}
```

- [ ] **Step 4: Testni qayta ishga tushirish**

Run: `cd backend && npx vitest run src/routes/service-agreements.helpers.test.ts`
Expected: PASS — 5 test.

- [ ] **Step 5: Zod sxema testini yozish**

`backend/src/routes/service-agreements.schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { agreementCreateSchema } from './service-agreements.schema';

const base = {
  clientId: 1,
  agreementNumber: '2026/001',
  agreementDate: '2026-03-12',
  customerName: 'AGRO EXPORT MCHJ',
  executorName: 'PRODEKLARANT MCHJ',
  mainTariffBhm: 3,
  paymentModel: 'PREPAID' as const,
};

describe('agreementCreateSchema', () => {
  it('minimal to\'g\'ri ma\'lumotni qabul qiladi', () => {
    expect(agreementCreateSchema.safeParse(base).success).toBe(true);
  });

  it('MONTHLY uchun monthlyDueDay majburiy', () => {
    const r = agreementCreateSchema.safeParse({ ...base, paymentModel: 'MONTHLY' });
    expect(r.success).toBe(false);
  });

  it('MONTHLY monthlyDueDay bilan o\'tadi', () => {
    const r = agreementCreateSchema.safeParse({ ...base, paymentModel: 'MONTHLY', monthlyDueDay: 10 });
    expect(r.success).toBe(true);
  });

  it('monthlyDueDay 1..28 oralig\'ida bo\'lishi kerak', () => {
    const r = agreementCreateSchema.safeParse({ ...base, paymentModel: 'MONTHLY', monthlyDueDay: 31 });
    expect(r.success).toBe(false);
  });

  it('PER_COUNT uchun ikkala maydon ham majburiy', () => {
    expect(agreementCreateSchema.safeParse({ ...base, paymentModel: 'PER_COUNT', perCountThreshold: 5 }).success).toBe(false);
    expect(agreementCreateSchema.safeParse({ ...base, paymentModel: 'PER_COUNT', perCountThreshold: 5, perCountDueDays: 3 }).success).toBe(true);
  });

  it('PER_AMOUNT uchun ikkala maydon ham majburiy', () => {
    expect(agreementCreateSchema.safeParse({ ...base, paymentModel: 'PER_AMOUNT', perAmountThreshold: 20000000 }).success).toBe(false);
    expect(agreementCreateSchema.safeParse({ ...base, paymentModel: 'PER_AMOUNT', perAmountThreshold: 20000000, perAmountDueDays: 3 }).success).toBe(true);
  });

  it('bo\'sh korxona nomini rad etadi', () => {
    expect(agreementCreateSchema.safeParse({ ...base, customerName: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 6: Testni ishga tushirib, yiqilishini ko'rish**

Run: `cd backend && npx vitest run src/routes/service-agreements.schema.test.ts`
Expected: FAIL — modul topilmadi.

- [ ] **Step 7: Zod sxemalarini yozish**

`backend/src/routes/service-agreements.schema.ts`:

```ts
import { z } from 'zod';

const tariffRowSchema = z.object({
  name: z.string().min(1),
  unit: z.string().default(''),
  bhm: z.number().nonnegative(),
});

const baseShape = {
  clientId: z.number().int().positive(),
  agreementNumber: z.string().min(1).max(50),
  agreementDate: z.string().min(1),
  templateVersion: z.string().default('v1'),
  status: z.enum(['DRAFT', 'ACTIVE', 'TERMINATED']).default('DRAFT'),

  customerName: z.string().min(1),
  customerInn: z.string().optional(),
  customerAddress: z.string().optional(),
  customerDirector: z.string().optional(),
  customerDirectorBasis: z.string().optional(),
  customerBankName: z.string().optional(),
  customerBankAccount: z.string().optional(),
  customerMfo: z.string().optional(),
  customerOked: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),

  executorName: z.string().min(1),
  executorInn: z.string().optional(),
  executorAddress: z.string().optional(),
  executorDirector: z.string().optional(),
  executorBankName: z.string().optional(),
  executorBankAccount: z.string().optional(),
  executorMfo: z.string().optional(),
  executorOked: z.string().optional(),
  executorPhone: z.string().optional(),
  executorEmail: z.string().optional(),

  paymentModel: z.enum(['PREPAID', 'MONTHLY', 'PER_COUNT', 'PER_AMOUNT']),
  monthlyDueDay: z.number().int().min(1).max(28).optional(),
  perCountThreshold: z.number().int().positive().optional(),
  perCountDueDays: z.number().int().positive().optional(),
  perAmountThreshold: z.number().nonnegative().optional(),
  perAmountDueDays: z.number().int().positive().optional(),
  creditLimit: z.number().nonnegative().optional(),
  prepaidRevertDays: z.number().int().positive().default(10),
  mainTariffBhm: z.number().nonnegative(),
  tariffs: z.array(tariffRowSchema).default([]),
  vatPayer: z.boolean().default(false),
  jurisdictionCourt: z.string().optional(),
  brokerRegistryNumber: z.string().optional(),
  signingPlace: z.string().default('Олтиариқ тумани'),
  includeSeal: z.boolean().default(true),
};

/**
 * Tanlangan to'lov modeliga qarab qaysi maydonlar majburiy ekanini tekshiradi
 * (shartnomaning 5.5.1-bandi). Modelsiz maydon kelib qolsa xato bermaymiz —
 * u shunchaki PDF'da ishlatilmaydi.
 */
function requireModelFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const need = (field: string) => {
      if (data[field] === undefined || data[field] === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${data.paymentModel} modeli uchun bu maydon majburiy`,
        });
      }
    };
    if (data.paymentModel === 'MONTHLY') need('monthlyDueDay');
    if (data.paymentModel === 'PER_COUNT') { need('perCountThreshold'); need('perCountDueDays'); }
    if (data.paymentModel === 'PER_AMOUNT') { need('perAmountThreshold'); need('perAmountDueDays'); }
  });
}

export const agreementCreateSchema = requireModelFields(z.object(baseShape));
export const agreementUpdateSchema = requireModelFields(z.object(baseShape).partial().extend({
  paymentModel: z.enum(['PREPAID', 'MONTHLY', 'PER_COUNT', 'PER_AMOUNT']),
}));
export const terminateSchema = z.object({
  terminationReason: z.string().min(1),
});

export type AgreementCreateInput = z.infer<typeof agreementCreateSchema>;
```

- [ ] **Step 8: Testni qayta ishga tushirish**

Run: `cd backend && npx vitest run src/routes/service-agreements.schema.test.ts`
Expected: PASS — 8 assertion.

- [ ] **Step 9: Commit**

```bash
git add backend/src/routes/service-agreements.helpers.ts backend/src/routes/service-agreements.helpers.test.ts backend/src/routes/service-agreements.schema.ts backend/src/routes/service-agreements.schema.test.ts
git commit -m "feat(api): add service agreement validation schemas and number helper"
```

---

### Task 4: Backend router

**Files:**
- Create: `backend/src/routes/service-agreements.ts`
- Modify: `backend/src/server.ts`

**Interfaces:**
- Consumes: `nextAgreementNumber`, `agreementCreateSchema`, `agreementUpdateSchema`, `terminateSchema` (Task 3)
- Produces: `/api/service-agreements` endpointlari

- [ ] **Step 1: Routerni yozish**

`backend/src/routes/service-agreements.ts`:

```ts
import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { nextAgreementNumber } from './service-agreements.helpers';
import {
  agreementCreateSchema,
  agreementUpdateSchema,
  terminateSchema,
} from './service-agreements.schema';

const router = Router();

/** Ro'yxat: bitta `q` maydoni korxona nomi, INN va shartnoma raqami bo'ylab qidiradi */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

    const where = {
      ...(status && ['DRAFT', 'ACTIVE', 'TERMINATED'].includes(status)
        ? { status: status as 'DRAFT' | 'ACTIVE' | 'TERMINATED' }
        : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: 'insensitive' as const } },
              { customerInn: { contains: q, mode: 'insensitive' as const } },
              { agreementNumber: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.serviceAgreement.findMany({
        where,
        orderBy: [{ agreementDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceAgreement.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  } catch (error: unknown) {
    console.error('[service-agreements] GET error:', error);
    res.status(500).json({ error: 'Shartnomalarni olishda xatolik' });
  }
});

/** Keyingi bo'sh shartnoma raqami */
router.get('/next-number', requireAuth(), async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const rows = await prisma.serviceAgreement.findMany({
    where: { agreementNumber: { startsWith: `${year}/` } },
    select: { agreementNumber: true },
  });
  res.json({ agreementNumber: nextAgreementNumber(year, rows.map((r) => r.agreementNumber)) });
});

router.get('/:id', requireAuth(), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const item = await prisma.serviceAgreement.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Shartnoma topilmadi' });
  res.json(item);
});

/** Zod natijasini Prisma `data` ga o'giradi (sana matndan Date ga) */
function toPrismaData(input: Record<string, unknown>) {
  const { agreementDate, ...rest } = input;
  return { ...rest, agreementDate: new Date(String(agreementDate)) };
}

router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  const parsed = agreementCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.serviceAgreement.create({
      data: {
        ...toPrismaData(parsed.data as Record<string, unknown>),
        createdById: req.user?.id ?? null,
        updatedById: req.user?.id ?? null,
      } as never,
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Bu shartnoma raqami allaqachon band' });
    }
    console.error('[service-agreements] POST error:', error);
    res.status(500).json({ error: 'Shartnoma yaratishda xatolik' });
  }
});

router.patch('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = agreementUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const data = parsed.data as Record<string, unknown>;
    const updated = await prisma.serviceAgreement.update({
      where: { id },
      data: {
        ...(data.agreementDate ? toPrismaData(data) : data),
        updatedById: req.user?.id ?? null,
      } as never,
    });
    res.json(updated);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Bu shartnoma raqami allaqachon band' });
    }
    console.error('[service-agreements] PATCH error:', error);
    res.status(500).json({ error: 'Shartnomani yangilashda xatolik' });
  }
});

router.post('/:id/terminate', requireAuth(), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = terminateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await prisma.serviceAgreement.update({
    where: { id },
    data: {
      status: 'TERMINATED',
      terminatedAt: new Date(),
      terminationReason: parsed.data.terminationReason,
      updatedById: req.user?.id ?? null,
    },
  });
  res.json(updated);
});

export default router;
```

- [ ] **Step 2: `server.ts` da ro'yxatdan o'tkazish**

`backend/src/server.ts` — import bloki (33-qator atrofida, `packagingTypesRouter` yoniga):

```ts
import serviceAgreementsRouter from './routes/service-agreements';
```

Va `app.use` bloki (260-qator atrofida):

```ts
app.use('/api/service-agreements', requireAuth(), serviceAgreementsRouter);
```

- [ ] **Step 3: Backend kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 4: Serverni ishga tushirib, endpointni qo'lda tekshirish**

```bash
cd backend && npm run dev
```

Boshqa terminalda (`<TOKEN>` — amaldagi accessToken):

```bash
curl -s -H "Authorization: Bearer <TOKEN>" "http://localhost:3001/api/service-agreements/next-number?year=2026"
```

Expected: `{"agreementNumber":"2026/001"}`

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/service-agreements.ts backend/src/server.ts
git commit -m "feat(api): add service agreements CRUD routes"
```

---

### Task 5: Newman integratsiya testi

**Files:**
- Create: `backend/openapi/service-agreements-postman-collection.json`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: Task 4 endpointlari
- Produces: `npm run test:integration:agreements`

- [ ] **Step 1: Kolleksiya faylini yaratish**

`backend/openapi/service-agreements-postman-collection.json`:

```json
{
  "info": {
    "name": "Prodeklarant — Service Agreements",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3001/api" },
    { "key": "token", "value": "" },
    { "key": "clientId", "value": "1" },
    { "key": "agreementId", "value": "" },
    { "key": "agreementNumber", "value": "" }
  ],
  "item": [
    {
      "name": "next-number",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/service-agreements/next-number?year=2026"
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('200', () => pm.response.to.have.status(200));",
          "const b = pm.response.json();",
          "pm.test('raqam 2026/ bilan boshlanadi', () => pm.expect(b.agreementNumber).to.match(/^2026\\//));",
          "pm.collectionVariables.set('agreementNumber', b.agreementNumber);"
        ] }
      }]
    },
    {
      "name": "create",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": "{{baseUrl}}/service-agreements",
        "body": { "mode": "raw", "raw": "{\"clientId\":{{clientId}},\"agreementNumber\":\"{{agreementNumber}}\",\"agreementDate\":\"2026-03-12\",\"customerName\":\"NEWMAN TEST MCHJ\",\"customerInn\":\"305999111\",\"executorName\":\"PRODEKLARANT MCHJ\",\"paymentModel\":\"MONTHLY\",\"monthlyDueDay\":10,\"creditLimit\":20000000,\"mainTariffBhm\":3}" }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('201', () => pm.response.to.have.status(201));",
          "pm.collectionVariables.set('agreementId', pm.response.json().id);"
        ] }
      }]
    },
    {
      "name": "create duplicate → 409",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": "{{baseUrl}}/service-agreements",
        "body": { "mode": "raw", "raw": "{\"clientId\":{{clientId}},\"agreementNumber\":\"{{agreementNumber}}\",\"agreementDate\":\"2026-03-12\",\"customerName\":\"NEWMAN TEST MCHJ\",\"executorName\":\"PRODEKLARANT MCHJ\",\"paymentModel\":\"PREPAID\",\"mainTariffBhm\":3}" }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": ["pm.test('409', () => pm.response.to.have.status(409));"] }
      }]
    },
    {
      "name": "create invalid (MONTHLY without day) → 400",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": "{{baseUrl}}/service-agreements",
        "body": { "mode": "raw", "raw": "{\"clientId\":{{clientId}},\"agreementNumber\":\"2026/900\",\"agreementDate\":\"2026-03-12\",\"customerName\":\"X\",\"executorName\":\"Y\",\"paymentModel\":\"MONTHLY\",\"mainTariffBhm\":3}" }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": ["pm.test('400', () => pm.response.to.have.status(400));"] }
      }]
    },
    {
      "name": "search by INN",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/service-agreements?q=305999111"
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('200', () => pm.response.to.have.status(200));",
          "pm.test('kamida bitta natija', () => pm.expect(pm.response.json().items.length).to.be.above(0));"
        ] }
      }]
    },
    {
      "name": "terminate",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": "{{baseUrl}}/service-agreements/{{agreementId}}/terminate",
        "body": { "mode": "raw", "raw": "{\"terminationReason\":\"14.3-band bo'yicha\"}" }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('200', () => pm.response.to.have.status(200));",
          "pm.test('holat TERMINATED', () => pm.expect(pm.response.json().status).to.eql('TERMINATED'));"
        ] }
      }]
    }
  ]
}
```

- [ ] **Step 2: `backend/package.json` ga skript qo'shish**

`scripts` blokiga:

```json
"test:integration:agreements": "newman run ./openapi/service-agreements-postman-collection.json --env-var baseUrl=http://localhost:3001/api --env-var token=$TOKEN --env-var clientId=$CLIENT_ID --delay-request 50"
```

- [ ] **Step 3: Ishga tushirib tekshirish**

Backend `npm run dev` bilan ishlab turgan holda:

```bash
cd backend && TOKEN=<accessToken> CLIENT_ID=<mavjud mijoz id> npm run test:integration:agreements
```

Expected: 6 request, barcha assertion PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/openapi/service-agreements-postman-collection.json backend/package.json
git commit -m "test(api): add newman collection for service agreements"
```

---

### Task 6: Umumiy PDF shrift moduli

`Font.register` global — ikki marta har xil konfiguratsiya bilan chaqirilmasligi kerak. Shartnoma PDF'i ham shu shriftlarni ishlatadi, shuning uchun registratsiyani bitta modulga chiqaramiz.

**Files:**
- Create: `frontend/src/components/pdf/fonts.ts`
- Modify: `frontend/src/components/invoice/pdf/PdfStyles.ts:1-19`

**Interfaces:**
- Produces: `PDF_FONT_STACK: string[]` — `['Roboto', 'NotoSans']`

- [ ] **Step 1: `frontend/src/components/pdf/fonts.ts` yaratish**

```ts
import { Font } from '@react-pdf/renderer';

/**
 * Shrift registratsiyasi — YAGONA joy. `Font.register` global holatga yozadi,
 * shuning uchun uni bir necha modulda takrorlash mumkin emas: oxirgi chaqiruv
 * oldingisini bekor qiladi va shrift steki kutilmaganda o'zgaradi.
 *
 * Zaxira shrift: Roboto'da glifi bo'lmagan belgi @react-pdf tomonidan jimgina
 * tashlab yuborilmasligi uchun keng Unicode qamrovli NotoSans ishlatiladi.
 * `fontFamily: PDF_FONT_STACK` — har bir belgi uchun glifi bor birinchi shrift
 * tanlanadi.
 */
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Roboto-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 },
  ],
});

Font.register({
  family: 'NotoSans',
  fonts: [{ src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 }],
});

export const PDF_FONT_STACK = ['Roboto', 'NotoSans'];
```

- [ ] **Step 2: `PdfStyles.ts` ni moslashtirish**

`frontend/src/components/invoice/pdf/PdfStyles.ts` boshidagi 1–19 qatorlarni shunga almashtiring:

```ts
import { StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_STACK } from '../../pdf/fonts';
```

Va `styles.page` ichidagi `fontFamily: ['Roboto', 'NotoSans'],` ni shunga o'zgartiring:

```ts
    fontFamily: PDF_FONT_STACK,
```

- [ ] **Step 3: Kompilyatsiyani tekshirish**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: faqat ma'lum baseline xatosi (`useInvoiceSave.ts(294,46)`). Boshqa xato bo'lmasin.

- [ ] **Step 4: Invoys PDF'i buzilmaganini tekshirish**

`npm run dev` bilan ilovani oching, istalgan invoysni oching va PDF tugmasini bosing.
Expected: PDF avvalgidek yuklanadi, kirill matni to'liq chiqadi.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/pdf/fonts.ts frontend/src/components/invoice/pdf/PdfStyles.ts
git commit -m "refactor(pdf): extract font registration into shared module"
```

---

### Task 7: Frontend turlari va API klienti

**Files:**
- Create: `frontend/src/features/serviceAgreement/types.ts`
- Create: `frontend/src/features/serviceAgreement/api.ts`

**Interfaces:**
- Produces:
  - `PaymentModel`, `AgreementStatus`, `TariffRow`, `ServiceAgreement`, `AgreementListResponse`
  - `listAgreements`, `getAgreement`, `createAgreement`, `updateAgreement`, `terminateAgreement`, `getNextNumber`

- [ ] **Step 1: `types.ts` yozish**

```ts
export type PaymentModel = 'PREPAID' | 'MONTHLY' | 'PER_COUNT' | 'PER_AMOUNT';
export type AgreementStatus = 'DRAFT' | 'ACTIVE' | 'TERMINATED';

/** Model → shartnoma matnidagi harf (5.5.1-band jadvali) */
export const PAYMENT_MODEL_LETTER: Record<PaymentModel, 'A' | 'B' | 'C' | 'D'> = {
  PREPAID: 'A',
  MONTHLY: 'B',
  PER_COUNT: 'C',
  PER_AMOUNT: 'D',
};

export const PAYMENT_MODEL_LABEL: Record<PaymentModel, string> = {
  PREPAID: 'A — Oldindan to\'lov',
  MONTHLY: 'B — Oylik (postpayd)',
  PER_COUNT: 'C — Xizmat soni bo\'yicha',
  PER_AMOUNT: 'D — Summa bo\'yicha',
};

export const STATUS_LABEL: Record<AgreementStatus, string> = {
  DRAFT: 'Qoralama',
  ACTIVE: 'Faol',
  TERMINATED: 'Bekor',
};

export interface TariffRow {
  name: string;
  unit: string;
  bhm: number;
}

export interface ServiceAgreement {
  id: number;
  clientId: number;
  agreementNumber: string;
  agreementDate: string;
  templateVersion: string;
  status: AgreementStatus;
  terminatedAt: string | null;
  terminationReason: string | null;

  customerName: string;
  customerInn: string | null;
  customerAddress: string | null;
  customerDirector: string | null;
  customerDirectorBasis: string | null;
  customerBankName: string | null;
  customerBankAccount: string | null;
  customerMfo: string | null;
  customerOked: string | null;
  customerPhone: string | null;
  customerEmail: string | null;

  executorName: string;
  executorInn: string | null;
  executorAddress: string | null;
  executorDirector: string | null;
  executorBankName: string | null;
  executorBankAccount: string | null;
  executorMfo: string | null;
  executorOked: string | null;
  executorPhone: string | null;
  executorEmail: string | null;

  paymentModel: PaymentModel;
  monthlyDueDay: number | null;
  perCountThreshold: number | null;
  perCountDueDays: number | null;
  perAmountThreshold: string | null;
  perAmountDueDays: number | null;
  creditLimit: string | null;
  prepaidRevertDays: number;
  mainTariffBhm: string;
  tariffs: TariffRow[];
  vatPayer: boolean;
  jurisdictionCourt: string | null;
  brokerRegistryNumber: string | null;
  signingPlace: string;
  includeSeal: boolean;
}

export interface AgreementListResponse {
  items: ServiceAgreement[];
  total: number;
  page: number;
  limit: number;
}

/** Formadan yuboriladigan ma'lumot — server default beradigan maydonlar ixtiyoriy */
export type AgreementInput = Omit<
  ServiceAgreement,
  'id' | 'terminatedAt' | 'terminationReason' | 'perAmountThreshold' | 'creditLimit' | 'mainTariffBhm'
> & {
  perAmountThreshold?: number;
  creditLimit?: number;
  mainTariffBhm: number;
};
```

Izoh: `Decimal` maydonlar JSON'da string bo'lib keladi (Prisma), shuning uchun o'qishda `string`, yozishda `number`.

- [ ] **Step 2: `api.ts` yozish**

```ts
import apiClient from '../../lib/api';
import type { AgreementInput, AgreementListResponse, ServiceAgreement } from './types';

const BASE = '/service-agreements';

export async function listAgreements(params: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AgreementListResponse> {
  const { data } = await apiClient.get<AgreementListResponse>(BASE, { params });
  return data;
}

export async function getAgreement(id: number): Promise<ServiceAgreement> {
  const { data } = await apiClient.get<ServiceAgreement>(`${BASE}/${id}`);
  return data;
}

export async function getNextNumber(year: number): Promise<string> {
  const { data } = await apiClient.get<{ agreementNumber: string }>(`${BASE}/next-number`, {
    params: { year },
  });
  return data.agreementNumber;
}

export async function createAgreement(input: AgreementInput): Promise<ServiceAgreement> {
  const { data } = await apiClient.post<ServiceAgreement>(BASE, input);
  return data;
}

export async function updateAgreement(id: number, input: Partial<AgreementInput>): Promise<ServiceAgreement> {
  const { data } = await apiClient.patch<ServiceAgreement>(`${BASE}/${id}`, input);
  return data;
}

export async function terminateAgreement(id: number, terminationReason: string): Promise<ServiceAgreement> {
  const { data } = await apiClient.post<ServiceAgreement>(`${BASE}/${id}/terminate`, { terminationReason });
  return data;
}
```

- [ ] **Step 3: Kompilyatsiyani tekshirish**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: faqat ma'lum baseline xatosi (`useInvoiceSave.ts(294,46)`). Boshqa xato bo'lmasin.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/serviceAgreement/types.ts frontend/src/features/serviceAgreement/api.ts
git commit -m "feat(frontend): add service agreement types and api client"
```

---

### Task 8: Token quruvchi

**Files:**
- Create: `frontend/src/features/serviceAgreement/tokens.ts`
- Create: `frontend/src/features/serviceAgreement/tokens.test.ts`

**Interfaces:**
- Consumes: `ServiceAgreement`, `TariffRow`, `PAYMENT_MODEL_LETTER` (Task 7)
- Produces: `AgreementTokens` interfeysi, `buildTokens(agreement: ServiceAgreement, bhmUzs: number): AgreementTokens`, `formatMoney(value: number): string`

- [ ] **Step 1: Testni yozish**

`frontend/src/features/serviceAgreement/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTokens, formatMoney } from './tokens';
import type { ServiceAgreement } from './types';

const agreement: ServiceAgreement = {
  id: 1, clientId: 1, agreementNumber: '2026/014', agreementDate: '2026-03-12T00:00:00.000Z',
  templateVersion: 'v1', status: 'ACTIVE', terminatedAt: null, terminationReason: null,
  customerName: 'AGRO EXPORT MCHJ', customerInn: '305123456', customerAddress: 'Farg\'ona',
  customerDirector: 'Aliyev A.A.', customerDirectorBasis: 'Устав', customerBankName: 'Ipoteka bank',
  customerBankAccount: '20208000...', customerMfo: '00123', customerOked: '46900',
  customerPhone: '+998901234567', customerEmail: 'a@b.uz',
  executorName: 'PRODEKLARANT MCHJ', executorInn: '311953399', executorAddress: 'Oltiariq',
  executorDirector: 'Турсунбоев О.У.', executorBankName: 'Universalbank',
  executorBankAccount: '20208000007207845001', executorMfo: '00973', executorOked: null,
  executorPhone: '+998911187007', executorEmail: 'oybek@prodeklarant.uz',
  paymentModel: 'MONTHLY', monthlyDueDay: 10, perCountThreshold: null, perCountDueDays: null,
  perAmountThreshold: null, perAmountDueDays: null, creditLimit: '20000000', prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Elektron BYuD', unit: '1 BYuD', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: 'Farg\'ona viloyati iqtisodiy sudi',
  brokerRegistryNumber: null, signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

describe('formatMoney', () => {
  it('uch xonalab ajratadi (uzluksiz probel bilan)', () => {
    expect(formatMoney(20000000)).toBe('20 000 000');
  });
  it('nolni to\'g\'ri beradi', () => {
    expect(formatMoney(0)).toBe('0');
  });
});

describe('buildTokens', () => {
  it('sanani kun.oy.yil ko\'rinishida beradi', () => {
    expect(buildTokens(agreement, 412000).agreementDate).toBe('12.03.2026');
  });

  it('to\'lov modeli harfini beradi', () => {
    expect(buildTokens(agreement, 412000).paymentModelLetter).toBe('B');
  });

  it('tarifni BHM dan so\'mga aylantiradi', () => {
    expect(buildTokens(agreement, 412000).mainTariffUzs).toBe('1 236 000');
  });

  it('kredit limitini formatlaydi', () => {
    expect(buildTokens(agreement, 412000).creditLimit).toBe('20 000 000');
  });

  it('bo\'sh maydonlarni chiziqcha bilan almashtiradi', () => {
    expect(buildTokens({ ...agreement, brokerRegistryNumber: null }, 412000).brokerRegistryNumber).toBe('');
    expect(buildTokens({ ...agreement, customerOked: null }, 412000).customerOked).toBe('—');
  });
});
```

- [ ] **Step 2: Testni ishga tushirib, yiqilishini ko'rish**

Run: `cd frontend && npx vitest run src/features/serviceAgreement/tokens.test.ts`
Expected: FAIL — `./tokens` moduli topilmadi.

- [ ] **Step 3: `tokens.ts` yozish**

```ts
import { PAYMENT_MODEL_LETTER, type ServiceAgreement, type TariffRow } from './types';

/** Shablon matnida ishlatiladigan barcha token — boshqasi yozilsa TypeScript ushlaydi */
export interface AgreementTokens {
  agreementNumber: string;
  agreementDate: string;
  signingPlace: string;

  customerName: string;
  customerInn: string;
  customerAddress: string;
  customerDirector: string;
  customerDirectorBasis: string;
  customerBankName: string;
  customerBankAccount: string;
  customerMfo: string;
  customerOked: string;
  customerPhone: string;
  customerEmail: string;

  executorName: string;
  executorInn: string;
  executorAddress: string;
  executorDirector: string;
  executorBankName: string;
  executorBankAccount: string;
  executorMfo: string;
  executorOked: string;
  executorPhone: string;
  executorEmail: string;

  paymentModelLetter: 'A' | 'B' | 'C' | 'D';
  monthlyDueDay: string;
  perCountThreshold: string;
  perCountDueDays: string;
  perAmountThreshold: string;
  perAmountDueDays: string;
  creditLimit: string;
  prepaidRevertDays: string;
  mainTariffBhm: string;
  mainTariffUzs: string;
  jurisdictionCourt: string;
  /** Bo'sh bo'lsa 2.3-bandning ikkinchi gapi PDF'dan tushadi */
  brokerRegistryNumber: string;

  /** Jadval bloklari uchun — matn tokeni emas */
  tariffs: TariffRow[];
  paymentModel: ServiceAgreement['paymentModel'];
  vatPayer: boolean;
}

/** `20 000 000` — uzluksiz probel, PDF'da qator o'rtasida uzilmasin */
export function formatMoney(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Bo'sh qiymat o'rniga chiziqcha — shartnomada bo'sh joy qolmasligi kerak */
const dash = (value: string | null | undefined): string => (value && value.trim() ? value : '—');

const numText = (value: number | null | undefined): string => (value == null ? '—' : String(value));

/** `2026-03-12T00:00:00.000Z` → `12.03.2026` */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/**
 * Shartnoma yozuvini shablon tokenlariga aylantiradi.
 * `bhmUzs` — shartnoma sanasida amalda bo'lgan BHM (5.3-band).
 */
export function buildTokens(a: ServiceAgreement, bhmUzs: number): AgreementTokens {
  const tariffBhm = Number(a.mainTariffBhm);
  return {
    agreementNumber: a.agreementNumber,
    agreementDate: formatDate(a.agreementDate),
    signingPlace: a.signingPlace,

    customerName: a.customerName,
    customerInn: dash(a.customerInn),
    customerAddress: dash(a.customerAddress),
    customerDirector: dash(a.customerDirector),
    customerDirectorBasis: dash(a.customerDirectorBasis),
    customerBankName: dash(a.customerBankName),
    customerBankAccount: dash(a.customerBankAccount),
    customerMfo: dash(a.customerMfo),
    customerOked: dash(a.customerOked),
    customerPhone: dash(a.customerPhone),
    customerEmail: dash(a.customerEmail),

    executorName: a.executorName,
    executorInn: dash(a.executorInn),
    executorAddress: dash(a.executorAddress),
    executorDirector: dash(a.executorDirector),
    executorBankName: dash(a.executorBankName),
    executorBankAccount: dash(a.executorBankAccount),
    executorMfo: dash(a.executorMfo),
    executorOked: dash(a.executorOked),
    executorPhone: dash(a.executorPhone),
    executorEmail: dash(a.executorEmail),

    paymentModelLetter: PAYMENT_MODEL_LETTER[a.paymentModel],
    monthlyDueDay: numText(a.monthlyDueDay),
    perCountThreshold: numText(a.perCountThreshold),
    perCountDueDays: numText(a.perCountDueDays),
    perAmountThreshold: a.perAmountThreshold ? formatMoney(Number(a.perAmountThreshold)) : '—',
    perAmountDueDays: numText(a.perAmountDueDays),
    creditLimit: a.creditLimit ? formatMoney(Number(a.creditLimit)) : '—',
    prepaidRevertDays: String(a.prepaidRevertDays),
    mainTariffBhm: String(tariffBhm),
    mainTariffUzs: formatMoney(tariffBhm * bhmUzs),
    jurisdictionCourt: dash(a.jurisdictionCourt),
    // Bu yerda `dash` ISHLATILMAYDI: bo'sh qiymat 2.3-bandni o'chirish signali
    brokerRegistryNumber: a.brokerRegistryNumber?.trim() ?? '',

    tariffs: a.tariffs,
    paymentModel: a.paymentModel,
    vatPayer: a.vatPayer,
  };
}
```

- [ ] **Step 4: Testni qayta ishga tushirish**

Run: `cd frontend && npx vitest run src/features/serviceAgreement/tokens.test.ts`
Expected: PASS — 8 test.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/serviceAgreement/tokens.ts frontend/src/features/serviceAgreement/tokens.test.ts
git commit -m "feat(frontend): add agreement token builder"
```

---

### Task 9: Shablon tizimi va `v1` matni

Bu rejadagi eng katta va eng muhim vazifa. Matn manbasi — `docs/shartnoma-shablon-2026.md`.

**Files:**
- Create: `frontend/src/features/serviceAgreement/templates/types.ts`
- Create: `frontend/src/features/serviceAgreement/templates/v1.ts`
- Create: `frontend/src/features/serviceAgreement/templates/index.ts`
- Create: `frontend/src/features/serviceAgreement/templates/v1.test.ts`

**Interfaces:**
- Consumes: `AgreementTokens` (Task 8)
- Produces:
  - `Block`, `AgreementTemplate`, `resolveText(text: string, tokens: AgreementTokens): string`, `visibleBlocks(template: AgreementTemplate, tokens: AgreementTokens): Block[]`
  - `getTemplate(version: string): AgreementTemplate`

- [ ] **Step 1: `types.ts` yozish**

```ts
import type { AgreementTokens } from '../tokens';

type Predicate = (t: AgreementTokens) => boolean;

export type Block =
  | { kind: 'heading'; level: 1 | 2; text: string; when?: Predicate }
  | { kind: 'paragraph'; text: string; when?: Predicate }
  | { kind: 'table'; header: string[]; widths: number[]; rows: (t: AgreementTokens) => string[][]; when?: Predicate }
  | { kind: 'signature'; when?: Predicate }
  | { kind: 'pageBreak'; when?: Predicate };

export interface AgreementTemplate {
  version: string;
  blocks: Block[];
}

/** Shablonda ishlatib bo'ladigan matn tokenlari (jadval/enum maydonlari bundan mustasno) */
type TextTokenKey = {
  [K in keyof AgreementTokens]: AgreementTokens[K] extends string ? K : never;
}[keyof AgreementTokens];

/**
 * `{{token}}` larni qiymatga almashtiradi.
 * Yechilmagan token qolsa — xato: bunday matn qog'ozga chiqmasligi kerak.
 */
export function resolveText(text: string, tokens: AgreementTokens): string {
  const out = text.replace(/\{\{(\w+)\}\}/g, (_full, key: string) => {
    const value = (tokens as Record<string, unknown>)[key];
    if (typeof value !== 'string') {
      throw new Error(`Shablonda noma'lum yoki matn bo'lmagan token: {{${key}}}`);
    }
    return value;
  });
  if (out.includes('{{')) {
    throw new Error(`Yechilmagan token qoldi: ${out.slice(out.indexOf('{{'), out.indexOf('{{') + 40)}`);
  }
  return out;
}

/** `when` shartidan o'tgan bloklar */
export function visibleBlocks(template: AgreementTemplate, tokens: AgreementTokens): Block[] {
  return template.blocks.filter((b) => (b.when ? b.when(tokens) : true));
}

export type { TextTokenKey };
```

- [ ] **Step 2: `v1.ts` yozish**

`docs/shartnoma-shablon-2026.md` ni ochib, uning **butun matnini** bloklarga ko'chiring. Quyida tuzilma va shartli bloklarning aniq ko'rinishi berilgan; qolgan bandlar shu naqshda davom ettiriladi.

```ts
import type { AgreementTemplate } from './types';

/**
 * 2026-yil tahriridagi shartnoma matni. Manba: docs/shartnoma-shablon-2026.md
 *
 * MUHIM: imzolangan shartnoma aynan shu versiyada qayta chiqishi kerak.
 * Matnni o'zgartirish kerak bo'lsa — YANGI fayl (`v2.ts`) yarating, bu faylga
 * tegmang. Bu fayldagi tuzatish avval imzolangan hujjatlarni ham o'zgartiradi.
 */
export const v1: AgreementTemplate = {
  version: 'v1',
  blocks: [
    { kind: 'heading', level: 1, text: 'ХИЗМАТ КЎРСАТИШ ШАРТНОМАСИ № {{agreementNumber}}' },
    { kind: 'paragraph', text: '(божхона мақсадлари учун ҳужжатларни тайёрлаш ва расмийлаштириш бўйича)' },
    { kind: 'paragraph', text: '{{signingPlace}}                    {{agreementDate}}' },
    {
      kind: 'paragraph',
      text:
        'Кейинги ўринларда **«Бажарувчи»** деб юритиладиган {{executorName}} номидан Устав асосида ' +
        'фаолият кўрсатувчи директор **{{executorDirector}}** бир томондан, ва кейинги ўринларда ' +
        '**«Буюртмачи»** деб юритиладиган **{{customerName}}** (СТИР: {{customerInn}}) номидан ' +
        '{{customerDirectorBasis}} асосида фаолият кўрсатувчи **{{customerDirector}}** иккинчи томондан, ' +
        'биргаликда **«Томонлар»** деб юритилиб, ушбу шартномани қуйидаги мазмунда туздилар.',
    },

    { kind: 'heading', level: 2, text: '2. ШАРТНОМА ПРЕДМЕТИ' },
    // …2.1 va 2.2 bandlari…
    // 2.3-band: umumiy matn bitta joyda, faqat maqomni belgilovchi oxirgi gap
    // shartli. Reestr raqami kiritilmagan bo'lsa firma o'zini broker deb
    // ko'rsatmasligi kerak — bu huquqiy talab, kosmetik tanlov emas.
    {
      kind: 'paragraph',
      text:
        '2.3. **Хизматларнинг чегараси.** Бажарувчи божхона органларининг қарорларини қабул қилмайди ва ' +
        'уларга таъсир кўрсата олмайди.',
    },
    {
      kind: 'paragraph',
      text: 'Бажарувчи божхона брокери сифатида фаолият юритади ва тегишли реестрга {{brokerRegistryNumber}} рақами билан киритилган.',
      when: (t) => t.brokerRegistryNumber !== '',
    },
    {
      kind: 'paragraph',
      text: 'Бажарувчи Буюртмачининг ишончли вакили сифатида ҳужжатларни тайёрлайди ва топширади.',
      when: (t) => t.brokerRegistryNumber === '',
    },

    { kind: 'heading', level: 2, text: '5.5. Тўлов модели' },
    {
      kind: 'paragraph',
      text:
        '5.5.1. Томонлар қуйидаги тўлов моделларидан бирини танлайдилар. **Танланган модель: ' +
        '{{paymentModelLetter}}**',
    },
    {
      kind: 'table',
      header: ['Белги', 'Модель', 'Тўлов муддати'],
      widths: [10, 30, 60],
      rows: (t) => [
        ['A', 'Олдиндан тўлов', 'Хизмат бошланишидан олдин 100%'],
        ['B', 'Ойлик (постпайд)', `Кейинги ойнинг ${t.monthlyDueDay}-санасигача`],
        ['C', 'Хизмат сони бўйича', `Ҳар ${t.perCountThreshold} та иш, кейинги ${t.perCountDueDays} банк куни ичида`],
        ['D', 'Сумма бўйича', `Қолдиқ ${t.perAmountThreshold} сўмга етганда, ${t.perAmountDueDays} банк куни ичида`],
      ],
    },
    {
      kind: 'paragraph',
      text:
        '5.5.3. **Кредит лимити.** Буюртмачининг тўланмаган қарзи бир вақтнинг ўзида {{creditLimit}} ' +
        'сўмдан ошмаслиги керак. Лимит ошиб кетганда Бажарувчи янги Буюртма-аризаларни қабул қилишни ' +
        'тўхтатиб туриш ҳуқуқига эга.',
      // A modelida qarz umuman yig'ilmaydi — bu band ma'nosiz
      when: (t) => t.paymentModel !== 'PREPAID',
    },
    {
      kind: 'paragraph',
      text:
        '5.5.4. **Олдиндан тўловга қайтариш.** Буюртмачи тўлов муддатини {{prepaidRevertDays}} кундан ' +
        'ортиқ кечиктирса, Бажарувчи кейинги буюртмаларни A моделига ўтказиш ҳуқуқига эга.',
      when: (t) => t.paymentModel !== 'PREPAID',
    },

    {
      kind: 'paragraph',
      text:
        '5.4. **ҚҚС.** Бажарувчи қўшилган қиймат солиғи тўловчиси эмас. Барча нархлар **ҚҚСсиз** ' +
        'белгиланган, электрон ҳисоб-фактуралар ҚҚС ажратилмаган ҳолда расмийлаштирилади.',
      when: (t) => !t.vatPayer,
    },

    { kind: 'heading', level: 2, text: '13. НИЗОЛАРНИ ҲАЛ ЭТИШ' },
    {
      kind: 'paragraph',
      text:
        '13.4. Даъво тартибида ҳал этилмаган низолар {{jurisdictionCourt}} томонидан кўриб чиқилади.',
    },

    { kind: 'heading', level: 2, text: '17. ТОМОНЛАРНИНГ РЕКВИЗИТЛАРИ' },
    {
      kind: 'table',
      header: ['БАЖАРУВЧИ', 'БУЮРТМАЧИ'],
      widths: [50, 50],
      rows: (t) => [
        [t.executorName, t.customerName],
        [`Манзил: ${t.executorAddress}`, `Манзил: ${t.customerAddress}`],
        [`СТИР: ${t.executorInn}`, `СТИР: ${t.customerInn}`],
        [`Банк: ${t.executorBankName}`, `Банк: ${t.customerBankName}`],
        [`Ҳ/р: ${t.executorBankAccount}`, `Ҳ/р: ${t.customerBankAccount}`],
        [`МФО: ${t.executorMfo}`, `МФО: ${t.customerMfo}`],
        [`Тел: ${t.executorPhone}`, `Тел: ${t.customerPhone}`],
        [`E-mail: ${t.executorEmail}`, `E-mail: ${t.customerEmail}`],
      ],
    },
    { kind: 'signature' },

    { kind: 'pageBreak' },
    { kind: 'heading', level: 1, text: '1-ИЛОВА — ТАРИФЛАР' },
    {
      kind: 'paragraph',
      text:
        'Нархлар БҲМга нисбатан коэффициентда, хизмат кўрсатилган санадаги БҲМ бўйича ҳисобланади. ' +
        'Барча нархлар ҚҚСсиз.',
    },
    {
      kind: 'table',
      header: ['№', 'Хизмат номи', 'Ўлчов бирлиги', 'Нархи (БҲМ)'],
      widths: [8, 52, 20, 20],
      rows: (t) => t.tariffs.map((row, i) => [String(i + 1), row.name, row.unit, String(row.bhm)]),
    },
    { kind: 'signature' },
  ],
};
```

**Qolgan bandlar.** Yuqoridagi ro'yxatda `…` bilan belgilangan joylarga `docs/shartnoma-shablon-2026.md` dagi qolgan barcha bo'limlarni (1, 3, 4, 5.1–5.3, 5.6–5.10, 6–12, 14–16 va 2–5-ilovalar) shu naqshda ko'chiring: sarlavha → `heading`, band → `paragraph`, jadval → `table`, imzo qatori → `signature`, ilova boshi → `pageBreak` + `heading`. Shartli `when` faqat yuqorida ko'rsatilgan to'rt joyda ishlatiladi.

- [ ] **Step 3: `index.ts` yozish**

```ts
import type { AgreementTemplate } from './types';
import { v1 } from './v1';

const TEMPLATES: Record<string, AgreementTemplate> = { v1 };

/** Eng so'nggi versiya — yangi shartnomalar shu bilan yaratiladi */
export const CURRENT_TEMPLATE_VERSION = 'v1';

/**
 * Imzolangan shartnoma AYNAN o'z versiyasida qayta chiqishi kerak, shuning
 * uchun noma'lum versiyada eng so'nggisiga tushib qolmaymiz — xato beramiz.
 */
export function getTemplate(version: string): AgreementTemplate {
  const template = TEMPLATES[version];
  if (!template) throw new Error(`Noma'lum shablon versiyasi: ${version}`);
  return template;
}

export { v1 };
```

- [ ] **Step 4: Shablon testini yozish**

`frontend/src/features/serviceAgreement/templates/v1.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getTemplate, CURRENT_TEMPLATE_VERSION } from './index';
import { resolveText, visibleBlocks } from './types';
import { buildTokens } from '../tokens';
import type { ServiceAgreement } from '../types';

const base: ServiceAgreement = {
  id: 1, clientId: 1, agreementNumber: '2026/014', agreementDate: '2026-03-12T00:00:00.000Z',
  templateVersion: 'v1', status: 'ACTIVE', terminatedAt: null, terminationReason: null,
  customerName: 'AGRO EXPORT MCHJ', customerInn: '305123456', customerAddress: 'Farg\'ona',
  customerDirector: 'Aliyev A.A.', customerDirectorBasis: 'Устав', customerBankName: 'Ipoteka bank',
  customerBankAccount: '20208', customerMfo: '00123', customerOked: '46900',
  customerPhone: '+998901234567', customerEmail: 'a@b.uz',
  executorName: 'PRODEKLARANT MCHJ', executorInn: '311953399', executorAddress: 'Oltiariq',
  executorDirector: 'Турсунбоев О.У.', executorBankName: 'Universalbank',
  executorBankAccount: '20208000007207845001', executorMfo: '00973', executorOked: null,
  executorPhone: '+998911187007', executorEmail: 'oybek@prodeklarant.uz',
  paymentModel: 'MONTHLY', monthlyDueDay: 10, perCountThreshold: 5, perCountDueDays: 3,
  perAmountThreshold: '20000000', perAmountDueDays: 3, creditLimit: '20000000', prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Elektron BYuD', unit: '1 BYuD', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: 'Farg\'ona viloyati iqtisodiy sudi',
  brokerRegistryNumber: null, signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

/** Shablonni to'liq yechib, hosil bo'lgan matnni qaytaradi */
function renderAll(agreement: ServiceAgreement): string {
  const tokens = buildTokens(agreement, 412000);
  const template = getTemplate(agreement.templateVersion);
  return visibleBlocks(template, tokens)
    .map((block) => {
      if (block.kind === 'heading' || block.kind === 'paragraph') return resolveText(block.text, tokens);
      if (block.kind === 'table') return block.rows(tokens).flat().join(' ');
      return '';
    })
    .join('\n');
}

describe('v1 shabloni', () => {
  it('barcha tokenlar yechiladi, {{...}} qolmaydi', () => {
    const text = renderAll(base);
    expect(text).not.toContain('{{');
  });

  it('to\'lov modeli harfi matnga tushadi', () => {
    expect(renderAll(base)).toContain('Танланган модель: B');
  });

  it('kredit limiti bandi PREPAID modelida chiqmaydi', () => {
    expect(renderAll(base)).toContain('Кредит лимити');
    expect(renderAll({ ...base, paymentModel: 'PREPAID' })).not.toContain('Кредит лимити');
  });

  it('reestr raqami bo\'lmasa broker bandi vakil bandiga almashadi', () => {
    const without = renderAll(base);
    expect(without).toContain('ишончли вакили');
    expect(without).not.toContain('реестрга');

    const with_ = renderAll({ ...base, brokerRegistryNumber: '№ 123' });
    expect(with_).toContain('реестрга');
    expect(with_).not.toContain('ишончли вакили');
  });

  it('QQS bandi vatPayer=false da chiqadi', () => {
    expect(renderAll(base)).toContain('ҚҚС тўловчиси эмас');
    expect(renderAll({ ...base, vatPayer: true })).not.toContain('ҚҚС тўловчиси эмас');
  });

  it('tarif jadvali qatorlari chiqadi', () => {
    expect(renderAll(base)).toContain('Elektron BYuD');
  });

  it('noma\'lum versiyada xato beradi', () => {
    expect(() => getTemplate('v99')).toThrow(/Noma'lum shablon versiyasi/);
  });

  it('joriy versiya mavjud', () => {
    expect(getTemplate(CURRENT_TEMPLATE_VERSION).version).toBe('v1');
  });
});
```

- [ ] **Step 5: Testni ishga tushirish**

Run: `cd frontend && npx vitest run src/features/serviceAgreement/templates/v1.test.ts`
Expected: PASS — 8 test. Agar `{{` qolgani haqida xato chiqsa, `v1.ts` da o'sha token nomi `AgreementTokens` da yo'q demakdir.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/serviceAgreement/templates
git commit -m "feat(frontend): add versioned agreement template system with v1 text"
```

---

### Task 10: PDF renderer

**Files:**
- Create: `frontend/src/features/serviceAgreement/pdf/agreementPdfStyles.ts`
- Create: `frontend/src/features/serviceAgreement/pdf/AgreementPdfDocument.tsx`
- Create: `frontend/src/features/serviceAgreement/pdf/renderAgreementPdf.ts`

**Interfaces:**
- Consumes: `PDF_FONT_STACK` (Task 6), `AgreementTokens`/`buildTokens` (Task 8), `getTemplate`/`resolveText`/`visibleBlocks` (Task 9), `deepNormalizeStrings` (`frontend/src/utils/textNormalize.ts`), `findMissingGlyphs`/`PdfMissingGlyphError` (`frontend/src/components/invoice/pdf/pdfGlyphCheck.ts`), `PdfLayoutNode` (`.../pdfLayout.ts`)
- Produces: `renderAgreementPdf(agreement: ServiceAgreement, bhmUzs: number): Promise<Blob>`

- [ ] **Step 1: `agreementPdfStyles.ts` yozish**

```ts
import { StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_STACK } from '../../../components/pdf/fonts';

/**
 * Invoysdan farqli o'laroq bu yerda masshtablash YO'Q. Invoysda `pdfFit` matnni
 * bir betga sig'dirish uchun bir necha marta qayta chizadi; shartnoma esa
 * tabiiy ravishda ko'p betli yuridik hujjat — shrift qat'iy, betlar o'zi
 * bo'linadi.
 */
export const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: PDF_FONT_STACK,
    fontSize: 11,
    lineHeight: 1.45,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  h1: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, marginTop: 4 },
  h2: { fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  bold: { fontWeight: 'bold' },
  table: { width: '100%', borderWidth: 0.75, borderColor: '#9ca3af', marginVertical: 6 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: '#9ca3af' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  tableCell: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 10 },
  tableCellHeader: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 10, fontWeight: 'bold' },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  signatureCol: { width: '45%' },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: '#111827', marginTop: 26, paddingTop: 3, fontSize: 10 },
  pageNumber: { position: 'absolute', bottom: 24, right: 56, fontSize: 9, color: '#6b7280' },
});
```

- [ ] **Step 2: `AgreementPdfDocument.tsx` yozish**

```tsx
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './agreementPdfStyles';
import type { AgreementTokens } from '../tokens';
import type { AgreementTemplate } from '../templates/types';
import { resolveText, visibleBlocks } from '../templates/types';

export interface AgreementPdfDocumentProps {
  template: AgreementTemplate;
  tokens: AgreementTokens;
  /** @react-pdf ichki layout daraxti — glif tekshiruvi uchun */
  onRender?: (info: { _INTERNAL__LAYOUT__DATA_?: unknown }) => void;
}

/** `**qalin**` bo'laklarini ajratadi. Boshqa markdown belgilari qo'llanilmaydi. */
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>
    ) : (
      <Text key={i}>{part}</Text>
    ),
  );
}

export const AgreementPdfDocument: React.FC<AgreementPdfDocumentProps> = ({ template, tokens, onRender }) => (
  <Document onRender={onRender}>
    <Page size="A4" style={styles.page}>
      {visibleBlocks(template, tokens).map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Text key={index} style={block.level === 1 ? styles.h1 : styles.h2}>
                {resolveText(block.text, tokens)}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={index} style={styles.paragraph}>
                {renderInline(resolveText(block.text, tokens))}
              </Text>
            );
          case 'table':
            return (
              <View key={index} style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  {block.header.map((cell, c) => (
                    <Text key={c} style={[styles.tableCellHeader, { width: `${block.widths[c]}%` }]}>{cell}</Text>
                  ))}
                </View>
                {block.rows(tokens).map((row, r) => (
                  <View key={r} style={styles.tableRow}>
                    {row.map((cell, c) => (
                      <Text key={c} style={[styles.tableCell, { width: `${block.widths[c]}%` }]}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          case 'signature':
            return (
              <View key={index} style={styles.signatureRow}>
                <View style={styles.signatureCol}>
                  <Text style={styles.signatureLine}>Бажарувчи: {tokens.executorDirector}</Text>
                </View>
                <View style={styles.signatureCol}>
                  <Text style={styles.signatureLine}>Буюртмачи: {tokens.customerDirector}</Text>
                </View>
              </View>
            );
          case 'pageBreak':
            return <View key={index} break />;
          default:
            return null;
        }
      })}
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  </Document>
);
```

- [ ] **Step 3: `renderAgreementPdf.ts` yozish**

```ts
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { AgreementPdfDocument } from './AgreementPdfDocument';
import { getTemplate } from '../templates';
import { buildTokens } from '../tokens';
import type { ServiceAgreement } from '../types';
import { deepNormalizeStrings } from '../../../utils/textNormalize';
import { findMissingGlyphs, PdfMissingGlyphError } from '../../../components/invoice/pdf/pdfGlyphCheck';
import type { PdfLayoutNode } from '../../../components/invoice/pdf/pdfLayout';

/**
 * Shartnoma PDF'ini yaratadi.
 *
 * Matn avval NFKC bilan normallashtiriladi, chizilgandan keyin esa shriftda
 * glifi yo'q belgi qolmaganiga ishonch hosil qilinadi — topilsa PDF UMUMAN
 * yaratilmaydi. Noto'g'ri hujjat chiqib ketgandan ko'ra yaratmaslik xavfsizroq
 * (qarang: components/invoice/pdf/pdfGlyphCheck.ts).
 */
export async function renderAgreementPdf(agreement: ServiceAgreement, bhmUzs: number): Promise<Blob> {
  const clean = deepNormalizeStrings(agreement);
  const tokens = deepNormalizeStrings(buildTokens(clean, bhmUzs));
  const template = getTemplate(clean.templateVersion);

  let layout: PdfLayoutNode | undefined;
  const doc = React.createElement(AgreementPdfDocument, {
    template,
    tokens,
    onRender: (info) => { layout = info._INTERNAL__LAYOUT__DATA_ as PdfLayoutNode | undefined; },
  });

  const blob = await pdf(doc).toBlob();

  const missing = findMissingGlyphs(layout);
  if (missing.length > 0) throw new PdfMissingGlyphError(missing);

  return blob;
}
```

- [ ] **Step 4: Kompilyatsiyani tekshirish**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: faqat ma'lum baseline xatosi (`useInvoiceSave.ts(294,46)`). Boshqa xato bo'lmasin.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/serviceAgreement/pdf
git commit -m "feat(frontend): add agreement PDF renderer"
```

---

### Task 11: Ro'yxat sahifasi

**Files:**
- Create: `frontend/src/pages/ServiceAgreements.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx:353` atrofida

**Interfaces:**
- Consumes: `listAgreements` (Task 7), `renderAgreementPdf` (Task 10)
- Produces: `/shartnomalar` route

- [ ] **Step 1: Sahifani yozish**

`frontend/src/pages/ServiceAgreements.tsx` — asosiy tuzilma:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { listAgreements } from '../features/serviceAgreement/api';
import { renderAgreementPdf } from '../features/serviceAgreement/pdf/renderAgreementPdf';
import { PAYMENT_MODEL_LETTER, STATUS_LABEL, type AgreementStatus, type ServiceAgreement } from '../features/serviceAgreement/types';
import { PdfMissingGlyphError, describeMissingGlyphs } from '../components/invoice/pdf/pdfGlyphCheck';

const STATUS_FILTERS: Array<{ key: '' | AgreementStatus; label: string }> = [
  { key: '', label: 'Hammasi' },
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'DRAFT', label: 'Qoralama' },
  { key: 'TERMINATED', label: 'Bekor' },
];

export default function ServiceAgreements() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'' | AgreementStatus>('');
  const [items, setItems] = useState<ServiceAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [bhmUzs, setBhmUzs] = useState(0);

  // Qidiruv har harfda so'rov yubormasligi uchun
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAgreements({ q: debounced, status, limit: 100 })
      .then((res) => { if (!cancelled) setItems(res.items); })
      .catch(() => { if (!cancelled) toast.error('Shartnomalarni yuklab bo\'lmadi'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, status]);

  // Tarif ustunidagi so'm ekvivalenti uchun joriy BHM
  useEffect(() => {
    apiClient.get('/bxm/current')
      .then(({ data }) => setBhmUzs(Number(data.amountUzs) || 0))
      .catch(() => setBhmUzs(0));
  }, []);

  const handlePdf = async (agreement: ServiceAgreement) => {
    try {
      const blob = await renderAgreementPdf(agreement, bhmUzs);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Shartnoma-${agreement.agreementNumber.replace('/', '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof PdfMissingGlyphError) {
        toast.error(describeMissingGlyphs(error.missing), { duration: 12000 });
        return;
      }
      toast.error('PDF yaratishda xatolik');
    }
  };

  const formatMoney = useMemo(
    () => (value: string | null) => (value ? Number(value).toLocaleString('ru-RU') : '—'),
    [],
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Shartnomalar</h1>
        <button
          onClick={() => navigate('/shartnomalar/yangi')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="text-xl" />
          Yangi shartnoma
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Icon icon="solar:magnifer-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Korxona, INN yoki shartnoma raqami…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm ${status === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500">Yuklanmoqda…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center">
          <p className="mb-3 text-gray-600">Hali shartnoma yo'q</p>
          <Link to="/shartnomalar/yangi" className="text-blue-600 hover:underline">Birinchisini yarating</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Korxona</th>
                <th className="px-4 py-3">INN</th>
                <th className="px-4 py-3">№ / Sana</th>
                <th className="px-4 py-3">Tarif</th>
                <th className="px-4 py-3">Kredit limiti</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className={`border-t border-gray-100 ${a.status === 'TERMINATED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{a.customerName}</td>
                  <td className="px-4 py-3">{a.customerInn || '—'}</td>
                  <td className="px-4 py-3">
                    <div>{a.agreementNumber}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(a.agreementDate).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{Number(a.mainTariffBhm)} BHM</div>
                    <div className="text-xs text-gray-500">
                      {bhmUzs ? (Number(a.mainTariffBhm) * bhmUzs).toLocaleString('ru-RU') : '—'} so'm
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatMoney(a.creditLimit)}</td>
                  <td className="px-4 py-3">{PAYMENT_MODEL_LETTER[a.paymentModel]}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[a.status]}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handlePdf(a)} title="PDF" className="rounded p-1.5 hover:bg-gray-100">
                        <Icon icon="solar:file-download-bold-duotone" className="text-xl text-gray-600" />
                      </button>
                      <Link to={`/shartnomalar/${a.id}`} title="Ochish" className="rounded p-1.5 hover:bg-gray-100">
                        <Icon icon="solar:pen-new-square-bold-duotone" className="text-xl text-gray-600" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Route qo'shish**

`frontend/src/App.tsx` — lazy import bloki (47-qator atrofida):

```tsx
const ServiceAgreements = lazy(() => import('./pages/ServiceAgreements'));
```

Route bloki (`/clients` route'lari yoniga). `allowedRoles` **berilmaydi** — sahifa barcha uchun ochiq:

```tsx
<Route path="/shartnomalar" element={<ProtectedRoute><ServiceAgreements /></ProtectedRoute>} />
```

Muharrir route'lari bu vazifada qo'shilmaydi — ular Task 12 da, muharrirning o'zi bilan birga keladi. Shu sababli ro'yxatdagi "Ochish" havolasi va "Yangi shartnoma" tugmasi Task 12 gacha 404 beradi; bu kutilgan oraliq holat.

- [ ] **Step 3: Yon menyuga qo'shish**

`frontend/src/components/Layout.tsx`, 353-qator yonidagi massivga (rol sharti yo'q):

```tsx
    { path: '/shartnomalar', label: 'Shartnomalar', icon: 'solar:document-text-bold-duotone', group: 'Savdo va CRM' },
```

- [ ] **Step 4: Tekshirish**

Run: `cd frontend && npx tsc -b --noEmit` (faqat baseline `useInvoiceSave.ts` xatosi bo'lsin), so'ng `npm run dev`
Brauzerda `/shartnomalar` sahifasini oching.
Expected: sahifa ochiladi, bo'sh holat ko'rinadi, yon menyuda "Shartnomalar" bandi bor. "Ochish" havolasi hozircha ishlamaydi — muharrir Task 12 da qo'shiladi.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ServiceAgreements.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx
git commit -m "feat(frontend): add service agreements list page"
```

---

### Task 12: Muharrir — forma va jonli preview

**Files:**
- Create: `frontend/src/components/serviceAgreement/AgreementPreview.tsx`
- Create: `frontend/src/pages/ServiceAgreementEditor.tsx`
- Modify: `frontend/src/App.tsx` (muharrir route'lari)

**Interfaces:**
- Consumes: `getAgreement`/`createAgreement`/`updateAgreement`/`getNextNumber` (Task 7), `renderAgreementPdf` (Task 10)
- Produces: `/shartnomalar/yangi` va `/shartnomalar/:id` sahifalari

- [ ] **Step 1: `AgreementPreview.tsx` yozish**

```tsx
import { useEffect, useState } from 'react';
import { renderAgreementPdf } from '../../features/serviceAgreement/pdf/renderAgreementPdf';
import { PdfMissingGlyphError, describeMissingGlyphs } from '../invoice/pdf/pdfGlyphCheck';
import type { ServiceAgreement } from '../../features/serviceAgreement/types';

interface Props {
  agreement: ServiceAgreement;
  bhmUzs: number;
}

/**
 * Jonli preview. Ko'rinayotgan narsa — yuklab olinadigan PDF'ning O'ZI:
 * ikkinchi (HTML) renderer yo'q, shuning uchun preview bilan hujjat ajralib
 * keta olmaydi. Har tugma bosilishida qayta chizmaslik uchun 500ms debounce.
 */
export default function AgreementPreview({ agreement, bhmUzs }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setPending(true);

    const timer = setTimeout(() => {
      renderAgreementPdf(agreement, bhmUzs)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setError('');
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof PdfMissingGlyphError ? describeMissingGlyphs(err.missing) : 'PDF yaratilmadi');
        })
        .finally(() => { if (!cancelled) setPending(false); });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [agreement, bhmUzs]);

  if (error) {
    return <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</pre>;
  }

  return (
    <div className="relative h-[calc(100vh-160px)] rounded-lg border border-gray-200 bg-gray-50">
      {pending && (
        <span className="absolute right-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-xs text-gray-500">
          Yangilanmoqda…
        </span>
      )}
      {url && <iframe src={url} title="Shartnoma" className="h-full w-full rounded-lg" />}
    </div>
  );
}
```

- [ ] **Step 2: Muharrir sahifasini yozish**

`frontend/src/pages/ServiceAgreementEditor.tsx` — asosiy tuzilma. Forma holati to'liq `ServiceAgreement` shaklida saqlanadi, shunda preview'ga to'g'ridan-to'g'ri uzatiladi.

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import AgreementPreview from '../components/serviceAgreement/AgreementPreview';
import { createAgreement, getAgreement, getNextNumber, updateAgreement } from '../features/serviceAgreement/api';
import { CURRENT_TEMPLATE_VERSION } from '../features/serviceAgreement/templates';
import { PAYMENT_MODEL_LABEL, type PaymentModel, type ServiceAgreement } from '../features/serviceAgreement/types';

const EMPTY: ServiceAgreement = {
  id: 0, clientId: 0, agreementNumber: '', agreementDate: new Date().toISOString(),
  templateVersion: CURRENT_TEMPLATE_VERSION, status: 'DRAFT', terminatedAt: null, terminationReason: null,
  customerName: '', customerInn: null, customerAddress: null, customerDirector: null,
  customerDirectorBasis: 'Устав', customerBankName: null, customerBankAccount: null,
  customerMfo: null, customerOked: null, customerPhone: null, customerEmail: null,
  executorName: '', executorInn: null, executorAddress: null, executorDirector: null,
  executorBankName: null, executorBankAccount: null, executorMfo: null, executorOked: null,
  executorPhone: null, executorEmail: null,
  paymentModel: 'PREPAID', monthlyDueDay: null, perCountThreshold: null, perCountDueDays: null,
  perAmountThreshold: null, perAmountDueDays: null, creditLimit: null, prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Электрон БЮД расмийлаштириш', unit: '1 БЮД', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: null, brokerRegistryNumber: null,
  signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

interface ClientOption {
  id: number; name: string; inn: string | null; address: string | null;
  bankName: string | null; bankAccount: string | null; email: string | null; phone: string | null;
  director: string | null; mfo: string | null; oked: string | null;
}

export default function ServiceAgreementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<ServiceAgreement>(EMPTY);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [bhmUzs, setBhmUzs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncToClient, setSyncToClient] = useState(false);

  const set = <K extends keyof ServiceAgreement>(key: K, value: ServiceAgreement[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Boshlang'ich yuklash: mavjud shartnoma yoki yangi uchun raqam + kompaniya rekvizitlari
  useEffect(() => {
    apiClient.get('/bxm/current').then(({ data }) => setBhmUzs(Number(data.amountUzs) || 0)).catch(() => setBhmUzs(0));
    apiClient.get<ClientOption[]>('/clients').then(({ data }) => setClients(data)).catch(() => setClients([]));

    if (id) {
      getAgreement(Number(id)).then(setForm).catch(() => toast.error('Shartnoma topilmadi'));
      return;
    }
    const year = new Date().getFullYear();
    Promise.all([getNextNumber(year), apiClient.get('/company-settings')])
      .then(([number, { data: company }]) => {
        setForm((prev) => ({
          ...prev,
          agreementNumber: number,
          executorName: company.name ?? '',
          executorInn: company.inn ?? null,
          executorAddress: company.legalAddress ?? null,
          executorBankName: company.bankName ?? null,
          executorBankAccount: company.bankAccount ?? null,
          executorPhone: company.phone ?? null,
          executorEmail: company.email ?? null,
        }));
      })
      .catch(() => toast.error('Boshlang\'ich ma\'lumotlarni yuklab bo\'lmadi'));
  }, [id]);

  /** Mijoz tanlanganda rekvizitlar ko'chiriladi — keyin ular mustaqil tahrirlanadi (snapshot) */
  const pickClient = (clientId: number) => {
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    setForm((prev) => ({
      ...prev,
      clientId: c.id,
      customerName: c.name,
      customerInn: c.inn,
      customerAddress: c.address,
      customerBankName: c.bankName,
      customerBankAccount: c.bankAccount,
      customerPhone: c.phone,
      customerEmail: c.email,
      customerDirector: c.director,
      customerMfo: c.mfo,
      customerOked: c.oked,
    }));
  };

  const save = async () => {
    if (!form.clientId) return toast.error('Mijozni tanlang');
    if (!form.customerName.trim()) return toast.error('Korxona nomi kerak');
    if (form.paymentModel === 'MONTHLY' && !form.monthlyDueDay) return toast.error('Oyning sanasini kiriting');
    if (form.paymentModel === 'PER_COUNT' && (!form.perCountThreshold || !form.perCountDueDays))
      return toast.error('Ish soni va to\'lov muddatini kiriting');
    if (form.paymentModel === 'PER_AMOUNT' && (!form.perAmountThreshold || !form.perAmountDueDays))
      return toast.error('Summa va to\'lov muddatini kiriting');

    setSaving(true);
    try {
      const payload = {
        ...form,
        mainTariffBhm: Number(form.mainTariffBhm),
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        perAmountThreshold: form.perAmountThreshold ? Number(form.perAmountThreshold) : undefined,
      };
      const saved = id
        ? await updateAgreement(Number(id), payload)
        : await createAgreement(payload);

      if (syncToClient) {
        await apiClient.put(`/clients/${form.clientId}`, {
          director: form.customerDirector,
          mfo: form.customerMfo,
          oked: form.customerOked,
        });
      }

      toast.success('Saqlandi');
      navigate(`/shartnomalar/${saved.id}`);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status;
      toast.error(status === 409 ? 'Bu shartnoma raqami allaqachon band' : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* 1. Mijoz va rekvizitlar */}
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">1. Mijoz va rekvizitlar</h2>
          <select
            value={form.clientId || ''}
            onChange={(e) => pickClient(Number(e.target.value))}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Mijozni tanlang</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Korxona nomi" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerInn ?? ''} onChange={(e) => set('customerInn', e.target.value)} placeholder="INN" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerDirector ?? ''} onChange={(e) => set('customerDirector', e.target.value)} placeholder="Direktor F.I.Sh." className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerMfo ?? ''} onChange={(e) => set('customerMfo', e.target.value)} placeholder="MFO" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerOked ?? ''} onChange={(e) => set('customerOked', e.target.value)} placeholder="OKED" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerAddress ?? ''} onChange={(e) => set('customerAddress', e.target.value)} placeholder="Manzil" className="rounded-lg border border-gray-300 px-3 py-2" />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={syncToClient} onChange={(e) => setSyncToClient(e.target.checked)} />
            Direktor, MFO va OKED ni mijoz kartochkasiga ham saqlash
          </label>
        </section>

        {/* 2. To'lov modeli */}
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">2. To'lov modeli</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(PAYMENT_MODEL_LABEL) as PaymentModel[]).map((model) => (
              <button
                key={model}
                onClick={() => set('paymentModel', model)}
                className={`rounded-lg px-3 py-2 text-sm ${form.paymentModel === model ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {PAYMENT_MODEL_LABEL[model]}
              </button>
            ))}
          </div>

          {form.paymentModel === 'MONTHLY' && (
            <input type="number" min={1} max={28} value={form.monthlyDueDay ?? ''} onChange={(e) => set('monthlyDueDay', Number(e.target.value) || null)} placeholder="Oyning sanasi (1–28)" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          )}
          {form.paymentModel === 'PER_COUNT' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" value={form.perCountThreshold ?? ''} onChange={(e) => set('perCountThreshold', Number(e.target.value) || null)} placeholder="Necha ta ishda" className="rounded-lg border border-gray-300 px-3 py-2" />
              <input type="number" value={form.perCountDueDays ?? ''} onChange={(e) => set('perCountDueDays', Number(e.target.value) || null)} placeholder="Necha bank kuni ichida" className="rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          )}
          {form.paymentModel === 'PER_AMOUNT' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" value={form.perAmountThreshold ?? ''} onChange={(e) => set('perAmountThreshold', e.target.value || null)} placeholder="Qaysi summada (so'm)" className="rounded-lg border border-gray-300 px-3 py-2" />
              <input type="number" value={form.perAmountDueDays ?? ''} onChange={(e) => set('perAmountDueDays', Number(e.target.value) || null)} placeholder="Necha bank kuni ichida" className="rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          )}
          {form.paymentModel !== 'PREPAID' && (
            <input type="number" value={form.creditLimit ?? ''} onChange={(e) => set('creditLimit', e.target.value || null)} placeholder="Kredit limiti (so'm)" className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2" />
          )}
        </section>

        {/* 3. Qo'shimcha shartlar */}
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">3. Qo'shimcha shartlar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.mainTariffBhm} onChange={(e) => set('mainTariffBhm', e.target.value)} placeholder="BYuD tarifi (BHM)" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.jurisdictionCourt ?? ''} onChange={(e) => set('jurisdictionCourt', e.target.value)} placeholder="Sud" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.brokerRegistryNumber ?? ''} onChange={(e) => set('brokerRegistryNumber', e.target.value)} placeholder="Broker reestri raqami (bo'sh — 2.3-band tushadi)" className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2" />
          </div>
        </section>

        <button onClick={save} disabled={saving} className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <AgreementPreview agreement={form} bhmUzs={bhmUzs} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Muharrir route'larini qo'shish**

`frontend/src/App.tsx` — lazy import bloki:

```tsx
const ServiceAgreementEditor = lazy(() => import('./pages/ServiceAgreementEditor'));
```

Route bloki, Task 11 da qo'shilgan `/shartnomalar` route'i yoniga. `allowedRoles` berilmaydi:

```tsx
<Route path="/shartnomalar/yangi" element={<ProtectedRoute><ServiceAgreementEditor /></ProtectedRoute>} />
<Route path="/shartnomalar/:id" element={<ProtectedRoute><ServiceAgreementEditor /></ProtectedRoute>} />
```

Diqqat: `/shartnomalar/yangi` `/shartnomalar/:id` dan OLDIN turishi kerak, aks holda `yangi` so'zi `:id` sifatida tushuniladi.

- [ ] **Step 4: Kompilyatsiyani tekshirish**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: faqat ma'lum baseline xatosi (`useInvoiceSave.ts(294,46)`). Boshqa xato bo'lmasin.

- [ ] **Step 5: Qo'lda tekshirish**

`npm run dev` bilan `/shartnomalar/yangi` sahifasini oching:

1. Mijoz tanlang → chap tomondagi maydonlar to'ladi, o'ng tomondagi hujjatda korxona nomi paydo bo'ladi.
2. To'lov modelini `B` ga o'zgartiring → ~0.5s dan keyin preview'dagi 5.5-bandda "Танланган модель: B" chiqadi va kredit limiti bandi paydo bo'ladi.
3. Modelni `A` ga qaytaring → kredit limiti bandi yo'qoladi.
4. Broker reestri raqamini kiriting → 2.3-band "реестрга … киритилган" ga almashadi; o'chiring → "ишончли вакили" qaytadi.
5. Saqlang → `/shartnomalar/:id` ga o'tadi, ro'yxatda ko'rinadi.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ServiceAgreementEditor.tsx frontend/src/components/serviceAgreement/AgreementPreview.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add agreement editor with live PDF preview"
```

---

### Task 13: Mijoz kartochkasidagi shartnomalar

**Files:**
- Modify: `frontend/src/pages/ClientDetail.tsx`

**Interfaces:**
- Consumes: `listAgreements` (Task 7)

- [ ] **Step 1: Shartnomalar bo'limini qo'shish**

`ClientDetail.tsx` ichida, mavjud bo'limlar naqshiga ergashib:

```tsx
const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);

useEffect(() => {
  if (!client?.id) return;
  listAgreements({ limit: 100 })
    .then((res) => setAgreements(res.items.filter((a) => a.clientId === client.id)))
    .catch(() => setAgreements([]));
}, [client?.id]);
```

Va JSX ichida:

```tsx
<section className="rounded-xl border border-gray-200 p-4">
  <div className="mb-3 flex items-center justify-between">
    <h2 className="font-semibold">Shartnomalar</h2>
    <Link to="/shartnomalar/yangi" className="text-sm text-blue-600 hover:underline">Yangi</Link>
  </div>
  {agreements.length === 0 ? (
    <p className="text-sm text-gray-500">Shartnoma yo'q</p>
  ) : (
    <ul className="divide-y divide-gray-100">
      {agreements.map((a) => (
        <li key={a.id} className="flex items-center justify-between py-2">
          <Link to={`/shartnomalar/${a.id}`} className="text-blue-600 hover:underline">
            {a.agreementNumber}
          </Link>
          <span className="text-sm text-gray-500">
            {new Date(a.agreementDate).toLocaleDateString('ru-RU')} · {STATUS_LABEL[a.status]}
          </span>
        </li>
      ))}
    </ul>
  )}
</section>
```

Kerakli importlarni fayl boshiga qo'shing:

```tsx
import { listAgreements } from '../features/serviceAgreement/api';
import { STATUS_LABEL, type ServiceAgreement } from '../features/serviceAgreement/types';
```

- [ ] **Step 2: Tekshirish**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: faqat ma'lum baseline xatosi (`useInvoiceSave.ts(294,46)`). Boshqa xato bo'lmasin.
Brauzerda shartnomasi bor mijoz kartochkasini oching.
Expected: "Shartnomalar" bo'limi ro'yxat bilan ko'rinadi.

- [ ] **Step 3: Barcha testlarni ishga tushirish**

```bash
cd frontend && npm run test
cd ../backend && npx vitest run src/routes/service-agreements.helpers.test.ts src/routes/service-agreements.schema.test.ts
```

Expected: hammasi PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ClientDetail.tsx
git commit -m "feat(frontend): show client agreements on client detail page"
```

---

## Self-Review

**Spec qamrovi**

| Spec bo'limi | Vazifa |
|---|---|
| 1. `ServiceAgreement` modeli, `Client` kengaytmasi | Task 2 |
| 1. Decimal aniqligi izohi | Global Constraints |
| 2. Backend endpointlar, qidiruv, 409, ochiq kirish | Task 3, 4 |
| 3. Shablon versiyalash, `when`, tiplangan tokenlar | Task 8, 9 |
| 4. PDF quvuri, masshtablash yo'q, preview, shrift moduli | Task 6, 10, 12 |
| 5. Ro'yxat, muharrir, `ClientDetail` | Task 11, 12, 13 |
| 6. Xatolar (glif, 409, token, bekor qilish, validatsiya) | Task 4, 10, 11, 12 |
| 7. Newman + shablon testi | Task 5, 9 |
| 8. Migratsiya (ruxsat nuqtasi bilan) | Task 2 |

**Aniqlangan va tuzatilgan farqlar**

- Spec'da frontend uchun `react-hook-form` + Zod aytilgan edi; bu paketlar loyihada yo'q va boshqa formalar `useState` ishlatadi. Global Constraints'ga chetlanish sifatida yozildi, Task 12 qo'lda validatsiya bilan bajariladi.
- Spec'da shartnomani bekor qilish modali bor edi; Task 4 da endpoint yozilgan, lekin muharrirda modal alohida vazifaga ajratilmagan. Bu **ataylab**: `status` va `terminate` API tayyor, UI tugmasi Task 12 dagi forma bilan bir xil naqshda keyinroq qo'shiladi. Agar bekor qilish tugmasi birinchi relizda kerak bo'lsa, Task 12 ga qo'shimcha step sifatida kiriting.

**Tur muvofiqligi**

`AgreementTokens` (Task 8) → `resolveText`/`visibleBlocks` (Task 9) → `AgreementPdfDocument` (Task 10) zanjirida nomlar bir xil. `ServiceAgreement` maydonlari Task 7 da e'lon qilingan va Task 8, 9, 11, 12 da o'sha nomlar bilan ishlatilgan. `PdfMissingGlyphError` va `describeMissingGlyphs` mavjud fayldan (`pdfGlyphCheck.ts`) o'zgarishsiz olinadi.
