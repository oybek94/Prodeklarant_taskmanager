import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  draftFindFirst: vi.fn(),
  draftFindUnique: vi.fn(),
  draftFindMany: vi.fn(),
  draftCreate: vi.fn(),
  draftUpdate: vi.fn(),
  draftUpdateMany: vi.fn(),
  draftDelete: vi.fn(),
  contractFindFirst: vi.fn(),
  contractFindUnique: vi.fn(),
  branchFindFirst: vi.fn(),
  branchFindUnique: vi.fn(),
  packagingFindMany: vi.fn(),
  callTelegram: vi.fn(),
  rememberProduct: vi.fn(),
  rememberDestination: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    clientCargoDraft: {
      findFirst: m.draftFindFirst,
      findUnique: m.draftFindUnique,
      findMany: m.draftFindMany,
      create: m.draftCreate,
      update: m.draftUpdate,
      updateMany: m.draftUpdateMany,
      delete: m.draftDelete,
    },
    contract: { findFirst: m.contractFindFirst, findUnique: m.contractFindUnique },
    branch: { findFirst: m.branchFindFirst, findUnique: m.branchFindUnique },
    packagingType: { findMany: m.packagingFindMany },
  },
}));
vi.mock('../services/telegram-bot-api', () => ({ callTelegram: m.callTelegram }));
vi.mock('../services/client-cargo-miniapp.service', () => ({
  rememberProduct: m.rememberProduct,
  rememberDestination: m.rememberDestination,
  shipmentPlaceOf: (b: { name: string; regionText: string | null }) => b.regionText?.trim() || b.name,
}));

import {
  cancelDraft,
  completeDraft,
  createDraft,
  getDraft,
  listOpenDrafts,
  patchDraft,
  syncDraftMessage,
} from '../services/client-cargo-draft.service';

const scope = { botToken: '123:TEST', clientId: 1, chatId: '-100123' };
const actor = { tgUserId: 10, name: 'Aziz' };
const vali = { tgUserId: 11, name: 'Vali' };

const completeData = () => ({
  contractId: 5,
  branchId: 3,
  header: { deliveryTerms: 'Москва', customsPlace: 'Ташкент', destination: 'Самара' },
  items: [{ uid: 'u1', fields: { product: 'Яблоки', boxCount: '10', netto: '100', brutto: '110' }, bruttoManual: false }],
});
const emptyData = () => ({ contractId: null, branchId: null, header: {}, items: [] });

