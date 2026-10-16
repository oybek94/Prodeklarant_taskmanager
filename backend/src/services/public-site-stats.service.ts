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

/**
 * Kichik harfda; apostrof variantlari cleanCountry() da bitta "'" ga keltiriladi.
 * Landing'dagi `trust.stats.countries.*` da har bir kod uchun nom bo'lishi kerak.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  RU: ['russia', 'russian federation', 'rossiya', 'rossiya federatsiyasi', 'россия', 'россии', 'российская федерация', 'российской федерации', 'рф', 'rus'],
  KZ: ['kazakhstan', 'qozogiston', "qozog'iston", 'qozoqiston', 'qazaqstan', 'kazakstan', 'казахстан', 'казахстана', 'kaz'],
  KG: ['kyrgyzstan', 'kirgizistan', 'kirgiziya', "qirg'iziston", 'qirgiziston', 'кыргызстан', 'киргизия', 'киргизии', 'кыргызстана', 'kgz'],
  TJ: ['tajikistan', 'tojikiston', 'таджикистан', 'таджикистана', 'tjk'],
  TM: ['turkmenistan', 'turkmaniston', 'туркменистан', 'туркмения', 'tkm'],
  BY: ['belarus', 'belorussia', 'belarusiya', 'belorussiya', 'беларусь', 'беларуси', 'белоруссия', 'белоруссии', 'республика беларусь', 'blr'],
  AM: ['armenia', 'armaniston', 'армения', 'армении', 'arm'],
  AZ: ['azerbaijan', 'azerbaydzhan', 'ozarbayjon', "o'zarbayjon", 'азербайджан', 'азербайджана', 'aze'],
  GE: ['georgia', 'gruziya', 'грузия', 'грузии', 'geo'],
  MD: ['moldova', 'moldaviya', 'молдова', 'молдавия', 'молдавии', 'mda'],
  UA: ['ukraine', 'ukraina', 'украина', 'украины', 'ukr'],
  UZ: ['uzbekistan', "o'zbekiston", 'ozbekiston', 'узбекистан', 'узбекистана', 'uzb'],
  CN: ['china', 'xitoy', 'китай', 'китая', "people's republic of china", 'prc', 'chn'],
  TR: ['turkey', 'turkiye', 'turkiya', 'турция', 'турции', 'tur'],
  IR: ['iran', 'eron', 'иран', 'ирана', 'irn'],
  IQ: ['iraq', 'irak', 'ирак', 'ирака', 'irq'],
  IL: ['israel', 'isroil', 'израиль', 'израиля', 'isr'],
  SA: ['saudi arabia', 'saudiya arabistoni', 'саудовская аравия', 'саудовской аравии', 'ksa', 'sau'],
  AE: ['united arab emirates', 'uae', 'baa', 'birlashgan arab amirliklari', 'оаэ', 'объединенные арабские эмираты', 'арабские эмираты', 'are'],
  QA: ['qatar', 'katar', 'катар', 'qat'],
  KW: ['kuwait', 'quvayt', 'кувейт', 'kwt'],
  OM: ['oman', 'умман', 'оман', 'omn'],
  BH: ['bahrain', 'bahrayn', 'бахрейн', 'bhr'],
  JO: ['jordan', 'iordaniya', 'иордания', 'jor'],
  EG: ['egypt', 'misr', 'египет', 'египта', 'egy'],
  IN: ['india', 'hindiston', 'индия', 'индии', 'ind'],
  PK: ['pakistan', 'pokiston', 'пакистан', 'пакистана', 'pak'],
  BD: ['bangladesh', 'бангладеш', 'bgd'],
  AF: ['afghanistan', "afg'oniston", 'afgoniston', 'афганистан', 'афганистана', 'afg'],
  MN: ['mongolia', "mo'g'uliston", 'mongoliya', 'монголия', 'монголии', 'mng'],
  KR: ['south korea', 'republic of korea', 'korea', 'janubiy koreya', 'koreya', 'корея', 'южная корея', 'kor'],
  JP: ['japan', 'yaponiya', 'япония', 'японии', 'jpn'],
  VN: ['vietnam', 'viet nam', 'vyetnam', 'вьетнам', 'вьетнама', 'vnm'],
  TH: ['thailand', 'tailand', 'таиланд', 'таиланда', 'tha'],
  MY: ['malaysia', 'malayziya', 'малайзия', 'малайзии', 'mys'],
  ID: ['indonesia', 'indoneziya', 'индонезия', 'индонезии', 'idn'],
  SG: ['singapore', 'singapur', 'сингапур', 'sgp'],
  DE: ['germany', 'germaniya', 'германия', 'германии', 'deu'],
  NL: ['netherlands', 'the netherlands', 'holland', 'niderlandiya', 'gollandiya', 'нидерланды', 'голландия', 'nld'],
  PL: ['poland', 'polsha', 'польша', 'польши', 'pol'],
  LT: ['lithuania', 'litva', 'литва', 'литвы', 'ltu'],
  LV: ['latvia', 'latviya', 'латвия', 'латвии', 'lva'],
  EE: ['estonia', 'estoniya', 'эстония', 'эстонии', 'est'],
  FI: ['finland', 'finlyandiya', 'финляндия', 'финляндии', 'fin'],
  SE: ['sweden', 'shvetsiya', 'швеция', 'швеции', 'swe'],
  CZ: ['czechia', 'czech republic', 'chexiya', 'чехия', 'чехии', 'cze'],
  SK: ['slovakia', 'slovakiya', 'словакия', 'словакии', 'svk'],
  HU: ['hungary', 'vengriya', 'венгрия', 'венгрии', 'hun'],
  RO: ['romania', 'ruminiya', 'румыния', 'румынии', 'rou'],
  BG: ['bulgaria', 'bolgariya', 'болгария', 'болгарии', 'bgr'],
  RS: ['serbia', 'serbiya', 'сербия', 'сербии', 'srb'],
  FR: ['france', 'fransiya', 'франция', 'франции', 'fra'],
  IT: ['italy', 'italiya', 'италия', 'италии', 'ita'],
  ES: ['spain', 'ispaniya', 'испания', 'испании', 'esp'],
  GB: ['united kingdom', 'uk', 'great britain', 'england', 'buyuk britaniya', 'angliya', 'великобритания', 'великобритании', 'англия', 'gbr'],
  US: ['united states', 'united states of america', 'usa', 'aqsh', 'сша', 'соединенные штаты америки', 'соединенные штаты'],
};

/** Ikki harfli ISO kodlar (to'liq qator "RU", "KZ"…) — alias jadvalida bor davlatlar. */
const ISO2_CODES = new Set(Object.keys(COUNTRY_ALIASES));

