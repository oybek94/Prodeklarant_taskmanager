import { describe, it, expect } from 'vitest';
import {
  DRIVER_CODE_ALPHABET,
  DRIVER_CODE_LENGTH,
  DRIVER_DOCUMENT_TYPES,
  createAttemptLimiter,
  findSingleMatchingTask,
  formatAge,
  formatDriverCard,
  formatTaskPickLabel,
  formatWhereMessage,
  generateDriverCode,
  isDriverCodeShape,
  isRecentTask,
  needsFinishQuestion,
  needsDriverPrompt,
  normalizeDriverCode,
  normalizeInvoiceNumber,
  normalizeVehicleNumber,
  parseCargoTrackingCallback,
  parseStartPayload,
  recentTaskCutoff,
  shouldPersistLocation,
} from '../services/cargo-tracking';

const NOW = new Date('2026-11-02T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe('driver code', () => {
  it("6 belgi, faqat ikki ma'noli bo'lmagan alifbodan", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateDriverCode();
      expect(code).toHaveLength(DRIVER_CODE_LENGTH);
      for (const ch of code) expect(DRIVER_CODE_ALPHABET).toContain(ch);
    }
    expect(DRIVER_CODE_ALPHABET).not.toMatch(/[01OI]/);
  });

  it("bo'sh joy, chiziq va kichik harfni normallashtiradi", () => {
    expect(normalizeDriverCode(' ab2-c3d ')).toBe('AB2C3D');
  });

  it("faqat 6 belgili alifbo matnini kod deb hisoblaydi", () => {
    expect(isDriverCodeShape('AB2C3D')).toBe(true);
    expect(isDriverCodeShape('ab2 c3d')).toBe(true);
    expect(isDriverCodeShape('Salom')).toBe(false);
    expect(isDriverCodeShape('AB2C3D4')).toBe(false);
    expect(isDriverCodeShape('AB2C30')).toBe(false); // 0 alifboda yo'q
    expect(isDriverCodeShape('/start')).toBe(false);
  });
});

describe('parseStartPayload', () => {
  it('/start KOD dan kodni oladi', () => {
    expect(parseStartPayload('/start AB2C3D')).toBe('AB2C3D');
    expect(parseStartPayload('/start@pd_client_bot ab2c3d')).toBe('AB2C3D');
  });
  it("payload yo'q yoki kod shaklida bo'lmasa null", () => {
    expect(parseStartPayload('/start')).toBeNull();
    expect(parseStartPayload('/start hello')).toBeNull();
  });
});

describe('parseCargoTrackingCallback', () => {
  it('guruhdagi "fura qayerda" tugmasi', () => {
    expect(parseCargoTrackingCallback('trk:w:12')).toEqual({ kind: 'where', trackingId: 12 });
  });
  it('mijoz yuk tanlab kod oladi', () => {
    expect(parseCargoTrackingCallback('trk:k:34')).toEqual({ kind: 'issue-code', taskId: 34 });
  });
  it('guruhdagi barcha furalar va qoralama bo\'yicha kod', () => {
    expect(parseCargoTrackingCallback('trk:f')).toEqual({ kind: 'where-all' });
    expect(parseCargoTrackingCallback('trk:d:7')).toEqual({ kind: 'draft-code', draftId: 7 });
  });
  it('haydovchining "yuk yakunlandimi?" javobi', () => {
    expect(parseCargoTrackingCallback('drv:fy:12')).toEqual({ kind: 'driver-finish', trackingId: 12, finished: true });
    expect(parseCargoTrackingCallback('drv:fn:12')).toEqual({ kind: 'driver-finish', trackingId: 12, finished: false });
    expect(parseCargoTrackingCallback('drv:fy:abc')).toBeNull();
    expect(parseCargoTrackingCallback('drv:fx:1')).toBeNull();
  });
  it('haydovchi tugmalari', () => {
    expect(parseCargoTrackingCallback('drv:info')).toEqual({ kind: 'driver-info' });
    expect(parseCargoTrackingCallback('drv:docs')).toEqual({ kind: 'driver-docs' });
  });
  it("begona yoki buzuq ma'lumotni rad etadi", () => {
    expect(parseCargoTrackingCallback('trk:w:abc')).toBeNull();
    expect(parseCargoTrackingCallback('trk:w:-1')).toBeNull();
    expect(parseCargoTrackingCallback('arx:p:1')).toBeNull();
    expect(parseCargoTrackingCallback('')).toBeNull();
  });
});

describe('hujjat whitelist', () => {
  it("OTHER yuborilmaydi", () => {
    expect(DRIVER_DOCUMENT_TYPES).toEqual(expect.arrayContaining(['ST', 'CMR', 'TIR', 'FITO', 'INVOICE']));
    expect(DRIVER_DOCUMENT_TYPES).not.toContain('OTHER');
  });
});

