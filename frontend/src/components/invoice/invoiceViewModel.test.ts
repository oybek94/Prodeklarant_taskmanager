import { describe, it, expect } from 'vitest';
import {
  getContractCurrency,
  getPartyRoles,
  getTotalColumnLabel,
  invoiceToFormPatch,
  orderVisibleColumns,
  parseSavedFields,
  restoreColumnState,
} from './invoiceViewModel';
import { DEFAULT_COLUMN_ORDER, DEFAULT_INVOICE_FORM_STATE, DEFAULT_VISIBLE_COLUMNS, type InvoiceItem } from './types';

const item = (unit: string): InvoiceItem => ({ name: 'Яблоки', unit, quantity: 1, unitPrice: 1, totalPrice: 1 });

describe('invoiceToFormPatch', () => {
  it("saqlangan invoys maydonlarini formaga ko'chiradi", () => {
    const form = invoiceToFormPatch(
      {
        invoiceNumber: '12',
        date: '2026-02-03T00:00:00.000Z',
        currency: 'USD',
        contractNumber: '77',
        notes: 'izoh',
        additionalInfo: { deliveryTerms: 'СРТ Москва', vehicleNumber: '40232BAA', destination: 'Самара' },
      },
      DEFAULT_INVOICE_FORM_STATE
    );
    expect(form).toMatchObject({
      invoiceNumber: '12',
      date: '2026-02-03',
      contractNumber: '77',
      notes: 'izoh',
      deliveryTerms: 'СРТ Москва',
      vehicleNumber: '40232BAA',
      destination: 'Самара',
      origin: 'Республика Узбекистан',
    });
  });

  it("invoysda tuman yo'q bo'lsa filialning standart tumani olinadi", () => {
    const form = invoiceToFormPatch(
      { additionalInfo: {} },
      DEFAULT_INVOICE_FORM_STATE,
      { id: 1, name: 'Олтиарик', internalCode: '11', externalCode: '22' }
    );
    expect(form).toMatchObject({ fssRegionName: 'Олтиарик', fssRegionInternalCode: '11', fssRegionExternalCode: '22' });
  });

  it("oldingi formadagi qiymat invoysda yo'q maydonda saqlanib qoladi", () => {
    const form = invoiceToFormPatch({ additionalInfo: {} }, { ...DEFAULT_INVOICE_FORM_STATE, shipmentPlace: 'Фергана' });
    expect(form.shipmentPlace).toBe('Фергана');
  });
});

describe('parseSavedFields', () => {
  it("id'siz maydonga id beradi, massiv bo'lmasa bo'sh", () => {
    const fields = parseSavedFields([{ label: 'Сорт', value: 'А' }, { id: 'x', label: 'B', value: 'C' }]);
    expect(fields[0]).toMatchObject({ label: 'Сорт', value: 'А' });
    expect(fields[0].id).not.toBe('');
    expect(fields[1].id).toBe('x');
    expect(parseSavedFields(undefined)).toEqual([]);
  });
});

describe('restoreColumnState', () => {
  it("saqlangan ko'rinish va tartibni tiklaydi, shtCount quantity yoniga qo'shiladi", () => {
    const state = restoreColumnState({
      visibleColumns: { plu: false },
      columnOrder: ['index', 'name', 'quantity', 'net', 'actions'],
      customColumns: ['custom_1'],
    });
    expect(state.visibleColumns.plu).toBe(false);
    expect(state.visibleColumns.name).toBe(true);
    expect(state.columnOrder.slice(0, 4)).toEqual(['index', 'name', 'quantity', 'shtCount']);
    expect(state.customColumns).toEqual(['custom_1']);
  });

  it("ko'rinish saqlanmagan bo'lsa standart holat (sahifadagidek)", () => {
    expect(restoreColumnState({ columnOrder: ['name'] })).toEqual({
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      columnOrder: DEFAULT_COLUMN_ORDER,
      customColumns: [],
    });
  });
});

describe('orderVisibleColumns', () => {
  it("actions chiqmaydi, yashirilgan ustun chiqmaydi, shtCount faqat 'шт' birligida", () => {
    const visible = { ...DEFAULT_VISIBLE_COLUMNS, plu: false };
    const withoutSht = orderVisibleColumns(DEFAULT_COLUMN_ORDER, visible, [item('кг')]);
    expect(withoutSht).not.toContain('actions');
    expect(withoutSht).not.toContain('plu');
    expect(withoutSht).not.toContain('shtCount');
    expect(orderVisibleColumns(DEFAULT_COLUMN_ORDER, visible, [item('шт')])).toContain('shtCount');
  });
});

describe('shartnomadan kelib chiqadigan qiymatlar', () => {
  it("yuk jo'natuvchi/qabul qiluvchi ko'rsatilmasa sotuvchi/sotib oluvchining o'zi", () => {
    expect(getPartyRoles({ sellerName: 'A', buyerName: 'B' })).toEqual({ isSellerShipper: true, isBuyerConsignee: true });
    expect(getPartyRoles({ sellerName: 'A', shipperName: 'C', buyerName: 'B', consigneeName: ' B ' })).toEqual({
      isSellerShipper: false,
      isBuyerConsignee: true,
    });
    expect(getPartyRoles(undefined)).toEqual({ isSellerShipper: false, isBuyerConsignee: false });
  });

  it("noma'lum yoki yo'q valyuta USD", () => {
    expect(getContractCurrency({ contractCurrency: 'RUB' })).toBe('RUB');
    expect(getContractCurrency({ contractCurrency: 'XXX' })).toBe('USD');
    expect(getContractCurrency(undefined)).toBe('USD');
  });

  it("jami ustuni nomi valyutaga bog'liq", () => {
    expect(getTotalColumnLabel('USD', 'Сумма')).toBe('Общая сумма в Долл. США');
    expect(getTotalColumnLabel('RUB', 'Сумма')).toBe('Общая сумма Рубли РФ');
    expect(getTotalColumnLabel('KZT', 'Сумма')).toBe('Сумма');
  });
});
