import { describe, it, expect } from 'vitest';
import { taskStatsPeriods } from '../services/task-stats-periods';

const iso = (r: { gte: Date; lte: Date }) => [r.gte.toISOString(), r.lte.toISOString()];

describe('taskStatsPeriods — Toshkent vaqti (UTC+5)', () => {
  // 2026-09-29 (seshanba) 02:30 Toshkent = 2026-09-28 21:30 UTC — server UTC'da "kecha" bo'lardi
  const now = new Date('2026-09-28T21:30:00.000Z');
  const p = taskStatsPeriods(now);

  it('kun Toshkent yarim tunidan boshlanadi', () => {
    expect(iso(p.daily.current)).toEqual(['2026-09-28T19:00:00.000Z', now.toISOString()]);
    expect(iso(p.daily.previous)).toEqual(['2026-09-27T19:00:00.000Z', '2026-09-28T18:59:59.999Z']);
  });

  it('hafta dushanbadan', () => {
    expect(iso(p.weekly.current)).toEqual(['2026-09-27T19:00:00.000Z', now.toISOString()]);
    expect(iso(p.weekly.previous)).toEqual(['2026-09-20T19:00:00.000Z', '2026-09-27T18:59:59.999Z']);
  });

  it('oy va yil', () => {
    expect(iso(p.monthly.previous)).toEqual(['2026-07-31T19:00:00.000Z', '2026-08-31T18:59:59.999Z']);
    expect(iso(p.yearly.previous)).toEqual(['2024-12-31T19:00:00.000Z', '2025-12-31T18:59:59.999Z']);
  });

  it('yanvarda oldingi oy — o\'tgan yil dekabri', () => {
    const jan = taskStatsPeriods(new Date('2026-01-10T10:00:00.000Z'));
    expect(iso(jan.monthly.previous)).toEqual(['2025-11-30T19:00:00.000Z', '2025-12-31T18:59:59.999Z']);
  });
});
