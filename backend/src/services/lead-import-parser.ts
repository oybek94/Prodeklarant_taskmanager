import { Readable } from 'stream';
import { inflateRawSync } from 'zlib';
import ExcelJS from 'exceljs';

/** Import faylidan o'qilgan katak: son (Excel sonli katagi) yoki matn. */
export type LeadImportCell = string | number;

export class LeadImportFormatError extends Error {}

/** Bitta faylda qabul qilinadigan eng ko'p qator — xotira va baza yukini cheklaydi. */
export const LEAD_IMPORT_MAX_ROWS = 20000;

/** Import faqat birinchi 10 ustunni ishlatadi — ortig'i o'qilmaydi. */
export const LEAD_IMPORT_MAX_COLS = 10;
/** XLSX (ZIP) ochilgandagi umumiy hajm chegarasi — siqilgan "zip-bomba"dan himoya. */
export const LEAD_IMPORT_MAX_UNZIPPED_BYTES = 50 * 1024 * 1024;

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const ZIP_EOCD_MIN_SIZE = 22;
const ZIP_MAX_ENTRIES = 2000;
const ZIP_METHOD_STORED = 0;
const ZIP_METHOD_DEFLATE = 8;

/**
 * ZIP ichidagi har bir yozuvni haqiqatda ochib, chiqqan baytlar yig'indisini qaytaradi.
 * Sarlavhadagi e'lon qilingan hajmga ISHONILMAYDI (u soxta bo'lishi mumkin): chegaradan
 * oshgan zahoti ochish to'xtaydi. Yozuvlar exceljs (jszip) o'qiydigan yo'l bilan —
 * markaziy katalog bo'yicha topiladi, shuning uchun tekshirilgan va o'qiladigan ma'lumot bir xil.
 * Buzuq, ZIP64 yoki notanish siqish usuli — LeadImportFormatError.
 */
export function measureZipInflatedSize(buf: Buffer, limit: number): number {
  const invalid = () => new LeadImportFormatError("Excel faylini o'qib bo'lmadi");
  const tooLarge = () => new LeadImportFormatError('Excel fayli juda katta');
  // EOCD fayl oxirida, undan keyin ko'pi bilan 65535 baytli izoh bo'lishi mumkin
  const searchFloor = Math.max(0, buf.length - ZIP_EOCD_MIN_SIZE - 0xffff);
  let eocd = -1;
  for (let i = buf.length - ZIP_EOCD_MIN_SIZE; i >= searchFloor; i--) {
    if (buf.readUInt32LE(i) === ZIP_EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw invalid();

  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || offset === 0xffffffff || entryCount > ZIP_MAX_ENTRIES) throw invalid();

  let total = 0;
  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== ZIP_CENTRAL_SIGNATURE) throw invalid();
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const localOffset = buf.readUInt32LE(offset + 42);
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) throw invalid(); // ZIP64

    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== ZIP_LOCAL_SIGNATURE) throw invalid();
    const dataStart = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buf.length) throw invalid();

    if (method === ZIP_METHOD_STORED) {
      total += compressedSize;
    } else if (method === ZIP_METHOD_DEFLATE) {
      try {
        // maxOutputLength: chegaradan oshsa zlib xotira ajratmasdan xato beradi
        total += inflateRawSync(buf.subarray(dataStart, dataEnd), { maxOutputLength: limit - total + 1 }).length;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') throw tooLarge();
        throw invalid();
      }
    } else {
      throw invalid();
    }
    if (total > limit) throw tooLarge();

    offset += 46 + buf.readUInt16LE(offset + 28) + buf.readUInt16LE(offset + 30) + buf.readUInt16LE(offset + 32);
  }
  return total;
}

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
    const lastCol = Math.min(row.cellCount, LEAD_IMPORT_MAX_COLS);
    for (let col = 1; col <= lastCol; col++) {
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
    measureZipInflatedSize(buffer, LEAD_IMPORT_MAX_UNZIPPED_BYTES);
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
