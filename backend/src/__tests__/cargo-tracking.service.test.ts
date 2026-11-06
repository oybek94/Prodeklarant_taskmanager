import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  trackingFindUnique: vi.fn(),
  trackingFindFirst: vi.fn(),
  trackingFindMany: vi.fn(),
  trackingUpsert: vi.fn(),
  trackingUpdate: vi.fn(),
  trackingUpdateMany: vi.fn(),
  pointCreate: vi.fn(),
  pointDeleteMany: vi.fn(),
  invoiceFindUnique: vi.fn(),
  callTelegram: vi.fn(),
  reverseGeocode: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    task: { findFirst: m.taskFindFirst, findMany: m.taskFindMany },
    cargoTracking: {
      findUnique: m.trackingFindUnique,
      findFirst: m.trackingFindFirst,
      findMany: m.trackingFindMany,
      upsert: m.trackingUpsert,
      update: m.trackingUpdate,
      updateMany: m.trackingUpdateMany,
    },
    cargoTrackingPoint: { create: m.pointCreate, deleteMany: m.pointDeleteMany },
    invoice: { findUnique: m.invoiceFindUnique },
  },
}));
vi.mock('../services/telegram-bot-api', () => ({ callTelegram: m.callTelegram }));
vi.mock('../services/geocode', () => ({ reverseGeocode: m.reverseGeocode }));

import {
  announceDriverConnected,
  answerDriverFinish,
  bindDriverByCode,
  buildWhereReply,
  issueDriverCode,
  recordDriverLocation,
  runHourlyTrackingJob,
} from '../services/cargo-tracking.service';

const NOW = new Date('2026-11-02T12:00:00Z');
const minutesAgo = (min: number) => new Date(NOW.getTime() - min * 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  m.invoiceFindUnique.mockResolvedValue({ invoiceNumber: 'INV-1', additionalInfo: { vehicleNumber: '01A123BC' }, contract: null });
  m.callTelegram.mockResolvedValue({ ok: true, result: {} });
  m.trackingUpdate.mockResolvedValue({});
  m.pointDeleteMany.mockResolvedValue({ count: 0 });
});

describe('issueDriverCode', () => {
  it("boshqa mijozning yukiga kod bermaydi (clientId filtr)", async () => {
    m.taskFindFirst.mockResolvedValue(null);
    const result = await issueDriverCode({ taskId: 5, clientId: 2, createdVia: 'CLIENT_GROUP', regenerate: false });
    expect(result).toEqual({ ok: false, reason: 'TASK_NOT_FOUND' });
    expect(m.taskFindFirst.mock.calls[0][0].where).toEqual({ id: 5, clientId: 2 });
    expect(m.trackingUpsert).not.toHaveBeenCalled();
  });

  it("mijoz guruhi 72 soatdan eski yukka kod bermaydi", async () => {
    m.taskFindFirst.mockResolvedValue({ id: 5, clientId: 2, createdAt: new Date(Date.now() - 73 * 3600_000) });
    expect(await issueDriverCode({ taskId: 5, clientId: 2, createdVia: 'CLIENT_GROUP', regenerate: false })).toEqual({ ok: false, reason: 'TASK_TOO_OLD' });
    expect(m.trackingUpsert).not.toHaveBeenCalled();
  });

  it("mijoz guruhi 72 soat ichidagi yukka kod beradi (status so'ralmaydi)", async () => {
    m.taskFindFirst.mockResolvedValue({ id: 5, clientId: 2, createdAt: new Date(Date.now() - 71 * 3600_000) });
    m.trackingFindUnique.mockResolvedValue(null);
    m.trackingUpsert.mockResolvedValue({ id: 9 });
    expect((await issueDriverCode({ taskId: 5, clientId: 2, createdVia: 'CLIENT_GROUP', regenerate: false })).ok).toBe(true);
    expect(m.taskFindFirst.mock.calls[0][0].select).not.toHaveProperty('status');
  });

  it("xodim eski yoki yakunlangan yukka ham kod bera oladi", async () => {
    m.taskFindFirst.mockResolvedValue({ id: 5, clientId: 2, createdAt: new Date('2026-01-01') });
    m.trackingUpsert.mockResolvedValue({ id: 9 });
    expect((await issueDriverCode({ taskId: 5, createdVia: 'STAFF', regenerate: true })).ok).toBe(true);
  });

  it("guruhdan (regenerate: false) faol kod bo'lsa uni o'zgartirmaydi", async () => {
    m.taskFindFirst.mockResolvedValue({ id: 5, clientId: 2, createdAt: new Date() });
    m.trackingFindUnique.mockResolvedValue({ code: 'K7M2QX', status: 'ACTIVE' });
    expect(await issueDriverCode({ taskId: 5, clientId: 2, createdVia: 'CLIENT_GROUP', regenerate: false })).toEqual({ ok: true, code: 'K7M2QX', reused: true });
    expect(m.trackingUpsert).not.toHaveBeenCalled();
  });

  it("xodim (regenerate: true) yangi kod beradi va haydovchi ulanishini tozalaydi", async () => {
    m.taskFindFirst.mockResolvedValue({ id: 5, clientId: 2, createdAt: new Date() });
    m.trackingUpsert.mockResolvedValue({ id: 9 });
    const result = await issueDriverCode({ taskId: 5, createdVia: 'STAFF', createdById: 3, regenerate: true });
    expect(result.ok && result.reused).toBe(false);
    const args = m.trackingUpsert.mock.calls[0][0];
    expect(args.update).toMatchObject({ status: 'WAITING', driverTelegramId: null, lastLat: null, finishAskedAt: null });
    expect(args.create).toMatchObject({ taskId: 5, clientId: 2, createdVia: 'STAFF', createdById: 3 });
    expect(m.pointDeleteMany).toHaveBeenCalledWith({ where: { trackingId: 9 } });
  });
});

