import { describe, it, expect } from 'vitest';
import {
  buildPatch,
  deriveManualFlags,
  makeUid,
  snapshotFromDraft,
  stripCyrillic,
  type DraftView,
  type FormSnapshot,
} from './tgCargoDraft';

const blankFields = { product: '', boxCount: '', boxWeight: '', packagingType: '', palletCount: '', palletWeight: '', netto: '', brutto: '', price: '' };
const blankHeader = { invoiceNumber: '', deliveryTerms: '', customsPlace: '', destination: '', vehicleNumber: '', orderNumber: '', temperature: '', sensorSerial: '' };

const snap = (over: Partial<FormSnapshot> = {}): FormSnapshot => ({
  contractId: null,
  branchId: null,
  header: { ...blankHeader },
  items: [{ uid: 'u1', fields: { ...blankFields }, bruttoManual: false }],
  ...over,
});

const view = (over: Partial<DraftView> = {}): DraftView => ({
  id: 7,
  status: 'OPEN',
  version: 2,
  data: { contractId: 5, branchId: 3, header: { invoiceNumber: 'INV-1' }, items: [{ uid: 'a1', fields: { product: 'Яблоки', netto: '100', brutto: '110' }, bruttoManual: true }] },
  authors: { 'header.invoiceNumber': { tgUserId: 1, name: 'Aziz', at: '2026-11-01T10:00:00.000Z' } },
  missing: [],
  complete: false,
  messageId: 55,
  completedByName: null,
  ...over,
});

describe('makeUid', () => {
  it("serverdagi uid qoidasiga mos va takrorlanmaydi", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const uid = makeUid();
      expect(uid).toMatch(/^[A-Za-z0-9_-]{1,24}$/);
      seen.add(uid);
    }
    expect(seen.size).toBe(100);
  });
});

describe('snapshotFromDraft', () => {
  it("null bo'lsa bo'sh forma va bitta bo'sh tovar", () => {
    const s = snapshotFromDraft(null);
    expect(s.contractId).toBeNull();
    expect(s.items).toHaveLength(1);
    expect(s.items[0].fields).toEqual(blankFields);
    expect(s.header).toEqual(blankHeader);
  });

  it("saqlangan qiymatlarni to'ldiradi, yetishmagan maydonlar bo'sh qator", () => {
    const s = snapshotFromDraft(view());
    expect(s.contractId).toBe(5);
    expect(s.branchId).toBe(3);
    expect(s.header.invoiceNumber).toBe('INV-1');
    expect(s.header.vehicleNumber).toBe('');
    expect(s.items).toEqual([{ uid: 'a1', fields: { ...blankFields, product: 'Яблоки', netto: '100', brutto: '110' }, bruttoManual: true }]);
  });

  it("tovari yo'q arizada ham bitta bo'sh tovar bloki chiqadi", () => {
    const s = snapshotFromDraft(view({ data: { contractId: null, branchId: null, header: {}, items: [] } }));
    expect(s.items).toHaveLength(1);
  });
});

