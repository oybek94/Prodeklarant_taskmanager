# Shartnoma to'lov turi (naqt/perechisleniya) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mijozlarga "shartnoma to'lov turi" (naqt/perechisleniya) belgilash imkonini berish va shu turga qarab har bir Task uchun profit (netProfit) hisob-kitobini avtomatik moslashtirish — yangi turlarda davlat to'lovlari (sertifikat/bojxona) netProfit'dan ayirilmaydi, chunki mijoz ularni endi o'zi to'laydi.

**Architecture:** `Client`ga yangi `contractPaymentType` enum + `serviceFeeTransferUzs` (faqat "Aralash" uchun, doim UZS) qo'shiladi, `Task` yaratilganda boshqa moliyaviy snapshot maydonlar qatorida shu ikkisi ham snapshot qilinadi. Profit hisob-kitobi 3 alohida joyda (`tasks.ts`, `dashboard.ts`, `finance.ts`) — har birida mavjud formula saqlanadi, faqat "davlat/bojxona to'lovini ayirmaslik" sharti qo'shiladi (foydalanuvchi bilan kelishilgan: umumiy funksiyaga birlashtirilmaydi). Naqt/perechisleniya taqsimoti faqat ko'rsatish uchun — bitta kichik, DB'ga bog'liq bo'lmagan pure-function modulda hisoblanadi va faqat `tasks.ts`ning Task moliyaviy hisobotida ishlatiladi.

**Tech Stack:** Express 5 + TypeScript + Prisma ORM (backend), React 19 + TypeScript (frontend), Zod validatsiya, vitest (unit testlar).

**Spec:** `docs/superpowers/specs/2026-09-05-contract-payment-type-design.md`

## Global Constraints

