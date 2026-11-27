import { describe, it, expect } from 'vitest';
import type { DraftData } from '../services/client-cargo-draft';
import {
  buildCargoInvoiceInput,
  cargoTaskTitle,
  parseInvoiceText,
  resolveCargoProductDefaults,
  type CargoInvoiceContext,
  type ProductSources,
} from '../services/client-cargo-invoice';

const TODAY = '2026-02-10';
const noSources: ProductSources = { global: [], spec: [], history: [] };

const fields = {
  product: 'Хурма свежая',
  boxCount: '100',
  packagingType: 'пласт.ящик',
  palletCount: '3',
  palletWeight: '45',
  netto: '1900',
  brutto: '2070',
  price: '1.28',
};

const draft = (over: Partial<DraftData> = {}): DraftData => ({
  contractId: 5,
  branchId: 3,
  header: {
    invoiceNumber: 'Инвойс № 1/26 от 01.02.2026 год',
    deliveryTerms: 'DAP - Город',
    customsPlace: 'Пост 1',
    destination: 'Склад 2',
    vehicleNumber: '01A111AA/012222BA',
    orderNumber: 'ORD-1',
    temperature: '+2',
    sensorSerial: 'SN1',
  },
  items: [{ uid: 'u1', fields: { ...fields }, bruttoManual: false }],
  ...over,
});

const context = (over: Partial<CargoInvoiceContext> = {}): CargoInvoiceContext => ({
  contract: { id: 5, contractNumber: 'K-1', contractCurrency: 'USD', gln: '4600000000000' },
  shipmentPlace: 'Тестовая область',
  region: { internalCode: '30', name: 'Туман', externalCode: '1730' },
  previousAdditionalInfo: null,
  packagingTypes: [{ name: 'пласт.ящик', code: 'PX' }],
  sources: noSources,
  ...over,
});

describe('parseInvoiceText', () => {
  it.each([
    ['Инвойс № 1/26 от 01.02.2026 год', { number: '1/26', date: '2026-02-01', invalidDate: false }],
    ['№12 от 1.2.26г.', { number: '12', date: '2026-02-01', invalidDate: false }],
    ['INV-7', { number: 'INV-7', invalidDate: false }],
    ['15 01.02.2026', { number: '15', date: '2026-02-01', invalidDate: false }],
    ['', { invalidDate: false }],
    [undefined, { invalidDate: false }],
  ])('%s', (raw, expected) => {
    expect(parseInvoiceText(raw)).toEqual(expected);
  });

  it.each(['3 от 31.02.2026', '3 от 5 ноября'])("tushunarsiz sana rad etiladi: %s", (raw) => {
    expect(parseInvoiceText(raw).invalidDate).toBe(true);
  });
});

describe('resolveCargoProductDefaults', () => {
  it('aynan mos nom: global kod spetsifikatsiya kodidan ustun, narx spetsifikatsiyadan', () => {
    const result = resolveCargoProductDefaults('Яблоки свежие', {
      global: [{ name: 'яблоки свежие', code: '0808108000' }],
      spec: [{ productName: 'Яблоки свежие', tnvedCode: '1111111111', unitPrice: 0.5 }],
      history: [],
    });
    expect(result).toEqual({ tnvedCode: '0808108000', unitPrice: 0.5 });
  });

  it("aynan moslik yo'q bo'lsa umumiy tur so'zi bo'yicha topadi", () => {
    const result = resolveCargoProductDefaults('Яблоки Гала свежие', {
      global: [],
      spec: [{ productName: 'Яблоки свежие', tnvedCode: '0808108000', unitPrice: 0.7 }],
      history: [],
    });
    expect(result).toEqual({ tnvedCode: '0808108000', unitPrice: 0.7 });
  });

  it("faqat 'свежий' mos kelishi yetarli emas", () => {
    const result = resolveCargoProductDefaults('Хурма свежая', {
      global: [{ name: 'Яблоки свежие', code: '0808108000' }],
      spec: [],
      history: [],
    });
    expect(result).toEqual({});
  });
});