const row = (over: Record<string, unknown> = {}) => ({
  id: 7,
  clientId: 1,
  chatId: '-100123',
  status: 'OPEN',
  data: emptyData(),
  authors: {},
  messageId: 55,
  version: 1,
  completedAt: null,
  completedByName: null,
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'));
  Object.values(m).forEach((fn) => fn.mockReset());
  m.callTelegram.mockResolvedValue({ ok: true, result: { message_id: 55 } });
  m.draftUpdateMany.mockResolvedValue({ count: 1 });
  m.draftUpdate.mockResolvedValue({});
  m.contractFindUnique.mockResolvedValue(null);
  m.branchFindUnique.mockResolvedValue({ name: 'Ташкент', regionText: 'Ташкентская обл.' });
  delete process.env.CLIENT_BOT_MINIAPP_LINK;
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('egalik tekshiruvi', () => {
  it("boshqa guruh/mijoz arizasi: getDraft null, patch/complete/cancel 404 va hech narsa yozilmaydi", async () => {
    m.draftFindFirst.mockResolvedValue(null);
    expect(await getDraft(scope, 99)).toBeNull();
    for (const result of [
      await patchDraft(scope, 99, actor, { header: { invoiceNumber: 'X' } }),
      await completeDraft(scope, 99, actor),
      await cancelDraft(scope, 99, actor),
    ]) {
      expect(result).toMatchObject({ ok: false, status: 404 });
    }
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
    expect(m.callTelegram).not.toHaveBeenCalled();
    expect(m.draftFindFirst.mock.calls[0][0].where).toEqual({ id: 99, clientId: 1, chatId: '-100123' });
  });
});

describe('patchDraft', () => {
  it("versiya to'qnashuvida qayta o'qib, boshqa foydalanuvchi qo'shganini saqlab qo'shadi", async () => {
    const other = row({
      id: 21,
      version: 2,
      data: { ...emptyData(), header: { orderNumber: '77' } },
      authors: { 'header.orderNumber': { tgUserId: 11, name: 'Vali', at: '2026-11-01T09:00:00.000Z' } },
    });
    m.draftFindFirst
      .mockResolvedValueOnce(row({ id: 21, version: 1 })) // 1-urinish
      .mockResolvedValueOnce(other) // 2-urinish (qayta o'qish)
      .mockResolvedValue({ ...other, version: 3 }); // yangi holatni qaytarish
    m.draftUpdateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    const result = await patchDraft(scope, 21, actor, { header: { invoiceNumber: 'INV-1' } });

    expect(result.ok).toBe(true);
    expect(m.draftUpdateMany).toHaveBeenCalledTimes(2);
    const second = m.draftUpdateMany.mock.calls[1][0];
    expect(second.where).toMatchObject({ id: 21, version: 2 });
    expect(second.data.data.header).toEqual({ orderNumber: '77', invoiceNumber: 'INV-1' });
    expect(second.data.authors['header.orderNumber'].name).toBe('Vali');
    expect(second.data.authors['header.invoiceNumber'].name).toBe('Aziz');
    expect(second.data.version).toEqual({ increment: 1 });
  });

  it("3 marta ketma-ket to'qnashuv bo'lsa 409", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 22 }));
    m.draftUpdateMany.mockResolvedValue({ count: 0 });
    const result = await patchDraft(scope, 22, actor, { header: { invoiceNumber: 'X' } });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(m.draftUpdateMany).toHaveBeenCalledTimes(3);
  });

  it.each(['COMPLETED', 'CANCELLED'])("%s ariza o'zgartirilmaydi (409)", async (status) => {
    m.draftFindFirst.mockResolvedValue(row({ id: 23, status }));
    const result = await patchDraft(scope, 23, actor, { header: { invoiceNumber: 'X' } });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
  });

  it("hech narsa o'zgarmasa yozilmaydi va xabar tahrirlanmaydi", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 24, data: { ...emptyData(), header: { invoiceNumber: 'X' } } }));
    const result = await patchDraft(scope, 24, actor, { header: { invoiceNumber: 'X' } });
    expect(result.ok).toBe(true);
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
    expect(m.callTelegram).not.toHaveBeenCalled();
  });

  it("noto'g'ri qiymat 400 va maydon xatolari bilan", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 25 }));
    const result = await patchDraft(scope, 25, actor, { items: { u1: { fields: { boxCount: 'abc' } } } });
    expect(result).toMatchObject({ ok: false, status: 400 });
    if (!result.ok) expect(result.errors?.['items.u1.boxCount']).toBeTruthy();
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
  });

  it("boshqa mijozning shartnomasi (contractId) 400", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 26 }));
    m.contractFindFirst.mockResolvedValue(null);
    const result = await patchDraft(scope, 26, actor, { contractId: 999 });
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(m.contractFindFirst.mock.calls[0][0].where).toMatchObject({ id: 999, clientId: 1 });
  });
});

describe('createDraft', () => {
  it("bo'sh patch 400 va hech narsa yaratilmaydi", async () => {
    const result = await createDraft(scope, actor, {});
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(m.draftCreate).not.toHaveBeenCalled();
  });

  it("yaratadi, guruhga jonli xabarni yuboradi va messageId ni saqlaydi", async () => {
    process.env.CLIENT_BOT_MINIAPP_LINK = 'https://t.me/pd_client_bot/cargo/';
    const created = row({
      id: 30,
      messageId: null,
      data: { ...emptyData(), header: { invoiceNumber: 'INV-1' } },
      authors: { 'header.invoiceNumber': { tgUserId: 10, name: 'Aziz', at: '2026-11-01T10:00:00.000Z' } },
    });
    m.draftCreate.mockResolvedValue(created);
    m.draftFindUnique.mockResolvedValue(created);
    m.draftFindFirst.mockResolvedValue({ ...created, messageId: 91 });
    m.callTelegram.mockResolvedValue({ ok: true, result: { message_id: 91 } });

    const result = await createDraft(scope, actor, { header: { invoiceNumber: 'INV-1' } });

    expect(result.ok).toBe(true);
    const createArgs = m.draftCreate.mock.calls[0][0].data;
    expect(createArgs).toMatchObject({ clientId: 1, chatId: '-100123', status: 'OPEN' });
    expect(createArgs.authors['header.invoiceNumber'].name).toBe('Aziz');
    const [token, method, body] = m.callTelegram.mock.calls[0];
    expect(token).toBe('123:TEST');
    expect(method).toBe('sendMessage');
    expect(body.chat_id).toBe('-100123');
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('Инвойс №: <b>INV-1</b>\n');
    expect(body.text).toContain('👤 Заполнили: Aziz');
    expect(JSON.stringify(body.reply_markup)).toContain('startapp=-100123_30');
    expect(m.draftUpdate).toHaveBeenCalledWith({ where: { id: 30 }, data: { messageId: 91 } });
  });

  it("guruhga yuborib bo'lmasa 502 va yaratilgan qoralama o'chiriladi", async () => {
    const created = row({ id: 31, messageId: null });
    m.draftCreate.mockResolvedValue(created);
    m.draftFindUnique.mockResolvedValue(created);
    m.callTelegram.mockResolvedValue({ ok: false, description: 'Forbidden: bot was kicked' });
    const result = await createDraft(scope, actor, { header: { invoiceNumber: 'INV-1' } });
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(m.draftDelete).toHaveBeenCalledWith({ where: { id: 31 } });
  });
});

