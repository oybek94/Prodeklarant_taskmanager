import { describe, it, expect } from 'vitest';
import { buildDraftKeyboard, buildDraftLaunchLink, draftLabel, formatDraftMessage } from '../services/client-cargo-draft-message';
import { EMPTY_DRAFT_DATA, type AuthorMap, type DraftData, type DraftItem } from '../services/client-cargo-draft';

const at = '2026-11-01T10:00:00.000Z';
const by = (name: string, id = 1) => ({ tgUserId: id, name, at });
const context = { contractText: 'K-1, Buyer LLC', shipmentPlace: 'Ташкентская обл.', currency: 'USD' };

const completeData = (): DraftData => ({
  contractId: 5,
  branchId: 3,
  header: { invoiceNumber: 'INV-1', deliveryTerms: 'Москва', customsPlace: 'Ташкент', vehicleNumber: '01A123BC' },
  items: [{ uid: 'u1', fields: { product: 'Яблоки', boxCount: '10', netto: '100', brutto: '110', price: '2.5' }, bruttoManual: false }],
});

describe('formatDraftMessage', () => {
  it("OPEN: sarlavha, muallifli qatorlar va yetishmayotgan majburiy maydonlar", () => {
    const data: DraftData = { ...EMPTY_DRAFT_DATA, branchId: 3, header: { vehicleNumber: '01A123BC' }, items: [{ uid: 'u1', fields: { product: 'Яблоки' }, bruttoManual: false }] };
    const authors: AuthorMap = { 'header.vehicleNumber': by('Aziz'), branchId: by('Vali', 2), 'items.u1.product': by('Aziz') };
    const text = formatDraftMessage({ data, authors, context, status: 'OPEN' });
    expect(text.startsWith('🚛 <b>Данные о грузе</b>')).toBe(true);
    expect(text).toContain('Номер автотранспорта: <b>01A123BC</b> — 👤 Aziz');
    expect(text).toContain('Место отгрузки груза: <b>Ташкентская обл.</b> — 👤 Vali');
    expect(text).toContain('Наименование: <b>Яблоки</b> — 👤 Aziz');
    expect(text).toContain('⏳ <b>Не заполнено:</b>');
    expect(text).toContain('• Условия поставки');
    expect(text).toContain('• Место там. очистки');
    expect(text).toContain('• Товар 1: Количество ящиков');
    expect(text).toContain('• Товар 1: Нетто');
    expect(text).toContain('• Товар 1: Брутто');
    expect(text).not.toContain('• Место отгрузки груза');
  });

  it("kontrakt matni context'dan, muallifi contractId kalitidan; narx valyuta bilan", () => {
    const authors: AuthorMap = { contractId: by('Aziz'), 'items.u1.price': by('Vali', 2) };
    const text = formatDraftMessage({ data: completeData(), authors, context, status: 'OPEN' });
    expect(text).toContain('Контракт: <b>K-1, Buyer LLC</b> — 👤 Aziz');
    expect(text).toContain('Цена: <b>2.5 USD</b> — 👤 Vali');
    expect(text).not.toContain('Не заполнено');
  });

  it("COMPLETED: to'liq sarlavha, kim yakunlagani, yetishmayotganlar bloki yo'q", () => {
    const text = formatDraftMessage({ data: EMPTY_DRAFT_DATA, authors: {}, context, status: 'COMPLETED', actorName: 'Aziz' });
    expect(text.startsWith('✅ <b>Данные о грузе — полные</b>')).toBe(true);
    expect(text).toContain('Завершил(а): <b>Aziz</b>');
    expect(text).not.toContain('Не заполнено');
  });

  it("CANCELLED: faqat bekor qilingan sarlavha", () => {
    expect(formatDraftMessage({ data: completeData(), authors: {}, context, status: 'CANCELLED' })).toBe('❌ <b>Отменено</b>');
  });

  it("ism va qiymatdagi <, > va & belgilari HTML-escape qilinadi", () => {
    const data: DraftData = { ...EMPTY_DRAFT_DATA, header: { orderNumber: 'A&B <1>' } };
    const text = formatDraftMessage({ data, authors: { 'header.orderNumber': by('A<b>&') }, context, status: 'OPEN' });
    expect(text).toContain('Номер заказа: <b>A&amp;B &lt;1&gt;</b> — 👤 A&lt;b&gt;&amp;');
    expect(text).not.toContain('A<b>&');
  });

  it("20 ta to'liq tovar bo'lsa ham xabar 4096 belgidan oshmaydi va teglari juft qoladi", () => {
    const items: DraftItem[] = Array.from({ length: 20 }, (_, i) => ({
      uid: `u${i}`,
      bruttoManual: false,
      fields: { product: `Товар номер ${i}`, boxCount: '1000', boxWeight: '12345.5', palletCount: '10', palletWeight: '4321.25', netto: '123456.5', brutto: '234567.5', price: '99.99' },
    }));
    const authors: AuthorMap = {};
    for (const item of items) for (const key of Object.keys(item.fields)) authors[`items.${item.uid}.${key}`] = by('Очень Длинное Имя');
    const text = formatDraftMessage({ data: { ...completeData(), items }, authors, context, status: 'OPEN' });
    expect(text.length).toBeLessThanOrEqual(4096);
    expect((text.match(/<b>/g) ?? []).length).toBe((text.match(/<\/b>/g) ?? []).length);
    expect(text.endsWith('…')).toBe(true);
  });

  it("uzun bo'lsa avval mualliflarsiz qayta quriladi (sig'sa qirqilmaydi)", () => {
    const items: DraftItem[] = Array.from({ length: 9 }, (_, i) => ({
      uid: `u${i}`,
      bruttoManual: false,
      fields: { product: `Товар ${i}`, boxCount: '10', boxWeight: '12.5', palletCount: '1', palletWeight: '5', netto: '100', brutto: '117.5', price: '1' },
    }));
    const authors: AuthorMap = {};
    for (const item of items) for (const key of Object.keys(item.fields)) authors[`items.${item.uid}.${key}`] = by('Aziz Karimovich Tursunov');
    const withAuthors = formatDraftMessage({ data: { ...completeData(), items }, authors, context, status: 'OPEN' });
    const without = formatDraftMessage({ data: { ...completeData(), items }, authors: {}, context, status: 'OPEN' });
    expect(without.length).toBeLessThanOrEqual(4096);
    expect(withAuthors.length).toBeLessThanOrEqual(4096);
    expect(withAuthors.endsWith('…')).toBe(false);
  });
});

