import { describe, it, expect } from 'vitest';
import { validateInvoiceWithST, InvoiceData, STData } from '../ai/rule-engine';

function makeInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
  return {
    invoice_number: '15',
    invoice_date: '2026-01-15',
    seller_name: 'URGANCH FRUITS',
    buyer_name: 'ООО "Фрукт Сервис"',
    products: [
      {
        name: 'Хурма свежая сорт Королёк',
        package_count: 3670,
        gross_weight: 23130,
        net_weight: 20190,
      },
    ],
    ...overrides,
  };
}

function makeSt(overrides: Partial<STData> = {}): STData {
  return {
    st_number: 'UZRU123456',
    exporter_name: 'URGANCH FRUITS',
    importer_name: 'ООО "Фрукт Сервис"',
    transport_method: 'Автотранспортом',
    invoice_ref_number: '№ 15',
    invoice_ref_date: '2026-01-15',
    certification_date: '2026-01-16',
    declaration_date: '2026-01-16',
    products: [
      {
        name: 'Хурма свежая сорт Королёк',
        package_count: 3670,
        gross_weight: 23130,
        net_weight: 20190,
      },
    ],
    ...overrides,
  };
}

describe('validateInvoiceWithST (yagona tolerant dvigatel)', () => {
  it('to‘liq mos hujjatlar OK', () => {
    expect(validateInvoiceWithST(makeInvoice(), makeSt()).status).toBe('OK');
  });

  it('1 kg yaxlitlash farqi endi xato EMAS (oldin qat’iy !== edi)', () => {
    const st = makeSt({
      products: [
        { name: 'Хурма свежая сорт Королёк', package_count: 3670, gross_weight: 23131, net_weight: 20189 },
      ],
    });
    expect(validateInvoiceWithST(makeInvoice(), st).status).toBe('OK');
  });

  it('mahsulot nomidagi kichik farq endi xato EMAS (fuzzy)', () => {
    const st = makeSt({
      products: [
        // Bir token farq — Jaccard chegarasidan yuqori
        { name: 'Хурма свежая Королёк', package_count: 3670, gross_weight: 23130, net_weight: 20190 },
      ],
    });
    expect(validateInvoiceWithST(makeInvoice(), st).status).toBe('OK');
  });

  it('invoys raqami № farqini kechiradi', () => {
    const result = validateInvoiceWithST(makeInvoice({ invoice_number: '015' }), makeSt());
    expect(result.errors.filter((e) => e.field === 'invoice_number')).toHaveLength(0);
  });

  it('sana format farqini kechiradi (15.01.2026 == 2026-01-15)', () => {
    const st = makeSt({ invoice_ref_date: '15.01.2026' });
    const result = validateInvoiceWithST(makeInvoice(), st);
    expect(result.errors.filter((e) => e.field === 'invoice_date')).toHaveLength(0);
  });

  it('haqiqiy og‘irlik farqi xato beradi', () => {
    const st = makeSt({
      products: [
        { name: 'Хурма свежая сорт Королёк', package_count: 3670, gross_weight: 25000, net_weight: 20190 },
      ],
    });
    const result = validateInvoiceWithST(makeInvoice(), st);
    expect(result.status).toBe('XATO');
    expect(result.errors.some((e) => e.field === 'gross_weight')).toBe(true);
  });

  it('transport turi avtotransport bo‘lmasa xato (biznes qoida)', () => {
    const st = makeSt({ transport_method: 'Железнодорожным транспортом' });
    const result = validateInvoiceWithST(makeInvoice(), st);
    expect(result.errors.some((e) => e.field === 'transport_method')).toBe(true);
  });

  it('bo‘sh products fail-fast', () => {
    const result = validateInvoiceWithST(makeInvoice({ products: [] }), makeSt());
    expect(result.status).toBe('XATO');
    expect(result.errors[0].field).toBe('products');
  });
});
