/**
 * Qadoq turi tekshiruvi — bir qadoqqa to'g'ri keladigan tara og'irligi orqali.
 *
 * Muammo: deklarant invoysda qadoq turini adashib noto'g'ri tanlaydi (yuk taxta
 * yashikda, lekin "пласт.ящик" yozilgan). Bu xato FSS/CMR eksportida noto'g'ri
 * UN kod bo'lib bojxona tizimiga ketadi.
 *
 * Yechim: tara = (brutto − netto) / qadoq soni. Har bir qadoq turi uchun bu
 * qiymat ma'lum oraliqda bo'ladi. Oraliqdan chiqsa — ogohlantiramiz va tara
 * qaysi turga mos kelishini taklif qilamiz.
 *
 * Diapazonlar bazadan keladi (PackagingType.tareMin/tareMax), kodda qotirilmagan.
 * Bu fayl DB'ga bog'liq emas — sof funksiyalar, test qilish oson.
 */

/** Nomlarni solishtirish uchun normallashtirish: "Пласт. Ящик" -> "пласт.ящик" */
export function normalizePackagingName(name: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, '');
}

export interface TareRange {
  name: string;
  tareMin: number | null;
  tareMax: number | null;
}

export interface TareCheckItem {
  name?: string | null;
  packageType?: string | null;
  quantity?: number | string | null;
  packagesCount?: number | string | null;
  grossWeight?: number | string | null;
  netWeight?: number | string | null;
}

export interface TareWarning {
  /** 0 dan boshlanadi; xabarda +1 qilib ko'rsatiladi */
  rowIndex: number;
  itemName: string;
  packageType: string;
  tarePerPkg: number;
  expectedMin: number;
  expectedMax: number;
  /** Tara shu turlarning oralig'iga to'g'ri keladi (tanlanganidan boshqa) */
  suggestions: string[];
  /** Tayyor o'zbekcha xabar — frontend va API bir xil matnni ko'rsatadi */
  message: string;
}

const EPS = 1e-9;

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Tarani 3 xonagacha yaxlitlaydi — suzuvchi nuqta chiqindisini xabarga chiqarmaslik uchun */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Bir qadoqqa to'g'ri keladigan tara (kg).
 * Qadoq soni yoki og'irliklar yo'q bo'lsa null — tekshirib bo'lmaydi.
 */
export function computeTarePerPackage(
  gross: number | string | null | undefined,
  net: number | string | null | undefined,
  qty: number | string | null | undefined
): number | null {
  const g = toNumber(gross);
  const n = toNumber(net);
  const q = toNumber(qty);
  if (g === null || n === null || q === null) return null;
  if (q <= 0) return null;
  return round3((g - n) / q);
}

/** Tur uchun diapazon belgilanganmi (ikkala chegara ham bor) */
export function hasTareRange(range: TareRange | null | undefined): boolean {
  return !!range && range.tareMin !== null && range.tareMax !== null;
}

/** Nom bo'yicha diapazonni topish */
export function findTareRange(packageType: string, all: TareRange[]): TareRange | null {
  const key = normalizePackagingName(packageType);
  if (!key) return null;
  return all.find((r) => normalizePackagingName(r.name) === key) ?? null;
}

/**
 * Tara oraliqda yoki yo'qligi.
 * Diapazon belgilanmagan bo'lsa — har doim true (tekshirmaymiz).
 * min===max===0 (навалом) — tara aniq nol bo'lishi kerak.
 */
export function isTareInRange(tareKg: number, range: TareRange | null | undefined): boolean {
  if (!hasTareRange(range)) return true;
  const min = range!.tareMin as number;
  const max = range!.tareMax as number;
  if (min === 0 && max === 0) return Math.abs(tareKg) < 1e-6;
  return tareKg >= min - EPS && tareKg <= max + EPS;
}

/**
 * Tara qaysi qadoq turlarining oralig'iga to'g'ri keladi (tanlanganidan boshqa).
 * Diapazonlar bir-birini qoplashi mumkin — shuning uchun ro'yxat qaytadi.
 */
export function suggestPackagingTypes(
  tareKg: number,
  all: TareRange[],
  excludeName: string
): string[] {
  const excludeKey = normalizePackagingName(excludeName);
  return all
    .filter((r) => hasTareRange(r))
    .filter((r) => normalizePackagingName(r.name) !== excludeKey)
    .filter((r) => isTareInRange(tareKg, r))
    .map((r) => r.name);
}

function formatKg(n: number): string {
  // 2.0 -> "2", 0.75 -> "0.75"
  return String(round3(n));
}

function buildMessage(w: Omit<TareWarning, 'message'>): string {
  const prefix = `${w.rowIndex + 1}-qatordagi tovar (${w.itemName})`;

  if (w.expectedMin === 0 && w.expectedMax === 0) {
    return (
      `${prefix}: «${w.packageType}» qadoqsiz yuk — tara 0 bo'lishi kerak, ` +
      `hozir ${formatKg(w.tarePerPkg)} kg. Qadoq turi to'g'ri tanlanganini tekshiring.`
    );
  }

  let msg =
    `${prefix}: bir qadoq tarasi ${formatKg(w.tarePerPkg)} kg — ` +
    `«${w.packageType}» uchun kutilgan oraliq ${formatKg(w.expectedMin)}–${formatKg(w.expectedMax)} kg. `;

  if (w.suggestions.length === 1) {
    msg += `Bu og'irlik «${w.suggestions[0]}» ga to'g'ri keladi. `;
  } else if (w.suggestions.length > 1) {
    msg += `Bu og'irlik ${w.suggestions.map((s) => `«${s}»`).join(' yoki ')} ga to'g'ri keladi. `;
  }

  msg += `Qadoq turi to'g'ri tanlanganini tekshiring.`;
  return msg;
}

/**
 * Invoys qatorlarini tekshiradi va shubhali qadoq turlari ro'yxatini qaytaradi.
 * Hech qachon throw qilmaydi va hech narsani bloklamaydi — bu faqat ogohlantirish.
 */
export function checkItemsTare(items: TareCheckItem[], packagingTypes: TareRange[]): TareWarning[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (!Array.isArray(packagingTypes) || packagingTypes.length === 0) return [];

  const warnings: TareWarning[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const packageType = (item.packageType || '').trim();
    if (!packageType) continue;

    const range = findTareRange(packageType, packagingTypes);
    if (!hasTareRange(range)) continue;

    // packagesCount ustuvor; bo'lmasa quantity (invoices.ts dagi mavjud mantiq bilan bir xil)
    const qty = toNumber(item.packagesCount) ?? toNumber(item.quantity);
    const tarePerPkg = computeTarePerPackage(item.grossWeight, item.netWeight, qty);
    if (tarePerPkg === null) continue;

    // Manfiy tara — netto > brutto degani; buni alohida bloklovchi tekshiruv ushlaydi
    if (tarePerPkg < 0) continue;

    if (isTareInRange(tarePerPkg, range)) continue;

    const base = {
      rowIndex: i,
      itemName: item.name?.trim() || 'Nomsiz',
      packageType,
      tarePerPkg,
      expectedMin: range!.tareMin as number,
      expectedMax: range!.tareMax as number,
      suggestions: suggestPackagingTypes(tarePerPkg, packagingTypes, packageType),
    };

    warnings.push({ ...base, message: buildMessage(base) });
  }

  return warnings;
}
