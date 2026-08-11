import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { mapHeaders, isOrderHeaderRow, type FieldKey } from './headers.js';

export type OrderPosition = Record<FieldKey, string | null>;

export type ParseResult =
  | { status: 'no-table' }
  | { status: 'ok'; positions: OrderPosition[] }
  | { status: 'unparsable'; reason: string };

/** Katakdagi matn: <br> va blok teglar bo'shliqqa aylanadi, bo'shliqlar siqiladi. */
const cellText = ($: cheerio.CheerioAPI, cell: Element): string => {
  const clone = $(cell).clone();
  clone.find('br').replaceWith(' ');
  clone.find('p, div, li').append(' ');
  return clone
    .text()
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeHeader = (text: string): string => text.toLowerCase();

const isBlank = (value: string): boolean => value === '' || value === '-' || value === '—';

const intAttr = (el: Element, name: string): number => {
  const raw = el.attribs?.[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

/** Faqat shu jadvalga tegishli (ichma-ich jadvallarnikini emas) elementlarni oladi. */
const ownDescendants = (
  $: cheerio.CheerioAPI,
  table: Element,
  selector: string,
): Element[] =>
  $(table)
    .find(selector)
    .toArray()
    .filter((el): el is Element => $(el as AnyNode).closest('table').get(0) === table);

/**
 * <table> ni to'rtburchak matn to'riga aylantiradi.
 * colspan/rowspan hisobga olinadi — aks holda ustun indekslari surilib ketadi.
 */
export const buildGrid = ($: cheerio.CheerioAPI, table: Element): string[][] => {
  const rows = ownDescendants($, table, 'tr');
  const grid: (string | undefined)[][] = [];

  const ensureRow = (index: number): (string | undefined)[] => {
    let row = grid[index];
    if (!row) {
      row = [];
      grid[index] = row;
    }
    return row;
  };

  rows.forEach((tr, rowIndex) => {
    const row = ensureRow(rowIndex);
    const cells = $(tr)
      .find('td, th')
      .toArray()
      .filter((el): el is Element => $(el as AnyNode).closest('tr').get(0) === tr);

    let col = 0;
    for (const cell of cells) {
      while (row[col] !== undefined) col++;

      const text = cellText($, cell);
      const colspan = intAttr(cell, 'colspan');
      const rowspan = intAttr(cell, 'rowspan');

      for (let dr = 0; dr < rowspan; dr++) {
        const target = ensureRow(rowIndex + dr);
        for (let dc = 0; dc < colspan; dc++) {
          target[col + dc] = dr === 0 && dc === 0 ? text : '';
        }
      }

      col += colspan;
    }
  });

  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);
  return grid.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ''));
};

/**
 * Sarlavha qatorini topadi.
 * Ba'zi xatlarda sarlavha ikki qatorga bo'linadi — shu holat uchun
 * qo'shni qatorlarni birlashtirib ham tekshiriladi.
 */
const findHeaderRow = (
  grid: string[][],
): { headers: string[]; dataStartIndex: number } | null => {
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    if (!row) continue;
    const headers = row.map(normalizeHeader);
    if (isOrderHeaderRow(headers)) {
      return { headers, dataStartIndex: i + 1 };
    }
  }

  for (let i = 0; i < grid.length - 1; i++) {
    const first = grid[i];
    const second = grid[i + 1];
    if (!first || !second) continue;
    const merged = first.map((cell, index) =>
      normalizeHeader(`${cell} ${second[index] ?? ''}`.trim()),
    );
    if (isOrderHeaderRow(merged)) {
      return { headers: merged, dataStartIndex: i + 2 };
    }
  }

  return null;
};

/**
 * Xat HTML'idan zakaz pozitsiyalarini ajratadi.
 *
 * - 'no-table'    — bu xatda zakaz jadvali yo'q (bot jim turadi)
 * - 'ok'          — pozitsiyalar ajratildi
 * - 'unparsable'  — jadval bor, lekin qatorlarni o'qib bo'lmadi (ogohlantirish kerak)
 */
export const extractOrderPositions = (html: string): ParseResult => {
  const $ = cheerio.load(html);
  const tables = $('table').toArray() as Element[];

  for (const table of tables) {
    const grid = buildGrid($, table);
    const header = findHeaderRow(grid);
    if (!header) continue;

    const columns = mapHeaders(header.headers);
    const positions: OrderPosition[] = [];

    for (let i = header.dataStartIndex; i < grid.length; i++) {
      const row = grid[i];
      if (!row) continue;

      const read = (key: FieldKey): string | null => {
        const index = columns[key];
        if (index === undefined) return null;
        const value = row[index] ?? '';
        return isBlank(value) ? null : value;
      };

      const position: OrderPosition = {
        supplier: read('supplier'),
        orderNumber: read('orderNumber'),
        productRu: read('productRu'),
        plu: read('plu'),
        size: read('size'),
        price: read('price'),
        currency: read('currency'),
        warehouse: read('warehouse'),
        warehouseAddress: read('warehouseAddress'),
        etd: read('etd'),
        eta: read('eta'),
      };

      // Haqiqiy pozitsiya qatorimi? Jadval oxiridagi tugma/izoh qatorlarini
      // chetlab o'tish uchun uchta asosiy maydondan kamida bittasi to'lgan bo'lishi kerak.
      const isRealRow = Boolean(position.orderNumber || position.plu || position.productRu);
      if (isRealRow) positions.push(position);
    }

    if (positions.length === 0) {
      return {
        status: 'unparsable',
        reason: 'Zakaz jadvali topildi, lekin birorta ham pozitsiya qatori o\'qilmadi',
      };
    }

    return { status: 'ok', positions };
  }

  return { status: 'no-table' };
};
