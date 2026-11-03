import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Xodimning medal bonusi hisobi: berilgan medallar `cashBonus` yig'indisi (jami),
 * MEDAL_BONUS tranzaksiyalari bilan to'langan summa va qoldiq.
 * Eslatma mukofotlari (`bountyReward`) bu yerga KIRMAYDI — ular allaqachon oylikning
 * "ishlab topgan" summasida hisoblanadi.
 * `excludeTransactionId` — tahrirlanayotgan tranzaksiyani qoldiqdan chiqarib yubormaslik uchun.
 */
export async function getMedalBonusBalance(
  tx: PrismaClient | Prisma.TransactionClient,
  workerId: number,
  excludeTransactionId?: number
): Promise<{ totalUzs: Decimal; paidUzs: Decimal; balanceUzs: Decimal }> {
  const [medalAgg, paidAgg] = await Promise.all([
    tx.userMedal.aggregate({ where: { userId: workerId }, _sum: { cashBonus: true } }),
    tx.transaction.aggregate({
      where: {
        type: 'SALARY',
        salarySource: 'MEDAL_BONUS',
        workerId,
        ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
      },
      _sum: { amount_uzs: true },
    }),
  ]);
  const totalUzs = new Decimal(medalAgg._sum.cashBonus ?? 0);
  const paidUzs = new Decimal(paidAgg._sum.amount_uzs ?? 0);
  return { totalUzs, paidUzs, balanceUzs: totalUzs.minus(paidUzs) };
}