describe('buildDraftKeyboard', () => {
  const base = { draftId: 7, chatId: '-1001234567890', miniAppLink: 'https://t.me/pd_client_bot/cargo' };

  it("OPEN, to'liq emas: To'ldirish (url) va Bekor qilish, Yakunlash yo'q", () => {
    const kb = buildDraftKeyboard({ ...base, status: 'OPEN', complete: false });
    expect(kb[0]).toEqual([{ text: "✏️ To'ldirish", url: 'https://t.me/pd_client_bot/cargo?startapp=-1001234567890_7' }]);
    expect(kb[kb.length - 1]).toEqual([{ text: '🗑 Bekor qilish', callback_data: 'cargo:cancel:7' }]);
    expect(JSON.stringify(kb)).not.toContain('cargo:done');
  });

  it("OPEN, to'liq: Yakunlash tugmasi chiqadi", () => {
    const kb = buildDraftKeyboard({ ...base, status: 'OPEN', complete: true });
    expect(JSON.stringify(kb)).toContain('"callback_data":"cargo:done:7"');
  });

  it("miniAppLink yo'q bo'lsa To'ldirish tugmasi chiqmaydi", () => {
    const kb = buildDraftKeyboard({ ...base, miniAppLink: null, status: 'OPEN', complete: false });
    expect(JSON.stringify(kb)).not.toContain("To'ldirish");
  });

  it("bekor qilishni tasdiqlash qatori", () => {
    const kb = buildDraftKeyboard({ ...base, status: 'OPEN', complete: true, confirmCancel: true });
    expect(kb).toEqual([
      [
        { text: 'Ha, bekor qilish', callback_data: 'cargo:cancel-yes:7' },
        { text: "Yo'q", callback_data: 'cargo:cancel-no:7' },
      ],
    ]);
  });

  it("COMPLETED va CANCELLED da tugma yo'q; callback_data 64 baytdan oshmaydi", () => {
    expect(buildDraftKeyboard({ ...base, status: 'COMPLETED', complete: true })).toEqual([]);
    expect(buildDraftKeyboard({ ...base, status: 'CANCELLED', complete: true })).toEqual([]);
    const all = buildDraftKeyboard({ ...base, draftId: 2147483647, status: 'OPEN', complete: true, confirmCancel: false }).flat();
    for (const button of all) if ('callback_data' in button) expect(Buffer.byteLength(button.callback_data)).toBeLessThanOrEqual(64);
  });
});

describe('draftLabel va buildDraftLaunchLink', () => {
  it("invoys | avto, qiymat yo'q bo'lsa —", () => {
    expect(draftLabel(completeData())).toBe('INV-1 | 01A123BC');
    expect(draftLabel(EMPTY_DRAFT_DATA)).toBe('— | —');
  });
  it('startapp havolasi', () => {
    expect(buildDraftLaunchLink('https://t.me/pd_client_bot/cargo', '-100123', 'new')).toBe('https://t.me/pd_client_bot/cargo?startapp=-100123_new');
    expect(buildDraftLaunchLink('https://t.me/pd_client_bot/cargo', '-100123', 9)).toBe('https://t.me/pd_client_bot/cargo?startapp=-100123_9');
  });
});
