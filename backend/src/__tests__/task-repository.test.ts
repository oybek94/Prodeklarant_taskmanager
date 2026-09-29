import { describe, it, expect, vi } from 'vitest';

vi.mock('../prisma', () => ({ prisma: {} }));

import { tashkentDayRange } from '../repositories/task.repository';

describe('tashkentDayRange — arxiv sana filtri', () => {
  it("filtr yo'q bo'lsa undefined", () => {
    expect(tashkentDayRange()).toBeUndefined();
  });

  it('kun Toshkentda 00:00 da boshlanib 23:59:59.999 da tugaydi (UTC+5)', () => {
    expect(tashkentDayRange('2026-09-01', '2026-09-30')).toEqual({
      gte: new Date('2026-08-31T19:00:00.000Z'),
      lte: new Date('2026-09-30T18:59:59.999Z'),
    });
  });

  it('bitta chegara', () => {
    expect(tashkentDayRange(undefined, '2026-01-01')).toEqual({ lte: new Date('2026-01-01T18:59:59.999Z') });
    expect(tashkentDayRange('2026-01-01')).toEqual({ gte: new Date('2025-12-31T19:00:00.000Z') });
  });
});
