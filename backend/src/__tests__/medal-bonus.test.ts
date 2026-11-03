import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { getMedalBonusBalance } from '../services/medal-bonus';

function fakeClient(medalSum: string | null, paidSum: string | null) {
  const medalAggregate = vi.fn().mockResolvedValue({ _sum: { cashBonus: medalSum } });
  const txAggregate = vi.fn().mockResolvedValue({ _sum: { amount_uzs: paidSum } });
  const client = {
    userMedal: { aggregate: medalAggregate },
    transaction: { aggregate: txAggregate },
  } as unknown as PrismaClient;
  return { client, medalAggregate, txAggregate };
}

describe('getMedalBonusBalance', () => {
  it('qoldiq = berilgan medal bonusi - to\'langan MEDAL_BONUS', async () => {
    const { client } = fakeClient('4250000.00', '1000000.00');
    const b = await getMedalBonusBalance(client, 3);
    expect(b.totalUzs.toNumber()).toBe(4250000);
    expect(b.paidUzs.toNumber()).toBe(1000000);
    expect(b.balanceUzs.toNumber()).toBe(3250000);
  });

  it('medal ham, to\'lov ham yo\'q bo\'lsa 0', async () => {
    const { client } = fakeClient(null, null);
    const b = await getMedalBonusBalance(client, 9);
    expect(b.balanceUzs.toNumber()).toBe(0);
  });

  it('faqat MEDAL_BONUS manbasi to\'lov sifatida hisoblanadi va tahrirlanayotgani chiqariladi', async () => {
    const { client, txAggregate, medalAggregate } = fakeClient('100000', '0');
    await getMedalBonusBalance(client, 2, 55);
    expect(medalAggregate).toHaveBeenCalledWith({ where: { userId: 2 }, _sum: { cashBonus: true } });
    expect(txAggregate).toHaveBeenCalledWith({
      where: { type: 'SALARY', salarySource: 'MEDAL_BONUS', workerId: 2, id: { not: 55 } },
      _sum: { amount_uzs: true },
    });
  });
});
