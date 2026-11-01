import { describe, it, expect } from 'vitest';
import {
  applyDraftPatch,
  draftPatchSchema,
  EMPTY_DRAFT_DATA,
  getMissingRequired,
  parseLaunchParam,
  type AuthorMap,
  type DraftData,
  type FieldAuthor,
} from '../services/client-cargo-draft';

const aziz: FieldAuthor = { tgUserId: 1, name: 'Aziz', at: '2026-11-01T10:00:00.000Z' };
const vali: FieldAuthor = { tgUserId: 2, name: 'Vali', at: '2026-11-01T11:00:00.000Z' };

const completeData = (): DraftData => ({
  contractId: 5,
  branchId: 3,
  header: { deliveryTerms: 'Москва', customsPlace: 'Ташкент' },
  items: [{ uid: 'u1', fields: { product: 'Яблоки', boxCount: '10', netto: '100', brutto: '110' }, bruttoManual: false }],
});

describe('getMissingRequired', () => {
  it("bo'sh qoralamada 7 ta majburiy maydon yetishmaydi", () => {
    const missing = getMissingRequired(EMPTY_DRAFT_DATA);
    expect(missing.map((m) => m.path)).toEqual([
      'branchId',
      'header.deliveryTerms',
      'header.customsPlace',
      'items.*.product',
      'items.*.boxCount',
      'items.*.netto',
      'items.*.brutto',
    ]);
    expect(missing[0]).toEqual({ path: 'branchId', label: 'Место отгрузки груза', itemNumber: null });
    expect(missing[3]).toEqual({ path: 'items.*.product', label: 'Наименование', itemNumber: 1 });
  });

  it("hamma majburiy maydon to'ldirilgan bo'lsa bo'sh ro'yxat qaytaradi", () => {
    expect(getMissingRequired(completeData())).toEqual([]);
  });

  it("butunlay bo'sh qo'shimcha tovar bloki e'tiborga olinmaydi", () => {
    const data = completeData();
    data.items.push({ uid: 'u2', fields: {}, bruttoManual: false });
    expect(getMissingRequired(data)).toEqual([]);
  });

  it("ikkinchi tovarda faqat nomi bo'lsa uning qolgan majburiy maydonlari itemNumber 2 bilan qaytadi", () => {
    const data = completeData();
    data.items.push({ uid: 'u2', fields: { product: 'Груши' }, bruttoManual: false });
    const missing = getMissingRequired(data);
    expect(missing.map((m) => `${m.itemNumber}:${m.path}`)).toEqual(['2:items.u2.boxCount', '2:items.u2.netto', '2:items.u2.brutto']);
  });
});