- **DB jonli/umumiy masofaviy server** (`138.249.7.15`) — bu "lokal dev" emas, productionga tegishli/yaqin jonli baza. `npx prisma migrate dev` **HECH QACHON ishlatilmaydi** (shadow-baza yaratib prod'ga tegishi mumkin).
- **Migratsiya qo'llash tartibi** (mavjud loyihada isbotlangan, qarang `20260902120000_add_agreement_pricing_mode`): (1) `schema.prisma`ni tahrirlash, (2) qo'lda `prisma/migrations/<timestamp>_<nom>/migration.sql` yozish — `CREATE TYPE`/`ADD COLUMN IF NOT EXISTS` bilan **idempotent**, (3) `npx prisma db execute --schema prisma/schema.prisma --file <migration.sql>`, (4) `npx prisma migrate resolve --applied <nom>`. 3-4 qadam bu muhitda agent uchun bloklangan — **foydalanuvchi buni `!` prefiksi bilan o'zi bajarishi kerak.** Shundan keyin `npx prisma generate` ishga tushiriladi (bu bloklanmagan).
- **Jonli bazaga avtomatik test yozuvi yaratilmaydi.** Yangi Client/Task yaratadigan integratsion (Newman) testlar bu reja doirasida yozilmaydi. To'g'ridan-to'g'ri DB'ga bog'liq bo'lmagan hisob-kitob logikasi pure function sifatida ajratiladi va vitest bilan sinaladi; route darajasidagi tekshiruv (`clients.ts`, `tasks.ts`) foydalanuvchi tomonidan ishlayotgan dev serverda qo'lda bajariladi (rejaning oxirgi bosqichida ko'rsatma beriladi).
- TypeScript strict, yangi kodda `any` ishlatmaslik (mavjud fayllardagi eski `as any` naqshlariga tegilmaydi — faqat qo'shiladigan yangi qatorlar toza tipланган bo'ladi).
- Valyuta: `Decimal(18,2)` (mavjud `dealAmount` naqshiga mos).

---

## Fayl tuzilishi

| Fayl | Vazifa |
|---|---|
| `backend/prisma/schema.prisma` | `ContractPaymentType` enum, `Client`/`Task`ga yangi ustunlar |
| `backend/prisma/migrations/20260905120000_add_contract_payment_type/migration.sql` | Qo'lda yozilgan idempotent DDL |
| `backend/src/services/contract-payment-split.ts` **(yangi)** | Pure funksiyalar: `shouldDeductGovernmentFees`, `computeContractPaymentSplit` |
| `backend/src/__tests__/contract-payment-split.test.ts` **(yangi)** | Yuqoridagi funksiyalar uchun vitest testlari |
| `backend/src/routes/tasks.ts` | Task yaratishda snapshot capture + `GET /:id` financialReport tuzatish |
| `backend/src/routes/dashboard.ts` | `sumNetProfitForRange` — davlat to'lovini shartli ayirish |
| `backend/src/routes/finance.ts` | Revenue/expense overview — davlat to'lovini shartli ayirish |
| `backend/src/routes/clients.ts` | Zod sxema + create/update route + response payload |
| `backend/src/services/client.service.ts` | Non-admin masking ro'yxatiga yangi maydonlar |
| `frontend/src/pages/Clients.tsx` | Create/edit forma: "Shartnoma turi" select + "Aralash" uchun summa input |
| `frontend/src/components/tasks/TaskDetailPanel.tsx` | Moliyaviy hisobotda naqt/perechisleniya qatori |

---

### Task 1: Prisma schema + migratsiya

**Files:**
- Modify: `backend/prisma/schema.prisma` (Client modeli ~68-113 qator, Task modeli ~187-236 qator, enumlar bo'limi)
- Create: `backend/prisma/migrations/20260905120000_add_contract_payment_type/migration.sql`

**Interfaces:**
- Produces: `ContractPaymentType` enum (`CASH_ALL_INCLUSIVE | TRANSFER_ONLY | CASH_ONLY | MIXED`), `Client.contractPaymentType: ContractPaymentType`, `Client.serviceFeeTransferUzs: Decimal | null`, `Task.snapshotContractPaymentType: ContractPaymentType | null`, `Task.snapshotServiceFeeTransferUzs: Decimal | null` — keyingi barcha tasklar shulardan foydalanadi.

- [ ] **Step 1: `schema.prisma`ga enum qo'shish**

`enum PaymentModel { ... }` blokidan oldin (~1562-qator atrofida, boshqa enumlar bilan bir joyda) qo'shing:

```prisma
enum ContractPaymentType {
  CASH_ALL_INCLUSIVE // Legacy: dealAmount = hammasi (davlat to'lovlari ham) naqt
  TRANSFER_ONLY      // Xizmat haqi 100% perechisleniya
  CASH_ONLY          // Xizmat haqi 100% naqt, davlat to'lovini mijoz o'zi to'laydi
  MIXED              // Xizmat haqi qisman perechisleniya (qat'iy UZS summa), qolgani naqt
}
```

- [ ] **Step 2: `Client` modeliga ustun qo'shish**

`backend/prisma/schema.prisma` da `Client` modelidagi `dealAmount_exchange_source Currency?` qatoridan keyin (~98-qator, `dealAmount_exchange_source ExchangeSource?` dan keyin) qo'shing:

```prisma
  contractPaymentType        ContractPaymentType @default(CASH_ALL_INCLUSIVE)
  serviceFeeTransferUzs      Decimal?           @db.Decimal(18, 2)
```

- [ ] **Step 3: `Task` modeliga snapshot ustunlar qo'shish**

`Task` modelidagi `snapshotCustomsPayment_exchange_source ExchangeSource?` qatoridan keyin (~235-qator) qo'shing:

```prisma
  snapshotContractPaymentType                ContractPaymentType?
  snapshotServiceFeeTransferUzs              Decimal?             @db.Decimal(18, 2)
```

- [ ] **Step 4: Migratsiya faylini qo'lda yozish**

`backend/prisma/migrations/20260902120000_add_agreement_pricing_mode/migration.sql`dagi naqshga mos, idempotent qilib yozing. Yangi papka: `backend/prisma/migrations/20260905120000_add_contract_payment_type/migration.sql`:

```sql
-- Shartnoma to'lov turi: mijoz sertifikat/bojxona to'lovlarini o'zi to'laydigan
-- yangi holatlar uchun (TRANSFER_ONLY/CASH_ONLY/MIXED) davlat to'lovlari
-- netProfit'dan ayirilmasligi kerak. CASH_ALL_INCLUSIVE — legacy, DEFAULT,
-- mavjud mijoz/tasklar uchun xatti-harakat o'zgarmaydi.
-- Skript idempotent: qayta ishga tushirilsa xato bermaydi.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractPaymentType') THEN
    CREATE TYPE "ContractPaymentType" AS ENUM ('CASH_ALL_INCLUSIVE', 'TRANSFER_ONLY', 'CASH_ONLY', 'MIXED');
  END IF;
END $$;

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "contractPaymentType" "ContractPaymentType" NOT NULL DEFAULT 'CASH_ALL_INCLUSIVE';

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "serviceFeeTransferUzs" DECIMAL(18,2);

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "snapshotContractPaymentType" "ContractPaymentType";

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "snapshotServiceFeeTransferUzs" DECIMAL(18,2);
```

- [ ] **Step 5: Foydalanuvchidan migratsiyani qo'llashni so'rash (TO'XTASH NUQTASI)**

Bu bosqich agent tomonidan BAJARILMAYDI — quyidagi xabarni foydalanuvchiga yozib, javobini kuting:

> "Schema va migratsiya fayli tayyor. Iltimos, quyidagi 2 buyruqni o'zingiz `!` prefiksi bilan bajaring (bular DDL bo'lgani uchun mendan bloklangan):
> ```
> !cd backend && npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260905120000_add_contract_payment_type/migration.sql
> !cd backend && npx prisma migrate resolve --applied 20260905120000_add_contract_payment_type
> ```
> Bajarilgach xabar bering, men davom etaman."

- [ ] **Step 6: Prisma clientni qayta generatsiya qilish**

Foydalanuvchi Step 5ni tasdiqlagach:

Run: `cd backend && npx prisma generate`
Expected: `Generated Prisma Client` xabari, xatosiz tugaydi.

- [ ] **Step 7: TypeScript kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: yangi xato yo'q (schema o'zgarishi hali hech qayerda ishlatilmagani uchun mavjud xatolar soni o'zgarmasligi kerak).

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260905120000_add_contract_payment_type/migration.sql
git commit -m "feat(db): ContractPaymentType enum va Client/Task ustunlari qo'shildi"
```

---

### Task 2: Pure hisoblash funksiyalari (`contract-payment-split.ts`)

**Files:**
- Create: `backend/src/services/contract-payment-split.ts`
- Test: `backend/src/__tests__/contract-payment-split.test.ts`

**Interfaces:**
- Consumes: `ContractPaymentType` enum (Task 1'dan, `@prisma/client`dan import qilinadi — faqat tip sifatida, DB bog'liqligi yo'q)
- Produces:
  - `shouldDeductGovernmentFees(contractPaymentType: ContractPaymentType): boolean` — Task 3, 4, 5'da ishlatiladi.
  - `computeContractPaymentSplit(contractPaymentType: ContractPaymentType, dealAmountUzs: number, transferUzsConfig: number | null | undefined): { cashAmount: number; transferAmount: number }` — Task 3'da ishlatiladi.

- [ ] **Step 1: Testlarni yozish (birinchi, muvaffaqiyatsiz bo'lishi kutiladi)**

`backend/src/__tests__/contract-payment-split.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { shouldDeductGovernmentFees, computeContractPaymentSplit } from '../services/contract-payment-split';

describe('shouldDeductGovernmentFees', () => {
  it('CASH_ALL_INCLUSIVE uchun true qaytaradi (legacy xatti-harakat)', () => {
    expect(shouldDeductGovernmentFees('CASH_ALL_INCLUSIVE')).toBe(true);
  });

  it('TRANSFER_ONLY uchun false qaytaradi', () => {
    expect(shouldDeductGovernmentFees('TRANSFER_ONLY')).toBe(false);
  });

  it('CASH_ONLY uchun false qaytaradi', () => {
    expect(shouldDeductGovernmentFees('CASH_ONLY')).toBe(false);
  });

  it('MIXED uchun false qaytaradi', () => {
    expect(shouldDeductGovernmentFees('MIXED')).toBe(false);
  });
});

describe('computeContractPaymentSplit', () => {
  it('CASH_ALL_INCLUSIVE: hammasi naqt', () => {
    expect(computeContractPaymentSplit('CASH_ALL_INCLUSIVE', 1000000, null)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });

  it('CASH_ONLY: hammasi naqt', () => {
    expect(computeContractPaymentSplit('CASH_ONLY', 1000000, null)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });

  it('TRANSFER_ONLY: hammasi perechisleniya', () => {
    expect(computeContractPaymentSplit('TRANSFER_ONLY', 1000000, null)).toEqual({
      cashAmount: 0,
      transferAmount: 1000000,
    });
  });

  it('MIXED: konfiguratsiya qilingan summa perechisleniya, qolgani naqt', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, 400000)).toEqual({
      cashAmount: 600000,
      transferAmount: 400000,
    });
  });

  it('MIXED: transfer summasi dealAmount dan katta bo\'lsa, naqt manfiy bo\'lmaydi (clamp)', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, 1500000)).toEqual({
      cashAmount: 0,
      transferAmount: 1000000,
    });
  });

  it('MIXED: transfer konfiguratsiyasi bo\'lmasa (null), hammasi naqt', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, null)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });

  it('MIXED: manfiy konfiguratsiya 0 sifatida ishlov beriladi', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, -500)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });
});
```

- [ ] **Step 2: Testni ishga tushirib, muvaffaqiyatsiz bo'lishini tasdiqlash**

Run: `cd backend && npx vitest run src/__tests__/contract-payment-split.test.ts`
Expected: FAIL — `Cannot find module '../services/contract-payment-split'`

- [ ] **Step 3: Minimal implementatsiya yozish**

`backend/src/services/contract-payment-split.ts`:

```typescript
import { ContractPaymentType } from '@prisma/client';

