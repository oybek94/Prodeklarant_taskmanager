import { describe, it, expect } from 'vitest';
import {
  applySelfSalaryRestrictions,
  canWorkerDeleteTransaction,
  type SelfSalaryInput,
} from './transactions.guards';

const NOW = new Date('2026-09-02T14:00:00');

function input(overrides: Partial<SelfSalaryInput> = {}): SelfSalaryInput {
  return {
    type: 'SALARY',
    date: new Date('2026-09-02T00:00:00'),
    ...overrides,
  };
}

describe('applySelfSalaryRestrictions', () => {
  it('o\'z ish haqi yozuvini qabul qiladi', () => {
    const data = input({ workerId: 7 });
    expect(applySelfSalaryRestrictions(data, 7, NOW)).toBeNull();
    expect(data.workerId).toBe(7);
  });

  it('workerId ko\'rsatilmasa foydalanuvchining o\'ziga bog\'laydi', () => {
    const data = input();
    expect(applySelfSalaryRestrictions(data, 7, NOW)).toBeNull();
    expect(data.workerId).toBe(7);
  });

  it('boshqa ishchi nomiga yozishni rad etadi', () => {
    const data = input({ workerId: 9 });
    expect(applySelfSalaryRestrictions(data, 7, NOW)).toMatch(/faqat o'zingiz uchun/i);
  });

  it('INCOME va EXPENSE turlarini rad etadi', () => {
    expect(applySelfSalaryRestrictions(input({ type: 'INCOME' }), 7, NOW)).toBeTruthy();
    expect(applySelfSalaryRestrictions(input({ type: 'EXPENSE' }), 7, NOW)).toBeTruthy();
  });

  it('kelajakdagi sanani rad etadi, bugungi kun oxirini qabul qiladi', () => {
    const tomorrow = input({ date: new Date('2026-09-03T00:00:00') });
    expect(applySelfSalaryRestrictions(tomorrow, 7, NOW)).toMatch(/kelajakdagi/i);

    const lateToday = input({ date: new Date('2026-09-02T23:59:00') });
    expect(applySelfSalaryRestrictions(lateToday, 7, NOW)).toBeNull();
  });

  it('faqat admin belgilaydigan maydonlarni tozalaydi', () => {
    const data = input({
      clientId: 3,
      expenseCategory: 'Ofis',
      taskId: 11,
      branchId: 2,
      virtualCardId: 4,
      isLegacyPayment: true,
    });

    expect(applySelfSalaryRestrictions(data, 7, NOW)).toBeNull();
    expect(data.clientId).toBeUndefined();
    expect(data.expenseCategory).toBeUndefined();
    expect(data.taskId).toBeUndefined();
    expect(data.branchId).toBeUndefined();
    expect(data.virtualCardId).toBeUndefined();
    expect(data.isLegacyPayment).toBe(false);
  });
});

describe('canWorkerDeleteTransaction', () => {
  const own = { type: 'SALARY', workerId: 7, createdAt: new Date('2026-09-02T09:00:00') };

  it('bugun qo\'shilgan o\'z yozuvini o\'chirishga ruxsat beradi', () => {
    expect(canWorkerDeleteTransaction(own, 7, NOW)).toBe(true);
  });

  it('kechagi yozuvni o\'chirishga ruxsat bermaydi', () => {
    expect(
      canWorkerDeleteTransaction({ ...own, createdAt: new Date('2026-09-01T23:59:00') }, 7, NOW)
    ).toBe(false);
  });

  it('boshqa ishchining yozuvini o\'chirishga ruxsat bermaydi', () => {
    expect(canWorkerDeleteTransaction({ ...own, workerId: 9 }, 7, NOW)).toBe(false);
  });

  it('ish haqi bo\'lmagan yozuvni o\'chirishga ruxsat bermaydi', () => {
    expect(canWorkerDeleteTransaction({ ...own, type: 'EXPENSE' }, 7, NOW)).toBe(false);
  });
});
