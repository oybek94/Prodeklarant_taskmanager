import { describe, it, expect } from 'vitest';
import {
  compareInvoiceWithDb,
  compareStWithDb,
  compareCmrWithDb,
  compareFitoWithDb,
  DbInvoiceSnapshot,
} from '../ai/db-rule-engine';
import type {
  InvoiceExtraction,
  ST1Extraction,
  CmrExtraction,
  FitoExtraction,
} from '../ai/extraction.schemas';

/* ===================== FIXTURES ===================== */

function makeSnapshot(overrides: Partial<DbInvoiceSnapshot> = {}): DbInvoiceSnapshot {
  return {
    invoiceNumber: '15',
    invoiceDate: '2026-01-15',
    sellerName: 'URGANCH FRUITS',
    buyerName: 'ООО "Фрукт Сервис"',
    consigneeName: null,
    items: [
      {
        name: 'Хурма свежая сорт Королёк',
        nameEn: null,
        tnvedCode: '0810700009',
        unit: 'kg',
        quantity: 20190,
        grossWeight: 23130,
        netWeight: 20190,
        packagesCount: 3670,
      },
    ],
    totalGrossWeight: 23130,
    totalNetWeight: 20190,
    totalPackagesCount: 3670,
    totalAmount: 13232.8,
    currency: 'USD',
    ...overrides,
  };
}

