import { randomBytes } from 'crypto';

// Haydovchi boti: sof funksiyalar (kod, callback/payload parse, eskirganlik, matnlar). Prisma va Telegram'ga bog'liq emas.

// 0/O va 1/I o'xshashligi uchun olib tashlangan (client-cargo-bot-link.service.ts bilan bir xil alifbo)
export const DRIVER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const DRIVER_CODE_LENGTH = 6;

/** Oxirgi signal shu daqiqadan eski bo'lsa "eskirgan" hisoblanadi va haydovchidan qayta so'raladi */
export const STALE_AFTER_MINUTES = 50;
/** Haydovchiga so'rov xabarlari orasidagi minimal masofa */
export const PROMPT_MIN_GAP_MINUTES = 55;
/** Jonli joylashuv shu daqiqa ichida tugasa haydovchiga eslatiladi */
export const LIVE_ENDING_SOON_MINUTES = 60;
/** Haydovchi ulanganidan shuncha kun o'tgach undan bir marta "yukni yakunladingizmi?" deb so'raladi */
export const FINISH_ASK_AFTER_DAYS = 7;
/** Joylashuv yangilanishlarini bazaga yozish oralig'i (Telegram har bir necha soniyada yuboradi) */
export const LOCATION_WRITE_GAP_MS = 30_000;

/** Mijoz guruhidan haydovchi kodi faqat shu soat ichida yaratilgan yuklar uchun olinadi (statusi ahamiyatsiz) */
export const RECENT_TASK_HOURS = 72;

const EMPTY_VALUE = '—';

export function recentTaskCutoff(now: Date): Date {
  return new Date(now.getTime() - RECENT_TASK_HOURS * 3600_000);
}

export function isRecentTask(createdAt: Date, now: Date): boolean {
  return createdAt.getTime() >= recentTaskCutoff(now).getTime();
}

/** Tugma matni: "INV | AVTO"; invoys ham, avto ham hali yo'q bo'lsa yuk nomi */
export function formatTaskPickLabel(item: { invoiceNumber: string | null; vehicleNumber: string | null; title: string }): string {
  if (!item.invoiceNumber?.trim() && !item.vehicleNumber?.trim()) return item.title.trim() || EMPTY_VALUE;
  return `${orDash(item.invoiceNumber)} | ${orDash(item.vehicleNumber)}`;
}

export function generateDriverCode(): string {
  const bytes = randomBytes(DRIVER_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < DRIVER_CODE_LENGTH; i++) code += DRIVER_CODE_ALPHABET[bytes[i] % DRIVER_CODE_ALPHABET.length];
  return code;
}

export function normalizeDriverCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

/** Matn kodga o'xshaydimi (6 belgi, faqat alifbodan) — oddiy gaplarni kod deb o'ylamaslik uchun */
export function isDriverCodeShape(input: string): boolean {
  const code = normalizeDriverCode(input);
  if (code.length !== DRIVER_CODE_LENGTH) return false;
  return [...code].every((ch) => DRIVER_CODE_ALPHABET.includes(ch));
}

/** "/start KOD" yoki "/start@bot KOD" dan kodni oladi; kod shaklida bo'lmasa null */
export function parseStartPayload(text: string): string | null {
  const match = /^\/start(?:@\w+)?\s+(\S+)\s*$/.exec(text.trim());
  if (!match) return null;
  return isDriverCodeShape(match[1]) ? normalizeDriverCode(match[1]) : null;
}

export type CargoTrackingCallback =
  | { kind: 'where'; trackingId: number }
  | { kind: 'driver-finish'; trackingId: number; finished: boolean }
  | { kind: 'where-all' }
  | { kind: 'issue-code'; taskId: number }
  | { kind: 'draft-code'; draftId: number }
  | { kind: 'driver-info' }
  | { kind: 'driver-docs' };

const POSITIVE_INT = /^[1-9]\d{0,9}$/;

/** callback_data: `drv:fy|fn:<kuzatuv>` haydovchining "yuk yakunlandimi?" javobi, `trk:w:<kuzatuv>` fura qayerda, `trk:f` guruhdagi barcha furalar, `trk:k:<yuk>` kod olish, `trk:d:<qoralama>` qoralama bo'yicha kod, `drv:*` haydovchi tugmalari */
export function parseCargoTrackingCallback(data: string): CargoTrackingCallback | null {
  if (data === 'drv:info') return { kind: 'driver-info' };
  if (data === 'drv:docs') return { kind: 'driver-docs' };
  if (data === 'trk:f') return { kind: 'where-all' };
  const finish = /^drv:f([yn]):(.+)$/.exec(data);
  if (finish) return POSITIVE_INT.test(finish[2]) ? { kind: 'driver-finish', trackingId: Number(finish[2]), finished: finish[1] === 'y' } : null;
  const match = /^trk:([wkd]):(.+)$/.exec(data);
  if (!match || !POSITIVE_INT.test(match[2])) return null;
  const id = Number(match[2]);
  if (match[1] === 'w') return { kind: 'where', trackingId: id };
  if (match[1] === 'k') return { kind: 'issue-code', taskId: id };
  return { kind: 'draft-code', draftId: id };
}

export function formatAge(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 1) return 'только что';
  if (total < 60) return `${total} мин назад`;
  if (total < 60 * 24) {
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0 ? `${hours} ч назад` : `${hours} ч ${rest} мин назад`;
  }
  return `${Math.floor(total / (60 * 24))} дн. назад`;
}

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60_000;
}