describe('buildCargoInvoiceInput', () => {
  it('tovar qatori va jami summa', () => {
    const input = buildCargoInvoiceInput(draft(), context(), TODAY);
    expect(input.items).toHaveLength(1);
    expect(input.items?.[0]).toMatchObject({
      name: 'Хурма свежая',
      unit: 'кг',
      quantity: 3,
      packagesCount: 100,
      packageType: 'пласт.ящик',
      netWeight: 1900,
      grossWeight: 2070,
      unitPrice: 1.28,
      totalPrice: 2432,
    });
    expect(input.totalAmount).toBe(2432);
  });

  it('sarlavha maydonlari', () => {
    const input = buildCargoInvoiceInput(draft(), context(), TODAY);
    expect(input).toMatchObject({ invoiceNumber: '1/26', date: '2026-02-01', contractId: 5, contractNumber: 'K-1', currency: 'USD' });
    expect(input.additionalInfo).toMatchObject({
      deliveryTerms: 'DAP - Город',
      customsAddress: 'Пост 1',
      destination: 'Склад 2',
      vehicleNumber: '01A111AA/012222BA',
      orderNumber: 'ORD-1',
      temperature: '+2',
      shipmentPlace: 'Тестовая область',
      origin: 'Республика Узбекистан',
      gln: '4600000000000',
      fssRegionInternalCode: '30',
      fssRegionName: 'Туман',
      fssRegionExternalCode: '1730',
      packagingTypeCodes: [{ name: 'пласт.ящик', code: 'PX' }],
      customFields: [{ id: 'cargo_sensor', label: 'Серийный номер датчика', value: 'SN1' }],
    });
  });

  it("raqam va sana yozilmagan: raqam bo'sh, sana bugun", () => {
    const input = buildCargoInvoiceInput(draft({ header: {} }), context(), TODAY);
    expect(input.invoiceNumber).toBeUndefined();
    expect(input.date).toBe(TODAY);
  });

  it("poddon og'irliklari yig'iladi va izohga yoziladi", () => {
    const data = draft({
      items: [
        { uid: 'u1', fields: { ...fields }, bruttoManual: false },
        { uid: 'u2', fields: { ...fields, palletWeight: '0.5' }, bruttoManual: false },
      ],
    });
    const input = buildCargoInvoiceInput(data, context(), TODAY);
    expect(input.additionalInfo?.palletWeight).toBe('45.5');
    expect(input.notes).toBe('Товары уложены на деревянных паллетах которые не являются товаром весом 45.5 кг.');
    expect(input.totalAmount).toBe(4864);
  });

  it("poddon og'irligi yo'q bo'lsa izoh ham yo'q", () => {
    const { palletWeight: _unused, ...rest } = fields;
    const input = buildCargoInvoiceInput(draft({ items: [{ uid: 'u1', fields: rest, bruttoManual: false }] }), context(), TODAY);
    expect(input.notes).toBeUndefined();
    expect(input.additionalInfo?.palletWeight).toBeUndefined();
  });

  it("narx bo'sh: spetsifikatsiya narxi, u ham yo'q bo'lsa 0", () => {
    const { price: _unused, ...rest } = fields;
    const data = draft({ items: [{ uid: 'u1', fields: rest, bruttoManual: false }] });
    const fromSpec = buildCargoInvoiceInput(
      data,
      context({ sources: { ...noSources, spec: [{ productName: 'Хурма свежая', tnvedCode: '0810700000', unitPrice: 2 }] } }),
      TODAY
    );
    expect(fromSpec.items?.[0]).toMatchObject({ unitPrice: 2, totalPrice: 3800, tnvedCode: '0810700000' });
    expect(buildCargoInvoiceInput(data, context(), TODAY).items?.[0]).toMatchObject({ unitPrice: 0, totalPrice: 0 });
  });

  it("bo'sh tovar bloki tushib qoladi", () => {
    const data = draft({ items: [{ uid: 'u0', fields: {}, bruttoManual: false }, { uid: 'u1', fields: { ...fields }, bruttoManual: false }] });
    expect(buildCargoInvoiceInput(data, context(), TODAY).items).toHaveLength(1);
  });

  it('shartnomasiz ariza: shartnomasiz invoys, USD', () => {
    const input = buildCargoInvoiceInput(draft({ contractId: null }), context({ contract: null }), TODAY);
    expect(input.contractId).toBeUndefined();
    expect(input.contractNumber).toBeUndefined();
    expect(input.currency).toBe('USD');
  });

  it.each([
    ['UZS', 'UZS'],
    ['RUB', 'USD'],
    [null, 'USD'],
  ])('shartnoma valyutasi %s → %s', (contractCurrency, expected) => {
    const input = buildCargoInvoiceInput(draft(), context({ contract: { id: 5, contractNumber: 'K-1', contractCurrency, gln: null } }), TODAY);
    expect(input.currency).toBe(expected);
  });

  it("oldingi invoysdan faqat doimiy sozlamalar ko'chadi", () => {
    const previous = {
      manufacturer: 'Завод',
      harvestYear: '2026',
      visibleColumns: { plu: false },
      columnLabels: { name: 'Товар' },
      columnOrder: ['name'],
      customColumns: ['c1'],
      visibleAdditionalInfoFields: { gln: true },
      additionalFieldsOrder: ['gln'],
      pdfFontSizes: { notes: 8 },
      vehicleNumber: 'OLD',
      orderNumber: 'OLD',
      customFields: [{ label: 'x', value: 'y' }],
      changeLog: [{ field: 'a' }],
    };
    const input = buildCargoInvoiceInput(draft({ header: {} }), context({ previousAdditionalInfo: previous }), TODAY);
    const ai = input.additionalInfo as Record<string, unknown>;
    expect(ai).toMatchObject({
      manufacturer: 'Завод',
      harvestYear: '2026',
      visibleColumns: { plu: false },
      columnLabels: { name: 'Товар' },
      columnOrder: ['name'],
      customColumns: ['c1'],
      visibleAdditionalInfoFields: { gln: true },
      additionalFieldsOrder: ['gln'],
      pdfFontSizes: { notes: 8 },
    });
    expect(ai.vehicleNumber).toBeUndefined();
    expect(ai.orderNumber).toBeUndefined();
    expect(ai.customFields).toBeUndefined();
    expect(ai.changeLog).toBeUndefined();
  });
});

describe('cargoTaskTitle', () => {
  it("raqam va avto bo'lsa, aks holda shartnoma bo'yicha", () => {
    expect(cargoTaskTitle('1/26', '01A111AA/012222BA', 'K-1')).toBe('1/26 АВТО 01A111AA');
    expect(cargoTaskTitle('1/26', undefined, 'K-1')).toBe('Invoice - K-1');
    expect(cargoTaskTitle('1/26', undefined, undefined)).toBe('Invoice - yangi');
  });
});
