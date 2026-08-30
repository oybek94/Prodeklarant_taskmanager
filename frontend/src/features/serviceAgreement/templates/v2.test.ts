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
  customerPhone: '+998901234567', customerEmail: 'a@b.uz', customerRequisites: null,
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

  it('qisqartirilgan tuzilma: 13 bo\'lim, atamalar bo\'limi yo\'q', () => {
    const text = renderAll(base);
    expect(text).toContain('13. ТОМОНЛАРНИНГ РЕКВИЗИТЛАРИ');
    expect(text).not.toContain('14.');
    expect(text).not.toContain('АТАМАЛАР ВА ТАЪРИФЛАР');
  });

  it('himoya bandlari saqlangan', () => {
    const text = renderAll(base);
    // Bularsiz shartnoma Bajaruvchi uchun ma'nosiz — o'chib ketmaganiga ishonch
    expect(text).toContain('Буюртмачининг кафолатлари');
    expect(text).toContain('контрабанда');
    expect(text).toContain('Регресс');
    expect(text).toContain('Жавобгарлик чегараси');
    expect(text).toContain('ушлаб туриш');
  });

  it('olib tashlangan bandlar qaytib kelmaydi', () => {
    const text = renderAll(base);
    // 1.4 (Deklarant maqomi) va eski 2.2 (ish boshlash muddati)
    expect(text).not.toContain('Декларант мақоми');
    expect(text).not.toContain('иш кунидан кечиктирмай');
    // Bandlar uzluksiz raqamlangan
    expect(text).toContain('1.2. Бажарувчи хизматларни');
    expect(text).toContain('2.2. Ҳужжатлар тўлиқ бўлмаган');
    expect(text).toContain('2.3. Бажарувчи Буюртмачининг топшириқлари');
    // Band raqami har doim qator boshida — «11.3.» kabi mosliklar hisobga olinmaydi
    expect(text).not.toContain('\n1.3.');
    expect(text).not.toContain('\n1.4.');
    expect(text).not.toContain('\n2.4.');
  });

  it('ishlatiladigan atamalar shartnomada ta\'riflangan', () => {
    const text = renderAll(base);
    // «Буюртма-ариза» 3.4, 4.5, 6.2, 6.3, 11.3 va 11.4 da ishlatiladi — ta'rif
    // eski 1.2 bilan birga yo'qolmasligi kerak
    expect(text).toContain('Буюртма-ариза** билан белгиланади');
    const definedAt = text.indexOf('Буюртма-ариза** билан белгиланади');
    expect(definedAt).toBeGreaterThan(-1);
    // Ta'rif atama birinchi ishlatilishidan oldin turishi kerak
    expect(definedAt).toBeLessThan(text.indexOf('ҳар бир Буюртма-ариза юборилиши билан'));
  });

  it('to\'lov modeli va shartli bandlar v1 dagidek ishlaydi', () => {
    expect(renderAll(base)).toContain('Тўлов модели: B (ойлик, постпайд)');
    expect(renderAll(base)).not.toContain('Тўлов модели: A');
    expect(renderAll(base)).toContain('Кредит лимити');
    expect(renderAll({ ...base, paymentModel: 'PREPAID' })).not.toContain('Кредит лимити');
    expect(renderAll(base)).toContain('ишончли вакили');
    expect(renderAll({ ...base, brokerRegistryNumber: '№ 123' })).toContain('реестр');
    expect(renderAll({ ...base, vatPayer: true })).not.toContain('ҚҚС тўловчиси эмас');
  });

  describe('13-bo\'lim rekvizitlari', () => {
    /** 13-bo'lim jadvalining qatorlarini `[bajaruvchi, buyurtmachi]` ko'rinishida beradi */
    const requisiteRows = (agreement: ServiceAgreement): string[][] => {
      const tokens = buildTokens(agreement, 412000);
      const table = visibleBlocks(getTemplate('v2'), tokens)
        .filter((block) => block.kind === 'table')
        .at(-1);
      if (table?.kind !== 'table') throw new Error('Rekvizitlar jadvali topilmadi');
      return table.rows(tokens);
    };

    const withRequisites = {
      ...base,
      customerRequisites: 'Манзил: Тошкент ш.\nБанк: Ипотека банк\nМФО: 00491',
    };

    it('erkin matn kiritilganda uni satrma-satr chiqaradi', () => {
      const customer = requisiteRows(withRequisites).map((row) => row[1]);
      expect(customer).toContain('Манзил: Тошкент ш.');
      expect(customer).toContain('Банк: Ипотека банк');
      expect(customer).toContain('МФО: 00491');
    });

    it('erkin matn tuzilmali qatorlarning O\'RNIGA chiqadi', () => {
      const customer = requisiteRows(withRequisites).map((row) => row[1]);
      // Mijozning bazadagi MFO'si 00123 — u endi chiqmasligi kerak
      expect(customer).not.toContain('МФО: 00123');
      // Nom va STIR baribir alohida qator bo'lib qoladi
      expect(customer[0]).toBe('AGRO EXPORT MCHJ');
      expect(customer[1]).toBe('СТИР: 305123456');
    });

    it('rekvizitlar bo\'sh bo\'lsa eski tuzilmali qatorlar saqlanadi', () => {
      const customer = requisiteRows(base).map((row) => row[1]);
      expect(customer).toContain('МФО: 00123');
      expect(customer).toContain('E-mail: a@b.uz');
    });

    it('ИФУТ (ОКЭД) hech bir ustunda chiqmaydi', () => {
      for (const agreement of [base, withRequisites]) {
        expect(requisiteRows(agreement).flat().join('\n')).not.toContain('ИФУТ');
      }
    });

    // Direktor F.I.Sh. preambulada va imzo joyida qoladi — rekvizitlar jadvalida emas
    it('«Директор» qatori hech bir ustunda chiqmaydi', () => {
      for (const agreement of [base, withRequisites]) {
        expect(requisiteRows(agreement).flat().join('\n')).not.toContain('Директор');
      }
    });

    it('bajaruvchi ustunida barcha rekvizit qatori bor', () => {
      for (const rows of [requisiteRows(base), requisiteRows(withRequisites)]) {
        expect(rows.every((row) => row.length === 2)).toBe(true);
        const executor = rows.map((row) => row[0]);
        expect(executor).toContain('PRODEKLARANT MCHJ');
        expect(executor).toContain('Манзил: Oltiariq');
        expect(executor).toContain('СТИР: 311953399');
        expect(executor).toContain('Банк: Universalbank');
        expect(executor).toContain('Ҳ/р: 20208000007207845001');
        expect(executor).toContain('МФО: 00973');
        expect(executor).toContain('Тел: +998911187007');
        expect(executor).toContain('E-mail: docs@prodeklarant.uz');
      }
    });

    it('uzun rekvizitlar matnida bajaruvchi qatorlari yo\'qolmaydi', () => {
      const long = { ...base, customerRequisites: Array.from({ length: 25 }, (_, i) => `Қатор ${i}`).join('\n') };
      const rows = requisiteRows(long);
      expect(rows).toHaveLength(28); // 2 sarlavha + 1 bo'sh + 25 qator
      expect(rows.map((row) => row[0])).toContain(`E-mail: ${'docs@prodeklarant.uz'}`);
    });
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
