import { describe, it, expect } from 'vitest';
import {
  abbreviateName,
  buildTokens,
  formatMoney,
  DEFAULT_JURISDICTION_COURT,
  EXECUTOR_DIRECTOR,
} from './tokens';
import type { ServiceAgreement } from './types';

const agreement: ServiceAgreement = {
  id: 1, clientId: 1, agreementNumber: '2026/014', agreementDate: '2026-03-12T00:00:00.000Z',
  templateVersion: 'v1', status: 'ACTIVE', terminatedAt: null, terminationReason: null,
  customerName: 'AGRO EXPORT MCHJ', customerInn: '305123456', customerAddress: 'Farg\'ona',
  customerDirector: 'Aliyev A.A.', customerDirectorBasis: 'Устав', customerBankName: 'Ipoteka bank',
  customerBankAccount: '20208000...', customerMfo: '00123', customerOked: '46900',
  customerPhone: '+998901234567', customerEmail: 'a@b.uz', customerRequisites: null,
  executorName: 'PRODEKLARANT MCHJ', executorInn: '311953399', executorAddress: 'Oltiariq',
  executorDirector: 'Турсунбоев О.У.', executorBankName: 'Universalbank',
  executorBankAccount: '20208000007207845001', executorMfo: '00973', executorOked: null,
  executorPhone: '+998911187007', executorEmail: 'oybek@prodeklarant.uz',
  paymentModel: 'MONTHLY', monthlyDueDay: 10, perCountThreshold: null, perCountDueDays: null,
  perAmountThreshold: null, perAmountDueDays: null, creditLimit: '20000000', prepaidRevertDays: 10,
  pricingMode: 'BHM', mainTariffBhm: '3', mainTariffUzs: null,
  tariffs: [{ name: 'Elektron BYuD', unit: '1 BYuD', bhm: 3 }],
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

  it('FIXED rejimida so\'mdagi qat\'iy narxni beradi, BHM ga ko\'paytirmaydi', () => {
    const fixed = { ...agreement, pricingMode: 'FIXED' as const, mainTariffUzs: '1000000' };
    expect(buildTokens(fixed, 412000).mainTariffUzs).toBe(formatMoney(1_000_000));
    expect(buildTokens(fixed, 412000).pricingMode).toBe('FIXED');
  });

  it('FIXED rejimida BHM o\'zgarsa narx o\'zgarmaydi', () => {
    const fixed = { ...agreement, pricingMode: 'FIXED' as const, mainTariffUzs: '1000000' };
    expect(buildTokens(fixed, 999999).mainTariffUzs).toBe(formatMoney(1_000_000));
  });

  it('FIXED rejimida narx kiritilmagan bo\'lsa 0 beradi', () => {
    const fixed = { ...agreement, pricingMode: 'FIXED' as const, mainTariffUzs: null };
    expect(buildTokens(fixed, 412000).mainTariffUzs).toBe('0');
  });

  it('kredit limitini formatlaydi', () => {
    expect(buildTokens(agreement, 412000).creditLimit).toBe('20 000 000');
  });

  it('bo\'sh maydonlarni chiziqcha bilan almashtiradi', () => {
    expect(buildTokens({ ...agreement, brokerRegistryNumber: null }, 412000).brokerRegistryNumber).toBe('');
    expect(buildTokens({ ...agreement, customerOked: null }, 412000).customerOked).toBe('—');
  });

  it('to\'ldirilgan maydonlarni kesib chiqaradi', () => {
    expect(buildTokens({ ...agreement, customerAddress: '  Farg\'ona  ' }, 412000).customerAddress).toBe('Farg\'ona');
  });

  it('rekvizitlar bo\'sh bo\'lsa bo\'sh matn beradi (tuzilmali qatorlar saqlanadi)', () => {
    expect(buildTokens(agreement, 412000).customerRequisites).toBe('');
    expect(buildTokens({ ...agreement, customerRequisites: '   ' }, 412000).customerRequisites).toBe('');
  });

  it('rekvizitlar matnini qator uzilishlari bilan saqlaydi', () => {
    const text = 'Манзил: Тошкент\nМФО: 00491';
    expect(buildTokens({ ...agreement, customerRequisites: text }, 412000).customerRequisites).toBe(text);
  });

  it('sud ko\'rsatilmagan bo\'lsa standart sudga tushadi', () => {
    expect(buildTokens({ ...agreement, jurisdictionCourt: null }, 412000).jurisdictionCourt)
      .toBe(DEFAULT_JURISDICTION_COURT);
    // Yozuvda qiymat bor bo'lsa u ustun — eski shartnoma o'z matnida qoladi
    expect(buildTokens(agreement, 412000).jurisdictionCourt).toBe('Farg\'ona viloyati iqtisodiy sudi');
  });

  it('bajaruvchi direktori ko\'rsatilmagan bo\'lsa standart qiymatga tushadi', () => {
    const tokens = buildTokens({ ...agreement, executorDirector: null }, 412000);
    expect(tokens.executorDirector).toBe(EXECUTOR_DIRECTOR);
    expect(tokens.executorDirectorShort).toBe('Турсунбоев О.У.');
  });
});

describe('abbreviateName', () => {
  // `ў`/`у` va `ғ`/`г` ikki xil yozilishi mumkin — ikkalasi ham qisqarishi shart
  it.each([
    ['Турсунбоев Ойбек Улуғбек ўғли', 'Турсунбоев О.У.'],
    ['Турсунбоев Ойбек Улугбек угли', 'Турсунбоев О.У.'],
    ['Karimov Aziz Baxtiyor o\'g\'li', 'Karimov A.B.'],
    ['Иванов Иван Иванович', 'Иванов И.И.'],
  ])('%s → %s', (full, short) => {
    expect(abbreviateName(full)).toBe(short);
  });

  it('allaqachon qisqargan shaklga tegmaydi', () => {
    expect(abbreviateName('Турсунбоев О.У.')).toBe('Турсунбоев О.У.');
  });

  it('bitta so\'zni o\'zgarishsiz qaytaradi', () => {
    expect(abbreviateName('—')).toBe('—');
  });
});