export interface ContractPaymentSplit {
  cashAmount: number;
  transferAmount: number;
}

/**
 * CASH_ALL_INCLUSIVE (legacy) turida dealAmount ichiga davlat to'lovlari
 * (sertifikat, bojxona) allaqachon kiritilgan deb hisoblanadi — kompaniya
 * ularni o'z hisobidan to'laydi, shuning uchun netProfit'dan ayiriladi.
 * Boshqa 3 turda mijoz davlat to'lovini o'zi to'g'ridan-to'g'ri to'laydi.
 */
export function shouldDeductGovernmentFees(contractPaymentType: ContractPaymentType): boolean {
  return contractPaymentType === 'CASH_ALL_INCLUSIVE';
}

/**
 * Xizmat haqining naqt/perechisleniya taqsimoti (faqat ko'rsatish uchun).
 * `transferUzsConfig` — MIXED turi uchun mijozda sozlangan qat'iy UZS summa
 * (doim UZS, `dealAmountUzs` valyutasidan qat'i nazar).
 */
export function computeContractPaymentSplit(
  contractPaymentType: ContractPaymentType,
  dealAmountUzs: number,
  transferUzsConfig: number | null | undefined
): ContractPaymentSplit {
  if (contractPaymentType === 'TRANSFER_ONLY') {
    return { cashAmount: 0, transferAmount: dealAmountUzs };
  }
  if (contractPaymentType === 'MIXED') {
    const configured = Math.max(0, Number(transferUzsConfig || 0));
    const transferAmount = Math.min(configured, dealAmountUzs);
    return { cashAmount: dealAmountUzs - transferAmount, transferAmount };
  }
  // CASH_ALL_INCLUSIVE, CASH_ONLY
  return { cashAmount: dealAmountUzs, transferAmount: 0 };
}
```

- [ ] **Step 4: Testni qayta ishga tushirib, o'tishini tasdiqlash**

Run: `cd backend && npx vitest run src/__tests__/contract-payment-split.test.ts`
Expected: PASS (11 testlar)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/contract-payment-split.ts backend/src/__tests__/contract-payment-split.test.ts
git commit -m "feat(finance): contract-payment-split pure hisoblash funksiyalari"
```

---

### Task 3: `tasks.ts` — snapshot capture va financialReport tuzatish

**Files:**
- Modify: `backend/src/routes/tasks.ts` (Task yaratish ~336-643 qator, `GET /:id` financialReport ~834-1128 qator)

**Interfaces:**
- Consumes: `shouldDeductGovernmentFees`, `computeContractPaymentSplit` (Task 2)
- Produces: Task yaratishda `snapshotContractPaymentType`/`snapshotServiceFeeTransferUzs` DB'ga yoziladi; `GET /:id` javobidagi `financialReport` obyektiga `contractPaymentType`, `cashAmount`, `transferAmount` maydonlari qo'shiladi, `netProfit` yangi turlarda davlat to'lovini ayirmaydi.

- [ ] **Step 1: `fullClient` select'iga yangi maydonlarni qo'shish**

`backend/src/routes/tasks.ts:367-379` dagi `fullClient` so'rovini toping:

```typescript
    const fullClient = await tx.client.findUnique({
      where: { id: parsed.data.clientId },
      select: {
        dealAmount: true,
        dealAmountCurrency: true,
        dealAmountExchangeRate: true,
        dealAmount_amount_original: true,
        dealAmount_currency: true,
        dealAmount_exchange_rate: true,
        dealAmount_amount_uzs: true,
        dealAmount_exchange_source: true,
      },
    });
```

`dealAmount_exchange_source: true,` qatoridan keyin qo'shing:

```typescript
        contractPaymentType: true,
        serviceFeeTransferUzs: true,
```

- [ ] **Step 2: Snapshot qiymatlarni hisoblash**

