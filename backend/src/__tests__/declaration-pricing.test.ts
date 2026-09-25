import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { declarationCompletedFields, declarationResetFields, DeclarationClient } from '../services/declaration-pricing';

const D = (v: number) => new Decimal(v);
const bxm = { amountUsd: 34.4, amountUzs: 412000 };
const usdClient: DeclarationClient = {
  dealAmount: D(150), dealAmount_currency: 'USD', dealAmountCurrency: 'USD', dealAmount_amount_uzs: null,
  dealAmount_exchange_rate: D(12000), dealAmountExchangeRate: null, contractPaymentType: 'CASH_ALL_INCLUSIVE',
};
const rates = { snapshotDealAmount_exchange_rate: D(12650), snapshotDealAmountExchangeRate: null };

describe('declarationCompletedFields', () => {
  it("USD, CASH_ALL_INCLUSIVE, koef 2, ish vaqtidan tashqari (mijoz to'laydi)", () => {
    const f = declarationCompletedFields({ client: usdClient, task: rates, multiplier: 2, afterHoursDeclaration: true, afterHoursPayer: 'CLIENT', bxm });
    // Mijoz summasi USD da: 150 + 1 × 34.4 + 8.5
    expect(f.snapshotDealAmount).toBeCloseTo(150 + 34.4 + 8.5, 2);
    expect(f.snapshotDealAmount_amount_uzs).toBe(150 * 12000 + 412000 + 103000);
    // Bojxona to'lovi — SO'MDA (oldin mijoz valyutasida 2 × 34.4 + 8.5 "USD" edi)
    expect(f.snapshotCustomsPayment).toBe(2 * 412000 + 103000);
    expect(f.snapshotCustomsPayment_currency).toBe('UZS');
    expect(f.snapshotCustomsPayment_exchange_rate).toBe(1);
  });

  it("TRANSFER_ONLY: mijoz summasiga qo'shimcha qo'shilmaydi", () => {
    const f = declarationCompletedFields({
      client: { ...usdClient, contractPaymentType: 'TRANSFER_ONLY' }, task: rates, multiplier: 3,
      afterHoursDeclaration: false, afterHoursPayer: 'CLIENT', bxm,
    });
    expect(f.snapshotDealAmount).toBe(150);
    expect(f.snapshotCustomsPayment).toBe(3 * 412000);
  });

  it("ish vaqtidan tashqari kompaniya hisobidan: bojxonaga qo'shiladi, mijozga emas", () => {
    const f = declarationCompletedFields({ client: usdClient, task: rates, multiplier: 1, afterHoursDeclaration: true, afterHoursPayer: 'COMPANY', bxm });
    expect(f.snapshotDealAmount).toBe(150);
    expect(f.snapshotCustomsPayment).toBe(412000 + 103000);
  });
});

describe('declarationResetFields', () => {
  it("asosiy summaga qaytadi, bojxona 0 so'm", () => {
    const f = declarationResetFields(usdClient, rates);
    expect(f.snapshotDealAmount).toBe(150);
    expect(f.snapshotDealAmount_amount_uzs).toBe(150 * 12000);
    expect(f.snapshotCustomsPayment).toBe(0);
    expect(f.snapshotCustomsPayment_currency).toBe('UZS');
    expect(f.customsPaymentMultiplier).toBeNull();
  });
});
