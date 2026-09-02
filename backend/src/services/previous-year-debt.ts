import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { SEASON_SPLIT_DATE, getPaidAmountIn } from './worker-payment';

/**
 * O'tgan yil qarzi (PreviousYearWorkerDebt) — adminning qo'lda kiritgan snapshot'i.
 * Undan keyin tizim orqali qilingan "o'tgan mavsum" to'lovlari (WorkerPayment,
 * isLegacyPayment = true) jadvalga yozilmaydi — ular shu yerda hisoblab qo'shiladi.
 * Saqlangan ustunlar o'zgarmaydi, shuning uchun to'lov o'chirilsa qarz o'zi tiklanadi.
 */

export interface PreviousYearDebtSnapshot {
  totalEarned: Decimal | number | string;
  totalPaid: Decimal | number | string;
}

export interface PreviousYearDebtTotals {
  /** Adminning formada kiritgan boshlang'ich "to'langan" summasi */
  initialTotalPaid: number;
  /** Tizimdagi o'tgan mavsum to'lovlari (USD) */
  paidFromPayments: number;
  /** Ko'rsatiladigan jami to'langan */
  totalPaid: number;
  /** Ko'rsatiladigan qoldiq qarz */
  balance: number;
}

/**
 * Snapshot va to'lovlar yig'indisidan ko'rsatiladigan qiymatlarni hisoblaydi.
 */
export function calculatePreviousYearDebtTotals(
  debt: PreviousYearDebtSnapshot,
  paidFromPayments: Decimal | number | string
): PreviousYearDebtTotals {
  const totalEarned = new Decimal(debt.totalEarned ?? 0);
  const initialTotalPaid = new Decimal(debt.totalPaid ?? 0);
  const paid = new Decimal(paidFromPayments ?? 0);
  const totalPaid = initialTotalPaid.plus(paid);

  return {
    initialTotalPaid: initialTotalPaid.toNumber(),
    paidFromPayments: paid.toNumber(),
    totalPaid: totalPaid.toNumber(),
    balance: totalEarned.minus(totalPaid).toNumber(),
  };
}

/**
 * Berilgan ishchilarning o'tgan mavsum to'lovlarini (USD) bitta so'rovda yig'adi.
 * `legacyDebtUsd` hisobi bilan bir xil qoida: faqat mavsum bo'linishidan keyingi to'lovlar.
 */
export async function getLegacyPaidUsdByWorker(
  workerIds: number[],
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<Map<number, Decimal>> {
  const result = new Map<number, Decimal>();
  if (workerIds.length === 0) return result;

  const client = tx || (await import('../prisma')).prisma;

  const payments = await (client as any).workerPayment.findMany({
    where: {
      workerId: { in: workerIds },
      isLegacyPayment: true,
      paymentDate: { gte: SEASON_SPLIT_DATE },
    },
    select: {
      workerId: true,
      paidAmountUsd: true,
      paidAmountUzs: true,
      exchangeRate: true,
    },
  });

  for (const payment of payments) {
    const current = result.get(payment.workerId) ?? new Decimal(0);
    result.set(payment.workerId, current.plus(getPaidAmountIn(payment, 'USD')));
  }

  return result;
}