describe('bindDriverByCode', () => {
  it("noto'g'ri yoki muddati o'tgan kodni rad etadi", async () => {
    m.trackingFindFirst.mockResolvedValue(null);
    expect(await bindDriverByCode({ code: 'zzzzzz', telegramUserId: 10, chatId: 10 })).toEqual({ ok: false, reason: 'INVALID' });
  });

  it('birinchi haydovchini bog\'laydi', async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, driverTelegramId: null });
    m.trackingUpdateMany.mockResolvedValue({ count: 1 });
    expect(await bindDriverByCode({ code: 'k7m-2qx', telegramUserId: 10, chatId: 10 })).toEqual({ ok: true, trackingId: 4, taskId: 8, alreadyBound: false });
    expect(m.trackingFindFirst.mock.calls[0][0].where.code).toBe('K7M2QX');
    expect(m.trackingUpdateMany.mock.calls[0][0].where).toEqual({ id: 4, driverTelegramId: null });
  });

  it("14 kundan eski kodni qabul qilmaydi", async () => {
    m.trackingFindFirst.mockResolvedValue(null);
    const before = Date.now();
    await bindDriverByCode({ code: 'K7M2QX', telegramUserId: 10, chatId: 10 });
    const limit = m.trackingFindFirst.mock.calls[0][0].where.createdAt.gt as Date;
    const after = Date.now();
    const fourteenDays = 14 * 24 * 3600 * 1000;
    expect(limit.getTime()).toBeGreaterThanOrEqual(before - fourteenDays);
    expect(limit.getTime()).toBeLessThanOrEqual(after - fourteenDays);
  });

  it("boshqa Telegram hisobi allaqachon ulangan kodni ishlata olmaydi", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, driverTelegramId: BigInt(99) });
    expect(await bindDriverByCode({ code: 'K7M2QX', telegramUserId: 10, chatId: 10 })).toEqual({ ok: false, reason: 'TAKEN' });
    expect(m.trackingUpdateMany).not.toHaveBeenCalled();
  });

  it("poygada yutqazsa (boshqa hisob oldin yozgan) TAKEN", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, driverTelegramId: null });
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindUnique.mockResolvedValue({ driverTelegramId: BigInt(99) });
    expect(await bindDriverByCode({ code: 'K7M2QX', telegramUserId: 10, chatId: 10 })).toEqual({ ok: false, reason: 'TAKEN' });
  });

  it('o\'sha haydovchi kodni qayta kiritsa muammo yo\'q', async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, driverTelegramId: BigInt(10) });
    expect(await bindDriverByCode({ code: 'K7M2QX', telegramUserId: 10, chatId: 10 })).toEqual({ ok: true, trackingId: 4, taskId: 8, alreadyBound: true });
  });
});

