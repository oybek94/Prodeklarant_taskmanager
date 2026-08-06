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
