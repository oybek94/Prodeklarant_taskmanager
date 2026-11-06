import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { callTelegram } from './telegram-bot-api';
import { readVehicleNumber, type ArchiveTaskItem } from './client-cargo-archive.service';
import {
  STALE_AFTER_MINUTES,
  findSingleMatchingTask,
  formatDriverCard,
  formatDriverConnectedMessage,
  formatWhereMessage,
  generateDriverCode,
  isDriverUnreachableError,
  isRecentTask,
  minutesBetween,
  needsDriverPrompt,
  needsUrgentDriverRequest,
  needsFinishQuestion,
  normalizeDriverCode,
  recentTaskCutoff,
  shouldPersistLocation,
  type TaskMatchCandidate,
} from './cargo-tracking';
import { reverseGeocode } from './geocode';

// Haydovchi boti: Prisma + Telegram bilan ishlaydigan qism. Sof mantiq: cargo-tracking.ts

/** Kod berilgandan 14 kun o'tgach kuzatuv avtomatik to'xtaydi (soatlik ish). Qo'lda to'xtatish tugmasi yo'q. */
const TRACKING_LIFETIME_DAYS = 14;
const POINT_RETENTION_DAYS = 30;
/** Soatlik nuqta uchun oxirgi signal shu daqiqadan eski bo'lmasligi kerak */
const SNAPSHOT_MAX_AGE_MINUTES = 90;
const MAX_LIVE_PERIOD_SECONDS = 30 * 24 * 3600;
const CODE_RETRIES = 5;
const RECENT_TASKS_LIMIT = 20;
const DAY_MS = 24 * 3600 * 1000;

const OPEN_STATUSES = ['WAITING', 'ACTIVE'] as const;

type TrackingCreatedVia = 'STAFF' | 'CLIENT_GROUP';

// ---------- Yuk ma'lumoti (invoys / shartnoma) ----------