describe('applyDraftPatch', () => {
  it('yangi qiymat muallifni yozadi', () => {
    const r = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { header: { invoiceNumber: 'INV-1' } }, aziz);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.header.invoiceNumber).toBe('INV-1');
    expect(r.authors['header.invoiceNumber']).toEqual(aziz);
    expect(r.changedPaths).toEqual(['header.invoiceNumber']);
  });

  it("bir xil qiymat qayta yuborilsa muallif o'zgarmaydi va changedPaths bo'sh", () => {
    const first = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { header: { invoiceNumber: 'INV-1' } }, aziz);
    if (!first.ok) throw new Error('first patch failed');
    const second = applyDraftPatch(first.data, first.authors, { header: { invoiceNumber: 'INV-1' } }, vali);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.changedPaths).toEqual([]);
    expect(second.authors['header.invoiceNumber']).toEqual(aziz);
  });

  it("boshqa qiymat muallifni o'zgartirgan odamga o'tkazadi", () => {
    const first = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { header: { invoiceNumber: 'INV-1' } }, aziz);
    if (!first.ok) throw new Error('first patch failed');
    const second = applyDraftPatch(first.data, first.authors, { header: { invoiceNumber: 'INV-2' } }, vali);
    if (!second.ok) throw new Error('second patch failed');
    expect(second.authors['header.invoiceNumber']).toEqual(vali);
  });

  it("'' yoki null maydonni va uning muallifini o'chiradi", () => {
    const first = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { header: { invoiceNumber: 'INV-1', orderNumber: '7' } }, aziz);
    if (!first.ok) throw new Error('first patch failed');
    const second = applyDraftPatch(first.data, first.authors, { header: { invoiceNumber: '', orderNumber: null } }, vali);
    if (!second.ok) throw new Error('second patch failed');
    expect(second.data.header).toEqual({});
    expect(second.authors).toEqual({});
  });

  it("kiruvchi data va authors obyektlarini o'zgartirmaydi", () => {
    const authors: AuthorMap = {};
    applyDraftPatch(EMPTY_DRAFT_DATA, authors, { header: { invoiceNumber: 'X' } }, aziz);
    expect(EMPTY_DRAFT_DATA.header).toEqual({});
    expect(authors).toEqual({});
  });

  it("noma'lum uid ga fields kelsa tovar yaratiladi, null yuborilsa tovar va uning mualliflari o'chadi", () => {
    const created = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { items: { abc: { fields: { product: 'Яблоки' } } } }, aziz);
    if (!created.ok) throw new Error('create failed');
    expect(created.data.items).toEqual([{ uid: 'abc', fields: { product: 'Яблоки' }, bruttoManual: false }]);
    expect(created.authors['items.abc.product']).toEqual(aziz);

    const removed = applyDraftPatch(created.data, created.authors, { items: { abc: null } }, vali);
    if (!removed.ok) throw new Error('remove failed');
    expect(removed.data.items).toEqual([]);
    expect(removed.authors).toEqual({});
  });

  it("bruttoManual muallif yozmaydi", () => {
    const r = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { items: { abc: { bruttoManual: true } } }, aziz);
    if (!r.ok) throw new Error('patch failed');
    expect(r.data.items[0].bruttoManual).toBe(true);
    expect(r.authors).toEqual({});
  });

  it("contractId va branchId muallifi yozilib, null bo'lganda o'chadi", () => {
    const set = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { contractId: 5, branchId: 3 }, aziz);
    if (!set.ok) throw new Error('set failed');
    expect(set.authors.contractId).toEqual(aziz);
    expect(set.authors.branchId).toEqual(aziz);
    const cleared = applyDraftPatch(set.data, set.authors, { branchId: null }, vali);
    if (!cleared.ok) throw new Error('clear failed');
    expect(cleared.data.branchId).toBeNull();
    expect(cleared.authors.branchId).toBeUndefined();
    expect(cleared.authors.contractId).toEqual(aziz);
  });

  it('21-tovar rad etiladi', () => {
    const items: Record<string, { fields: { product: string } }> = {};
    for (let i = 0; i < 21; i++) items[`u${i}`] = { fields: { product: 'x' } };
    const r = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { items }, aziz);
    expect(r.ok).toBe(false);
  });

  it("noto'g'ri qiymat xatosi: tovar maydoni items.<uid>.<maydon>, sarlavha yalang kalit; hech narsa qo'llanmaydi", () => {
    const r = applyDraftPatch(
      EMPTY_DRAFT_DATA,
      {},
      { header: { orderNumber: '' , sensorSerial: 'S1' }, items: { abc: { fields: { boxCount: 'abc' } } } },
      aziz
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors['items.abc.boxCount']).toBeTruthy();
    const header = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { header: { temperature: 'x'.repeat(250) } }, aziz);
    expect(header.ok).toBe(false);
    if (header.ok) return;
    expect(header.errors.temperature).toBeTruthy();
  });

  it("avto raqami bo'shliqsiz, katta harfda saqlanadi", () => {
    const r = applyDraftPatch(EMPTY_DRAFT_DATA, {}, { header: { vehicleNumber: ' 01a 123bc ' } }, aziz);
    if (!r.ok) throw new Error('patch failed');
    expect(r.data.header.vehicleNumber).toBe('01A123BC');
  });
});

describe('draftPatchSchema', () => {
  it("noto'g'ri uid va uzun qiymatni rad etadi", () => {
    expect(draftPatchSchema.safeParse({ items: { 'bad uid!': null } }).success).toBe(false);
    expect(draftPatchSchema.safeParse({ header: { invoiceNumber: 'x'.repeat(301) } }).success).toBe(false);
    expect(draftPatchSchema.safeParse({ header: { invoiceNumber: 'ok' }, items: { u1: null } }).success).toBe(true);
  });
  it("noma'lum sarlavha kalitini rad etadi", () => {
    expect(draftPatchSchema.safeParse({ header: { shipmentPlace: 'x' } }).success).toBe(false);
  });
});

describe('parseLaunchParam', () => {
  it("chat, new va ariza raqamini ajratadi", () => {
    expect(parseLaunchParam('-1001234567890')).toEqual({ chatId: '-1001234567890', draft: null });
    expect(parseLaunchParam('-1001234567890_new')).toEqual({ chatId: '-1001234567890', draft: 'new' });
    expect(parseLaunchParam('-1001234567890_5')).toEqual({ chatId: '-1001234567890', draft: 5 });
  });
  it("noto'g'ri qiymatlarda null", () => {
    for (const bad of ['-100123_abc', '5', null, '-1001234567890_0', '-1001234567890_5_6']) {
      expect(parseLaunchParam(bad)).toBeNull();
    }
  });
});