function makeSt(overrides: Partial<ST1Extraction> = {}): ST1Extraction {
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

function makeInvoiceDoc(overrides: Partial<InvoiceExtraction> = {}): InvoiceExtraction {
  return {
    invoice_number: '15',
    invoice_date: '2026-01-15',
    seller_name: 'URGANCH FRUITS',
    buyer_name: 'ООО "Фрукт Сервис"',
    total_amount: 13232.8,
    currency: 'USD',
    products: [
      {
        name: 'Хурма свежая сорт Королёк',
        package_count: 3670,
        gross_weight: 23130,
        net_weight: 20190,
        unit_price: 0.7,
        amount: 13232.8,
      },
    ],
    ...overrides,
  };
}

/* ===================== ST-1 ===================== */

describe('compareStWithDb', () => {
  it('to‘liq mos hujjat OK qaytaradi', () => {
    const result = compareStWithDb(makeSt(), makeSnapshot());
    expect(result.status).toBe('OK');
    expect(result.errors).toHaveLength(0);
  });

  it('yaxlitlash farqi (tolerantlik ichida) xato bermaydi', () => {
    const st = makeSt({
      products: [
        { name: 'Хурма свежая сорт Королёк', package_count: 3670, gross_weight: 23131, net_weight: 20189 },
      ],
    });
    expect(compareStWithDb(st, makeSnapshot()).status).toBe('OK');
  });

  it('sana format farqi endi xato emas (15.01.2026 == 2026-01-15)', () => {
    const st = makeSt({ invoice_ref_date: '15.01.2026' });
    const result = compareStWithDb(st, makeSnapshot());
    expect(result.errors.filter((e) => e.field === 'invoice_date')).toHaveLength(0);
  });

  it('haqiqiy sana farqi xato beradi (warning)', () => {
    const st = makeSt({ invoice_ref_date: '16.01.2026' });
    const result = compareStWithDb(st, makeSnapshot());
    const err = result.errors.find((e) => e.field === 'invoice_date');
    expect(err).toBeDefined();
    expect(err?.severity).toBe('warning');
  });

  it('og‘irlik nomuvofiqligi critical', () => {
    const st = makeSt({
      products: [
        { name: 'Хурма свежая сорт Королёк', package_count: 3670, gross_weight: 25000, net_weight: 20190 },
      ],
    });
    const result = compareStWithDb(st, makeSnapshot());
    const err = result.errors.find((e) => e.field === 'gross_weight');
    expect(err?.severity).toBe('critical');
  });

  it('bitta jamlangan qator ko‘p itemli invoys totallariga solishtiriladi', () => {
    const snapshot = makeSnapshot({
      items: [
        { name: 'Хурма свежая', nameEn: null, tnvedCode: null, unit: 'kg', quantity: 10000, grossWeight: 11000, netWeight: 10000, packagesCount: 2000 },
        { name: 'Лимон свежий', nameEn: null, tnvedCode: null, unit: 'kg', quantity: 10190, grossWeight: 12130, netWeight: 10190, packagesCount: 1670 },
      ],
    });
    const st = makeSt({
      products: [{ name: 'Плоды свежие', package_count: 3670, gross_weight: 23130, net_weight: 20190 }],
    });
    expect(compareStWithDb(st, snapshot).status).toBe('OK');
  });

  it('sertifikat sanasi invoysdan oldin bo‘lsa xato (format farqiga qaramay)', () => {
    const st = makeSt({ certification_date: '10.01.2026' });
    const result = compareStWithDb(st, makeSnapshot());
    expect(result.errors.some((e) => e.field === 'certification_date')).toBe(true);
  });

  it('bo‘sh extraction NEEDS_REVIEW darajali warning beradi', () => {
    const st = makeSt({
      st_number: null,
      exporter_name: null,
      importer_name: null,
      invoice_ref_number: null,
      products: [],
    });
    const result = compareStWithDb(st, makeSnapshot());
    expect(result.status).toBe('XATO');
    expect(result.errors[0].field).toBe('extraction');
    expect(result.errors[0].severity).toBe('warning');
  });
});

/* ===================== INVOICE vs DB ===================== */

describe('compareInvoiceWithDb', () => {
  it('to‘liq mos invoys OK', () => {
    const result = compareInvoiceWithDb(makeInvoiceDoc(), makeSnapshot());
    expect(result.status).toBe('OK');
  });

  it('pul summasi 0.1% ichida farq qilsa OK', () => {
    const doc = makeInvoiceDoc({ total_amount: 13233 });
    expect(compareInvoiceWithDb(doc, makeSnapshot()).status).toBe('OK');
  });

  it('pul summasi katta farq qilsa critical xato', () => {
    const doc = makeInvoiceDoc({ total_amount: 15000 });
    const result = compareInvoiceWithDb(doc, makeSnapshot());
    const err = result.errors.find((e) => e.field === 'total_amount');
    expect(err?.severity).toBe('critical');
  });

  it('valyuta nomuvofiqligi critical xato (yozuv farqi emas)', () => {
    // "долл США" → USD deb normalizatsiya qilinadi — xato emas
    const okDoc = makeInvoiceDoc({ currency: 'долл. США' });
    expect(compareInvoiceWithDb(okDoc, makeSnapshot()).errors.filter((e) => e.field === 'currency')).toHaveLength(0);

    const badDoc = makeInvoiceDoc({ currency: 'EUR' });
    const err = compareInvoiceWithDb(badDoc, makeSnapshot()).errors.find((e) => e.field === 'currency');
    expect(err?.severity).toBe('critical');
  });

  it('invoys raqami № va nol farqlarini kechiradi', () => {
    const doc = makeInvoiceDoc({ invoice_number: '№ 015' });
    expect(compareInvoiceWithDb(doc, makeSnapshot()).errors.filter((e) => e.field === 'invoice_number')).toHaveLength(0);
  });
});

/* ===================== CMR ===================== */

describe('compareCmrWithDb', () => {
  function makeCmr(overrides: Partial<CmrExtraction> = {}): CmrExtraction {
    return {
      sender_name: 'URGANCH FRUITS',
      consignee_name: 'ООО "Фрукт Сервис"',
      delivery_place: 'Москва',
      loading_place: 'Ургенч',
      attached_documents: 'Инвойс № 15',
      invoice_ref_number: '15',
      total_package_count: 3670,
      goods_description: 'Хурма свежая',
      total_gross_weight: 23130,
      vehicle_number: '01A123BC',
      products: [],
      ...overrides,
    };
  }

  it('to‘liq mos CMR OK', () => {
    expect(compareCmrWithDb(makeCmr(), makeSnapshot()).status).toBe('OK');
  });

  it('goods_description mos kelmasa warning (critical emas)', () => {
    const cmr = makeCmr({ goods_description: 'Строительные материалы' });
    const err = compareCmrWithDb(cmr, makeSnapshot()).errors.find(
      (e) => e.field === 'goods_description'
    );
    expect(err?.severity).toBe('warning');
  });

  it('brutto og‘irlik nomuvofiqligi critical', () => {
    const cmr = makeCmr({ total_gross_weight: 25000 });
    const err = compareCmrWithDb(cmr, makeSnapshot()).errors.find(
      (e) => e.field === 'gross_weight'
    );
    expect(err?.severity).toBe('critical');
  });
});

/* ===================== FITO ===================== */

describe('compareFitoWithDb', () => {
  function makeFito(overrides: Partial<FitoExtraction> = {}): FitoExtraction {
    return {
      certificate_number: 'UZ0000001',
      issue_date: '2026-01-16',
      exporter: 'URGANCH FRUITS',
      importer: 'ООО "Фрукт Сервис"',
      product: null,
      origin_country: 'Узбекистан',
      products: [
        { name: 'Хурма свежая сорт Королёк', quantity: 20190, unit: 'kg', net_weight: 20190 },
      ],
      total_net_weight: 20190,
      total_package_count: 3670,
      ...overrides,
    };
  }

  it('to‘liq mos FITO OK', () => {
    expect(compareFitoWithDb(makeFito(), makeSnapshot()).status).toBe('OK');
  });

  it('umumiy netto nomuvofiqligi critical', () => {
    const fito = makeFito({ total_net_weight: 25000 });
    const err = compareFitoWithDb(fito, makeSnapshot()).errors.find(
      (e) => e.field === 'total_net_weight'
    );
    expect(err?.severity).toBe('critical');
  });

  it('importyor farqi warning (manzil shovqini tez-tez uchraydi)', () => {
    const fito = makeFito({ importer: 'BOSHQA KOMPANIYA' });
    const err = compareFitoWithDb(fito, makeSnapshot()).errors.find((e) => e.field === 'importer');
    expect(err?.severity).toBe('warning');
  });
});
