// Invoice moduli uchun utility funksiyalar

import type { InvoiceItem, SpecRow } from './types';

// --- Sana formatlash ---

/** Sana formatlash funksiyasi (DD.MM.YYYY) */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// --- Raqam formatlash ---

/** Raqamni rus formatida chiqarish (vergul separator, 0-2 kasr) */
export const formatNumber = (value?: number): string =>
  value !== undefined && value !== null && !Number.isNaN(value)
    ? value.toLocaleString('ru-RU', {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
      })
    : '';

/** Raqamni rus formatida chiqarish (har doim 2 kasr) */
export const formatNumberFixed = (value?: number): string =>
  value !== undefined && value !== null && !Number.isNaN(value)
    ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

// --- Item operations ---

/** InvoiceItem maydonlarini normalizatsiya qilish (null -> undefined, string -> number) */
export const normalizeItem = (item: InvoiceItem): InvoiceItem => ({
  ...item,
  tnvedCode: item.tnvedCode ?? undefined,
  pluCode: item.pluCode ?? undefined,
  packageType: item.packageType ?? undefined,
  quantity: item.quantity != null ? Number(item.quantity) : 0,
  packagesCount:
    item.packagesCount != null && Number(item.packagesCount) !== 0 ? Number(item.packagesCount) : undefined,
  grossWeight: item.grossWeight != null ? Number(item.grossWeight) : undefined,
  netWeight: item.netWeight != null ? Number(item.netWeight) : undefined,
  unitPrice: item.unitPrice != null ? Number(item.unitPrice) : 0,
  totalPrice: item.totalPrice != null ? Number(item.totalPrice) : 0,
});

/** Shartnoma spetsifikatsiyasidagi nom va boshqa maydonlarni invoys qatorlariga (indeks bo'yicha) yozadi. */
export const syncItemsFromSpec = (currentItems: InvoiceItem[], spec: SpecRow[]): InvoiceItem[] =>
  currentItems.map((item, i) => {
    const row = spec[i];
    if (!row) return item;
    const next = { ...item };
    if (row.productName != null && String(row.productName).trim() !== '') next.name = String(row.productName).trim();
    if (row.tnvedCode != null && String(row.tnvedCode).trim() !== '') next.tnvedCode = String(row.tnvedCode).trim();
    if (row.unitPrice != null) next.unitPrice = Number(row.unitPrice);
    if (row.totalPrice != null) next.totalPrice = Number(row.totalPrice);
    return next;
  });

// --- Tara tekshiruvi ---

/** Qadoq turi bo'yicha tara (кг) ruxsat etilgan oralig'i */
export const getTareRange = (packageType: string): { min: number; max: number } | null => {
  const key = (packageType || '').trim().toLowerCase().replace(/\s+/g, '');
  const ranges: Record<string, { min: number; max: number }> = {
    'дер.ящик': { min: 0.8, max: 2.5 },
    'пласт.ящик': { min: 0.3, max: 0.7 },
    'пласт.ящик.': { min: 0.3, max: 0.7 },
    мешки: { min: 0.01, max: 0.1 },
    'картон.короб.': { min: 0.3, max: 2.5 },
    'картон.короб': { min: 0.3, max: 2.5 },
    навалом: { min: 0, max: 0 },
  };
  return ranges[key] ?? null;
};

/** Tara oralig'ida yoki yo'qligini tekshirish */
export const isTareInRange = (tareKg: number, packageType: string): boolean => {
  const range = getTareRange(packageType);
  if (!range) return true;
  if (range.min === 0 && range.max === 0) return Math.abs(tareKg) < 1e-6;
  const eps = 1e-9;
  return tareKg >= range.min - eps && tareKg <= range.max + eps;
};

// --- Son -> So'z (rus tilida) ---