describe('formatAge', () => {
  it('daqiqa, soat va kunni ifodalaydi', () => {
    expect(formatAge(0)).toBe('hozirgina');
    expect(formatAge(12)).toBe('12 daq oldin');
    expect(formatAge(60)).toBe('1 soat oldin');
    expect(formatAge(185)).toBe('3 soat 5 daq oldin');
    expect(formatAge(60 * 49)).toBe('2 kun oldin');
  });
});

describe('shouldPersistLocation', () => {
  it("30 soniyadan tez yozuvni o'tkazib yuboradi", () => {
    expect(shouldPersistLocation(null, NOW)).toBe(true);
    expect(shouldPersistLocation(new Date(NOW.getTime() - 10_000), NOW)).toBe(false);
    expect(shouldPersistLocation(new Date(NOW.getTime() - 31_000), NOW)).toBe(true);
  });
});

describe('needsDriverPrompt', () => {
  const base = { lastLocationAt: minutesAgo(10), lastPromptAt: null, livePeriodEndsAt: null, now: NOW };

  it("signal yangi bo'lsa so'ramaydi", () => {
    expect(needsDriverPrompt(base)).toBe(false);
  });
  it("signal 50 daqiqadan eski bo'lsa so'raydi", () => {
    expect(needsDriverPrompt({ ...base, lastLocationAt: minutesAgo(51) })).toBe(true);
  });
  it("hech qachon signal kelmagan bo'lsa so'raydi", () => {
    expect(needsDriverPrompt({ ...base, lastLocationAt: null })).toBe(true);
  });
  it('bir soatda bir martadan ko\'p so\'ramaydi', () => {
    expect(needsDriverPrompt({ ...base, lastLocationAt: minutesAgo(120), lastPromptAt: minutesAgo(30) })).toBe(false);
    expect(needsDriverPrompt({ ...base, lastLocationAt: minutesAgo(120), lastPromptAt: minutesAgo(56) })).toBe(true);
  });
  it("jonli joylashuv 60 daqiqa ichida tugasa yangi signalda ham eslatadi", () => {
    expect(needsDriverPrompt({ ...base, livePeriodEndsAt: new Date(NOW.getTime() + 30 * 60_000) })).toBe(true);
    expect(needsDriverPrompt({ ...base, livePeriodEndsAt: new Date(NOW.getTime() + 5 * 3600_000) })).toBe(false);
  });
});

describe('formatWhereMessage', () => {
  it('manzil va yangilanish vaqtini beradi', () => {
    const text = formatWhereMessage({
      vehicleNumber: '01A123BC',
      invoiceNumber: 'INV-1',
      address: 'Aktobe viloyati, Qozog‘iston',
      lat: 50.28,
      lng: 57.2,
      lastLocationAt: minutesAgo(12),
      now: NOW,
    });
    expect(text).toContain('01A123BC');
    expect(text).toContain('INV-1');
    expect(text).toContain('Aktobe viloyati');
    expect(text).toContain('12 daq oldin');
    expect(text).not.toContain('eskirgan');
  });
  it("signal 50 daqiqadan eski bo'lsa ogohlantiradi", () => {
    const text = formatWhereMessage({
      vehicleNumber: '01A123BC',
      invoiceNumber: null,
      address: null,
      lat: 50.28,
      lng: 57.2,
      lastLocationAt: minutesAgo(200),
      now: NOW,
    });
    expect(text).toContain('3 soat 20 daq oldin');
    expect(text).toContain('eskirgan');
    expect(text).toContain('50.2800, 57.2000');
  });
  it("joylashuv hali kelmagan bo'lsa shuni aytadi", () => {
    const text = formatWhereMessage({ vehicleNumber: '01A123BC', invoiceNumber: null, address: null, lat: null, lng: null, lastLocationAt: null, now: NOW });
    expect(text).toContain('hali joylashuv yubormagan');
  });
});

describe('formatDriverCard', () => {
  it('avto, bojxona va manzilni ko\'rsatadi, yo\'q bo\'lsa — qo\'yadi', () => {
    const text = formatDriverCard({ vehicleNumber: '01A123BC', invoiceNumber: 'INV-1', customsAddress: 'Yallama bojxonasi', destination: null });
    expect(text).toContain('01A123BC');
    expect(text).toContain('Yallama bojxonasi');
    expect(text).toMatch(/Yetkazish manzili: —/);
  });
  it("bir nechta bojxona qatorini saqlaydi", () => {
    const text = formatDriverCard({ vehicleNumber: null, invoiceNumber: null, customsAddress: 'A\nB', destination: 'Moskva' });
    expect(text).toContain('A\nB');
  });
});

