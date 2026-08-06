import { describe, it, expect } from 'vitest';
import { agreementCreateSchema, agreementUpdateSchema } from './service-agreements.schema';

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

  // Frontend to'ldirilmagan maydonni `null` bilan yuboradi (bazadagi ustunlar
  // nullable, GET javobi ham `null` qaytaradi) — schema buni qabul qilishi shart.
  it('to\'ldirilmagan maydonlar uchun null qabul qiladi', () => {
    const r = agreementCreateSchema.safeParse({
      ...base,
      customerInn: null,
      customerAddress: null,
      customerDirector: null,
      customerDirectorBasis: null,
      customerBankName: null,
      customerBankAccount: null,
      customerMfo: null,
      customerOked: null,
      customerPhone: null,
      customerEmail: null,
      executorInn: null,
      executorAddress: null,
      executorDirector: null,
      executorBankName: null,
      executorBankAccount: null,
      executorMfo: null,
      executorOked: null,
      executorPhone: null,
      executorEmail: null,
      monthlyDueDay: null,
      perCountThreshold: null,
      perCountDueDays: null,
      perAmountThreshold: null,
      perAmountDueDays: null,
      creditLimit: null,
      jurisdictionCourt: null,
      brokerRegistryNumber: null,
    });
    expect(r.success).toBe(true);
  });

  it('null model uchun majburiy maydonni to\'ldirmaydi', () => {
    const r = agreementCreateSchema.safeParse({ ...base, paymentModel: 'MONTHLY', monthlyDueDay: null });
    expect(r.success).toBe(false);
  });
});

describe('agreementUpdateSchema', () => {
  it('null bilan maydonni tozalashga ruxsat beradi', () => {
    const r = agreementUpdateSchema.safeParse({ paymentModel: 'PREPAID', jurisdictionCourt: null, creditLimit: null });
    expect(r.success).toBe(true);
  });
});
