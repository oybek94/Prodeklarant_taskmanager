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
  it("OPEN: qatorlarda muallif yo'q; yetishmayotganlardan keyin oxirgi qatorda kimlar to'ldirgani", () => {
    const data: DraftData = { ...EMPTY_DRAFT_DATA, branchId: 3, header: { vehicleNumber: '01A123BC' }, items: [{ uid: 'u1', fields: { product: 'Яблоки' }, bruttoManual: false }] };
    const authors: AuthorMap = { 'header.vehicleNumber': by('Aziz'), branchId: by('Vali', 2), 'items.u1.product': by('Aziz') };
    const text = formatDraftMessage({ data, authors, context, status: 'OPEN' });
    expect(text.startsWith('🚛 <b>Данные о грузе</b>')).toBe(true);
    expect(text).toContain('Номер автотранспорта: <b>01A123BC</b>\n');
    expect(text).toContain('Место отгрузки груза: <b>Ташкентская обл.</b>\n');
    expect(text).toContain('Наименование: <b>Яблоки</b>\n');
    expect(text).not.toContain('— 👤');
    expect(text).toContain('⏳ <b>Не заполнено:</b>');
    expect(text).toContain('• Условия поставки');
    expect(text).toContain('• Место там. очистки');
    expect(text).toContain('• Товар 1: Количество ящиков');
    expect(text).toContain('• Товар 1: Нетто');
    expect(text).toContain('• Товар 1: Брутто');
    expect(text).not.toContain('• Место отгрузки груза');
    expect(text.endsWith('👤 Заполнили: Aziz, Vali')).toBe(true);
    expect(text.indexOf('Не заполнено')).toBeLessThan(text.indexOf('Заполнили'));
  });

  it("kontrakt matni context'dan; narx valyuta bilan; muallif qatorda emas", () => {
    const authors: AuthorMap = { contractId: by('Aziz'), 'items.u1.price': by('Vali', 2) };
    const text = formatDraftMessage({ data: completeData(), authors, context, status: 'OPEN' });
    expect(text).toContain('Контракт: <b>K-1, Buyer LLC</b>\n');
    expect(text).toContain('Цена: <b>2.5 USD</b>');
    expect(text).not.toContain('Не заполнено');
    expect(text).not.toContain('— 👤');
    expect(text.endsWith('👤 Заполнили: Aziz, Vali')).toBe(true);
  });

  it("to'ldirganlar vaqt bo'yicha tartiblanadi va bir kishi bir marta chiqadi", () => {
    const authors: AuthorMap = {
      'header.orderNumber': { tgUserId: 1, name: 'Aziz', at: '2026-11-01T11:00:00.000Z' },
      'header.temperature': { tgUserId: 2, name: 'Vali', at: '2026-11-01T09:00:00.000Z' },
      'header.sensorSerial': { tgUserId: 1, name: 'Aziz', at: '2026-11-01T12:00:00.000Z' },
    };
    const data: DraftData = { ...EMPTY_DRAFT_DATA, header: { orderNumber: '7', temperature: '+2', sensorSerial: 'S1' } };
    const text = formatDraftMessage({ data, authors, context, status: 'OPEN' });
    expect(text.endsWith('👤 Заполнили: Vali, Aziz')).toBe(true);
  });

  it("har qator o'z belgisi (emoji) bilan boshlanadi va yorliq matni o'zgarmaydi", () => {
    const text = formatDraftMessage({ data: completeData(), authors: {}, context, status: 'OPEN' });
    expect(text).toContain('📄 Контракт: <b>K-1, Buyer LLC</b>');
    expect(text).toContain('🧾 Инвойс №: <b>INV-1</b>');
    expect(text).toContain('🌍 Условия поставки: <b>Москва</b>');
    expect(text).toContain('🛃 Место там. очистки: <b>Ташкент</b>');
    expect(text).toContain('🚛 Номер автотранспорта: <b>01A123BC</b>');
    expect(text).toContain('🏭 Место отгрузки груза: <b>Ташкентская обл.</b>');
    expect(text).toContain('🏷 Наименование: <b>Яблоки</b>');
    expect(text).toContain('📦 Количество ящиков: <b>10 шт.</b>');
    expect(text).toContain('⚖️ Нетто: <b>100 кг.</b>');
    expect(text).toContain('⚖️ Брутто: <b>110 кг.</b>');
    expect(text).toContain('💰 Цена: <b>2.5 USD</b>');
  });

  it("birliklar: ящиклар/поддонлар soni — шт., barcha og'irliklar — кг., narxda valyuta", () => {
    const data: DraftData = {
      ...completeData(),
      items: [{ uid: 'u1', fields: { product: 'Яблоки', boxCount: '2000', boxWeight: '500', palletCount: '33', palletWeight: '429', netto: '21000', brutto: '21929', price: '100' }, bruttoManual: false }],
    };
    const text = formatDraftMessage({ data, authors: {}, context, status: 'OPEN' });
    expect(text).toContain('Количество ящиков: <b>2000 шт. (500 кг)</b>'); // ящиклар soni va vazni birlashtirilgan
    expect(text).not.toContain('Общий вес ящиков');
    expect(text).toContain('Количество поддонов: <b>33 шт. (429 кг)</b>'); // поддонlar soni va vazni birlashtirilgan
    expect(text).not.toContain('Общий вес поддонов');
    expect(text).toContain('Нетто: <b>21000 кг.</b>');
    expect(text).toContain('Брутто: <b>21929 кг.</b>');
    expect(text).toContain('Цена: <b>100 USD</b>');
    expect(text).toContain('Наименование: <b>Яблоки</b>'); // nomga birlik qo'shilmaydi
  });

  it("uzun qiymat (40 belgidan ortiq) alohida qatorda <blockquote> ichida, qisqasi shu qatorda qoladi", () => {
    const customs = '10504080 Челябинский таможенный пост г. Челябинск, ул. Игуменка 7А СВХ ООО «ЮУВК»';
    const data: DraftData = { ...completeData(), header: { ...completeData().header, customsPlace: customs } };
    const text = formatDraftMessage({ data, authors: {}, context, status: 'OPEN' });
    expect(text).toContain('🛃 Место там. очистки:\n<blockquote>' + customs +'</blockquote>');
    expect(text).toContain('🌍 Условия поставки: <b>Москва</b>');
    expect((text.match(/<blockquote>/g) ?? []).length).toBe(1);
  });

  it("blockquote ichidagi qiymat ham HTML-escape qilinadi", () => {
    const evil = 'A&B <script> ' + 'x'.repeat(50);
    const data: DraftData = { ...EMPTY_DRAFT_DATA, header: { customsPlace: evil } };
    const text = formatDraftMessage({ data, authors: {}, context, status: 'OPEN' });
    expect(text).toContain('<blockquote>A&amp;B &lt;script&gt; ');
    expect(text).not.toContain('<script>');
  });

  it("hech kim to'ldirmagan bo'lsa 'Заполнили' qatori yo'q", () => {
    expect(formatDraftMessage({ data: completeData(), authors: {}, context, status: 'OPEN' })).not.toContain('Заполнили');
  });

  it("12 dan ortiq ishtirokchi bo'lsa 10 tasi va 'и ещё N' chiqadi", () => {
    const authors: AuthorMap = {};
    for (let i = 1; i <= 12; i++) authors[`header.f${i}`] = { tgUserId: i, name: `U${i}`, at: `2026-11-01T10:${String(i).padStart(2, '0')}:00.000Z` };
    const text = formatDraftMessage({ data: completeData(), authors, context, status: 'OPEN' });
    expect(text.endsWith('👤 Заполнили: U1, U2, U3, U4, U5, U6, U7, U8, U9, U10 и ещё 2')).toBe(true);
  });

  it("COMPLETED: to'liq sarlavha, to'ldirganlar, so'ng kim yakunlagani; yetishmayotganlar bloki yo'q", () => {
    const text = formatDraftMessage({ data: EMPTY_DRAFT_DATA, authors: { 'header.orderNumber': by('Vali', 2) }, context, status: 'COMPLETED' });
    expect(text.startsWith('✅ <b>Данные о грузе — полные</b>')).toBe(true);
    expect(text).toContain('👤 Заполнили: Vali');
    expect(text.endsWith('👤 Заполнили: Vali')).toBe(true);
    expect(text).not.toContain('Завершил');
    expect(text).not.toContain('Не заполнено');
  });

  it("CANCELLED: faqat bekor qilingan sarlavha", () => {
    expect(formatDraftMessage({ data: completeData(), authors: {}, context, status: 'CANCELLED' })).toBe('❌ <b>Отменено</b>');
  });

  it("ism va qiymatdagi <, > va & belgilari HTML-escape qilinadi", () => {
    const data: DraftData = { ...EMPTY_DRAFT_DATA, header: { orderNumber: 'A&B <1>' } };
    const text = formatDraftMessage({ data, authors: { 'header.orderNumber': by('A<b>&') }, context, status: 'OPEN' });
    expect(text).toContain('Номер заказа: <b>A&amp;B &lt;1&gt;</b>');
    expect(text).toContain('👤 Заполнили: A&lt;b&gt;&amp;');
    expect(text).not.toContain('A<b>&');
  });

  it("20 ta to'liq tovar bo'lsa ham xabar 4096 belgidan oshmaydi, teglar juft, to'ldirganlar qatori saqlanadi", () => {
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
    expect(text).toContain('…');
    expect(text.endsWith('👤 Заполнили: Очень Длинное Имя')).toBe(true);
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

  it("COMPLETED da haydovchi kodi va fura tugmalari, CANCELLED da tugma yo'q", () => {
    expect(buildDraftKeyboard({ ...base, status: 'COMPLETED', complete: true })).toEqual([
      [
        { text: '🔑 Haydovchi kodi', callback_data: 'trk:d:7' },
        { text: '📍 Fura qayerda?', callback_data: 'trk:f' },
      ],
    ]);
    expect(buildDraftKeyboard({ ...base, status: 'CANCELLED', complete: true })).toEqual([]);
  });

  it('callback_data 64 baytdan oshmaydi', () => {
    for (const status of ['OPEN', 'COMPLETED'] as const) {
      const all = buildDraftKeyboard({ ...base, draftId: 2147483647, status, complete: true, confirmCancel: false }).flat();
      for (const button of all) if ('callback_data' in button) expect(Buffer.byteLength(button.callback_data)).toBeLessThanOrEqual(64);
    }
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

describe('uzun xabarda oxirgi blok saqlanadi (I3)', () => {
  const manyItems = (): DraftItem[] =>
    Array.from({ length: 20 }, (_, i) => ({
      uid: `u${i}`,
      bruttoManual: false,
      fields: { product: i === 19 ? '' : `Товар номер ${i}`, boxCount: '1000', boxWeight: '12345.5', palletCount: '10', palletWeight: '4321.25', netto: '123456.5', brutto: '234567.5', price: '99.99' },
    }));

  it("OPEN: tovarlar qirqilsa ham 'Не заполнено' bloki xabar oxirida qoladi", () => {
    const text = formatDraftMessage({ data: { ...completeData(), items: manyItems() }, authors: {}, context, status: 'OPEN' });
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).toContain('⏳ <b>Не заполнено:</b>');
    expect(text).toContain('• Товар 20: Наименование');
    expect(text).toContain('…');
    expect((text.match(/<b>/g) ?? []).length).toBe((text.match(/<\/b>/g) ?? []).length);
  });

  it("COMPLETED: uzun xabar qirqilganda 'Заполнили' qatori saqlanadi", () => {
    const full = manyItems().map((item) => ({ ...item, fields: { ...item.fields, product: 'Яблоки' } }));
    const text = formatDraftMessage({ data: { ...completeData(), items: full }, authors: { 'header.orderNumber': by('Aziz') }, context, status: 'COMPLETED' });
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text.endsWith('👤 Заполнили: Aziz')).toBe(true);
    expect(text).not.toContain('Завершил');
  });
});

describe('Вид упаковки xabarda — Количество ящиков bilan birlashtiriladi', () => {
  const withItem = (fields: Record<string, string>): DraftData => ({ ...completeData(), items: [{ uid: 'u1', fields, bruttoManual: false }] });

  it("qadoq turi bor bo'lsa 'Количество ящиков' qiymati shu nom bilan, 'шт.' va alohida 'Вид упаковки' qatori yo'q", () => {
    const text = formatDraftMessage({
      data: withItem({ product: 'Виноград', boxCount: '2500', boxWeight: '5', packagingType: 'дер.ящик', palletCount: '2', netto: '100', brutto: '110' }),
      authors: {},
      context,
      status: 'OPEN',
    });
    expect(text).toContain('📦 Количество ящиков: <b>2500 дер.ящик (5 кг)</b>');
    expect(text).not.toContain('Вид упаковки');
    expect(text).not.toContain('2500 шт.');
    expect(text).toContain('Количество поддонов: <b>2 шт.</b>'); // поддонlar birligi o'zgarmaydi
  });

  it("qadoq turi yo'q bo'lsa avvalgidek 'шт.'", () => {
    const text = formatDraftMessage({ data: withItem({ product: 'Виноград', boxCount: '2500', netto: '100', brutto: '110' }), authors: {}, context, status: 'OPEN' });
    expect(text).toContain('Количество ящиков: <b>2500 шт.</b>');
  });

  it("qadoq turi bor-u ящиклар soni yo'q bo'lsa ma'lumot yo'qolmaydi: 'Вид упаковки' qatori qoladi", () => {
    const text = formatDraftMessage({ data: withItem({ product: 'Виноград', packagingType: 'дер.ящик', netto: '100', brutto: '110' }), authors: {}, context, status: 'OPEN' });
    expect(text).toContain('🗃 Вид упаковки: <b>дер.ящик</b>');
    expect(text).not.toContain('Количество ящиков: <b>');
  });

  it("qadoq nomidagi HTML belgilari escape qilinadi", () => {
    const text = formatDraftMessage({ data: withItem({ product: 'Виноград', boxCount: '10', packagingType: 'A&B<x>' }), authors: {}, context, status: 'OPEN' });
    expect(text).toContain('Количество ящиков: <b>10 A&amp;B&lt;x&gt;</b>');
  });
});

describe('Поддоны: Количество va Общий вес birlashtiriladi', () => {
  const withItem = (fields: Record<string, string>): DraftData => ({ ...completeData(), items: [{ uid: 'u1', fields, bruttoManual: false }] });
  const render = (fields: Record<string, string>) => formatDraftMessage({ data: withItem(fields), authors: {}, context, status: 'OPEN' });

  it("ikkalasi ham kiritilgan: 'Количество поддонов: 33 шт. (430 кг)', alohida vazn qatori yo'q", () => {
    const text = render({ product: 'Виноград', palletCount: '33', palletWeight: '430', netto: '100', brutto: '110' });
    expect(text).toContain('🧱 Количество поддонов: <b>33 шт. (430 кг)</b>');
    expect(text).not.toContain('Общий вес поддонов');
  });

  it("o'nli vazn o'zgarishsiz yoziladi", () => {
    expect(render({ product: 'Виноград', palletCount: '33', palletWeight: '429.5' })).toContain('<b>33 шт. (429.5 кг)</b>');
  });

  it("faqat soni bo'lsa 'шт.' bilan, vazn qatori yo'q", () => {
    const text = render({ product: 'Виноград', palletCount: '33' });
    expect(text).toContain('Количество поддонов: <b>33 шт.</b>');
    expect(text).not.toContain('Общий вес поддонов');
  });

  it("faqat vazni bo'lsa ma'lumot yo'qolmaydi: o'z qatorida 'кг.' bilan", () => {
    const text = render({ product: 'Виноград', palletWeight: '430' });
    expect(text).toContain('⚖️ Общий вес поддонов: <b>430 кг.</b>');
    expect(text).not.toContain('Количество поддонов');
  });

  it("ящиклар va поддонlar birlashtirilishi bir-biriga xalaqit bermaydi", () => {
    const text = render({ product: 'Виноград', boxCount: '2500', boxWeight: '500', packagingType: 'дер.ящик', palletCount: '33', palletWeight: '430' });
    expect(text).toContain('Количество ящиков: <b>2500 дер.ящик (500 кг)</b>');
    expect(text).toContain('Количество поддонов: <b>33 шт. (430 кг)</b>');
    expect(text).not.toContain('Общий вес');
  });
});

describe('Ящики: Количество (qadoq turi bilan) va Общий вес birlashtiriladi', () => {
  const render = (fields: Record<string, string>) =>
    formatDraftMessage({ data: { ...completeData(), items: [{ uid: 'u1', fields, bruttoManual: false }] }, authors: {}, context, status: 'OPEN' });

  it("qadoq turi bilan: '📦 Количество ящиков: 2500 пласт.ящик (2500 кг)', alohida vazn qatori yo'q", () => {
    const text = render({ product: 'Виноград', boxCount: '2500', boxWeight: '2500', packagingType: 'пласт.ящик' });
    expect(text).toContain('📦 Количество ящиков: <b>2500 пласт.ящик (2500 кг)</b>');
    expect(text).not.toContain('Общий вес ящиков');
    expect(text).not.toContain('Вид упаковки');
  });

  it("qadoq turisiz: 'шт.' bilan", () => {
    expect(render({ product: 'Виноград', boxCount: '2100', boxWeight: '1000' })).toContain('Количество ящиков: <b>2100 шт. (1000 кг)</b>');
  });

  it("o'nli vazn o'zgarishsiz", () => {
    expect(render({ product: 'Виноград', boxCount: '10', boxWeight: '12.5' })).toContain('<b>10 шт. (12.5 кг)</b>');
  });

  it("faqat soni: vazn qatori yo'q; faqat vazni: o'z qatorida 'кг.' bilan (ma'lumot yo'qolmaydi)", () => {
    const onlyCount = render({ product: 'Виноград', boxCount: '10' });
    expect(onlyCount).toContain('Количество ящиков: <b>10 шт.</b>');
    expect(onlyCount).not.toContain('Общий вес ящиков');
    const onlyWeight = render({ product: 'Виноград', boxWeight: '500' });
    expect(onlyWeight).toContain('⚖️ Общий вес ящиков: <b>500 кг.</b>');
    expect(onlyWeight).not.toContain('Количество ящиков: <b>'); // qiymat qatori yo'q (yetishmayotganlar ro'yxatida nomi bor)
  });

  it("ящиклар soni yo'q bo'lsa qadoq turi o'z qatorida, vazn ham o'z qatorida", () => {
    const text = render({ product: 'Виноград', boxWeight: '500', packagingType: 'дер.ящик' });
    expect(text).toContain('🗃 Вид упаковки: <b>дер.ящик</b>');
    expect(text).toContain('Общий вес ящиков: <b>500 кг.</b>');
  });
});

describe('Итого — 2 va undan ortiq tovar bo\'lsa', () => {
  const item = (uid: string, fields: Record<string, string>): DraftItem => ({ uid, fields, bruttoManual: false });
  const render = (items: DraftItem[], status: 'OPEN' | 'COMPLETED' = 'OPEN') =>
    formatDraftMessage({ data: { ...completeData(), items }, authors: {}, context, status });

  it("2 ta tovar: 'Итого: 20 330 нетто / 21 770 брутто' (mingliklar bo'shliq bilan)", () => {
    const text = render([
      item('u1', { product: 'Виноград', boxCount: '10', netto: '10000', brutto: '10700' }),
      item('u2', { product: 'Яблоки', boxCount: '5', netto: '10330', brutto: '11070' }),
    ]);
    expect(text).toContain('📊 Итого: <b>20 330 нетто / 21 770 брутто</b>');
  });

  it("1 ta tovar bo'lsa Итого chiqmaydi; butunlay bo'sh qo'shimcha blok tovar hisoblanmaydi", () => {
    expect(render([item('u1', { product: 'Виноград', boxCount: '10', netto: '100', brutto: '110' })])).not.toContain('Итого');
    expect(render([item('u1', { product: 'Виноград', boxCount: '10', netto: '100', brutto: '110' }), item('u2', {})])).not.toContain('Итого');
  });

  it("o'nli qiymatlar aniq yig'iladi va yaxlitlanadi (0.1 + 0.2 = 0.3; 1000.5 + 2000.25 = 3 000.75)", () => {
    const a = render([item('u1', { product: 'А', netto: '0.1', brutto: '1000.5' }), item('u2', { product: 'Б', netto: '0.2', brutto: '2000.25' })]);
    expect(a).toContain('Итого: <b>0.3 нетто / 3 000.75 брутто</b>');
  });

  it("faqat bittasi (netto yoki brutto) mavjud bo'lsa shu qismi chiqadi; ikkalasi ham yo'q bo'lsa qator yo'q", () => {
    const onlyNetto = render([item('u1', { product: 'А', netto: '100' }), item('u2', { product: 'Б', netto: '200' })]);
    expect(onlyNetto).toContain('Итого: <b>300 нетто</b>');
    expect(onlyNetto).not.toContain('брутто</b>');
    const neither = render([item('u1', { product: 'А', boxCount: '1' }), item('u2', { product: 'Б', boxCount: '2' })]);
    expect(neither).not.toContain('Итого');
  });

  it("tovarlardan keyin, 'Не заполнено' va 'Заполнили' dan oldin turadi", () => {
    const text = formatDraftMessage({
      data: { ...completeData(), items: [item('u1', { product: 'А', netto: '100', brutto: '110' }), item('u2', { product: 'Б', netto: '200', brutto: '220' })] },
      authors: { 'header.orderNumber': by('Aziz') },
      context,
      status: 'OPEN',
    });
    const total = text.indexOf('Итого');
    expect(total).toBeGreaterThan(text.indexOf('Товар 2'));
    expect(total).toBeLessThan(text.indexOf('Не заполнено'));
    expect(total).toBeLessThan(text.indexOf('Заполнили'));
  });

  it("COMPLETED xabarda ham chiqadi; juda uzun xabar qirqilganda ham Итого saqlanadi", () => {
    expect(render([item('u1', { product: 'А', netto: '1', brutto: '2' }), item('u2', { product: 'Б', netto: '3', brutto: '4' })], 'COMPLETED')).toContain('Итого: <b>4 нетто / 6 брутто</b>');
    const many = Array.from({ length: 20 }, (_, i) =>
      item(`u${i}`, { product: `Товар номер ${i}`, boxCount: '1000', boxWeight: '12345.5', packagingType: 'дер.ящик', palletCount: '10', palletWeight: '4321.25', netto: '1000', brutto: '1100', price: '99.99' })
    );
    const text = render(many);
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).toContain('Итого: <b>20 000 нетто / 22 000 брутто</b>');
  });
});
