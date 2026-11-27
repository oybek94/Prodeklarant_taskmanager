/**
 * Mijoz guruhiga yuboriladigan invoys serverda chiziladi. Bu testlar invoys sahifasisiz,
 * faqat bazadan kelgan ma'lumotdan sahifadagi bilan bir xil PDF props'i yig'ilishini tekshiradi.
 */
import { describe, it, expect, vi } from 'vitest';
import { Font } from '@react-pdf/renderer';

vi.mock('../components/pdf/fonts', () => ({ PDF_FONT_STACK: ['Roboto', 'NotoSans'] }));

import { buildInvoicePdfProps, parseInvoicePdfSource } from './buildInvoicePdfProps';
import { renderFittedInvoicePdf } from '../components/invoice/pdf/pdfFit';

const font = (name: string): string => {
  const decoded = decodeURIComponent(new URL(`../../public/fonts/${name}`, import.meta.url).pathname);
  return /^\/[A-Za-z]:/.test(decoded) ? decoded.slice(1) : decoded;
};
Font.register({
  family: 'Roboto',
  fonts: [
    { src: font('Roboto-Regular.ttf'), fontWeight: 400 },
    { src: font('Roboto-Medium.ttf'), fontWeight: 500 },
    { src: font('Roboto-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.register({ family: 'NotoSans', fonts: [{ src: font('NotoSans-Regular.ttf'), fontWeight: 400 }] });

const contract = {
  id: 5,
  contractNumber: '77',
  contractDate: '2026-01-15T00:00:00.000Z',
  contractCurrency: 'RUB',
  sellerName: 'ООО «Фрукт Водий»',
  sellerLegalAddress: 'Фергана',
  buyerName: 'АО «Северный Торговый Дом»',
  buyerAddress: 'Москва',
  supplierDirector: 'Каримов А.',
  gln: '123',
  sellerSealUrl: '/uploads/seal.png',
};

/** Bazadan JSON'ga o'tkazilgan ko'rinish: Decimal — matn, sana — ISO */
const invoice = {
  id: 1,
  invoiceNumber: '12',
  date: '2026-02-03T00:00:00.000Z',
  currency: 'USD',
  contractNumber: '77',
  notes: null,
  additionalInfo: {
    vehicleNumber: '40232BAA',
    destination: 'Самара',
    visibleColumns: { plu: false },
    columnOrder: ['index', 'name', 'unit', 'net', 'unitPrice', 'total', 'actions'],
    columnLabels: { net: 'Нетто (кг)', name: 'Товар' },
    visibleAdditionalInfoFields: { destination: false },
    customFields: [{ id: 'c1', label: 'Серийный номер датчика', value: 'S-1' }],
  },
  items: [
    { id: 1, name: 'Яблоки', unit: 'кг', quantity: '10', packagesCount: null, netWeight: '100', grossWeight: '110', unitPrice: '1.5', totalPrice: '150', customFields: null, tnvedCode: null },
  ],
};

const task = { id: 9, title: '12 АВТО 40232BAA', client: { id: 2, name: 'Клиент' }, branch: null };

const source = () => parseInvoicePdfSource({ invoice, contract, task });

describe('buildInvoicePdfProps', () => {
  it('sahifadagidek forma, ustunlar va valyutani yig\'adi', () => {
    const props = buildInvoicePdfProps(source());
    expect(props.viewTab).toBe('invoice');
    expect(props.form).toMatchObject({ invoiceNumber: '12', date: '2026-02-03', vehicleNumber: '40232BAA', contractNumber: '77', gln: '123' });
    expect(props.selectedContract).toMatchObject({ id: 5, buyerName: 'АО «Северный Торговый Дом»' });
    expect(props.invoiceCurrency).toBe('RUB');
    expect(props.totalColumnLabel).toBe('Общая сумма Рубли РФ');
    expect(props.orderedVisibleColumns.slice(0, 3)).toEqual(['index', 'name', 'unit']);
    expect(props.orderedVisibleColumns).not.toContain('actions');
    expect(props.columnLabels).toMatchObject({ name: 'Товар', net: 'Нетто' });
    expect(props.items[0]).toMatchObject({ quantity: 10, netWeight: 100, unitPrice: 1.5, totalPrice: 150 });
    expect(props.customFields).toEqual([{ id: 'c1', label: 'Серийный номер датчика', value: 'S-1' }]);
    expect(props.isAdditionalInfoVisible('destination')).toBe(false);
    expect(props.isAdditionalInfoVisible('vehicleNumber')).toBe(true);
  });

  it('tekshiruv nusxasi pechat va imzosiz', () => {
    expect(buildInvoicePdfProps(source()).pdfIncludeSeal).toBe(false);
  });

  it("shartnomasiz invoys: contracts bo'sh, valyuta USD, mijoz vazifadan", () => {
    const props = buildInvoicePdfProps(parseInvoicePdfSource({ invoice, contract: null, task }));
    expect(props.selectedContract).toBeUndefined();
    expect(props.contracts).toEqual([]);
    expect(props.invoiceCurrency).toBe('USD');
    expect(props.task).toMatchObject({ client: { name: 'Клиент' } });
  });

  it("buzuq kirishni rad etadi", () => {
    expect(() => parseInvoicePdfSource({ invoice: null })).toThrow();
  });

  it('yig\'ilgan props\'dan haqiqiy PDF chiziladi', async () => {
    const blob = await renderFittedInvoicePdf(buildInvoicePdfProps(source()));
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).subarray(0, 5));
    expect(head).toBe('%PDF-');
  }, 30000);
});