describe('findSingleMatchingTask', () => {
  const candidates = [
    { taskId: 1, invoiceNumber: 'INV-10', vehicleNumber: '01 A 123 BC' },
    { taskId: 2, invoiceNumber: 'INV-11', vehicleNumber: '01A123BC' },
    { taskId: 3, invoiceNumber: null, vehicleNumber: '90X777XX' },
  ];
  it('invoys va avto raqami aynan bitta yukka mos kelsa uni qaytaradi', () => {
    expect(findSingleMatchingTask({ invoiceNumber: 'inv-10', vehicleNumber: '01a123bc' }, candidates)).toBe(1);
  });
  it("bir nechta mos kelsa yoki hech biri mos kelmasa null", () => {
    expect(findSingleMatchingTask({ invoiceNumber: null, vehicleNumber: '01A123BC' }, candidates)).toBeNull();
    expect(findSingleMatchingTask({ invoiceNumber: 'INV-99', vehicleNumber: '01A123BC' }, candidates)).toBeNull();
  });
  it("qoralamada invoys yoki avto bo'sh bo'lsa moslamaydi", () => {
    expect(findSingleMatchingTask({ invoiceNumber: 'INV-10', vehicleNumber: null }, candidates)).toBeNull();
  });
});

describe('needsFinishQuestion', () => {
  const day = 24 * 3600_000;
  it("ulanganidan 7 kun o'tgach, hali so'ralmagan bo'lsa so'raydi", () => {
    expect(needsFinishQuestion({ boundAt: new Date(NOW.getTime() - 7 * day), finishAskedAt: null, now: NOW })).toBe(true);
    expect(needsFinishQuestion({ boundAt: new Date(NOW.getTime() - 10 * day), finishAskedAt: null, now: NOW })).toBe(true);
  });
  it("7 kun to'lmagan bo'lsa so'ramaydi", () => {
    expect(needsFinishQuestion({ boundAt: new Date(NOW.getTime() - 6 * day), finishAskedAt: null, now: NOW })).toBe(false);
  });
  it("bir marta so'ralgan bo'lsa yoki haydovchi ulanmagan bo'lsa qayta so'ramaydi", () => {
    expect(needsFinishQuestion({ boundAt: new Date(NOW.getTime() - 8 * day), finishAskedAt: NOW, now: NOW })).toBe(false);
    expect(needsFinishQuestion({ boundAt: null, finishAskedAt: null, now: NOW })).toBe(false);
  });
});

describe('72 soatlik oyna', () => {
  it("72 soat ichida yaratilgan yuk yaqin hisoblanadi, statusga qaramasdan", () => {
    expect(isRecentTask(new Date(NOW.getTime() - 71 * 3600_000), NOW)).toBe(true);
    expect(isRecentTask(new Date(NOW.getTime() - 72 * 3600_000), NOW)).toBe(true);
    expect(isRecentTask(new Date(NOW.getTime() - 72 * 3600_000 - 1000), NOW)).toBe(false);
    expect(recentTaskCutoff(NOW).getTime()).toBe(NOW.getTime() - 72 * 3600_000);
  });
});

describe('formatTaskPickLabel', () => {
  it('invoys va avto bo\'lsa "INV | AVTO"', () => {
    expect(formatTaskPickLabel({ invoiceNumber: 'INV-1', vehicleNumber: null, title: 'Yuk A' })).toBe('INV-1 | —');
  });
  it("hech biri yo'q bo'lsa yuk nomi", () => {
    expect(formatTaskPickLabel({ invoiceNumber: ' ', vehicleNumber: null, title: 'Olma, Rossiya' })).toBe('Olma, Rossiya');
  });
});

describe('normalizers', () => {
  it("avto raqamidan bo'sh joy va chiziqni olib, katta harfga o'tkazadi", () => {
    expect(normalizeVehicleNumber(' 01 a-123 bc ')).toBe('01A123BC');
    expect(normalizeInvoiceNumber(' inv-10 ')).toBe('INV-10');
  });
});

describe('createAttemptLimiter', () => {
  it("limitdan keyin bloklaydi, muvaffaqiyatda tozalaydi", () => {
    let now = 1_000;
    const limiter = createAttemptLimiter({ limit: 3, windowMs: 3600_000, now: () => now });
    expect(limiter.isBlocked('u1')).toBe(false);
    limiter.recordFailure('u1');
    limiter.recordFailure('u1');
    expect(limiter.isBlocked('u1')).toBe(false);
    limiter.recordFailure('u1');
    expect(limiter.isBlocked('u1')).toBe(true);
    expect(limiter.isBlocked('u2')).toBe(false);
    now += 3600_001;
    expect(limiter.isBlocked('u1')).toBe(false);
    limiter.recordFailure('u1');
    limiter.reset('u1');
    expect(limiter.isBlocked('u1')).toBe(false);
  });
});