function readInfoString(additionalInfo: unknown, key: string): string | null {
  if (typeof additionalInfo !== 'object' || additionalInfo === null || Array.isArray(additionalInfo)) return null;
  const value = (additionalInfo as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export interface CargoInfo {
  invoiceNumber: string | null;
  vehicleNumber: string | null;
  customsAddress: string | null;
  destination: string | null;
}

async function loadCargoInfo(taskId: number): Promise<CargoInfo> {
  const invoice = await prisma.invoice.findUnique({
    where: { taskId },
    select: { invoiceNumber: true, additionalInfo: true, contract: { select: { customsAddress: true } } },
  });
  const contractCustoms = invoice?.contract?.customsAddress?.trim() || null;
  return {
    invoiceNumber: invoice?.invoiceNumber?.trim() || null,
    vehicleNumber: readVehicleNumber(invoice?.additionalInfo),
    customsAddress: readInfoString(invoice?.additionalInfo, 'customsAddress') ?? contractCustoms,
    destination: readInfoString(invoice?.additionalInfo, 'destination'),
  };
}

// ---------- Kod berish (xodim yoki mijoz guruhi) ----------

export type IssueCodeResult = { ok: true; code: string; reused: boolean } | { ok: false; reason: 'TASK_NOT_FOUND' | 'TASK_TOO_OLD' };

/**
 * Yukka haydovchi kodi beradi. `regenerate: true` (xodim "Yangi kod") kodni almashtiradi va haydovchi ulanishini
 * tozalaydi; false (mijoz guruhi) faol kod bo'lsa uni o'zgartirmay qaytaradi — guruh a'zosi tasodifan kuzatuvni buzmasligi uchun.
 * `clientId` berilsa yuk shu mijozga tegishli bo'lishi shart. Mijoz guruhi (CLIENT_GROUP) faqat oxirgi 72 soatda
 * yaratilgan yuklar uchun kod oladi; xodim (STAFF) uchun yosh cheklovi yo'q. Yuk statusi hech qachon to'sqinlik qilmaydi
 * (hujjatlar tugagach ham fura yo'lda bo'ladi).
 */
export async function issueDriverCode(input: {
  taskId: number;
  clientId?: number;
  createdById?: number | null;
  createdVia: TrackingCreatedVia;
  regenerate: boolean;
}): Promise<IssueCodeResult> {
  const task = await prisma.task.findFirst({
    where: { id: input.taskId, ...(input.clientId !== undefined ? { clientId: input.clientId } : {}) },
    select: { id: true, clientId: true, createdAt: true },
  });
  if (!task) return { ok: false, reason: 'TASK_NOT_FOUND' };
  if (input.createdVia === 'CLIENT_GROUP' && !isRecentTask(task.createdAt, new Date())) return { ok: false, reason: 'TASK_TOO_OLD' };

  if (!input.regenerate) {
    const existing = await prisma.cargoTracking.findUnique({ where: { taskId: task.id }, select: { code: true, status: true } });
    if (existing && existing.status !== 'FINISHED') return { ok: true, code: existing.code, reused: true };
  }

  for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
    const code = generateDriverCode();
    try {
      const tracking = await prisma.cargoTracking.upsert({
        where: { taskId: task.id },
        create: { taskId: task.id, clientId: task.clientId, code, createdVia: input.createdVia, createdById: input.createdById ?? null },
        update: {
          code,
          status: 'WAITING',
          createdVia: input.createdVia,
          createdById: input.createdById ?? null,
          createdAt: new Date(),
          driverTelegramId: null,
          driverChatId: null,
          boundAt: null,
          lastLat: null,
          lastLng: null,
          lastLocationAt: null,
          livePeriodEndsAt: null,
          lastPromptAt: null,
          finishAskedAt: null,
          lastAddress: null,
          finishedAt: null,
        },
        select: { id: true },
      });
      await prisma.cargoTrackingPoint.deleteMany({ where: { trackingId: tracking.id } });
      return { ok: true, code, reused: false };
    } catch (e) {
      // Kod to'qnashuvi (@unique) — yangi kod bilan qayta urinamiz
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  throw new Error('Haydovchi kodini yaratib bo\'lmadi (to\'qnashuvlar)');
}

export interface DriverCodeStatus {
  code: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  driverBound: boolean;
  boundAt: Date | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: Date | null;
}

export async function getDriverCodeStatus(taskId: number): Promise<DriverCodeStatus | null> {
  const tracking = await prisma.cargoTracking.findUnique({
    where: { taskId },
    select: { code: true, status: true, driverTelegramId: true, boundAt: true, lastLat: true, lastLng: true, lastLocationAt: true },
  });
  if (!tracking) return null;
  return {
    code: tracking.code,
    status: tracking.status,
    driverBound: tracking.driverTelegramId !== null,
    boundAt: tracking.boundAt,
    lastLat: tracking.lastLat,
    lastLng: tracking.lastLng,
    lastLocationAt: tracking.lastLocationAt,
  };
}

export async function revokeDriverCode(taskId: number): Promise<boolean> {
  const result = await prisma.cargoTracking.deleteMany({ where: { taskId } });
  return result.count > 0;
}

// ---------- Mijoz guruhi: kod olish uchun yuklar ro'yxati ----------

export interface RecentTaskItem extends TaskMatchCandidate {
  title: string;
  hasCode: boolean;
}

/** Mijozning oxirgi 72 soatda yaratilgan yuklari (statusi ahamiyatsiz), yangisi birinchi */
export async function listClientRecentTasks(clientId: number, limit = RECENT_TASKS_LIMIT): Promise<RecentTaskItem[]> {
  const tasks = await prisma.task.findMany({
    where: { clientId, createdAt: { gte: recentTaskCutoff(new Date()) } },
    orderBy: { id: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      invoice: { select: { invoiceNumber: true, additionalInfo: true } },
      cargoTracking: { select: { status: true } },
    },
  });
  return tasks.map((t) => ({
    taskId: t.id,
    title: t.title,
    invoiceNumber: t.invoice?.invoiceNumber ?? null,
    vehicleNumber: readVehicleNumber(t.invoice?.additionalInfo),
    hasCode: !!t.cargoTracking && t.cargoTracking.status !== 'FINISHED',
  }));
}

/** Qoralamadagi invoys va avto raqami aynan bitta yaqin (72 soat) yukka mos kelsa uning ID'si */
export async function matchDraftToRecentTask(clientId: number, header: { invoiceNumber?: string; vehicleNumber?: string }): Promise<number | null> {
  const tasks = await listClientRecentTasks(clientId, 50);
  return findSingleMatchingTask({ invoiceNumber: header.invoiceNumber, vehicleNumber: header.vehicleNumber }, tasks);
}

// ---------- Haydovchi: kod bilan ulanish ----------

export type BindResult =
  | { ok: true; trackingId: number; taskId: number; alreadyBound: boolean }
  | { ok: false; reason: 'INVALID' | 'TAKEN' };

export async function bindDriverByCode(input: { code: string; telegramUserId: number; chatId: number }): Promise<BindResult> {
  const code = normalizeDriverCode(input.code);
  const expiresBefore = new Date(Date.now() - TRACKING_LIFETIME_DAYS * DAY_MS);
  const tracking = await prisma.cargoTracking.findFirst({
    where: { code, status: { in: [...OPEN_STATUSES] }, createdAt: { gt: expiresBefore } },
    select: { id: true, taskId: true, driverTelegramId: true },
  });
  if (!tracking) return { ok: false, reason: 'INVALID' };

  const telegramId = BigInt(input.telegramUserId);
  const chatId = BigInt(input.chatId);
  if (tracking.driverTelegramId === null) {
    // Poyga: ikki kishi bir vaqtda kiritsa faqat birinchisi yozadi
    const claimed = await prisma.cargoTracking.updateMany({
      where: { id: tracking.id, driverTelegramId: null },
      data: { driverTelegramId: telegramId, driverChatId: chatId, boundAt: new Date() },
    });
    if (claimed.count === 1) return { ok: true, trackingId: tracking.id, taskId: tracking.taskId, alreadyBound: false };
    const winner = await prisma.cargoTracking.findUnique({ where: { id: tracking.id }, select: { driverTelegramId: true } });
    if (winner?.driverTelegramId !== telegramId) return { ok: false, reason: 'TAKEN' };
    return { ok: true, trackingId: tracking.id, taskId: tracking.taskId, alreadyBound: true };
  }
  if (tracking.driverTelegramId !== telegramId) return { ok: false, reason: 'TAKEN' };
  await prisma.cargoTracking.update({ where: { id: tracking.id }, data: { driverChatId: chatId } });
  return { ok: true, trackingId: tracking.id, taskId: tracking.taskId, alreadyBound: true };
}

const driverTrackingSelect = {
  id: true,
  taskId: true,
  clientId: true,
  status: true,
  driverChatId: true,
  lastLocationAt: true,
  livePeriodEndsAt: true,
} satisfies Prisma.CargoTrackingSelect;

export type DriverTracking = Prisma.CargoTrackingGetPayload<{ select: typeof driverTrackingSelect }>;

/** Haydovchining hozirgi (tugamagan) yuki; bir nechta bo'lsa eng oxirgi ulangani */
export async function getDriverTracking(telegramUserId: number): Promise<DriverTracking | null> {
  return prisma.cargoTracking.findFirst({
    where: { driverTelegramId: BigInt(telegramUserId), status: { in: [...OPEN_STATUSES] } },
    orderBy: { boundAt: 'desc' },
    select: driverTrackingSelect,
  });
}

export async function getDriverCardText(taskId: number): Promise<string> {
  return formatDriverCard(await loadCargoInfo(taskId));
}

/** Haydovchi hujjatlari uchun yuk (ArchiveTaskItem) — loadTaskFiles ga beriladi */
export async function getDriverArchiveItem(taskId: number): Promise<ArchiveTaskItem> {
  const info = await loadCargoInfo(taskId);
  return { taskId, invoiceNumber: info.invoiceNumber, vehicleNumber: info.vehicleNumber };
}

// ---------- Joylashuv ----------

export interface LocationUpdate {
  telegramUserId: number;
  lat: number;
  lng: number;
  /** Telegram xabarining asl yuborilgan vaqti (unix sekund) — jonli muddat shundan hisoblanadi */
  messageDate: number;
  livePeriod?: number;
  /** Haydovchi shaxsiy chati: bot bloklanib keyin qayta ochilgan bo'lsa, ogohlantirishlar tiklanishi uchun saqlanadi */
  chatId?: number;
  now?: Date;
}

export type LocationResult = { ok: false } | { ok: true; trackingId: number; firstFix: boolean; persisted: boolean };

export async function recordDriverLocation(update: LocationUpdate): Promise<LocationResult> {
  const now = update.now ?? new Date();
  const tracking = await getDriverTracking(update.telegramUserId);
  if (!tracking) return { ok: false };
  const firstFix = tracking.lastLocationAt === null;
  if (!firstFix && !shouldPersistLocation(tracking.lastLocationAt, now)) return { ok: true, trackingId: tracking.id, firstFix: false, persisted: false };

  const livePeriodEndsAt =
    update.livePeriod && update.livePeriod > 0
      ? new Date(update.messageDate * 1000 + Math.min(update.livePeriod, MAX_LIVE_PERIOD_SECONDS) * 1000)
      : undefined;
  const data = {
    status: 'ACTIVE' as const,
    lastLat: update.lat,
    lastLng: update.lng,
    lastLocationAt: now,
    lastAddress: null,
    ...(livePeriodEndsAt ? { livePeriodEndsAt } : {}),
    ...(update.chatId !== undefined ? { driverChatId: BigInt(update.chatId) } : {}),
  };
  if (firstFix) {
    // Birinchi signalni faqat bitta yangilanish "yutadi" (boshlang'ich va tahrirlangan xabar bir vaqtda kelsa guruhga ikki marta yozilmasin)
    const won = await prisma.cargoTracking.updateMany({ where: { id: tracking.id, lastLocationAt: null }, data });
    if (won.count === 0) return { ok: true, trackingId: tracking.id, firstFix: false, persisted: false };
    return { ok: true, trackingId: tracking.id, firstFix: true, persisted: true };
  }
  await prisma.cargoTracking.update({ where: { id: tracking.id }, data });
  return { ok: true, trackingId: tracking.id, firstFix: false, persisted: true };
}

/** Haydovchi birinchi joylashuvini yuborganda mijoz guruhiga "haydovchi botga ulandi" deb yozadi. Xato bo'lsa kuzatuvga ta'sir qilmaydi. */
export async function announceDriverConnected(botToken: string, trackingId: number): Promise<void> {
  try {
    const tracking = await prisma.cargoTracking.findUnique({
      where: { id: trackingId },
      select: { taskId: true, client: { select: { botGroupChatId: true } } },
    });
    const groupChatId = tracking?.client.botGroupChatId;
    if (!tracking || !groupChatId) return;
    const info = await loadCargoInfo(tracking.taskId);
    const sent = await callTelegram<unknown>(botToken, 'sendMessage', {
      chat_id: groupChatId,
      text: formatDriverConnectedMessage({ vehicleNumber: info.vehicleNumber, invoiceNumber: info.invoiceNumber }),
      reply_markup: { inline_keyboard: [[{ text: '📍 Где фура?', callback_data: 'trk:f' }]] },
    });
    if (!sent.ok) console.error(`[CargoTracking] Guruhga xabar yuborilmadi (kuzatuv ${trackingId}):`, sent.description);
  } catch (e) {
    console.error(`[CargoTracking] Guruhga xabar xatosi (kuzatuv ${trackingId}):`, e instanceof Error ? e.message : e);
  }
}

// ---------- Guruh: "fura qayerda?" ----------

export interface ActiveFura {
  trackingId: number;
  vehicleNumber: string | null;
  invoiceNumber: string | null;
}

export async function listActiveFuras(clientId: number): Promise<ActiveFura[]> {
  const rows = await prisma.cargoTracking.findMany({
    where: { clientId, status: { in: [...OPEN_STATUSES] }, driverTelegramId: { not: null } },
    orderBy: { boundAt: 'desc' },
    select: { id: true, taskId: true },
  });
  const furas: ActiveFura[] = [];
  for (const row of rows) {
    const info = await loadCargoInfo(row.taskId);
    furas.push({ trackingId: row.id, vehicleNumber: info.vehicleNumber, invoiceNumber: info.invoiceNumber });
  }
  return furas;
}

export type WhereReply =
  | { ok: false }
  | { ok: true; text: string; location: { lat: number; lng: number } | null };

/** Guruhga javob matni. Kuzatuv shu mijozga tegishli bo'lishi shart (boshqa guruh ko'ra olmaydi). Eskirgan bo'lsa haydovchidan qayta so'raydi. */
export async function buildWhereReply(input: { clientId: number; trackingId: number; botToken: string; now?: Date }): Promise<WhereReply> {
  const now = input.now ?? new Date();
  const tracking = await prisma.cargoTracking.findFirst({
    where: { id: input.trackingId, clientId: input.clientId, status: { in: [...OPEN_STATUSES] }, driverTelegramId: { not: null } },
    select: { id: true, taskId: true, lastLat: true, lastLng: true, lastLocationAt: true, lastAddress: true, lastPromptAt: true, driverChatId: true },
  });
  if (!tracking) return { ok: false };

  const info = await loadCargoInfo(tracking.taskId);
  let address = tracking.lastAddress;
  const hasLocation = tracking.lastLat !== null && tracking.lastLng !== null && tracking.lastLocationAt !== null;
  if (hasLocation && !address) {
    address = await reverseGeocode(tracking.lastLat as number, tracking.lastLng as number);
    if (address) await prisma.cargoTracking.update({ where: { id: tracking.id }, data: { lastAddress: address } });
  }

  const stale = !hasLocation || minutesBetween(tracking.lastLocationAt as Date, now) > STALE_AFTER_MINUTES;
  // Mijoz o'zi so'radi: signal eskirgan (joylashuv o'chiq) bo'lsa haydovchiga zudlik bilan yuborishni talab qiladi.
  // Takroriy bosishlarda haydovchi bezovta qilinmaydi (15 daqiqada bir marta); bot bloklangan bo'lsa mijozga shu aytiladi.
  let driverRequested = true;
  if (stale) {
    if (tracking.driverChatId === null) driverRequested = false;
    else if (needsUrgentDriverRequest({ lastPromptAt: tracking.lastPromptAt, now })) {
      driverRequested = await promptDriver(input.botToken, { id: tracking.id, driverChatId: tracking.driverChatId }, now, 'urgent');
    }
  }

  const text = formatWhereMessage({
    vehicleNumber: info.vehicleNumber,
    invoiceNumber: info.invoiceNumber,
    address,
    lat: tracking.lastLat,
    lng: tracking.lastLng,
    lastLocationAt: tracking.lastLocationAt,
    now,
    driverRequested,
  });
  return { ok: true, text, location: hasLocation ? { lat: tracking.lastLat as number, lng: tracking.lastLng as number } : null };
}

// ---------- Kuzatuvni yopish ----------

/** Yopilgan kuzatuv: holat FINISHED va oxirgi joylashuv bazadan o'chiriladi (maxfiylik); soatlik nuqtalar POINT_RETENTION_DAYS gacha qoladi */
function closedTrackingData(now: Date) {
  return { status: 'FINISHED' as const, finishedAt: now, lastLat: null, lastLng: null, lastAddress: null, lastLocationAt: null, livePeriodEndsAt: null };
}

export type FinishAnswerResult = { ok: false } | { ok: true; finished: boolean };

/** Haydovchining "yukni yakunladingizmi?" javobi: Ha — kuzatuv yopiladi, Yo'q — davom etadi. Faqat shu kuzatuvga ulangan haydovchi javob bera oladi. */
export async function answerDriverFinish(input: { trackingId: number; telegramUserId: number; finished: boolean; now?: Date }): Promise<FinishAnswerResult> {
  const where = { id: input.trackingId, driverTelegramId: BigInt(input.telegramUserId), status: { in: [...OPEN_STATUSES] } };
  if (!input.finished) {
    const open = await prisma.cargoTracking.findFirst({ where, select: { id: true } });
    return open ? { ok: true, finished: false } : { ok: false };
  }
  const result = await prisma.cargoTracking.updateMany({ where, data: closedTrackingData(input.now ?? new Date()) });
  return result.count === 1 ? { ok: true, finished: true } : { ok: false };
}

// ---------- Haydovchiga so'rov va soatlik ish ----------

const LOCATION_BUTTON = { keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]], resize_keyboard: true, one_time_keyboard: true };

const PROMPT_PERIODIC =
  "⚠️ Joylashuvingiz o'chiq yoki yuborilmayapti. Iltimos, telefoningizda joylashuvni (GPS) yoqing va pastdagi tugma bilan yuboring.\nDoimiy kuzatish uchun: 📎 → Joylashuv → «Jonli joylashuvni ulashish» → «Doimiy».";
const PROMPT_URGENT =
  "🚨 Mijoz fura qayerdaligini so'rayapti! Zudlik bilan joylashuvingizni yuboring: pastdagi tugmani bosing.\nJoylashuv o'chiq bo'lsa, avval telefoningizda uni yoqing.";

/**
 * Haydovchiga joylashuv so'rovi. Davriy eslatma tovushsiz (disable_notification), shoshilinch (mijoz so'ragan) — tovushli.
 * Haydovchi botni bloklagan bo'lsa chat saqlanmaydi (driverChatId = null) — keyin unga urinmaymiz, u joylashuv yuborganda tiklanadi.
 * Yuborilgan bo'lsa true.
 */
async function promptDriver(botToken: string, tracking: { id: number; driverChatId: bigint }, now: Date, kind: 'periodic' | 'urgent'): Promise<boolean> {
  const sent = await callTelegram<unknown>(botToken, 'sendMessage', {
    chat_id: Number(tracking.driverChatId),
    text: kind === 'urgent' ? PROMPT_URGENT : PROMPT_PERIODIC,
    reply_markup: LOCATION_BUTTON,
    ...(kind === 'periodic' ? { disable_notification: true } : {}),
  });
  if (!sent.ok) console.error(`[CargoTracking] Haydovchiga so'rov yuborilmadi (kuzatuv ${tracking.id}):`, sent.description);
  const unreachable = !sent.ok && isDriverUnreachableError(sent.description);
  await prisma.cargoTracking.update({ where: { id: tracking.id }, data: { lastPromptAt: now, ...(unreachable ? { driverChatId: null } : {}) } });
  return sent.ok;
}

const FINISH_QUESTION =
  "Yukni yakunladingizmi? (Yuk manzilga yetib borib, topshirildimi?)\n\n«Ha» desangiz joylashuvni kuzatish to'xtaydi, «Yo'q» desangiz davom etadi.";

/** Haydovchidan bir marta "yukni yakunladingizmi?" deb so'raydi; yuborilgandagina so'ralgan vaqt yoziladi (xato bo'lsa keyingi soatda qayta urinadi) */
async function askDriverFinished(botToken: string, tracking: { id: number; driverChatId: bigint }, now: Date): Promise<boolean> {
  const sent = await callTelegram<unknown>(botToken, 'sendMessage', {
    chat_id: Number(tracking.driverChatId),
    text: FINISH_QUESTION,
    reply_markup: {
      inline_keyboard: [[{ text: '✅ Ha, yakunladim', callback_data: `drv:fy:${tracking.id}` }, { text: "❌ Yo'q, davom etyapti", callback_data: `drv:fn:${tracking.id}` }]],
    },
  });
  if (!sent.ok) {
    console.error(`[CargoTracking] Yakunlash savoli yuborilmadi (kuzatuv ${tracking.id}):`, sent.description);
    return false;
  }
  await prisma.cargoTracking.update({ where: { id: tracking.id }, data: { finishAskedAt: now } });
  return true;
}

/**
 * Soatlik ish: 14 kundan oshgan kuzatuvlarni yopadi (yuk statusiga qaramasdan), har bir faol kuzatuv uchun soatlik nuqta yozadi,
 * eskirgan signalda haydovchidan joylashuv so'raydi va eski nuqtalarni tozalaydi.
 */
export async function runHourlyTrackingJob(botToken: string, now: Date = new Date()): Promise<void> {
  await prisma.cargoTracking.updateMany({
    where: { status: { in: [...OPEN_STATUSES] }, createdAt: { lt: new Date(now.getTime() - TRACKING_LIFETIME_DAYS * DAY_MS) } },
    data: closedTrackingData(now),
  });

  const active = await prisma.cargoTracking.findMany({
    where: { status: { in: [...OPEN_STATUSES] }, driverTelegramId: { not: null }, driverChatId: { not: null } },
    select: { id: true, driverChatId: true, boundAt: true, finishAskedAt: true, lastLat: true, lastLng: true, lastLocationAt: true, lastPromptAt: true, livePeriodEndsAt: true },
  });
  for (const tracking of active) {
    try {
      if (tracking.lastLat !== null && tracking.lastLng !== null && tracking.lastLocationAt && minutesBetween(tracking.lastLocationAt, now) <= SNAPSHOT_MAX_AGE_MINUTES) {
        await prisma.cargoTrackingPoint.create({ data: { trackingId: tracking.id, lat: tracking.lastLat, lng: tracking.lastLng, recordedAt: now } });
      }
      // Ulanganidan 7 kun o'tgach bir marta so'raladi; shu soatda savol yuborilsa joylashuv so'rovi qoldiriladi
      if (tracking.driverChatId !== null && needsFinishQuestion({ boundAt: tracking.boundAt, finishAskedAt: tracking.finishAskedAt, now })) {
        if (await askDriverFinished(botToken, { id: tracking.id, driverChatId: tracking.driverChatId }, now)) continue;
      }
      if (tracking.driverChatId !== null && needsDriverPrompt({ lastLocationAt: tracking.lastLocationAt, lastPromptAt: tracking.lastPromptAt, boundAt: tracking.boundAt, now })) {
        await promptDriver(botToken, { id: tracking.id, driverChatId: tracking.driverChatId }, now, 'periodic');
      }
    } catch (e) {
      console.error(`[CargoTracking] Soatlik ish xatosi (kuzatuv ${tracking.id}):`, e instanceof Error ? e.message : e);
    }
  }

  await prisma.cargoTrackingPoint.deleteMany({ where: { recordedAt: { lt: new Date(now.getTime() - POINT_RETENTION_DAYS * DAY_MS) } } });
}