const COUNTRY_LOOKUP = new Map<string, string>();
for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
  for (const alias of aliases) COUNTRY_LOOKUP.set(alias, code);
}

/**
 * Qisqa (<5 belgi) aliaslar ("uk", "uae", "rus") faqat TO'LIQ qator/bo'lak sifatida mos keladi —
 * matn ichidan qidirilsa begona so'zlar noto'g'ri tushishi mumkin. Uzunlari so'z chegarasi bilan qidiriladi.
 */
const LETTER_CLASS = "a-zа-я0-9'";
const CONTAINED_ALIASES: Array<[RegExp, string]> = [...COUNTRY_LOOKUP.entries()]
  .filter(([alias]) => alias.length >= 5)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([alias, code]): [RegExp, string] => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [new RegExp(`(^|[^${LETTER_CLASS}])${escaped}($|[^${LETTER_CLASS}])`), code];
  });

function cleanCountry(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[`’ʻʼ‘ʹ´]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

function lookupExact(key: string): string | null {
  const hit = COUNTRY_LOOKUP.get(key);
  if (hit) return hit;
  const upper = key.toUpperCase();
  return key.length === 2 && ISO2_CODES.has(upper) ? upper : null;
}

/**
 * "Россия" / "Russia" / " rossiya " / "RU" / "Rossiya Federatsiyasi, Moskva" → "RU"; tanilmasa null.
 * Avval to'liq mos kelish, so'ng vergul/qavs/chiziq bo'yicha bo'laklar, oxirida so'z chegarasi bilan qidiruv.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  const key = cleanCountry(raw);
  if (!key) return null;

  const direct = lookupExact(key);
  if (direct) return direct;

  for (const part of key.split(/[,;/()\\|–—]|\s-\s/)) {
    const hit = lookupExact(part.trim());
    if (hit) return hit;
  }

  for (const [re, code] of CONTAINED_ALIASES) {
    if (re.test(key)) return code;
  }
  return null;
}

// ─── Mahsulotlar: TN VED kodi → guruh ──────────────────────────────

/**
 * Uzun prefiks avval tekshiriladi (6 xona → 4 xona → 2 xona).
 * Kalitlar landing'dagi `trust.stats.products.*` bilan bir xil bo'lishi kerak.
 */
const PRODUCT_PREFIXES: Array<[string, string]> = [
  // 0809 — danakli mevalar
  ['080921', 'cherry'],
  ['080929', 'cherry'],
  ['080910', 'apricot'],
  ['080930', 'peach'], // shaftoli va nektarin
  ['080940', 'plum'],
  // 0806 — uzum; 080620 — mayiz (quritilgan)
  ['080620', 'dried'],
  ['0806', 'grape'],
  // 0807 — qovun, tarvuz (papayya — tropik)
  ['080720', 'tropical'],
  ['0807', 'melon'],
  // 0808 — olma, nok, behi
  ['0808', 'apple'],
  ['0805', 'citrus'],
  // 0803, 0804 — banan, xurmo, anjir, ananas, avokado, mango
  ['0803', 'tropical'],
  ['0804', 'tropical'],
  ['081050', 'tropical'], // kivi
  ['081090', 'otherfruit'], // xurmo (persimmon), anor, feyxoa
  ['0810', 'berries'],
  // 0811 — muzlatilgan mevalar; 0812 — vaqtincha konservalangan; 0813 — quritilgan
  ['0811', 'frozen'],
  ['0812', 'processed'],
  ['0813', 'dried'],
  // 0801, 0802 — yong'oq turlari
  ['0801', 'nuts'],
  ['0802', 'nuts'],
  // 07 — sabzavotlar
  ['0701', 'potato'],
  ['0702', 'tomato'],
  ['070320', 'garlic'],
  ['0703', 'onion'],
  ['0704', 'vegetables'], // karam
  ['0705', 'vegetables'], // salat, sikoriy
  ['0706', 'carrot'], // sabzi, lavlagi, turp
  ['0707', 'cucumber'],
  ['0708', 'vegetables'], // dukkakli sabzavotlar
  ['070960', 'pepper'],
  ['0709', 'vegetables'], // baqlajon, qovoqcha, ko'katlar, boshqa
  ['0710', 'frozen'],
  ['0711', 'processed'],
  ['0712', 'dried'],
  ['0713', 'pulses'], // mosh, no'xat, loviya
  // 20 — meva-sabzavot qayta ishlanmalari (sharbat, murabbo, tomat pastasi, konserva)
  ['20', 'processed'],
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