describe('completeDraft va cancelDraft', () => {
  it("majburiy maydonlar to'liq bo'lmasa 400 va yetishmayotganlar nomi", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 40 }));
    const result = await completeDraft(scope, 40, actor);
    expect(result).toMatchObject({ ok: false, status: 400 });
    if (!result.ok) expect(result.error).toContain('Условия поставки');
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
  });

  it("yakunlaydi, xabarni yangilaydi, tovar nomlarini eslab qoladi; ikkinchi marta zararsiz", async () => {
    const open = row({ id: 41, data: completeData() });
    m.draftFindFirst
      .mockResolvedValueOnce(open) // 1-chaqiruv: ochiq
      .mockResolvedValueOnce({ ...open, status: 'COMPLETED', completedByName: 'Aziz', version: 2 }) // qayta yuklash
      .mockResolvedValue({ ...open, status: 'COMPLETED', completedByName: 'Aziz', version: 2 }); // 2-chaqiruv
    m.draftFindUnique.mockResolvedValue({ ...open, status: 'COMPLETED', completedByName: 'Aziz', version: 2 });

    const first = await completeDraft(scope, 41, actor);
    expect(first.ok).toBe(true);
    expect(m.draftUpdateMany.mock.calls[0][0].data).toMatchObject({ status: 'COMPLETED', completedByName: 'Aziz' });
    expect(m.rememberProduct).toHaveBeenCalledWith(1, 'Яблоки');
    expect(m.rememberDestination).toHaveBeenCalledWith(1, 5, 'Самара');
    const editBody = m.callTelegram.mock.calls[0][2];
    expect(m.callTelegram.mock.calls[0][1]).toBe('editMessageText');
    expect(editBody.text).toContain('✅ <b>Данные о грузе — полные</b>');
    expect(editBody.text).not.toContain('Завершил'); // yakunlagan odam xabarda ko'rsatilmaydi (completedByName faqat bazada)
    expect(editBody.reply_markup).toEqual({ inline_keyboard: [] });

    const telegramCalls = m.callTelegram.mock.calls.length;
    const second = await completeDraft(scope, 41, vali);
    expect(second.ok).toBe(true);
    expect(m.draftUpdateMany).toHaveBeenCalledTimes(1);
    // I2: yopiq arizada ham xabar qayta moslanadi (oldingi tahrir muvaffaqiyatsiz bo'lgan bo'lishi mumkin)
    expect(m.callTelegram.mock.calls.length).toBe(telegramCalls + 1);
    expect(m.callTelegram.mock.calls[telegramCalls][1]).toBe('editMessageText');
  });

  it("bekor qilingan arizani yakunlab bo'lmaydi (409), yakunlanganini bekor qilib bo'lmaydi (409)", async () => {
    m.draftFindFirst.mockResolvedValueOnce(row({ id: 42, status: 'CANCELLED', data: completeData() }));
    expect(await completeDraft(scope, 42, actor)).toMatchObject({ ok: false, status: 409 });
    m.draftFindFirst.mockResolvedValueOnce(row({ id: 43, status: 'COMPLETED', data: completeData() }));
    expect(await cancelDraft(scope, 43, actor)).toMatchObject({ ok: false, status: 409 });
  });

  it("bekor qilish: holat CANCELLED, xabar 'Отменено' ga o'zgaradi", async () => {
    const open = row({ id: 44 });
    m.draftFindFirst.mockResolvedValueOnce(open).mockResolvedValue({ ...open, status: 'CANCELLED', version: 2 });
    m.draftFindUnique.mockResolvedValue({ ...open, status: 'CANCELLED', version: 2 });
    const result = await cancelDraft(scope, 44, actor);
    expect(result.ok).toBe(true);
    expect(m.draftUpdateMany.mock.calls[0][0].data).toMatchObject({ status: 'CANCELLED' });
    expect(m.callTelegram.mock.calls[0][2].text).toBe('❌ <b>Отменено</b>');
  });
});