describe('recordDriverLocation', () => {
  it('haydovchining yuki bo\'lmasa e\'tibor bermaydi', async () => {
    m.trackingFindFirst.mockResolvedValue(null);
    expect(await recordDriverLocation({ telegramUserId: 10, lat: 1, lng: 2, messageDate: 1, now: NOW })).toEqual({ ok: false });
  });

  it("birinchi signalni yozadi va ACTIVE qiladi; jonli muddatni xabar vaqtidan hisoblaydi", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, lastLocationAt: null });
    const messageDate = Math.floor(NOW.getTime() / 1000);
    m.trackingUpdateMany.mockResolvedValue({ count: 1 });
    const result = await recordDriverLocation({ telegramUserId: 10, lat: 50.28, lng: 57.2, messageDate, livePeriod: 28800, now: NOW });
    expect(result).toEqual({ ok: true, trackingId: 4, firstFix: true, persisted: true });
    // birinchi signal faqat lastLocationAt hali bo'sh bo'lsagina yoziladi (poyga himoyasi)
    expect(m.trackingUpdateMany.mock.calls[0][0].where).toEqual({ id: 4, lastLocationAt: null });
    const data = m.trackingUpdateMany.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: 'ACTIVE', lastLat: 50.28, lastLng: 57.2 });
    expect(data.livePeriodEndsAt).toEqual(new Date(NOW.getTime() + 28800 * 1000));
  });

  it("30 soniyadan tez yangilanishni bazaga yozmaydi", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, lastLocationAt: new Date(NOW.getTime() - 10_000) });
    expect(await recordDriverLocation({ telegramUserId: 10, lat: 1, lng: 2, messageDate: 1, now: NOW })).toEqual({ ok: true, trackingId: 4, firstFix: false, persisted: false });
    expect(m.trackingUpdate).not.toHaveBeenCalled();
  });

  it("birinchi signal poygasida yutqazgan yangilanish 'birinchi' hisoblanmaydi (guruhga ikki marta yozilmaydi)", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, lastLocationAt: null });
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    expect(await recordDriverLocation({ telegramUserId: 10, lat: 1, lng: 2, messageDate: 1, now: NOW })).toEqual({ ok: true, trackingId: 4, firstFix: false, persisted: false });
  });

  it("keyingi signal oddiy yangilanadi va 'birinchi' emas", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4, taskId: 8, lastLocationAt: new Date(NOW.getTime() - 120_000) });
    expect(await recordDriverLocation({ telegramUserId: 10, lat: 1, lng: 2, messageDate: 1, now: NOW })).toEqual({ ok: true, trackingId: 4, firstFix: false, persisted: true });
    expect(m.trackingUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('announceDriverConnected', () => {
  it("mijoz guruhiga ruscha xabar yuboradi (avto raqami, invoys, 'Где фура?' tugmasi)", async () => {
    m.trackingFindUnique.mockResolvedValue({ taskId: 8, client: { botGroupChatId: '-100123' } });
    await announceDriverConnected('tok', 4);
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    const [token, method, body] = m.callTelegram.mock.calls[0];
    expect(token).toBe('tok');
    expect(method).toBe('sendMessage');
    expect(body.chat_id).toBe('-100123');
    expect(body.text).toContain('Водитель подключился к боту');
    expect(body.text).toContain('01A123BC');
    expect(body.text).toContain('INV-1');
    expect(body.reply_markup.inline_keyboard[0][0]).toEqual({ text: '📍 Где фура?', callback_data: 'trk:f' });
  });

  it("guruh ulanmagan bo'lsa hech narsa yubormaydi", async () => {
    m.trackingFindUnique.mockResolvedValue({ taskId: 8, client: { botGroupChatId: null } });
    await announceDriverConnected('tok', 4);
    expect(m.callTelegram).not.toHaveBeenCalled();
  });

  it("Telegram xatosi istisno otmaydi", async () => {
    m.trackingFindUnique.mockResolvedValue({ taskId: 8, client: { botGroupChatId: '-100123' } });
    m.callTelegram.mockResolvedValue({ ok: false, description: 'Forbidden' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(announceDriverConnected('tok', 4)).resolves.toBeUndefined();
  });
});

describe('buildWhereReply', () => {
  const tracking = (over: Record<string, unknown> = {}) => ({
    id: 4,
    taskId: 8,
    lastLat: 50.28,
    lastLng: 57.2,
    lastLocationAt: minutesAgo(12),
    lastAddress: 'Aktobe, Qozog‘iston',
    lastPromptAt: null,
    driverChatId: BigInt(10),
    ...over,
  });

  it("boshqa mijoz guruhi uchun kuzatuvni topmaydi (clientId filtr)", async () => {
    m.trackingFindFirst.mockResolvedValue(null);
    expect(await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 't', now: NOW })).toEqual({ ok: false });
    expect(m.trackingFindFirst.mock.calls[0][0].where).toMatchObject({ id: 4, clientId: 2 });
  });

  it("yangi signalda manzil va koordinata qaytaradi, haydovchiga yozmaydi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking());
    const reply = await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 't', now: NOW });
    expect(reply.ok && reply.text).toContain('Aktobe');
    expect(reply.ok && reply.text).toContain('12 мин назад');
    expect(reply.ok && reply.location).toEqual({ lat: 50.28, lng: 57.2 });
    expect(m.callTelegram).not.toHaveBeenCalled();
    expect(m.reverseGeocode).not.toHaveBeenCalled();
  });

  it("manzil keshda yo'q bo'lsa geokodlaydi va saqlaydi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastAddress: null }));
    m.reverseGeocode.mockResolvedValue('Aktobe, Qozog‘iston');
    await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 't', now: NOW });
    expect(m.trackingUpdate).toHaveBeenCalledWith({ where: { id: 4 }, data: { lastAddress: 'Aktobe, Qozog‘iston' } });
  });

  it("signal eskirgan bo'lsa haydovchidan qayta so'raydi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastLocationAt: minutesAgo(200) }));
    const reply = await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 'tok', now: NOW });
    expect(reply.ok && reply.text).toContain('устарели');
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    expect(m.callTelegram.mock.calls[0][1]).toBe('sendMessage');
    expect(m.callTelegram.mock.calls[0][2].chat_id).toBe(10);
    // mijoz so'ragani uchun shoshilinch xabar + joylashuv tugmasi
    expect(m.callTelegram.mock.calls[0][2].text).toContain('Zudlik bilan');
    expect(m.callTelegram.mock.calls[0][2].reply_markup.keyboard[0][0]).toMatchObject({ request_location: true });
  });

  it("signal eskirgan bo'lsa ham 1 daqiqa oldin so'ralgan bo'lsa takroran yozmaydi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastLocationAt: minutesAgo(200), lastPromptAt: minutesAgo(1) }));
    await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 'tok', now: NOW });
    expect(m.callTelegram).not.toHaveBeenCalled();
  });

  it("davriy eslatmadan 20 daqiqa o'tgach mijoz bossa shoshilinch (tovushli) so'rov yuboradi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastLocationAt: minutesAgo(200), lastPromptAt: minutesAgo(20) }));
    await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 'tok', now: NOW });
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    expect(m.callTelegram.mock.calls[0][2]).not.toHaveProperty('disable_notification');
  });

  it("haydovchi botni bloklagan bo'lsa chatni o'chiradi va mijozga to'g'ridan-to'g'ri bog'lanishni aytadi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastLocationAt: minutesAgo(200) }));
    m.callTelegram.mockResolvedValue({ ok: false, description: 'Forbidden: bot was blocked by the user' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reply = await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 'tok', now: NOW });
    expect(reply.ok && reply.text).toContain('свяжитесь с водителем напрямую');
    expect(m.trackingUpdate).toHaveBeenCalledWith({ where: { id: 4 }, data: { lastPromptAt: NOW, driverChatId: null } });
  });

  it("chat allaqachon o'chirilgan (bloklangan) haydovchiga umuman yozmaydi", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastLocationAt: minutesAgo(200), driverChatId: null }));
    const reply = await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 'tok', now: NOW });
    expect(m.callTelegram).not.toHaveBeenCalled();
    expect(reply.ok && reply.text).toContain('свяжитесь с водителем напрямую');
  });

  it("joylashuv hali kelmagan bo'lsa shuni aytadi, xarita yo'q", async () => {
    m.trackingFindFirst.mockResolvedValue(tracking({ lastLat: null, lastLng: null, lastLocationAt: null, lastAddress: null }));
    const reply = await buildWhereReply({ clientId: 2, trackingId: 4, botToken: 't', now: NOW });
    expect(reply.ok && reply.text).toContain('ещё не отправил местоположение');
    expect(reply.ok && reply.location).toBeNull();
  });
});

