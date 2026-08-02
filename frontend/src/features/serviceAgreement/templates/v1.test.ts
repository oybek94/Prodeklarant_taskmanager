import { describe, it, expect } from 'vitest';
import { getTemplate, CURRENT_TEMPLATE_VERSION } from './index';
import { resolveText, visibleBlocks } from './types';
import { buildTokens } from '../tokens';
import type { ServiceAgreement } from '../types';

const base: ServiceAgreement = {
  id: 1, clientId: 1, agreementNumber: '2026/014', agreementDate: '2026-03-12T00:00:00.000Z',
  templateVersion: 'v1', status: 'ACTIVE', terminatedAt: null, terminationReason: null,
  customerName: 'AGRO EXPORT MCHJ', customerInn: '305123456', customerAddress: 'Farg\'ona',
  customerDirector: 'Aliyev A.A.', customerDirectorBasis: 'Устав', customerBankName: 'Ipoteka bank',
  customerBankAccount: '20208', customerMfo: '00123', customerOked: '46900',
  customerPhone: '+998901234567', customerEmail: 'a@b.uz',
  executorName: 'PRODEKLARANT MCHJ', executorInn: '311953399', executorAddress: 'Oltiariq',
  executorDirector: 'Турсунбоев О.У.', executorBankName: 'Universalbank',
  executorBankAccount: '20208000007207845001', executorMfo: '00973', executorOked: null,
  executorPhone: '+998911187007', executorEmail: 'oybek@prodeklarant.uz',
  paymentModel: 'MONTHLY', monthlyDueDay: 10, perCountThreshold: 5, perCountDueDays: 3,
  perAmountThreshold: '20000000', perAmountDueDays: 3, creditLimit: '20000000', prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Elektron BYuD', unit: '1 BYuD', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: 'Farg\'ona viloyati iqtisodiy sudi',
  brokerRegistryNumber: null, signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

/** Shablonni to'liq yechib, hosil bo'lgan matnni qaytaradi */
function renderAll(agreement: ServiceAgreement): string {
  const tokens = buildTokens(agreement, 412000);
  const template = getTemplate(agreement.templateVersion);
  return visibleBlocks(template, tokens)
    .map((block) => {
      if (block.kind === 'heading' || block.kind === 'paragraph') return resolveText(block.text, tokens);
      if (block.kind === 'table') return block.rows(tokens).flat().join(' ');
      return '';
    })
    .join('\n');
}

describe('v1 shabloni', () => {
  it('barcha tokenlar yechiladi, {{...}} qolmaydi', () => {
    const text = renderAll(base);
    expect(text).not.toContain('{{');
  });

  it('to\'lov modeli harfi matnga tushadi', () => {
    expect(renderAll(base)).toContain('Танланган модель: B');
  });

  it('kredit limiti bandi PREPAID modelida chiqmaydi', () => {
    expect(renderAll(base)).toContain('Кредит лимити');
    expect(renderAll({ ...base, paymentModel: 'PREPAID' })).not.toContain('Кредит лимити');
  });

  it('reestr raqami bo\'lmasa broker bandi vakil bandiga almashadi', () => {
    const without = renderAll(base);
    expect(without).toContain('ишончли вакили');
    expect(without).not.toContain('реестрга');

    const with_ = renderAll({ ...base, brokerRegistryNumber: '№ 123' });
    expect(with_).toContain('реестрга');
    expect(with_).not.toContain('ишончли вакили');
  });

  it('QQS bandi vatPayer=false da chiqadi', () => {
    expect(renderAll(base)).toContain('ҚҚС тўловчиси эмас');
    expect(renderAll({ ...base, vatPayer: true })).not.toContain('ҚҚС тўловчиси эмас');
  });

  it('tarif jadvali qatorlari chiqadi', () => {
    expect(renderAll(base)).toContain('Elektron BYuD');
  });

  it('noma\'lum versiyada xato beradi', () => {
    expect(() => getTemplate('v99')).toThrow(/Noma'lum shablon versiyasi/);
  });

  it('joriy versiya mavjud', () => {
    expect(getTemplate(CURRENT_TEMPLATE_VERSION).version).toBe('v1');
  });
});
