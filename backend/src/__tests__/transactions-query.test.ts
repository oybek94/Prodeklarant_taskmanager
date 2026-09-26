import { describe, it, expect } from 'vitest';
import { buildTransactionListArgs } from '../routes/transactions.query';

const admin = { id: 1, role: 'ADMIN' };
const worker = { id: 7, role: 'DEKLARANT' };

describe('buildTransactionListArgs', () => {
  it('sukut: 1-sahifa, 15 ta, filtr yo\'q', () => {
    const r = buildTransactionListArgs({}, admin);
    expect(r).toEqual({ ok: true, page: 1, take: 15, skip: 0, where: {} });
  });

  it('filtrlar where ga aylanadi, endDate kun oxirigacha', () => {
    const r = buildTransactionListArgs({
      type: 'EXPENSE', paymentMethod: 'CARD', clientId: '3', workerId: '4',
      startDate: '2026-09-01', endDate: '2026-09-30', search: ' benzin ', page: '2', limit: '20',
    }, admin);
    if (!r.ok) throw new Error(r.error);
    expect(r.skip).toBe(20);
    expect(r.where).toMatchObject({
      type: 'EXPENSE', paymentMethod: 'CARD', clientId: 3, workerId: 4,
      comment: { contains: 'benzin', mode: 'insensitive' },
    });
    const date = r.where.date as { gte: Date; lte: Date };
    expect(date.gte.toISOString().slice(0, 10)).toBe('2026-09-01');
    expect(date.lte.getHours()).toBe(23);
  });

  it('noto\'g\'ri qiymatlar rad etiladi', () => {
    expect(buildTransactionListArgs({ limit: '100000' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ type: 'FOO' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ clientId: 'abc' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ page: '0' }, admin).ok).toBe(false);
    expect(buildTransactionListArgs({ startDate: 'kecha' }, admin).ok).toBe(false);
  });

  it('bo\'sh satrlar filtr hisoblanmaydi', () => {
    const r = buildTransactionListArgs({ type: '', search: '   ', clientId: '' }, admin);
    expect(r).toMatchObject({ ok: true, where: {} });
  });

  it('xodim faqat o\'z yozuvlarini ko\'radi (workerId filtri e\'tiborsiz)', () => {
    const r = buildTransactionListArgs({ workerId: '4', clientId: '3' }, worker);
    if (!r.ok) throw new Error(r.error);
    expect(r.where.workerId).toBe(7);
    expect(r.where.clientId).toBeUndefined();
  });
});