describe('runHourlyTrackingJob', () => {
  const active = (over: Record<string, unknown> = {}) => ({
    id: 4,
    driverChatId: BigInt(10),
    boundAt: minutesAgo(24 * 60),
    finishAskedAt: null,
    lastLat: 50.28,
    lastLng: 57.2,
    lastLocationAt: minutesAgo(10),
    lastPromptAt: null,
    livePeriodEndsAt: null,
    ...over,
  });

  it("14 kundan oshgan kuzatuvlarni yopadi, eski nuqtalarni tozalaydi", async () => {
    m.trackingFindMany.mockResolvedValue([]);
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    await runHourlyTrackingJob('t', NOW);
    const where = m.trackingUpdateMany.mock.calls[0][0].where;
    // faqat 14 kundan keyin avtomatik to'xtaydi; yuk statusi (YAKUNLANDI ham) kuzatuvni yopmaydi
    expect(where.createdAt).toEqual({ lt: new Date(NOW.getTime() - 14 * 24 * 3600 * 1000) });
    expect(JSON.stringify(where)).not.toContain('YAKUNLANDI');
    // yopilganda oxirgi joylashuv o'chiriladi
    expect(m.trackingUpdateMany.mock.calls[0][0].data).toEqual({
      status: 'FINISHED',
      finishedAt: NOW,
      lastLat: null,
      lastLng: null,
      lastAddress: null,
      lastLocationAt: null,
      livePeriodEndsAt: null,
    });
    expect(m.pointDeleteMany).toHaveBeenCalledWith({ where: { recordedAt: { lt: new Date(NOW.getTime() - 30 * 24 * 3600 * 1000) } } });
  });

  it("yangi signal bo'lsa soatlik nuqta yozadi va haydovchiga yozmaydi", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindMany.mockResolvedValue([active()]);
    await runHourlyTrackingJob('t', NOW);
    expect(m.pointCreate).toHaveBeenCalledWith({ data: { trackingId: 4, lat: 50.28, lng: 57.2, recordedAt: NOW } });
    expect(m.callTelegram).not.toHaveBeenCalled();
  });

  it("signal 50 daqiqadan eski bo'lsa nuqta yozmaydi (90 dan eski) va haydovchidan joylashuv so'raydi", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindMany.mockResolvedValue([active({ lastLocationAt: minutesAgo(180) })]);
    await runHourlyTrackingJob('tok', NOW);
    expect(m.pointCreate).not.toHaveBeenCalled();
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    expect(m.callTelegram.mock.calls[0][2].reply_markup.keyboard[0][0]).toMatchObject({ request_location: true });
    expect(m.callTelegram.mock.calls[0][2].disable_notification).toBe(true);
    expect(m.trackingUpdate).toHaveBeenCalledWith({ where: { id: 4 }, data: { lastPromptAt: NOW } });
  });

  it("ulanganidan 7 kun o'tgach bir marta 'yakunladingizmi?' deb so'raydi va joylashuv so'rovini shu soatga qoldiradi", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindMany.mockResolvedValue([active({ boundAt: minutesAgo(7 * 24 * 60 + 5), lastLocationAt: minutesAgo(200) })]);
    await runHourlyTrackingJob('tok', NOW);
    expect(m.callTelegram).toHaveBeenCalledTimes(1);
    const body = m.callTelegram.mock.calls[0][2];
    expect(body.chat_id).toBe(10);
    expect(body.reply_markup.inline_keyboard[0].map((b: { callback_data: string }) => b.callback_data)).toEqual(['drv:fy:4', 'drv:fn:4']);
    expect(m.trackingUpdate).toHaveBeenCalledWith({ where: { id: 4 }, data: { finishAskedAt: NOW } });
    expect(m.trackingUpdate).not.toHaveBeenCalledWith({ where: { id: 4 }, data: { lastPromptAt: NOW } });
  });

  it("allaqachon so'ralgan bo'lsa qayta so'ramaydi", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindMany.mockResolvedValue([active({ boundAt: minutesAgo(9 * 24 * 60), finishAskedAt: minutesAgo(60) })]);
    await runHourlyTrackingJob('tok', NOW);
    expect(m.callTelegram).not.toHaveBeenCalled();
  });

  it("savol yuborilmasa so'ralgan vaqt yozilmaydi (keyingi soatda qayta urinadi)", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindMany.mockResolvedValue([active({ boundAt: minutesAgo(8 * 24 * 60) })]);
    m.callTelegram.mockResolvedValue({ ok: false, description: 'Forbidden' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runHourlyTrackingJob('tok', NOW);
    expect(m.trackingUpdate).not.toHaveBeenCalledWith({ where: { id: 4 }, data: { finishAskedAt: NOW } });
  });

  it("bir kuzatuvdagi xato qolganlarni to'xtatmaydi", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    m.trackingFindMany.mockResolvedValue([active({ id: 1 }), active({ id: 2 })]);
    m.pointCreate.mockRejectedValueOnce(new Error('db'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runHourlyTrackingJob('t', NOW);
    expect(m.pointCreate).toHaveBeenCalledTimes(2);
  });
});

