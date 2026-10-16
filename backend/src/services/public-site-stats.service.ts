import { TaskStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { appCache } from './cache';

/**
 * prodeklarant.uz (landing) uchun OCHIQ statistika — faqat jamlangan sonlar.
 *
 * Maxfiylik qoidasi: mijoz nomi, INN, telefon, summa, narx va shartnoma raqamlari
 * bu yerdan HECH QACHON chiqmaydi. Faqat sonlar, tonna va davlat/mahsulot kodlari.
 */

/** "Rasmiylashtirilgan" deb sanaladigan holatlar (mijozga topshirilgan yoki yakunlangan). */
export const DONE_STATUSES: TaskStatus[] = [TaskStatus.TOPSHIRILDI, TaskStatus.YAKUNLANDI];

export const PERIOD_MONTHS = 12;
const CACHE_KEY = 'public:site-stats';
const CACHE_TTL_MS = 60 * 60 * 1000;
/** Bundan kam deklaratsiyali davlat alohida ko'rsatilmaydi ("other"ga qo'shiladi). */
const MIN_COUNTRY_COUNT = 3;
/** O'zbekiston UTC+5 (yozgi vaqt yo'q) — oy chegaralari shu vaqt bo'yicha. */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

// ─── Davlatlar: erkin matn → ISO 3166-1 alpha-2 ─────────────────────

const COUNTRY_ALIASES: Record<string, string[]> = {
  RU: ['russia', 'russian federation', 'rossiya', 'rossiya federatsiyasi', 'россия', 'российская федерация', 'рф'],
  KZ: ['kazakhstan', 'qozogiston', "qozog'iston", 'qazaqstan', 'казахстан'],
  KG: ['kyrgyzstan', 'kirgizistan', "qirg'iziston", 'qirgiziston', 'кыргызстан', 'киргизия'],
  TJ: ['tajikistan', 'tojikiston', 'таджикистан'],
  TM: ['turkmenistan', 'туркменистан'],
  BY: ['belarus', 'belorussia', 'belarusiya', 'беларусь', 'белоруссия'],
  AM: ['armenia', 'armaniston', 'армения'],
  AZ: ['azerbaijan', 'ozarbayjon', "o'zarbayjon", 'азербайджан'],
  GE: ['georgia', 'gruziya', 'грузия'],
  MD: ['moldova', 'молдова', 'молдавия'],
  UA: ['ukraine', 'ukraina', 'украина'],
  CN: ['china', 'xitoy', 'китай'],
  TR: ['turkey', 'turkiye', 'turkiya', 'турция'],
  IR: ['iran', 'иран'],
  IN: ['india', 'hindiston', 'индия'],
  PK: ['pakistan', 'пакистан'],
  AF: ['afghanistan', "afg'oniston", 'афганистан'],
  MN: ['mongolia', "mo'g'uliston", 'монголия'],
  KR: ['south korea', 'korea', 'janubiy koreya', 'корея', 'южная корея'],
  AE: ['united arab emirates', 'uae', 'baa','оаэ', 'объединенные арабские эмираты'],
  DE: ['germany', 'germaniya', 'германия'],
  PL: ['poland', 'polsha', 'польша'],
  LT: ['lithuania', 'litva', 'литва'],
  LV: ['latvia', 'latviya', 'латвия'],
  EE: ['estonia', 'estoniya', 'эстония'],
};

const COUNTRY_LOOKUP = new Map<string, string>();
for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
  for (const alias of aliases) COUNTRY_LOOKUP.set(alias, code);
}

