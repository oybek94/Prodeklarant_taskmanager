import { Readable } from 'stream';
import ExcelJS from 'exceljs';

/** Import faylidan o'qilgan katak: son (Excel sonli katagi) yoki matn. */
export type LeadImportCell = string | number;

export class LeadImportFormatError extends Error {}

/** Bitta faylda qabul qilinadigan eng ko'p qator — xotira va baza yukini cheklaydi. */
export const LEAD_IMPORT_MAX_ROWS = 20000;

const isZip = (buf: Buffer) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
// Eski ikkilik .xls (OLE2 konteyner) — exceljs o'qimaydi.
const isLegacyXls = (buf: Buffer) =>
  buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0;

const cellValue = (cell: ExcelJS.Cell): LeadImportCell => {
  const value = cell.value;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'result' in value && typeof value.result === 'number') {
    return value.result;
  }
  // .text boy matn, havola, formula natijasi va sanani oddiy matnga keltiradi
  return cell.text ?? '';
};

const sheetToRows = (sheet: ExcelJS.Worksheet | undefined): LeadImportCell[][] => {
  if (!sheet) return [];
  if (sheet.rowCount > LEAD_IMPORT_MAX_ROWS + 1) {
    throw new LeadImportFormatError(`Faylda qatorlar juda ko'p (eng ko'pi ${LEAD_IMPORT_MAX_ROWS})`);
  }
  const rows: LeadImportCell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: LeadImportCell[] = [];
    for (let col = 1; col <= row.cellCount; col++) {
      cells.push(cellValue(row.getCell(col)));
    }
    rows.push(cells);
  });
  return rows;
};

/** Birinchi qatordagi eng ko'p uchragan ajratuvchi (Excel RU/UZ lokali `;` bilan saqlaydi). */
const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let best = ',';
  let bestCount = 0;
  for (const candidate of [',', ';', '\t']) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
};

/**
 * Lid import faylini (XLSX yoki CSV) qatorlar massiviga aylantiradi.
 * Birinchi qator — sarlavha. Kataklar tartib bo'yicha o'qiladi (takror ustun nomlari bor).
 */
export async function parseLeadImportFile(buffer: Buffer): Promise<LeadImportCell[][]> {
  if (isLegacyXls(buffer)) {
    throw new LeadImportFormatError(
      "Eski .xls formati qo'llab-quvvatlanmaydi. Faylni .xlsx yoki .csv qilib saqlang"
    );
  }

  const workbook = new ExcelJS.Workbook();

  if (isZip(buffer)) {
    try {
      // exceljs turlari eski Buffer'ni kutadi; Node 22+ da Buffer generik bo'lgani uchun ArrayBuffer beramiz
      const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      await workbook.xlsx.load(data);
    } catch {
      throw new LeadImportFormatError("Excel faylini o'qib bo'lmadi");
    }
    return sheetToRows(workbook.worksheets[0]);
  }

  const text = buffer.toString('utf8').replace(/^﻿/, '');
  try {
    const sheet = await workbook.csv.read(Readable.from([text]), {
      parserOptions: { delimiter: detectDelimiter(text) },
      // Standart map sonlarni/sanalarni o'zgartiradi (STIR, telefon buziladi) — matnligicha qoldiramiz
      map: (value: string) => value,
    });
    return sheetToRows(sheet);
  } catch (err) {
    if (err instanceof LeadImportFormatError) throw err;
    throw new LeadImportFormatError("CSV faylini o'qib bo'lmadi");
  }
}