describe('Brutto — serverda hisoblanadi (C1)', () => {
  const must = (r: ReturnType<typeof applyDraftPatch>) => {
    if (!r.ok) throw new Error(`patch failed: ${JSON.stringify(r.errors)}`);
    return r;
  };
  const patchItem = (data: DraftData, authors: AuthorMap, fields: Record<string, string | null>, author: FieldAuthor, bruttoManual?: boolean) =>
    must(applyDraftPatch(data, authors, { items: { u1: { fields, ...(bruttoManual === undefined ? {} : { bruttoManual }) } } }, author));

  it("qo'lda emas: Netto + yashik + poddon yig'indisi, muallif — o'zgartirgan odam", () => {
    const first = patchItem(EMPTY_DRAFT_DATA, {}, { netto: '100', boxWeight: '10' }, aziz);
    expect(first.data.items[0].fields.brutto).toBe('110');
    expect(first.authors['items.u1.brutto']).toEqual(aziz);
    const second = patchItem(first.data, first.authors, { boxWeight: '15' }, vali);
    expect(second.data.items[0].fields.brutto).toBe('115');
    expect(second.authors['items.u1.brutto']).toEqual(vali);
  });

  it("qo'lda emas bo'lsa mijozdan kelgan brutto e'tiborga olinmaydi (eskirgan brauzer hisobi)", () => {
    const r = patchItem(EMPTY_DRAFT_DATA, {}, { netto: '100', brutto: '999' }, aziz);
    expect(r.data.items[0].fields.brutto).toBe('100');
  });

  it("qo'lda yozilgan brutto bruttoManual:true siz kelgan (eskirgan) patchda o'zgarmaydi", () => {
    const manual: DraftData = { ...EMPTY_DRAFT_DATA, items: [{ uid: 'u1', fields: { netto: '100', brutto: '120' }, bruttoManual: true }] };
    const r = patchItem(manual, {}, { netto: '200', brutto: '210' }, vali);
    expect(r.data.items[0].fields.brutto).toBe('120');
    expect(r.data.items[0].fields.netto).toBe('200');
    expect(r.data.items[0].bruttoManual).toBe(true);
  });

  it("bruttoManual:true bilan kelgan brutto qabul qilinadi va keyingi vazn o'zgarishida saqlanib qoladi", () => {
    const first = patchItem(EMPTY_DRAFT_DATA, {}, { netto: '100', brutto: '120' }, aziz, true);
    expect(first.data.items[0].fields.brutto).toBe('120');
    expect(first.authors['items.u1.brutto']).toEqual(aziz);
    const second = patchItem(first.data, first.authors, { netto: '300' }, vali);
    expect(second.data.items[0].fields.brutto).toBe('120');
  });

  it("bruttoManual:false qo'lda qiymatni bekor qilib qayta hisoblaydi", () => {
    const manual: DraftData = { ...EMPTY_DRAFT_DATA, items: [{ uid: 'u1', fields: { netto: '100', brutto: '120' }, bruttoManual: true }] };
    const r = patchItem(manual, {}, {}, vali, false);
    expect(r.data.items[0].fields.brutto).toBe('100');
  });

  it("Netto/yashik/poddon hammasi tozalansa brutto va uning muallifi ham o'chadi", () => {
    const first = patchItem(EMPTY_DRAFT_DATA, {}, { netto: '100' }, aziz);
    const second = patchItem(first.data, first.authors, { netto: null }, vali);
    expect(second.data.items[0].fields.brutto).toBeUndefined();
    expect(second.authors['items.u1.brutto']).toBeUndefined();
  });

  it("o'nli yig'indi 3 xonagacha yaxlitlanadi (0.1 + 0.2 = 0.3)", () => {
    const r = patchItem(EMPTY_DRAFT_DATA, {}, { netto: '0.1', boxWeight: '0.2' }, aziz);
    expect(r.data.items[0].fields.brutto).toBe('0.3');
  });
});

describe('draftPatchSchema — tovar kalitlari chegarasi (C2)', () => {
  const keys = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`u${i}`, null]));
  it("o'chirilgan + yangi tovarlar uchun 40 tagacha kalit mumkin, 41 — yo'q", () => {
    expect(draftPatchSchema.safeParse({ items: keys(40) }).success).toBe(true);
    expect(draftPatchSchema.safeParse({ items: keys(41) }).success).toBe(false);
  });
});
