import { describe, it, expect } from 'vitest';
import { buildTokens, formatMoney } from './tokens';
import type { ServiceAgreement } from './types';

const agreement: ServiceAgreement = {
  id: 1, clientId: 1, agreementNumber: '2026/014', agreementDate: '2026-03-12T00:00:00.000Z',
  templateVersion: 'v1', status: 'ACTIVE', terminatedAt: null, terminationReason: null,
  customerName: 'AGRO EXPORT MCHJ', customerInn: '305123456', customerAddress: 'Farg\'ona',
  customerDirector: 'Aliyev A.A.', customerDirectorBasis: 'Устав', customerBankName: 'Ipoteka bank',
  customerBankAccount: '20208000...', customerMfo: '00123', customerOked: '46900',
  customerPhone: '+998901234567', customerEmail: 'a@b.uz',
  executorName: 'PRODEKLARANT MCHJ', executorInn: '311953399', executorAddress: 'Oltiariq',
  executorDirector: 'Турсунбоев О.У.', executorBankName: 'Universalbank',
  executorBankAccount: '20208000007207845001', executorMfo: '00973', executorOked: null,
  executorPhone: '+998911187007', executorEmail: 'oybek@prodeklarant.uz',
  paymentModel: 'MONTHLY', monthlyDueDay: 10, perCountThreshold: null, perCountDueDays: null,
  perAmountThreshold: null, perAmountDueDays: null, creditLimit: '20000000', prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Elektron BYuD', unit: '1 BYuD', bhm: 3 }],
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
});