describe('syncDraftMessage', () => {
  it("xabar o'chirilgan bo'lsa yangisini yuboradi va messageId ni yangilaydi", async () => {
    m.draftFindUnique.mockResolvedValue(row({ id: 50, messageId: 55 }));
    m.callTelegram
      .mockResolvedValueOnce({ ok: false, description: 'Bad Request: message to edit not found' })
      .mockResolvedValueOnce({ ok: true, result: { message_id: 77 } });
    const result = await syncDraftMessage('123:TEST', 50, { immediate: true });
    expect(result).toEqual({ ok: true });
    expect(m.callTelegram.mock.calls.map((c) => c[1])).toEqual(['editMessageText', 'sendMessage']);
    expect(m.draftUpdate).toHaveBeenCalledWith({ where: { id: 50 }, data: { messageId: 77 } });
  });

  it("'message is not modified' xato emas", async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.draftFindUnique.mockResolvedValue(row({ id: 51 }));
    m.callTelegram.mockResolvedValue({ ok: false, description: 'Bad Request: message is not modified' });
    expect(await syncDraftMessage('123:TEST', 51, { immediate: true })).toEqual({ ok: true });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("3 soniya ichidagi ketma-ket chaqiruvlar bitta tahrirga birlashadi", async () => {
    m.draftFindUnique.mockResolvedValue(row({ id: 52 }));
    await syncDraftMessage('123:TEST', 52); // darrov (oldin tahrir bo'lmagan)
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    await syncDraftMessage('123:TEST', 52);
    await syncDraftMessage('123:TEST', 52);
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3100);
    expect(m.callTelegram).toHaveBeenCalledTimes(2);
  });

  it("immediate bo'lsa kutilayotgan kechiktirilgan tahrir bekor qilinadi (ikki marta tahrir yo'q)", async () => {
    m.draftFindUnique.mockResolvedValue(row({ id: 53 }));
    await syncDraftMessage('123:TEST', 53);
    await syncDraftMessage('123:TEST', 53); // kechiktirildi
    await syncDraftMessage('123:TEST', 53, { immediate: true });
    expect(m.callTelegram).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3100);
    expect(m.callTelegram).toHaveBeenCalledTimes(2);
  });
});

describe('listOpenDrafts', () => {
  it("ochiq arizalarni yorliq va yetishmayotganlar soni bilan qaytaradi, buzuq yozuvni tashlaydi", async () => {
    m.draftFindMany.mockResolvedValue([
      row({ id: 1, data: { ...emptyData(), header: { invoiceNumber: 'INV-9', vehicleNumber: '01A123BC' } }, updatedAt: new Date('2026-11-01T09:00:00.000Z') }),
      row({ id: 2, data: 'buzuq', updatedAt: new Date('2026-11-01T08:00:00.000Z') }),
    ]);
    const list = await listOpenDrafts({ clientId: 1, chatId: '-100123' });
    expect(m.draftFindMany.mock.calls[0][0]).toMatchObject({ where: { clientId: 1, chatId: '-100123', status: 'OPEN' }, orderBy: { updatedAt: 'desc' }, take: 5 });
    expect(list).toEqual([{ id: 1, label: 'INV-9 | 01A123BC', missingCount: 7, updatedAt: '2026-11-01T09:00:00.000Z' }]);
  });
});