export function shouldPersistLocation(lastWrittenAt: Date | null, now: Date): boolean {
  if (!lastWrittenAt) return true;
  return now.getTime() - lastWrittenAt.getTime() >= LOCATION_WRITE_GAP_MS;
}

/** Soatlik ish: haydovchidan joylashuvni qayta so'rash kerakmi */
export function needsDriverPrompt(input: {
  lastLocationAt: Date | null;
  lastPromptAt: Date | null;
  livePeriodEndsAt: Date | null;
  now: Date;
}): boolean {
  const { lastLocationAt, lastPromptAt, livePeriodEndsAt, now } = input;
  if (lastPromptAt && minutesBetween(lastPromptAt, now) < PROMPT_MIN_GAP_MINUTES) return false;
  const stale = !lastLocationAt || minutesBetween(lastLocationAt, now) > STALE_AFTER_MINUTES;
  const liveEndingSoon = !!livePeriodEndsAt && minutesBetween(now, livePeriodEndsAt) < LIVE_ENDING_SOON_MINUTES;
  return stale || liveEndingSoon;
}

/** Soatlik ish: haydovchidan "yukni yakunladingizmi?" deb so'rash vaqti keldimi (ulanganidan 7 kun o'tgan, hali so'ralmagan) */
export function needsFinishQuestion(input: { boundAt: Date | null; finishAskedAt: Date | null; now: Date }): boolean {
  if (!input.boundAt || input.finishAskedAt) return false;
  return input.now.getTime() - input.boundAt.getTime() >= FINISH_ASK_AFTER_DAYS * 24 * 3600_000;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function mapLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_VALUE;
}

/** Guruhga "fura qayerda?" javobi: faqat rus tilida (oddiy matn, parse_mode yo'q) */
export function formatWhereMessage(input: {
  vehicleNumber: string | null;
  invoiceNumber: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  lastLocationAt: Date | null;
  now: Date;
}): string {
  const head = `🚚 ${orDash(input.vehicleNumber)}${input.invoiceNumber?.trim() ? ` · ${input.invoiceNumber.trim()}` : ''}`;
  if (input.lat === null || input.lng === null || !input.lastLocationAt) {
    return `${head}\nВодитель ещё не отправил местоположение.`;
  }
  const age = minutesBetween(input.lastLocationAt, input.now);
  const lines = [head, `📍 ${input.address?.trim() || formatCoordinates(input.lat, input.lng)}`];
  if (input.address?.trim()) lines.push(`Координаты: ${formatCoordinates(input.lat, input.lng)}`);
  lines.push(`Последнее обновление: ${formatAge(age)}`);
  if (age > STALE_AFTER_MINUTES) {
    lines.push('⚠️ Данные устарели. Местоположение у водителя запрошено повторно.');
  }
  return lines.join('\n');
}

/** Haydovchi kodni kiritgandan keyin ko'radigan yuk kartasi */
export function formatDriverCard(input: {
  vehicleNumber: string | null;
  invoiceNumber: string | null;
  customsAddress: string | null;
  destination: string | null;
}): string {
  return [
    `🚚 Avto raqami: ${orDash(input.vehicleNumber)}`,
    `Invoys: ${orDash(input.invoiceNumber)}`,
    `🛃 Bojxona: ${orDash(input.customsAddress)}`,
    `Yetkazish manzili: ${orDash(input.destination)}`,
  ].join('\n');
}

export function normalizeVehicleNumber(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export function normalizeInvoiceNumber(value: string): string {
  return value.trim().toUpperCase();
}

export interface TaskMatchCandidate {
  taskId: number;
  invoiceNumber: string | null;
  vehicleNumber: string | null;
}

/** Qoralamadagi invoys va avto raqami aynan bitta yukka mos kelsa uning ID'si, aks holda null */
export function findSingleMatchingTask(
  header: { invoiceNumber: string | null | undefined; vehicleNumber: string | null | undefined },
  candidates: TaskMatchCandidate[]
): number | null {
  const invoice = header.invoiceNumber?.trim();
  const vehicle = header.vehicleNumber?.trim();
  if (!invoice || !vehicle) return null;
  const wantedInvoice = normalizeInvoiceNumber(invoice);
  const wantedVehicle = normalizeVehicleNumber(vehicle);
  const matches = candidates.filter(
    (c) =>
      !!c.invoiceNumber &&
      !!c.vehicleNumber &&
      normalizeInvoiceNumber(c.invoiceNumber) === wantedInvoice &&
      normalizeVehicleNumber(c.vehicleNumber) === wantedVehicle
  );
  return matches.length === 1 ? matches[0].taskId : null;
}

export interface AttemptLimiter {
  isBlocked(key: string): boolean;
  recordFailure(key: string): void;
  reset(key: string): void;
}

/** Xotirada saqlanadigan urinish cheklagich: faqat MUVAFFAQIYATSIZ urinishlar sanaladi (qayta ishga tushganda tozalanadi) */
export function createAttemptLimiter(options: { limit: number; windowMs: number; now?: () => number }): AttemptLimiter {
  const now = options.now ?? Date.now;
  const entries = new Map<string, { count: number; resetAt: number }>();
  return {
    isBlocked(key) {
      const entry = entries.get(key);
      if (!entry) return false;
      if (entry.resetAt <= now()) {
        entries.delete(key);
        return false;
      }
      return entry.count >= options.limit;
    },
    recordFailure(key) {
      const entry = entries.get(key);
      if (!entry || entry.resetAt <= now()) {
        entries.set(key, { count: 1, resetAt: now() + options.windowMs });
        return;
      }
      entry.count += 1;
    },
    reset(key) {
      entries.delete(key);
    },
  };
}