describe('buildPatch', () => {
  it("o'zgarish bo'lmasa null", () => {
    const base = snap();
    expect(buildPatch(base, structuredClone(base))).toBeNull();
  });

  it("faqat o'zgargan maydonlarni yuboradi", () => {
    const base = snap({ header: { ...blankHeader, invoiceNumber: 'INV-1' } });
    const current = structuredClone(base);
    current.header.vehicleNumber = '01A123BC';
    current.items[0].fields.netto = '100';
    expect(buildPatch(base, current)).toEqual({
      header: { vehicleNumber: '01A123BC' },
      items: { u1: { fields: { netto: '100' } } },
    });
  });

  it("bo'shatilgan maydon null bo'lib ketadi", () => {
    const base = snap({ header: { ...blankHeader, orderNumber: '7' } });
    const current = structuredClone(base);
    current.header.orderNumber = '';
    expect(buildPatch(base, current)).toEqual({ header: { orderNumber: null } });
  });

  it("kontrakt/filial o'zgarishi va tozalanishi", () => {
    const base = snap({ contractId: 5, branchId: 3 });
    const current = structuredClone(base);
    current.contractId = 6;
    current.branchId = null;
    expect(buildPatch(base, current)).toEqual({ contractId: 6, branchId: null });
  });

  it("o'chirilgan tovar null, yangi to'ldirilgan tovar to'liq fields bilan", () => {
    const base = snap({ items: [{ uid: 'u1', fields: { ...blankFields, product: 'Яблоки' }, bruttoManual: false }] });
    const current: FormSnapshot = {
      ...structuredClone(base),
      items: [{ uid: 'u9', fields: { ...blankFields, product: 'Груши', boxCount: '5' }, bruttoManual: false }],
    };
    expect(buildPatch(base, current)).toEqual({
      items: { u1: null, u9: { fields: { product: 'Груши', boxCount: '5' } } },
    });
  });

  it("C2: birinchi saqlashda bo'sh boshlang'ich tovar o'chirish sifatida yuborilmaydi (21 kalit xatosi bo'lmasin)", () => {
    const base = snap(); // bo'sh boshlang'ich tovar u1
    const current: FormSnapshot = {
      ...structuredClone(base),
      items: [{ uid: 'u9', fields: { ...blankFields, product: 'Груши' }, bruttoManual: false }],
    };
    expect(buildPatch(base, current)).toEqual({ items: { u9: { fields: { product: 'Груши' } } } });
  });

  it("C1: qo'lda emas Brutto yuborilmaydi — serverda hisoblanadi", () => {
    const base = snap();
    const current = structuredClone(base);
    current.items[0].fields.netto = '100';
    current.items[0].fields.brutto = '100';
    expect(buildPatch(base, current)).toEqual({ items: { u1: { fields: { netto: '100' } } } });
  });

  it("C1: qo'lda Brutto o'zgarsa har safar bruttoManual:true bilan birga yuboriladi", () => {
    const base = snap({ items: [{ uid: 'u1', fields: { ...blankFields, netto: '100', brutto: '120' }, bruttoManual: true }] });
    const current = structuredClone(base);
    current.items[0].fields.brutto = '130';
    expect(buildPatch(base, current)).toEqual({ items: { u1: { fields: { brutto: '130' }, bruttoManual: true } } });
  });

  it("yangi, butunlay bo'sh tovar bloki yuborilmaydi", () => {
    const base = snap();
    const current = structuredClone(base);
    current.items.push({ uid: 'u2', fields: { ...blankFields }, bruttoManual: false });
    expect(buildPatch(base, current)).toBeNull();
  });

  it("bruttoManual o'zgarishi yuboriladi", () => {
    const base = snap();
    const current = structuredClone(base);
    current.items[0].bruttoManual = true;
    current.items[0].fields.brutto = '120';
    expect(buildPatch(base, current)).toEqual({ items: { u1: { fields: { brutto: '120' }, bruttoManual: true } } });
  });
});

describe('deriveManualFlags', () => {
  const contract = { cities: [{ text: 'Москва' }], customs: ['Ташкент'], destinations: ['Склад 1'] };

  it("shartnoma variantidagi qiymat qo'lda emas, boshqasi qo'lda", () => {
    const header = { ...blankHeader, deliveryTerms: 'Москва', customsPlace: 'Бухара', destination: '' };
    expect(deriveManualFlags(header, contract)).toEqual({ deliveryTerms: false, customsPlace: true, destination: false });
  });

  it("shartnoma yo'q bo'lsa to'ldirilgan qiymat qo'lda hisoblanadi", () => {
    const header = { ...blankHeader, deliveryTerms: 'Москва' };
    expect(deriveManualFlags(header, null)).toEqual({ deliveryTerms: true, customsPlace: false, destination: false });
  });
});

describe('stripCyrillic — avto raqami faqat lotin alifbosida (dasturdagidek)', () => {
  it("kirill harflarini (lotinga o'xshash А, В, С ham) o'chiradi va o'chirilganini bildiradi", () => {
    expect(stripCyrillic('01А123ВС')).toEqual({ value: '01123', stripped: true });
  });
  it("lotin harflari, raqamlar va / ni o'zgartirmaydi", () => {
    expect(stripCyrillic('40232BAA/402332BA')).toEqual({ value: '40232BAA/402332BA', stripped: false });
  });
  it("bo'sh qator", () => {
    expect(stripCyrillic('')).toEqual({ value: '', stripped: false });
  });
});

describe('Вид упаковки (packagingType)', () => {
  it("saqlangan arizadan to'ldiriladi", () => {
    const s = snapshotFromDraft(view({ data: { contractId: null, branchId: null, header: {}, items: [{ uid: 'a1', fields: { packagingType: 'Картонные ящики' }, bruttoManual: false }] } }));
    expect(s.items[0].fields.packagingType).toBe('Картонные ящики');
  });
  it("tanlov o'zgarsa patchga tushadi, tozalansa null", () => {
    const base = snap({ items: [{ uid: 'u1', fields: { ...blankFields, packagingType: 'Картонные ящики' }, bruttoManual: false }] });
    const changed = structuredClone(base);
    changed.items[0].fields.packagingType = 'Пластиковые ящики';
    expect(buildPatch(base, changed)).toEqual({ items: { u1: { fields: { packagingType: 'Пластиковые ящики' } } } });
    const cleared = structuredClone(base);
    cleared.items[0].fields.packagingType = '';
    expect(buildPatch(base, cleared)).toEqual({ items: { u1: { fields: { packagingType: null } } } });
  });
});
