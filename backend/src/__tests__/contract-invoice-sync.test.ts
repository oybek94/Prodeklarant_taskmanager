import { describe, it, expect, vi } from 'vitest';

vi.mock('../prisma', () => ({ prisma: {} }));

import { syncCustomsAddressInInfo } from '../services/contract-invoice-sync.service';

const before = { deliveryTerms: 'FCA\nDAP', customsAddress: 'Eski manzil 1\nEski manzil 2' };

describe('syncCustomsAddressInInfo', () => {
  it('shartnomadan ko\'chirilgan manzilni yangisiga almashtiradi (yetkazib berish sharti bo\'yicha)', () => {
    const after = { deliveryTerms: 'FCA\nDAP', customsAddress: 'Yangi manzil 1\nYangi manzil 2' };
    const info = syncCustomsAddressInInfo({ deliveryTerms: 'DAP', customsAddress: 'Eski manzil 2' }, before, after);
    expect(info).toEqual({ deliveryTerms: 'DAP', customsAddress: 'Yangi manzil 2' });
  });

  it('shart topilmasa eski qator o\'rnidan foydalanadi', () => {
    const after = { deliveryTerms: 'FCA\nDAP', customsAddress: 'Yangi manzil 1\nYangi manzil 2' };
    const info = syncCustomsAddressInInfo({ customsAddress: 'Eski manzil 1' }, before, after);
    expect(info?.customsAddress).toBe('Yangi manzil 1');
  });

  it('qo\'lda kiritilgan manzilga tegmaydi', () => {
    const after = { deliveryTerms: 'FCA\nDAP', customsAddress: 'Yangi manzil 1\nYangi manzil 2' };
    expect(syncCustomsAddressInInfo({ customsAddress: 'Qo\'lda yozilgan' }, before, after)).toBeNull();
  });

  it('bo\'sh manzilga va o\'zgarmagan manzilga tegmaydi', () => {
    const after = { deliveryTerms: 'FCA\nDAP', customsAddress: 'Yangi manzil 1\nYangi manzil 2' };
    expect(syncCustomsAddressInInfo({ customsAddress: '' }, before, after)).toBeNull();
    expect(syncCustomsAddressInInfo({ customsAddress: 'Eski manzil 1' }, before, before)).toBeNull();
    expect(syncCustomsAddressInInfo(null, before, after)).toBeNull();
  });
});
