import { describe, it, expect } from 'vitest';
import { openSync } from 'fontkit';
import { getTemplate, CURRENT_TEMPLATE_VERSION } from './index';
import { resolveText, visibleBlocks } from './types';
import { buildTokens } from '../tokens';
import type { ServiceAgreement } from '../types';

/** `components/pdf/fonts.ts` dagi stek bilan bir xil bo'lishi shart */
const PDF_FONTS = ['Roboto-Regular', 'Roboto-Medium', 'Roboto-Bold', 'NotoSans-Regular'].map((name) =>
  openSync(`public/fonts/${name}.ttf`),
);

const base: ServiceAgreement = {
  id: 1, clientId: 1, agreementNumber: '2026/014', agreementDate: '2026-03-12T00:00:00.000Z',
  templateVersion: 'v2', status: 'ACTIVE', terminatedAt: null, terminationReason: null,
  customerName: 'AGRO EXPORT MCHJ', customerInn: '305123456', customerAddress: 'Farg\'ona',
  customerDirector: 'Aliyev A.A.', customerDirectorBasis: 'Устав', customerBankName: 'Ipoteka bank',
  customerBankAccount: '20208', customerMfo: '00123', customerOked: '46900',
  customerPhone: '+998901234567', customerEmail: 'a@b.uz',
  executorName: 'PRODEKLARANT MCHJ', executorInn: '311953399', executorAddress: 'Oltiariq',
  executorDirector: 'Турсунбоев О.У.', executorBankName: 'Universalbank',
  executorBankAccount: '20208000007207845001', executorMfo: '00973', executorOked: null,
  executorPhone: '+998911187007', executorEmail: '1187007@mail.ru',
  paymentModel: 'MONTHLY', monthlyDueDay: 10, perCountThreshold: 5, perCountDueDays: 3,
  perAmountThreshold: '20000000', perAmountDueDays: 3, creditLimit: '20000000', prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Elektron BYuD', unit: '1 BYuD', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: 'Farg\'ona viloyati iqtisodiy sudi',
  brokerRegistryNumber: null, signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

function renderAll(agreement: ServiceAgreement): string {
  const tokens = buildTokens(agreement, 412000);
  const template = getTemplate(agreement.templateVersion);
  return visibleBlocks(template, tokens)
    .map((block) => {
      if (block.kind === 'heading' || block.kind === 'paragraph') return resolveText(block.text, tokens);
      if (block.kind === 'table') return [...block.header, ...block.rows(tokens).flat()].join(' ');
      return '';
    })
    .join('\n');
}

describe('v2 shabloni', () => {
  it('joriy versiya — v2', () => {
    expect(CURRENT_TEMPLATE_VERSION).toBe('v2');
  });

  it('barcha tokenlar yechiladi, {{...}} qolmaydi', () => {
    expect(renderAll(base)).not.toContain('{{');
  });

  it('iloval1ar butunlay yo\'q', () => {
    const text = renderAll(base);
    expect(text).not.toContain('1-илова');
    expect(text).not.toContain('2-илова');
    expect(text).not.toContain('3-илова');
    expect(text).not.toContain('4-илова');
    expect(text).not.toContain('5-илова');
    expect(text).not.toContain('ИЛОВА');
  });

  it('tarif jadvali asosiy matnda qoladi', () => {
    const text = renderAll(base);
    expect(text).toContain('Elektron BYuD');
    expect(text).toContain('Нархи (БҲМ)');
  });

  it('Bajaruvchi e-mail\'i doimiy docs@prodeklarant.uz', () => {
    const text = renderAll(base);
    expect(text).toContain('docs@prodeklarant.uz');
    // Sozlamalardagi eski manzil hujjatga tushmasligi kerak
    expect(text).not.toContain('1187007@mail.ru');
  });

  it('16.2–16.6 bandlari olib tashlangan', () => {
    const text = renderAll(base);
    expect(text).toContain('16.1.');
    expect(text).toContain('16.2.');
    expect(text).not.toContain('16.3.');
    expect(text).not.toContain('16.7.');
    expect(text).not.toContain('16.8.');
  });

  it('to\'lov modeli va shartli bandlar v1 dagidek ishlaydi', () => {
    expect(renderAll(base)).toContain('Танланган модель: B');
    expect(renderAll(base)).toContain('Кредит лимити');
    expect(renderAll({ ...base, paymentModel: 'PREPAID' })).not.toContain('Кредит лимити');
    expect(renderAll(base)).toContain('ишончли вакили');
    expect(renderAll({ ...base, brokerRegistryNumber: '№ 123' })).toContain('реестрга');
    expect(renderAll({ ...base, vatPayer: true })).not.toContain('ҚҚС тўловчиси эмас');
  });

  /** Qarang: `v1.test.ts` — glifi yo'q belgi PDF'ni butunlay ishlamay qoldiradi */
  it('shablon matnidagi har bir belgi PDF shriftlarida mavjud', () => {
    const text = [
      renderAll(base),
      renderAll({ ...base, paymentModel: 'PREPAID' }),
      renderAll({ ...base, paymentModel: 'PER_COUNT' }),
      renderAll({ ...base, paymentModel: 'PER_AMOUNT' }),
      renderAll({ ...base, brokerRegistryNumber: '№ 123' }),
      renderAll({ ...base, vatPayer: true }),
    ].join('\n');

    const missing = new Set<string>();
    for (const char of text) {
      const codePoint = char.codePointAt(0);
      if (codePoint === undefined || char === '\n') continue;
      if (PDF_FONTS.some((font) => font.hasGlyphForCodePoint(codePoint))) continue;
      missing.add(`«${char}» U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
    }

    expect([...missing]).toEqual([]);
  });
});
