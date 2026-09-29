import {
  tashkentDate, tashkentParts, startOfTashkentDay, startOfTashkentWeek,
  startOfTashkentMonth, startOfTashkentYear,
} from '../utils/tashkent-time';

export interface PeriodRange { gte: Date; lte: Date }

/**
 * GET /tasks/stats davrlari — Toshkent vaqti bo'yicha (server TZ'ga bog'liq emas).
 * Joriy davr: boshidan hozirgacha; oldingi davr: to'liq oldingi kun/hafta/oy/yil.
 * Hafta dushanbadan boshlanadi (dashboard bilan bir xil).
 */
export function taskStatsPeriods(now: Date): Record<'yearly' | 'monthly' | 'weekly' | 'daily', { current: PeriodRange; previous: PeriodRange }> {
  const p = tashkentParts(now);
  const justBefore = (d: Date) => new Date(d.getTime() - 1);

  const today = startOfTashkentDay(now);
  const weekStart = startOfTashkentWeek(now);
  const monthStart = startOfTashkentMonth(now);
  const yearStart = startOfTashkentYear(now);

  return {
    daily: {
      current: { gte: today, lte: now },
      previous: { gte: tashkentDate(p.year, p.month, p.day - 1), lte: justBefore(today) },
    },
    weekly: {
      current: { gte: weekStart, lte: now },
      previous: { gte: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000), lte: justBefore(weekStart) },
    },
    monthly: {
      current: { gte: monthStart, lte: now },
      previous: { gte: tashkentDate(p.year, p.month - 1, 1), lte: justBefore(monthStart) },
    },
    yearly: {
      current: { gte: yearStart, lte: now },
      previous: { gte: tashkentDate(p.year - 1, 0, 1), lte: justBefore(yearStart) },
    },
  };
}
