import { describe, it, expect } from 'vitest';
import {
  endOfTashkentDay,
  startOfTashkentDay,
  startOfTashkentMonth,
  startOfTashkentWeek,
  startOfTashkentYear,
  tashkentDate,
  tashkentDateKey,
  tashkentParts,
} from '../utils/tashkent-time';

describe('tashkent-time', () => {
  // 2026-09-28 (dushanba) 02:30 Toshkent = 2026-09-27 21:30 UTC
  const earlyMonday = new Date('2026-09-27T21:30:00Z');

  it('REGRESSIYA: 00:00–05:00 dagi yozuv Toshkent kuniga tushadi (UTC bo\'yicha kechagi kun edi)', () => {
    expect(tashkentDateKey(earlyMonday)).toBe('2026-09-28');
    expect(tashkentParts(earlyMonday)).toMatchObject({ year: 2026, month: 8, day: 28, hour: 2, weekdayMon0: 0 });
  });

  it('kun chegaralari Toshkent yarim tunida', () => {
    expect(startOfTashkentDay(earlyMonday).toISOString()).toBe('2026-09-27T19:00:00.000Z');
    expect(endOfTashkentDay(earlyMonday).toISOString()).toBe('2026-09-28T18:59:59.999Z');
  });

  it('hafta dushanbadan, oy va yil boshi', () => {
    // 2026-10-04 yakshanba 23:00 Toshkent
    const sunday = new Date('2026-10-04T18:00:00Z');
    expect(tashkentDateKey(startOfTashkentWeek(sunday))).toBe('2026-09-28');
    expect(startOfTashkentWeek(earlyMonday).toISOString()).toBe('2026-09-27T19:00:00.000Z');
    expect(startOfTashkentMonth(sunday).toISOString()).toBe('2026-09-30T19:00:00.000Z');
    expect(startOfTashkentYear(earlyMonday).toISOString()).toBe('2025-12-31T19:00:00.000Z');
  });

  it('tashkentDate oy/kun toshishini normallashtiradi', () => {
    // 0-kun = oldingi oyning oxirgi kuni
    expect(tashkentParts(tashkentDate(2026, 2, 0)).day).toBe(28);
    expect(tashkentDateKey(tashkentDate(2026, -1, 1))).toBe('2025-12-01');
  });
});