/** "Россия" / "Russia" / " rossiya " → "RU"; tanilmasa null. */
export function normalizeCountry(raw: string | null | undefined): string | null {
  const key = (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[`’ʻʼ‘]/g, "'")
    .replace(/\s+/g, ' ');
  if (!key) return null;
  return COUNTRY_LOOKUP.get(key) ?? null;
}

// ─── Mahsulotlar: TN VED kodi → guruh ──────────────────────────────

/** Uzun prefiks avval tekshiriladi (6 xona → 4 xona). */
const PRODUCT_PREFIXES: Array<[string, string]> = [
  ['080921', 'cherry'],
  ['080929', 'cherry'],
  ['080910', 'apricot'],
  ['080930', 'peach'],
  ['080940', 'plum'],
  ['0806', 'grape'],
  ['0703', 'onion'],
  ['0702', 'tomato'],
  ['0808', 'apple'],
  ['0805', 'citrus'],
  ['0804', 'tropical'],
  ['0810', 'berries'],
];

export function productKeyFromTnved(code: string | null | undefined): string {
  const digits = (code ?? '').replace(/\D/g, '');
  if (!digits) return 'other';
  for (const [prefix, key] of PRODUCT_PREFIXES) {
    if (digits.startsWith(prefix)) return key;
  }
  return 'other';
}

// ─── Oylar ──────────────────────────────────────────────────────────

function tashkentYearMonth(date: Date): { y: number; m: number } {
  const t = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
}

const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

/** Oxirgi `n` oy (Toshkent vaqti bilan), eskisidan yangisiga. */
export function lastMonths(now: Date, n: number): string[] {
  const { y, m } = tashkentYearMonth(now);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = y * 12 + m - i;
    out.push(monthKey(Math.floor(total / 12), total % 12));
  }
  return out;
}

/** Davr boshi: n-oy oldingi oyning 1-kuni 00:00 (Toshkent) — UTC Date sifatida. */
export function periodStart(now: Date, n: number): Date {
  const first = lastMonths(now, n)[0];
  const [y, m] = first.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1) - TASHKENT_OFFSET_MS);
}

// ─── Hisoblash (sof funksiya — testlanadi) ─────────────────────────

export interface TaskRow {
  createdAt: Date;
  clientId: number;
  destinationCountry: string | null;
}

export interface ItemGroupRow {
  tnvedCode: string | null;
  netWeightKg: number;
}

export interface PublicSiteStats {
  generatedAt: string;
  periodMonths: number;
  declarations: {
    total: number;
    thisMonth: number;
    monthly: Array<{ month: string; count: number }>;
  };
  cargo: {
    tonnes: number;
    byProduct: Array<{ key: string; tonnes: number }>;
  };
  destinations: {
    countries: number;
    byCountry: Array<{ code: string; count: number }>;
    otherCount: number;
  };
  clients: { active: number };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildPublicSiteStats(tasks: TaskRow[], items: ItemGroupRow[], now: Date): PublicSiteStats {
  const months = lastMonths(now, PERIOD_MONTHS);
  const perMonth = new Map<string, number>(months.map((m) => [m, 0]));
  const clients = new Set<number>();
  const perCountry = new Map<string, number>();
  let unknownCountry = 0;

  for (const t of tasks) {
    const { y, m } = tashkentYearMonth(t.createdAt);
    const key = monthKey(y, m);
    if (perMonth.has(key)) perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
    clients.add(t.clientId);
    const code = normalizeCountry(t.destinationCountry);
    if (code) perCountry.set(code, (perCountry.get(code) ?? 0) + 1);
    else unknownCountry += 1;
  }

  const monthly = months.map((month) => ({ month, count: perMonth.get(month) ?? 0 }));

  // Kam uchragan davlatlar "other"ga: kichik sonlar bitta mijozni ko'rsatib qo'ymasin.
  const visible = [...perCountry.entries()].filter(([, c]) => c >= MIN_COUNTRY_COUNT).sort((a, b) => b[1] - a[1]);
  const hiddenCount = [...perCountry.values()].filter((c) => c < MIN_COUNTRY_COUNT).reduce((s, c) => s + c, 0);

  const perProduct = new Map<string, number>();
  let totalKg = 0;
  for (const it of items) {
    if (!(it.netWeightKg > 0)) continue;
    totalKg += it.netWeightKg;
    const key = productKeyFromTnved(it.tnvedCode);
    perProduct.set(key, (perProduct.get(key) ?? 0) + it.netWeightKg);
  }

  return {
    generatedAt: now.toISOString(),
    periodMonths: PERIOD_MONTHS,
    declarations: {
      total: tasks.length,
      thisMonth: monthly[monthly.length - 1].count,
      monthly,
    },
    cargo: {
      tonnes: round1(totalKg / 1000),
      byProduct: [...perProduct.entries()]
        .map(([key, kg]) => ({ key, tonnes: round1(kg / 1000) }))
        .sort((a, b) => b.tonnes - a.tonnes),
    },
    destinations: {
      countries: visible.length,
      byCountry: visible.map(([code, count]) => ({ code, count })),
      otherCount: hiddenCount + unknownCountry,
    },
    clients: { active: clients.size },
  };
}

// ─── Bazadan o'qish ─────────────────────────────────────────────────

async function computeFromDatabase(now: Date): Promise<PublicSiteStats> {
  const since = periodStart(now, PERIOD_MONTHS);
  const taskWhere = { status: { in: DONE_STATUSES }, createdAt: { gte: since } };

  const [taskRows, itemGroups] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      select: {
        createdAt: true,
        clientId: true,
        invoice: { select: { contract: { select: { destinationCountry: true } } } },
      },
    }),
    prisma.invoiceItem.groupBy({
      by: ['tnvedCode'],
      where: { invoice: { task: taskWhere } },
      _sum: { netWeight: true },
    }),
  ]);

  const tasks: TaskRow[] = taskRows.map((t) => ({
    createdAt: t.createdAt,
    clientId: t.clientId,
    destinationCountry: t.invoice?.contract?.destinationCountry ?? null,
  }));
  const items: ItemGroupRow[] = itemGroups.map((g) => ({
    tnvedCode: g.tnvedCode,
    netWeightKg: Number(g._sum.netWeight ?? 0),
  }));
  return buildPublicSiteStats(tasks, items, now);
}

export function getPublicSiteStats(now: Date = new Date()): Promise<PublicSiteStats> {
  return appCache.getOrSet(CACHE_KEY, CACHE_TTL_MS, () => computeFromDatabase(now));
}