describe('answerDriverFinish', () => {
  it("'Ha' — kuzatuvni yopadi va oxirgi joylashuvni o'chiradi; faqat shu haydovchi uchun", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 1 });
    expect(await answerDriverFinish({ trackingId: 4, telegramUserId: 10, finished: true, now: NOW })).toEqual({ ok: true, finished: true });
    const args = m.trackingUpdateMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ id: 4, driverTelegramId: BigInt(10) });
    expect(args.data).toEqual({ status: 'FINISHED', finishedAt: NOW, lastLat: null, lastLng: null, lastAddress: null, lastLocationAt: null, livePeriodEndsAt: null });
  });

  it("boshqa haydovchi yoki allaqachon yopilgan kuzatuvga javob bera olmaydi", async () => {
    m.trackingUpdateMany.mockResolvedValue({ count: 0 });
    expect(await answerDriverFinish({ trackingId: 4, telegramUserId: 99, finished: true })).toEqual({ ok: false });
  });

  it("'Yo'q' — hech narsa o'zgarmaydi, kuzatuv davom etadi", async () => {
    m.trackingFindFirst.mockResolvedValue({ id: 4 });
    expect(await answerDriverFinish({ trackingId: 4, telegramUserId: 10, finished: false })).toEqual({ ok: true, finished: false });
    expect(m.trackingUpdateMany).not.toHaveBeenCalled();
    expect(m.trackingUpdate).not.toHaveBeenCalled();
  });

  it("'Yo'q' deb boshqa haydovchi javob bersa rad etiladi", async () => {
    m.trackingFindFirst.mockResolvedValue(null);
    expect(await answerDriverFinish({ trackingId: 4, telegramUserId: 99, finished: false })).toEqual({ ok: false });
  });
});