Xuddi shu faylda, `let snapshotCustomsPaymentAmountUzs: number | null = null;` qatoridan keyin (~394-qator, boshqa `let snapshot...` e'lonlari orasida) qo'shing:

```typescript
    const snapshotContractPaymentType = fullClient?.contractPaymentType || 'CASH_ALL_INCLUSIVE';
    const snapshotServiceFeeTransferUzs = fullClient?.serviceFeeTransferUzs != null
      ? Number(fullClient.serviceFeeTransferUzs)
      : null;
```

- [ ] **Step 3: `taskData`ga yozish**

`taskData.snapshotCustomsPayment = snapshotCustomsPayment;` va unga tegishli `if` blokidan keyin (~587-qator, `taskData.snapshotCustomsPaymentExchangeRate = snapshotCustomsPaymentExchangeRate;` dan keyin, "Universal monetary fields" izohidan oldin) qo'shing:

```typescript
    // Shartnoma to'lov turi snapshot (dealAmount snapshot bilan bir vaqtda)
    taskData.snapshotContractPaymentType = snapshotContractPaymentType;
    if (snapshotServiceFeeTransferUzs != null) {
      taskData.snapshotServiceFeeTransferUzs = snapshotServiceFeeTransferUzs;
    }
```

- [ ] **Step 4: `financialReport` hisoblashiga contract type mantiqini qo'shish**

`backend/src/routes/tasks.ts` boshida import qatorlariga (fayl yuqorisidagi mavjud `import` bloklaridan biriga, masalan `calculateAmountUzs` import qilingan qatorga yaqin) qo'shing:

```typescript
import { shouldDeductGovernmentFees, computeContractPaymentSplit } from '../services/contract-payment-split';
```

`GET /:id` ichidagi financialReport blokini toping (~1113-1128 qator):

```typescript
    // Snapshotlarda BXM summasi allaqachon finalDealAmountInUzs (shartnoma) va customsPaymentUzs (davlat) ichiga kiritib bo'lingan.
    const tDealAmount = finalDealAmountInUzs;
    const tDeclarationPayment = customsPaymentUzs;
    
    // UI da "Asosiy Shartnoma (Base)" kursatish uchun, tDealAmount dan tExtra ni ayiramiz:
    const baseDealUzs = tDealAmount - extraDeklaratsiyaUzs;
    
    (task as any).financialReport = {
        dealAmountBase: baseDealUzs - psrAmountInUzs, // PSR ni ham ayirib tashlaymiz
        dealAmount: tDealAmount,
        certifierFee: certifierUzsReal,
        statePayment: davlatUzsReal,
        declarationPayment: tDeclarationPayment,
        hiredWorkerPayment: certHiredWorkerUzs,
        netProfit: tDealAmount - certifierUzsReal - davlatUzsReal - tDeclarationPayment - certHiredWorkerUzs - localAdminEarnedUzs
    };
```

Shu blokni quyidagicha almashtiring:

```typescript
    // Snapshotlarda BXM summasi allaqachon finalDealAmountInUzs (shartnoma) va customsPaymentUzs (davlat) ichiga kiritib bo'lingan.
    const tDealAmount = finalDealAmountInUzs;
    const tDeclarationPayment = customsPaymentUzs;
    
    // UI da "Asosiy Shartnoma (Base)" kursatish uchun, tDealAmount dan tExtra ni ayiramiz:
    const baseDealUzs = tDealAmount - extraDeklaratsiyaUzs;

    // Shartnoma to'lov turi: CASH_ALL_INCLUSIVE (legacy) dan boshqasida mijoz
    // davlat to'lovini (sertifikat/bojxona) o'zi to'laydi — netProfit'dan ayirilmaydi.
    const contractPaymentType = task.snapshotContractPaymentType || (task.client as any).contractPaymentType || 'CASH_ALL_INCLUSIVE';
    const deductGovernmentFees = shouldDeductGovernmentFees(contractPaymentType);
    const stateDeduction = deductGovernmentFees ? davlatUzsReal : 0;
    const customsDeduction = deductGovernmentFees ? tDeclarationPayment : 0;

    const transferConfigUzs = task.snapshotServiceFeeTransferUzs != null
      ? Number(task.snapshotServiceFeeTransferUzs)
      : ((task.client as any).serviceFeeTransferUzs != null ? Number((task.client as any).serviceFeeTransferUzs) : null);
    const { cashAmount, transferAmount } = computeContractPaymentSplit(contractPaymentType, tDealAmount, transferConfigUzs);

    (task as any).financialReport = {
        dealAmountBase: baseDealUzs - psrAmountInUzs, // PSR ni ham ayirib tashlaymiz
        dealAmount: tDealAmount,
        certifierFee: certifierUzsReal,
        statePayment: davlatUzsReal,
        declarationPayment: tDeclarationPayment,
        hiredWorkerPayment: certHiredWorkerUzs,
        contractPaymentType,
        cashAmount,
        transferAmount,
        netProfit: tDealAmount - certifierUzsReal - stateDeduction - customsDeduction - certHiredWorkerUzs - localAdminEarnedUzs
    };
```

- [ ] **Step 5: TypeScript kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/tasks.ts
git commit -m "feat(tasks): shartnoma to'lov turini snapshot qilish va netProfit/split hisobiga qo'shish"
```

---

### Task 4: `dashboard.ts` — completed-summary tuzatish

**Files:**
- Modify: `backend/src/routes/dashboard.ts` (`sumNetProfitForRange`, ~769-834 qator)

**Interfaces:**
- Consumes: `shouldDeductGovernmentFees` (Task 2)

- [ ] **Step 1: Task/Client select'ga contractPaymentType qo'shish**

`backend/src/routes/dashboard.ts:775-792` dagi `select` blokini toping:

```typescript
        select: {
          id: true,
          status: true,
          hasPsr: true,
          snapshotDealAmount: true,
          snapshotPsrPrice: true,
          snapshotCertificatePayment: true,
          snapshotWorkerPrice: true,
          snapshotCustomsPayment: true,
          client: {
            select: {
              dealAmount: true,
              dealAmount_currency: true,
              dealAmountCurrency: true,
            },
          },
        },
      });
```

Quyidagicha almashtiring (2 ta yangi maydon: `snapshotContractPaymentType` va nested `client.contractPaymentType`):

```typescript
        select: {
          id: true,
          status: true,
          hasPsr: true,
          snapshotDealAmount: true,
          snapshotPsrPrice: true,
          snapshotCertificatePayment: true,
          snapshotWorkerPrice: true,
          snapshotCustomsPayment: true,
          snapshotContractPaymentType: true,
          client: {
            select: {
              dealAmount: true,
              dealAmount_currency: true,
              dealAmountCurrency: true,
              contractPaymentType: true,
            },
          },
        },
      });