/** Sonni rus tilida so'z bilan yozish (valyuta bilan) */
export const numberToWordsRu = (num: number, currency: string): string => {
  const cur = currency && String(currency).trim() ? String(currency).trim().toUpperCase() : 'USD';
  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const tens = [
    '',
    '',
    'двадцать',
    'тридцать',
    'сорок',
    'пятьдесят',
    'шестьдесят',
    'семьдесят',
    'восемьдесят',
    'девяносто',
  ];
  const teens = [
    'десять',
    'одиннадцать',
    'двенадцать',
    'тринадцать',
    'четырнадцать',
    'пятнадцать',
    'шестнадцать',
    'семнадцать',
    'восемнадцать',
    'девятнадцать',
  ];
  const hundreds = [
    '',
    'сто',
    'двести',
    'триста',
    'четыреста',
    'пятьсот',
    'шестьсот',
    'семьсот',
    'восемьсот',
    'девятьсот',
  ];

  /** 0–999 oralig'ini so'zda ifodalaydi */
  const convertBlock = (n: number): string => {
    if (n === 0) return '';
    let r = '';
    const h = Math.floor(n / 100);
    if (h > 0 && h <= 9) r += hundreds[h] + ' ';
    const rem = n % 100;
    if (rem >= 10 && rem < 20) return (r + teens[rem - 10]).trim();
    const t = Math.floor(rem / 10),
      o = rem % 10;
    if (t > 0) r += tens[t] + ' ';
    if (o > 0) r += ones[o];
    return r.trim();
  };

  const zeroPhrase =
    cur === 'USD'
      ? 'ноль долларов США'
      : cur === 'RUB'
        ? 'ноль рублей РФ'
        : cur === 'EUR'
          ? 'ноль евро'
          : 'ноль сумов';
  if (!Number.isFinite(num) || num < 0) return zeroPhrase;
  if (num === 0) return zeroPhrase;

  const whole = Math.floor(num);
  const dec = Math.round((num - whole) * 100);
  let result = '';

  const millions = Math.floor(whole / 1_000_000);
  const restAfterMillions = whole % 1_000_000;
  const th = Math.floor(restAfterMillions / 1000);
  const rem = whole % 1000;

  if (millions > 0) {
    if (millions === 1) result += 'один миллион ';
    else if (millions >= 2 && millions <= 4) result += convertBlock(millions) + ' миллиона ';
    else if (millions >= 5 && millions <= 20) result += convertBlock(millions) + ' миллионов ';
    else {
      const mMod = millions % 100;
      if (mMod === 1 && millions % 10 === 1 && millions % 100 !== 11)
        result += convertBlock(millions) + ' миллион ';
      else if (mMod >= 2 && mMod <= 4 && (mMod < 10 || mMod >= 20))
        result += convertBlock(millions) + ' миллиона ';
      else result += convertBlock(millions) + ' миллионов ';
    }
  }

  if (th > 0) {
    if (th === 1) result += 'одна тысяча ';
    else if (th >= 2 && th <= 4) result += convertBlock(th) + ' тысячи ';
    else if (th >= 5 && th <= 20) result += convertBlock(th) + ' тысяч ';
    else {
      const tMod = th % 100;
      if (th % 10 === 1 && tMod !== 11) result += convertBlock(th) + ' тысяча ';
      else if (tMod >= 2 && tMod <= 4 && (tMod < 10 || tMod >= 20)) result += convertBlock(th) + ' тысячи ';
      else result += convertBlock(th) + ' тысяч ';
    }
  }

  if (rem > 0) result += convertBlock(rem);

  if (cur === 'USD') {
    if (whole === 1) result += ' доллар США';
    else if (whole < 5) result += ' доллара США';
    else result += ' долларов США';
  } else if (cur === 'RUB') {
    if (whole === 1) result += ' рубль РФ';
    else if (whole >= 2 && whole <= 4) result += ' рубля РФ';
    else result += ' рублей РФ';
  } else if (cur === 'EUR') {
    if (whole === 1) result += ' евро';
    else if (whole >= 2 && whole <= 4) result += ' евро';
    else result += ' евро';
  } else {
    if (whole === 1) result += ' сум';
    else if (whole < 5) result += ' сума';
    else result += ' сумов';
  }

  const fracWord =
    cur === 'USD' ? 'центов' : cur === 'RUB' ? 'копеек' : cur === 'EUR' ? 'евроцентов' : 'тиин';
  if (dec > 0) result += ` ${dec} ${fracWord}`;
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// --- Download / Document helpers ---

/** Ikki requestAnimationFrame kutish (DOM paint uchun) */
export const waitForPaint = (): Promise<void> =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

/** Avtomobil raqamidan faqat birinchi plastinkani olish (slash dan oldin) */
export const getVehiclePlate = (value?: string): string => {
  if (!value) return '';
  return value.split('/')[0].trim();
};

/** Task sarlavhasini shakllantirish: "DZA-123 АВТО 40232BAA" */
export const buildTaskTitle = (invoiceNumber?: string, vehicleNumber?: string): string => {
  const safeInvoice = invoiceNumber?.trim();
  const plate = getVehiclePlate(vehicleNumber);
  if (!safeInvoice || !plate) return '';
  return `${safeInvoice} АВТО ${plate}`;
};

/** Fayl nomidagi taqiqlangan belgilarni tozalash */
export const sanitizeFileName = (value: string): string =>
  value.replace(/[\\/:*?"<>|]+/g, '_').trim();

/** Blob ichidan xato xabarini ajratib olish */
export const extractBlobErrorMessage = async (blob: Blob, fallback: string): Promise<string> => {
  try {
    const text = await blob.text();
    if (!text) return fallback;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) return String(parsed.error);
    } catch {
      // Not JSON, fallback to raw text
    }
    return text;
  } catch {
    return fallback;
  }
};

/** Excel response ni faylga yuklab olish */
export const downloadExcelResponse = async (
  response: { data: Blob; status: number; headers?: any },
  fileName: string,
  fallbackError: string
): Promise<void> => {
  if (response.status >= 400) {
    const message = await extractBlobErrorMessage(response.data, fallbackError);
    throw new Error(message);
  }
  const contentType = String(response.headers?.['content-type'] || response.headers?.['Content-Type'] || '');
  if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    const message = await extractBlobErrorMessage(response.data, fallbackError);
    throw new Error(message);
  }
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
