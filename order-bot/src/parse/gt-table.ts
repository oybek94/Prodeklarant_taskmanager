import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { buildGrid } from './table.js';

/**
 * Магнит / GrandTrade zakaz jadvali.
 *
 * Xat tanasida 4 ustunli kichik jadval bo'ladi:
 *   заказ | Место ТО | Товар для указания в заказе | Место прибытия
 *
 * Bitta GT raqam bir nechta qatorda uchraydi — bu bitta zakazning bir nechta
 * yetkazish nuqtasi (masalan GT-773211 -> РЦ Киров va РЦ Зеленодольск).
 */

export type GtTableRow = {
  gtNumber: string;
  customsPlace: string | null;
  product: string | null;
  arrivalPlace: string | null;
};

/** Sarlavhalarni topish qoidalari — pozitsiya emas, matn bo'yicha. */
const COLUMN_RULES = {
  gtNumber: ['заказ'],
  customsPlace: ['место то'],
  product: ['товар'],
  arrivalPlace: ['место прибытия'],
} as const;

type ColumnKey = keyof typeof COLUMN_RULES;

/** Jadval GT jadvali deb tanilishi uchun shu ustunlar shart. */
const REQUIRED: ColumnKey[] = ['gtNumber', 'arrivalPlace'];

/** `GT-773211`, `gt 773211`, `GT773211` -> `GT-773211`. Topilmasa null. */
export const normalizeGtNumber = (raw: string): string | null => {
  const match = /gt[\s\-_]*(\d{4,})/i.exec(raw);
  return match ? `GT-${match[1]}` : null;
};

const mapColumns = (headers: string[]): Partial<Record<ColumnKey, number>> => {
  const result: Partial<Record<ColumnKey, number>> = {};
  const claimed = new Set<number>();

  for (const [key, needles] of Object.entries(COLUMN_RULES) as [ColumnKey, readonly string[]][]) {
    for (let i = 0; i < headers.length; i++) {
      if (claimed.has(i)) continue;
      const header = headers[i];
      if (!header) continue;
      if (!needles.some((needle) => header.includes(needle))) continue;
      result[key] = i;
      claimed.add(i);
      break;
    }
  }

  return result;
};

const blank = (value: string): boolean => value === '' || value === '-' || value === '—';

/**
 * Xat HTML'idan GT jadvalining qatorlarini ajratadi.
 * Jadval topilmasa yoki GT raqamli qator bo'lmasa — bo'sh massiv.
 */
export const extractGtRows = (html: string): GtTableRow[] => {
  const $ = cheerio.load(html);

  for (const table of $('table').toArray() as Element[]) {
    const grid = buildGrid($, table);

    for (let headerIndex = 0; headerIndex < grid.length; headerIndex++) {
      const headerRow = grid[headerIndex];
      if (!headerRow) continue;

      const headers = headerRow.map((cell) => cell.toLowerCase());
      const columns = mapColumns(headers);
      if (!REQUIRED.every((key) => columns[key] !== undefined)) continue;

      const rows: GtTableRow[] = [];
      for (let i = headerIndex + 1; i < grid.length; i++) {
        const row = grid[i];
        if (!row) continue;

        const read = (key: ColumnKey): string | null => {
          const index = columns[key];
          if (index === undefined) return null;
          const value = row[index] ?? '';
          return blank(value) ? null : value;
        };

        // GT raqami bo'lmagan qator — izoh yoki bo'sh qator, o'tkazib yuboriladi.
        const gtNumber = normalizeGtNumber(read('gtNumber') ?? '');
        if (!gtNumber) continue;

        rows.push({
          gtNumber,
          customsPlace: read('customsPlace'),
          product: read('product'),
          arrivalPlace: read('arrivalPlace'),
        });
      }

      if (rows.length > 0) return rows;
    }
  }

  return [];
};