```

- [ ] **Step 2: Import qo'shish**

Fayl yuqorisidagi importlar orasiga qo'shing:

```typescript
import { shouldDeductGovernmentFees } from '../services/contract-payment-split';
```

- [ ] **Step 3: Hisoblash tsiklini tuzatish**

`backend/src/routes/dashboard.ts:802-816` dagi blokni toping:

```typescript
      for (const task of rangeTasks) {
        const client = task.client;
        const clientCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';

        // Use snapshot values if available, otherwise fallback to client dealAmount
        const baseDealAmount = task.snapshotDealAmount != null
          ? Number(task.snapshotDealAmount)
          : Number(client.dealAmount || 0);
        const psrAmount = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
        const dealAmount = baseDealAmount + psrAmount;
        const certificatePayment = Number(task.snapshotCertificatePayment || 0);
        const workerPrice = Number(task.snapshotWorkerPrice || 0);
        const customsPayment = Number(task.snapshotCustomsPayment || 0);
        const branchPayments = certificatePayment + workerPrice + psrAmount + customsPayment;
        const netProfit = dealAmount - branchPayments;
```

Quyidagicha almashtiring:

```typescript
      for (const task of rangeTasks) {
        const client = task.client;
        const clientCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';

        // Use snapshot values if available, otherwise fallback to client dealAmount
        const baseDealAmount = task.snapshotDealAmount != null
          ? Number(task.snapshotDealAmount)
          : Number(client.dealAmount || 0);
        const psrAmount = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
        const dealAmount = baseDealAmount + psrAmount;
        const workerPrice = Number(task.snapshotWorkerPrice || 0);

        const contractPaymentType = task.snapshotContractPaymentType || client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
        const deductGovernmentFees = shouldDeductGovernmentFees(contractPaymentType);
        const certificatePayment = deductGovernmentFees ? Number(task.snapshotCertificatePayment || 0) : 0;
        const customsPayment = deductGovernmentFees ? Number(task.snapshotCustomsPayment || 0) : 0;

        const branchPayments = certificatePayment + workerPrice + psrAmount + customsPayment;
        const netProfit = dealAmount - branchPayments;
```

- [ ] **Step 4: TypeScript kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/dashboard.ts
git commit -m "fix(dashboard): completed-summary'da yangi shartnoma turlari uchun davlat to'lovi ayirilmaydi"
```

---

### Task 5: `finance.ts` — revenue/expense overview tuzatish

**Files:**
- Modify: `backend/src/routes/finance.ts` (~1006-1077 qator)

**Interfaces:**
- Consumes: `shouldDeductGovernmentFees` (Task 2)

- [ ] **Step 1: Client select'ga contractPaymentType qo'shish**

`backend/src/routes/finance.ts:1001-1008` dagi so'rovni toping:

```typescript
    const completedTasks = await prisma.task.findMany({
      where: {
        status: { notIn: ['BOSHLANMAGAN', 'JARAYONDA'] }
      },
      include: {
        client: { select: { id: true, name: true, dealAmount: true, dealAmountCurrency: true, dealAmount_currency: true } }
      }
    });
```

Quyidagicha almashtiring:

```typescript
    const completedTasks = await prisma.task.findMany({
      where: {
        status: { notIn: ['BOSHLANMAGAN', 'JARAYONDA'] }
      },
      include: {
        client: { select: { id: true, name: true, dealAmount: true, dealAmountCurrency: true, dealAmount_currency: true, contractPaymentType: true } }
      }
    });
```

(`task.snapshotContractPaymentType` alohida select qilinmaydi — `include`dagi asosiy `Task` maydonlari to'liq qaytadi, chunki `task` uchun tashqi `select` yo'q.)

- [ ] **Step 2: Import qo'shish**

Fayl yuqorisidagi importlar orasiga qo'shing:

```typescript
import { shouldDeductGovernmentFees } from '../services/contract-payment-split';
```

- [ ] **Step 3: Xarajat hisoblashini tuzatish**

`backend/src/routes/finance.ts:1056-1077` dagi blokni toping:

```typescript
        let taskExpenseUzs = 0;
        
        // Davlat tolovlari: ST-1, FITO, Fumigatsiya, Ichki sertifikat
        const davlatUz = Number(sp?.st1Payment || 0) + Number(sp?.fitoPayment || 0) + Number(sp?.fumigationPayment || 0) + Number(sp?.internalCertPayment || 0);
        if (sp?.currency === 'USD') taskExpenseUzs += davlatUz * usdToUzsRate;
        else taskExpenseUzs += davlatUz;

        // Bojxona tolovi:
        const customs = task.snapshotCustomsPayment != null ? Number(task.snapshotCustomsPayment) : Number(sp?.customsPayment || 0);
        const customsCurrency = task.snapshotCustomsPayment_currency || sp?.currency || 'UZS';
        if (customsCurrency === 'USD') taskExpenseUzs += customs * usdToUzsRate;
        else taskExpenseUzs += customs;

        // Ishchilarga to'lovlar:
        const worker = task.snapshotWorkerPrice != null ? Number(task.snapshotWorkerPrice) : Number(sp?.workerPrice || 0);
        const workerCurrency = task.snapshotWorkerPrice_currency || sp?.currency || 'UZS';
        if (workerCurrency === 'USD') taskExpenseUzs += worker * usdToUzsRate;
        else taskExpenseUzs += worker;

        // Sertifikatchi tariflari:
        const certifierUzs = Number(cc?.st1Rate || 0) + Number(cc?.fitoRate || 0) + Number(cc?.aktRate || 0);
        taskExpenseUzs += certifierUzs;
```

Quyidagicha almashtiring (faqat davlat to'lovi va bojxona bloklariga shart qo'shiladi; ishchi va sertifikatchi xarajatlari o'zgarishsiz qoladi):

```typescript
        let taskExpenseUzs = 0;

        const contractPaymentType = task.contractPaymentType || task.client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
        const deductGovernmentFees = shouldDeductGovernmentFees(contractPaymentType);

        // Davlat tolovlari: ST-1, FITO, Fumigatsiya, Ichki sertifikat
        // (faqat CASH_ALL_INCLUSIVE turida — boshqalarida mijoz o'zi to'laydi)
        if (deductGovernmentFees) {
          const davlatUz = Number(sp?.st1Payment || 0) + Number(sp?.fitoPayment || 0) + Number(sp?.fumigationPayment || 0) + Number(sp?.internalCertPayment || 0);
          if (sp?.currency === 'USD') taskExpenseUzs += davlatUz * usdToUzsRate;
          else taskExpenseUzs += davlatUz;

          // Bojxona tolovi:
          const customs = task.snapshotCustomsPayment != null ? Number(task.snapshotCustomsPayment) : Number(sp?.customsPayment || 0);
          const customsCurrency = task.snapshotCustomsPayment_currency || sp?.currency || 'UZS';
          if (customsCurrency === 'USD') taskExpenseUzs += customs * usdToUzsRate;
          else taskExpenseUzs += customs;
        }

        // Ishchilarga to'lovlar:
        const worker = task.snapshotWorkerPrice != null ? Number(task.snapshotWorkerPrice) : Number(sp?.workerPrice || 0);
        const workerCurrency = task.snapshotWorkerPrice_currency || sp?.currency || 'UZS';
        if (workerCurrency === 'USD') taskExpenseUzs += worker * usdToUzsRate;
        else taskExpenseUzs += worker;

        // Sertifikatchi tariflari:
        const certifierUzs = Number(cc?.st1Rate || 0) + Number(cc?.fitoRate || 0) + Number(cc?.aktRate || 0);
        taskExpenseUzs += certifierUzs;
```

**Eslatma:** `task.contractPaymentType` deb yozilgani xato emas — `task` obyekti bu yerda to'liq `Task` qatori (snapshot ustuni nomi `snapshotContractPaymentType`). To'g'ri yozing: `task.snapshotContractPaymentType || task.client.contractPaymentType || 'CASH_ALL_INCLUSIVE'`.

- [ ] **Step 4: TypeScript kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/finance.ts
git commit -m "fix(finance): revenue/expense overview'da yangi shartnoma turlari uchun davlat to'lovi ayirilmaydi"
```

---

### Task 6: `clients.ts` — Zod sxema, create/update route, response

**Files:**
- Modify: `backend/src/routes/clients.ts`

**Interfaces:**
- Produces: `POST /clients` va `PATCH /clients/:id` endi `contractPaymentType`/`serviceFeeTransferUzs` qabul qiladi va qaytaradi.

- [ ] **Step 1: Import va Zod sxemaga qo'shish**

`backend/src/routes/clients.ts:3` dagi importni:

```typescript
import { Prisma, Currency, ExchangeSource } from '@prisma/client';
```

Quyidagicha o'zgartiring:

```typescript
import { Prisma, Currency, ExchangeSource, ContractPaymentType } from '@prisma/client';
```

`clientSchema`ga (~19-47 qator) `dealAmountExchangeSource` qatoridan keyin qo'shing:

```typescript
  dealAmountExchangeSource: z.enum(['CBU', 'MANUAL']).optional(), // Optional - defaults to CBU
  contractPaymentType: z.enum(['CASH_ALL_INCLUSIVE', 'TRANSFER_ONLY', 'CASH_ONLY', 'MIXED']).optional(),
  serviceFeeTransferUzs: z.number().min(0).optional().nullable(),
```

- [ ] **Step 2: `POST /` create route**

`backend/src/routes/clients.ts:305-332` dagi `createData` obyektini toping (`dealAmount_exchange_source: dealAmount ? exchangeSource : null,` qatoridan keyin, `phone` dan oldin — aslida `phone` allaqachon bor, shu qatordan keyin qo'shamiz):

```typescript
      dealAmount_exchange_source: dealAmount ? exchangeSource : null,
      phone: parsed.data.phone ?? null,
```

Quyidagicha o'zgartiring:

```typescript
      dealAmount_exchange_source: dealAmount ? exchangeSource : null,
      contractPaymentType: (parsed.data.contractPaymentType as ContractPaymentType) ?? undefined,
      serviceFeeTransferUzs: parsed.data.serviceFeeTransferUzs != null ? new Decimal(parsed.data.serviceFeeTransferUzs) : undefined,
      phone: parsed.data.phone ?? null,
```

- [ ] **Step 3: `PATCH /:id` update route**

`backend/src/routes/clients.ts:562-564` dagi blokni toping:

```typescript
    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone === null || req.body.phone === '' ? null : req.body.phone;
    }
```

Undan keyin qo'shing:

```typescript
    if (req.body.contractPaymentType !== undefined) {
      const validTypes = ['CASH_ALL_INCLUSIVE', 'TRANSFER_ONLY', 'CASH_ONLY', 'MIXED'];
      if (!validTypes.includes(req.body.contractPaymentType)) {
        return res.status(400).json({ error: `Noto'g'ri shartnoma turi: ${req.body.contractPaymentType}` });
      }
      updateData.contractPaymentType = req.body.contractPaymentType as ContractPaymentType;
    }
    if (req.body.serviceFeeTransferUzs !== undefined) {
      updateData.serviceFeeTransferUzs = req.body.serviceFeeTransferUzs === null || req.body.serviceFeeTransferUzs === ''
        ? null
        : new Decimal(req.body.serviceFeeTransferUzs);
    }
```

- [ ] **Step 4: Response payload'ga qo'shish**

`backend/src/routes/clients.ts:702-716` dagi javob obyektini toping:

```typescript
    res.json({
      id: updatedClient.id,
      name: updatedClient.name,
      dealAmount: updatedClient.dealAmount,
      phone: updatedClient.phone,
```

`dealAmount: updatedClient.dealAmount,` qatoridan keyin qo'shing:

```typescript
      contractPaymentType: updatedClient.contractPaymentType,
      serviceFeeTransferUzs: updatedClient.serviceFeeTransferUzs,
```

- [ ] **Step 5: TypeScript kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/clients.ts
git commit -m "feat(clients): contractPaymentType/serviceFeeTransferUzs create va update route'larda"
```

---

### Task 7: `client.service.ts` — non-admin masking

**Files:**
- Modify: `backend/src/services/client.service.ts`

**Interfaces:**
- Produces: `getClientsWithBalances`/`getClientById` non-admin uchun `contractPaymentType`/`serviceFeeTransferUzs`ni yashiradi (boshqa moliyaviy maydonlar kabi).

- [ ] **Step 1: `getClientsWithBalances` masking**

`backend/src/services/client.service.ts:48-63` dagi blokni toping:

```typescript
    if (!isAdmin) {
      finalClients = finalClients.map((client: any) => ({
        ...client,
        dealAmount: 0,
        dealAmount_amount_uzs: 0,
        dealAmount_amount_original: 0,
        dealAmount_exchange_rate: 0,
        totalDealAmount: 0,
        totalIncome: 0,
        balance: 0,
        initialDebt: 0,
        initialDebtInUzs: 0,
        tasks: client.tasks?.map((t: any) => ({ id: t.id, status: t.status, createdAt: t.createdAt })) || [],
        transactions: []
      }));
    }
```

`dealAmount_exchange_rate: 0,` qatoridan keyin qo'shing:

```typescript
        contractPaymentType: 'CASH_ALL_INCLUSIVE',
        serviceFeeTransferUzs: 0,
```

- [ ] **Step 2: `getClientById` masking**

`backend/src/services/client.service.ts:168-184` dagi blokni toping:

```typescript
    if (!isAdmin) {
      (client as any).dealAmount = 0;
      (client as any).dealAmount_amount_uzs = 0;
      (client as any).dealAmount_amount_original = 0;
      (client as any).dealAmount_exchange_rate = 0;
      (client as any).initialDebt = 0;
```

`(client as any).dealAmount_exchange_rate = 0;` qatoridan keyin qo'shing:

```typescript
      (client as any).contractPaymentType = 'CASH_ALL_INCLUSIVE';
      (client as any).serviceFeeTransferUzs = 0;
```

- [ ] **Step 3: TypeScript kompilyatsiyasini tekshirish**

Run: `cd backend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/client.service.ts
git commit -m "fix(clients): non-admin uchun contractPaymentType/serviceFeeTransferUzs yashiriladi"
```

---

### Task 8: Frontend — `Clients.tsx` forma (create + edit)

**Files:**
- Modify: `frontend/src/pages/Clients.tsx`

**Interfaces:**
- Consumes: backend `POST /clients`, `PATCH /clients/:id` (Task 6) — endi `contractPaymentType`/`serviceFeeTransferUzs` qabul qiladi.
- Produces: create/edit formalarida "Shartnoma turi" select + "Aralash" uchun UZS summa input.

- [ ] **Step 1: `Client`/`ClientDetail` interfeyslariga maydon qo'shish**

`frontend/src/pages/Clients.tsx:28-42` dagi `Client` interfeysini toping:

```typescript
interface Client {
  id: number;
  name: string;
  dealAmount?: number | string | null;
  dealAmountCurrency?: 'USD' | 'UZS';
```

`dealAmountCurrency?: 'USD' | 'UZS';` qatoridan keyin qo'shing:

```typescript
  contractPaymentType?: 'CASH_ALL_INCLUSIVE' | 'TRANSFER_ONLY' | 'CASH_ONLY' | 'MIXED';
  serviceFeeTransferUzs?: number | string | null;
```

- [ ] **Step 2: Create forma state'iga qo'shish**

`frontend/src/pages/Clients.tsx:136-160` dagi `form` state'ini toping, `dealAmountCurrency: 'UZS' as 'USD' | 'UZS',` qatoridan keyin qo'shing:

```typescript
    contractPaymentType: 'CASH_ALL_INCLUSIVE' as 'CASH_ALL_INCLUSIVE' | 'TRANSFER_ONLY' | 'CASH_ONLY' | 'MIXED',
    serviceFeeTransferUzs: '',
```

- [ ] **Step 3: Edit forma state'iga qo'shish**

`frontend/src/pages/Clients.tsx:163-188` dagi `editForm` state'ini toping, `dealAmountExchangeRate: '',` (edit form ichidagi, ~167-qator) qatoridan keyin qo'shing:

```typescript
    contractPaymentType: 'CASH_ALL_INCLUSIVE' as 'CASH_ALL_INCLUSIVE' | 'TRANSFER_ONLY' | 'CASH_ONLY' | 'MIXED',
    serviceFeeTransferUzs: '',
```

- [ ] **Step 4: Create submit payloadga qo'shish**

`frontend/src/pages/Clients.tsx:1018-1039` dagi `handleSubmit`dagi `createData` obyektini toping, `dealAmountExchangeRate: ...,` qatoridan keyin qo'shing:

```typescript
        contractPaymentType: form.contractPaymentType,
        serviceFeeTransferUzs: form.contractPaymentType === 'MIXED' && form.serviceFeeTransferUzs
          ? parseFloat(form.serviceFeeTransferUzs)
          : undefined,
```

- [ ] **Step 5: Create forma reset joylariga qo'shish**

Fayldagi ikkita joyda `setForm({ name: '', dealAmount: '', ... })` bilan forma reset qilinadi (~1079-1101 va ~1240-1242 atrofida, submit muvaffaqiyatli bo'lgach va modal yopilganda). Ikkalasida ham `dealAmountCurrency: 'UZS',` yoki `'USD',` qatoridan keyin qo'shing:

```typescript
        contractPaymentType: 'CASH_ALL_INCLUSIVE',
        serviceFeeTransferUzs: '',
```

- [ ] **Step 6: `handleEdit` — mijoz ma'lumotini editForm'ga yuklash**

`frontend/src/pages/Clients.tsx:1111-1138` dagi `handleEdit` funksiyasini toping, `dealAmountExchangeRate: (client as any).dealAmountExchangeRate ? ... : '',` qatoridan keyin qo'shing:

```typescript
      contractPaymentType: ((client as any).contractPaymentType || 'CASH_ALL_INCLUSIVE') as 'CASH_ALL_INCLUSIVE' | 'TRANSFER_ONLY' | 'CASH_ONLY' | 'MIXED',
      serviceFeeTransferUzs: (client as any).serviceFeeTransferUzs != null ? (client as any).serviceFeeTransferUzs.toString() : '',
```

- [ ] **Step 7: `handleUpdate` submit payloadga qo'shish**

`frontend/src/pages/Clients.tsx:1184-1189+` dagi `handleUpdate`dagi `updateData` obyektini toping, `dealAmountExchangeRate: ...,` qatoridan keyin qo'shing:

```typescript
        contractPaymentType: editForm.contractPaymentType,
        serviceFeeTransferUzs: editForm.contractPaymentType === 'MIXED' && editForm.serviceFeeTransferUzs
          ? parseFloat(editForm.serviceFeeTransferUzs)
          : (editForm.contractPaymentType !== 'MIXED' ? null : undefined),
```

- [ ] **Step 8: Create forma JSX — select va shartli input**

`frontend/src/pages/Clients.tsx:1518-1543` dagi `MonetaryInput` (Deal Amount) blokidan keyin, `</div>` yopilishidan keyin qo'shing (create formaning `<form onSubmit={handleSubmit}>` ichida):

```tsx
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shartnoma turi</label>
                    <select
                      value={form.contractPaymentType}
                      onChange={(e) => setForm({ ...form, contractPaymentType: e.target.value as typeof form.contractPaymentType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="CASH_ALL_INCLUSIVE">Naqt (hammasi ichida, eski)</option>
                      <option value="TRANSFER_ONLY">Xizmat haqi — 100% perechisleniya</option>
                      <option value="CASH_ONLY">Xizmat haqi — 100% naqt</option>
                      <option value="MIXED">Xizmat haqi — aralash (naqt + perechisleniya)</option>
                    </select>
                  </div>
                  {form.contractPaymentType === 'MIXED' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Perechisleniya summasi (so'm)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.serviceFeeTransferUzs}
                        onChange={(e) => setForm({ ...form, serviceFeeTransferUzs: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
```

- [ ] **Step 9: Edit forma JSX — select va shartli input**

`frontend/src/pages/Clients.tsx:3606-3629` dagi `MonetaryInput` (Deal Amount) blokidan keyin, uni o'rab turgan `</div>` (3629-qator) dan keyin qo'shing (edit formaning `<form onSubmit={handleUpdate}>` ichida):

```tsx
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shartnoma turi</label>
                  <select
                    value={editForm.contractPaymentType}
                    onChange={(e) => setEditForm({ ...editForm, contractPaymentType: e.target.value as typeof editForm.contractPaymentType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="CASH_ALL_INCLUSIVE">Naqt (hammasi ichida, eski)</option>
                    <option value="TRANSFER_ONLY">Xizmat haqi — 100% perechisleniya</option>
                    <option value="CASH_ONLY">Xizmat haqi — 100% naqt</option>
                    <option value="MIXED">Xizmat haqi — aralash (naqt + perechisleniya)</option>
                  </select>
                </div>
                {editForm.contractPaymentType === 'MIXED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perechisleniya summasi (so'm)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.serviceFeeTransferUzs}
                      onChange={(e) => setEditForm({ ...editForm, serviceFeeTransferUzs: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
```

- [ ] **Step 10: Frontend TypeScript kompilyatsiyasini tekshirish**

Run: `cd frontend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/pages/Clients.tsx
git commit -m "feat(clients-ui): shartnoma turi select va aralash summa inputi"
```

---

### Task 9: Frontend — `TaskDetailPanel.tsx` naqt/perechisleniya ko'rsatish

**Files:**
- Modify: `frontend/src/components/tasks/TaskDetailPanel.tsx`

**Interfaces:**
- Consumes: `financial.rep.cashAmount`, `financial.rep.transferAmount` (Task 3'dan, `financialReport` obyektida keladi)

- [ ] **Step 1: Moliyaviy blokka qator qo'shish**

`frontend/src/components/tasks/TaskDetailPanel.tsx:678-688` dagi blokni toping:

```tsx
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Shartnoma summasi:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatMoney(financial.dealAmount, financial.currency)}
                        {financial.rep && financial.dealAmount > financial.dealAmountBase + financial.psrAmount && (
                          <span className="text-xs font-semibold text-gray-400 ml-1.5 whitespace-normal">
                            (+ qo'shimcha BXM hisobi qo'shilgan)
                          </span>
                        )}
                      </span>
                    </div>
```

Shu blokdan keyin qo'shing:

```tsx
                    {financial.rep && financial.rep.transferAmount > 0 && (
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 -mt-1.5">
                        <span>Naqt: {formatMoney(financial.rep.cashAmount, financial.currency)}</span>
                        <span>Perechisleniya: {formatMoney(financial.rep.transferAmount, financial.currency)}</span>
                      </div>
                    )}
```

- [ ] **Step 2: Frontend TypeScript kompilyatsiyasini tekshirish**

Run: `cd frontend && npx tsc --noEmit`
Expected: yangi xato yo'q.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tasks/TaskDetailPanel.tsx
git commit -m "feat(tasks-ui): moliyaviy hisobotda naqt/perechisleniya qatorini ko'rsatish"
```

---

### Task 10: Qo'lda smoke-test (dev serverda)

**Files:** (yo'q — faqat tekshirish, kod o'zgarishi yo'q)

Bu bosqich jonli/umumiy DB'ga tegishli bo'lgani uchun avtomatik bajarilmaydi — foydalanuvchi o'zi dev serverda tekshiradi. Quyidagi xabarni foydalanuvchiga yozing:

> "Barcha kod tayyor va commit qilindi. Iltimos, backend (`cd backend && npm run dev`) va frontend (`cd frontend && npm run dev`) ishga tushirilgan holda quyidagilarni tekshiring:
> 1. Mijozlar sahifasida yangi mijoz yarating, "Shartnoma turi" = "Aralash" tanlang, perechisleniya summasini kiriting — saqlanadi va qayta ochilganda to'g'ri ko'rinadimi?
> 2. Shu mijozga bitta Task yarating, uni ochib "Moliyaviy hisobot"ni yoying — "Naqt: ... / Perechisleniya: ..." qatori to'g'ri summalarni ko'rsatadimi, va "Sof foyda" endi sertifikat/bojxona to'lovini ayirmayaptimi?
> 3. `CASH_ALL_INCLUSIVE` (eski) turidagi mavjud biror mijoz/task uchun "Sof foyda" avvalgidek qolganini tasdiqlang (regression yo'q).
> 4. Test uchun yaratgan mijoz/task yozuvlarini keyin o'chirib tashlang (jonli baza)."

- [ ] **Step 1: Foydalanuvchi tasdiqlashini kutish va natijani qayd etish**

---

## Self-Review natijasi

- **Spec qamrovi:** 6 ta qaror bandining barchasi tegishli tasklarda qoplangan — (1) Client darajasi → Task 1/3; (2) qat'iy summa → Task 2/3; (3) doim UZS → Task 2 (`transferUzsConfig` UZS deb hujjatlashtirilgan); (4) davlat to'lovi ayirilmasligi → Task 3/4/5; (5) faqat ko'rsatish → Task 9 (Transaction yaratilmaydi); (6) 3 joy alohida tuzatiladi → Task 3/4/5 alohida-alohida.
- **Placeholder skanerlash:** "TBD"/"o'xshash"/"appropriate" kabi iboralar yo'q — barcha qadamlarda aniq kod berildi.
- **Tip mosligi:** `ContractPaymentType` qiymatlari (`CASH_ALL_INCLUSIVE | TRANSFER_ONLY | CASH_ONLY | MIXED`) barcha tasklarda bir xil yozilgan; `shouldDeductGovernmentFees`/`computeContractPaymentSplit` imzolari Task 2da e'lon qilingani Task 3/4/5da xuddi shu tarzda chaqiriladi.
