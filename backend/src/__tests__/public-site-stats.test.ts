import { describe, it, expect, vi } from 'vitest';

vi.mock('../prisma', () => ({ prisma: {} }));

import {
  buildPublicSiteStats,
  lastMonths,
  normalizeCountry,
  periodStart,
  productKeyFromTnved,
} from '../services/public-site-stats.service';

// 2026-10-16 12:00 Toshkent
const NOW = new Date('2026-10-16T07:00:00Z');

describe('normalizeCountry', () => {
  it.each([
    ['Russia', 'RU'],
    [' Россия ', 'RU'],
    ['Rossiya', 'RU'],
    ["Qozog'iston", 'KZ'],
    ['Qozog‘iston', 'KZ'],
    ['KAZAKHSTAN', 'KZ'],
  ])('%s → %s', (raw, code) => expect(normalizeCountry(raw)).toBe(code));

  it('tanilmagan va bo\'sh qiymat → null', () => {
    expect(normalizeCountry('Atlantida')).toBeNull();
    expect(normalizeCountry('  ')).toBeNull();
    expect(normalizeCountry(null)).toBeNull();
  });
});

describe('productKeyFromTnved', () => {
  it.each([
    ['0809 29 000 0', 'cherry'],
    ['0809210000', 'cherry'],
    ['0809100000', 'apricot'],
    ['0806 10 100 0', 'grape'],
    ['0703101900', 'onion'],
    ['1234567890', 'other'],
    ['', 'other'],
    [null, 'other'],
  ])('%s → %s', (code, key) => expect(productKeyFromTnved(code)).toBe(key));
});

describe('oy chegaralari (Toshkent vaqti)', () => {
  it('oxirgi 12 oy eskidan yangiga', () => {
    const m = lastMonths(NOW, 12);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe('2025-11');
    expect(m[11]).toBe('2026-10');
  });

  it('yil chegarasidan o\'tadi', () => {
    expect(lastMonths(new Date('2026-02-10T00:00:00Z'), 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('davr boshi — birinchi oyning 1-kuni 00:00 Toshkent (= oldingi kun 19:00 UTC)', () => {
    expect(periodStart(NOW, 12).toISOString()).toBe('2025-10-31T19:00:00.000Z');
  });

  it('UTC bo\'yicha oldingi oy, Toshkent bo\'yicha yangi oy', () => {
    // 30 sentabr 20:00 UTC = 1 oktabr 01:00 Toshkent
    expect(lastMonths(new Date('2026-09-30T20:00:00Z'), 1)).toEqual(['2026-10']);
  });
});

describe('buildPublicSiteStats', () => {
  const task = (iso: string, clientId: number, country: string | null) => ({
    createdAt: new Date(iso),
    clientId,
    destinationCountry: country,
  });

  it('oylar, mijozlar va davlatlarni sanaydi; kam uchraydigan davlatni yashiradi', () => {
    const tasks = [
      task('2026-10-02T05:00:00Z', 1, 'Russia'),
      task('2026-10-05T05:00:00Z', 1, 'Россия'),
      task('2026-10-09T05:00:00Z', 2, 'Rossiya'),
      task('2026-09-09T05:00:00Z', 3, "Qozog'iston"),
      task('2026-09-10T05:00:00Z', 3, "Qozog'iston"),
      task('2026-09-11T05:00:00Z', 4, "Qozog'iston"),
      task('2026-09-12T05:00:00Z', 5, 'Mongolia'), // 1 ta — yashirin
      task('2026-08-12T05:00:00Z', 5, null), // noma'lum davlat
      task('2024-01-01T05:00:00Z', 9, 'Russia'), // davrdan tashqari — oylarga tushmaydi
    ];
    const s = buildPublicSiteStats(tasks, [], NOW);

    expect(s.declarations.thisMonth).toBe(3);
    expect(s.declarations.monthly.find((m) => m.month === '2026-09')?.count).toBe(4);
    expect(s.declarations.monthly.find((m) => m.month === '2026-08')?.count).toBe(1);
    expect(s.destinations.byCountry).toEqual([
      { code: 'RU', count: 4 },
      { code: 'KZ', count: 3 },
    ]);
    expect(s.destinations.countries).toBe(2);
    expect(s.destinations.otherCount).toBe(2); // Mongolia + noma'lum
    expect(JSON.stringify(s)).not.toMatch(/Mongolia|MN/);
  });

  it('og\'irlikni kg → tonnaga o\'tkazadi va mahsulot bo\'yicha guruhlaydi', () => {
    const s = buildPublicSiteStats(
      [],
      [
        { tnvedCode: '0809290000', netWeightKg: 12_000 },
        { tnvedCode: '0809210000', netWeightKg: 3_050 },
        { tnvedCode: '0806101000', netWeightKg: 5_000 },
        { tnvedCode: '0703101900', netWeightKg: 0 },
        { tnvedCode: null, netWeightKg: -5 },
      ],
      NOW,
    );
    expect(s.cargo.tonnes).toBe(20.1);
    expect(s.cargo.byProduct).toEqual([
      { key: 'cherry', tonnes: 15.1 },
      { key: 'grape', tonnes: 5 },
    ]);
  });

  it('bo\'sh bazada ham to\'liq 12 oy qaytaradi', () => {
    const s = buildPublicSiteStats([], [], NOW);
    expect(s.declarations.total).toBe(0);
    expect(s.declarations.monthly).toHaveLength(12);
    expect(s.clients.active).toBe(0);
  });

  it('javobda shaxsiy yoki moliyaviy maydon yo\'q', () => {
    const s = buildPublicSiteStats([task('2026-10-02T05:00:00Z', 7, 'Russia')], [], NOW);
    expect(JSON.stringify(Object.keys(s))).toBe('["generatedAt","periodMonths","declarations","cargo","destinations","clients"]');
    expect(JSON.stringify(s)).not.toMatch(/clientId|name|inn|phone|amount|price/i);
  });
});