describe('xavfsizlik tuzatishlari (review)', () => {
  it("I1: bir ariza uchun sinxronlash ketma-ket bajariladi — kechikkan eski tahrir yangisini bosib ketmaydi", async () => {
    m.draftFindUnique.mockResolvedValueOnce(row({ id: 60 })).mockResolvedValueOnce(row({ id: 60, status: 'CANCELLED' }));
    let release: () => void = () => undefined;
    m.callTelegram.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ ok: true, result: {} }); }));
    m.callTelegram.mockResolvedValue({ ok: true, result: {} });

    const first = syncDraftMessage('123:TEST', 60, { immediate: true });
    const second = syncDraftMessage('123:TEST', 60, { immediate: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(m.callTelegram).toHaveBeenCalledTimes(1); // ikkinchisi birinchisi tugamaguncha boshlanmaydi
    release();
    await first;
    await second;
    expect(m.callTelegram).toHaveBeenCalledTimes(2);
    expect(m.callTelegram.mock.calls[1][2].text).toBe('❌ <b>Отменено</b>');
  });

  it("I2: allaqachon bekor qilingan arizani qayta bekor qilish xabarni qayta moslaydi", async () => {
    const cancelled = row({ id: 61, status: 'CANCELLED', version: 2 });
    m.draftFindFirst.mockResolvedValue(cancelled);
    m.draftFindUnique.mockResolvedValue(cancelled);
    const result = await cancelDraft(scope, 61, actor);
    expect(result.ok).toBe(true);
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
    expect(m.callTelegram.mock.calls[0][2].text).toBe('❌ <b>Отменено</b>');
  });

  it("I4: yozuv commit bo'lgandan keyin xabar sinxronlashi yiqilsa ham saqlash muvaffaqiyatli (500 emas)", async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.draftFindFirst.mockResolvedValue(row({ id: 70 }));
    m.draftFindUnique.mockRejectedValue(new Error('db down'));
    const result = await patchDraft(scope, 70, actor, { header: { invoiceNumber: 'INV-1' } });
    expect(result.ok).toBe(true);
    expect(m.draftUpdateMany).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("I4: createDraft da sinxronlash xato otsa 502 va yaratilgan qoralama o'chiriladi (takroriy ariza qolmaydi)", async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.draftCreate.mockResolvedValue(row({ id: 71, messageId: null }));
    m.draftFindUnique.mockRejectedValue(new Error('db down'));
    const result = await createDraft(scope, actor, { header: { invoiceNumber: 'INV-1' } });
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(m.draftDelete).toHaveBeenCalledWith({ where: { id: 71 } });
    spy.mockRestore();
  });
});

describe('Вид упаковки — Sozlamalardagi Qadoq turlaridan tanlanadi', () => {
  it("ro'yxatda bo'lmagan qiymat 400 va maydon xatosi bilan rad etiladi, hech narsa yozilmaydi", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 80 }));
    m.packagingFindMany.mockResolvedValue([{ name: 'Картонные ящики' }, { name: 'Пластиковые ящики' }]);
    const result = await patchDraft(scope, 80, actor, { items: { u1: { fields: { packagingType: 'Выдуманная тара' } } } });
    expect(result).toMatchObject({ ok: false, status: 400 });
    if (!result.ok) expect(result.errors?.['items.u1.packagingType']).toBeTruthy();
    expect(m.draftUpdateMany).not.toHaveBeenCalled();
  });

  it("ro'yxatdagi qiymat qabul qilinadi (katta-kichik harf farqisiz, bazadagi yozuv saqlanadi)", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 81 }));
    m.packagingFindMany.mockResolvedValue([{ name: 'Картонные ящики' }]);
    const result = await patchDraft(scope, 81, actor, { items: { u1: { fields: { packagingType: 'картонные ЯЩИКИ' } } } });
    expect(result.ok).toBe(true);
    expect(m.draftUpdateMany.mock.calls[0][0].data.data.items[0].fields.packagingType).toBe('Картонные ящики');
  });

  it("qiymat tozalansa (null) ro'yxat tekshirilmaydi", async () => {
    m.draftFindFirst.mockResolvedValue(row({ id: 82, data: { ...emptyData(), items: [{ uid: 'u1', fields: { packagingType: 'Картонные ящики' }, bruttoManual: false }] } }));
    const result = await patchDraft(scope, 82, actor, { items: { u1: { fields: { packagingType: null } } } });
    expect(result.ok).toBe(true);
    expect(m.packagingFindMany).not.toHaveBeenCalled();
  });

  it("createDraft ham ro'yxatdan tashqari qiymatni rad etadi", async () => {
    m.packagingFindMany.mockResolvedValue([{ name: 'Картонные ящики' }]);
    const result = await createDraft(scope, actor, { items: { u1: { fields: { packagingType: 'Бочка' } } } });
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(m.draftCreate).not.toHaveBeenCalled();
  });
});
