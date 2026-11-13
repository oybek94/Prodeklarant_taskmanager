import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  LEAD_IMPORT_MAX_COLS,
  LEAD_IMPORT_MAX_UNZIPPED_BYTES,
  LeadImportFormatError,
  measureZipInflatedSize,
  parseLeadImportFile,
} from '../services/lead-import-parser';

const HEADER = ['Firma nomi', 'Viloyat', 'Viloyat', 'STIR', 'Telefon', "Mas'ul", 'Tahminiy hajmi'];

async function buildXlsx(rows: (string | number | null)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Lidlar');
  for (const row of rows) ws.addRow(row);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('parseLeadImportFile', () => {
  it('XLSX: matn va sonli kataklarni tartib bilan o\'qiydi', async () => {
    const buf = await buildXlsx([
      HEADER,
      ['Agro MCHJ', 'Toshkent', 'Chilonzor', '012345678', '+998901234567', 'Ali', 1250.6],
    ]);
    const rows = await parseLeadImportFile(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(HEADER);
    expect(rows[1]).toEqual(['Agro MCHJ', 'Toshkent', 'Chilonzor', '012345678', '+998901234567', 'Ali', 1250.6]);
  });

  it('XLSX: o\'rtadagi bo\'sh katak bo\'sh satr bo\'lib qoladi (ustunlar siljimaydi)', async () => {
    const buf = await buildXlsx([HEADER, ['Firma', null, 'Tuman', null, '901234567']]);
    const rows = await parseLeadImportFile(buf);
    expect(rows[1]).toEqual(['Firma', '', 'Tuman', '', '901234567']);
  });

  it('XLSX: boy matn va formula natijasi oddiy qiymatga keladi', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('L');
    ws.addRow(HEADER);
    ws.addRow([]);
    ws.getCell('A2').value = { richText: [{ text: 'Boy ' }, { text: 'matn' }] };
    ws.getCell('G2').value = { formula: '1+2', result: 3 };
    const rows = await parseLeadImportFile(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(rows[1][0]).toBe('Boy matn');
    expect(rows[1][6]).toBe(3);
  });

  it('CSV: vergul bilan, BOM olib tashlanadi, STIR boshidagi nol saqlanadi', async () => {
    const csv = '﻿Firma nomi,Viloyat,Viloyat,STIR\r\n"Meva, Sabzavot MCHJ",Samarqand,Urgut,012345678\r\n';
    const rows = await parseLeadImportFile(Buffer.from(csv, 'utf8'));
    expect(rows[0][0]).toBe('Firma nomi');
    expect(rows[1]).toEqual(['Meva, Sabzavot MCHJ', 'Samarqand', 'Urgut', '012345678']);
  });

  it('CSV: nuqta-vergul ajratuvchini aniqlaydi', async () => {
    const csv = 'Firma nomi;Viloyat;Viloyat;STIR\nAgro;Toshkent;Bektemir;305123456\n';
    const rows = await parseLeadImportFile(Buffer.from(csv, 'utf8'));
    expect(rows[1]).toEqual(['Agro', 'Toshkent', 'Bektemir', '305123456']);
  });

  it('eski .xls formatini tushunarli xato bilan rad etadi', async () => {
    const xls = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await expect(parseLeadImportFile(xls)).rejects.toBeInstanceOf(LeadImportFormatError);
  });

  it('buzuq ZIP (xlsx emas) LeadImportFormatError beradi', async () => {
    const broken = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('axlat')]);
    await expect(parseLeadImportFile(broken)).rejects.toBeInstanceOf(LeadImportFormatError);
  });

  it("ortiqcha ustunlar o'qilmaydi", async () => {
    const wide = Array.from({ length: 40 }, (_, i) => `u${i}`);
    const rows = await parseLeadImportFile(await buildXlsx([wide, wide]));
    expect(rows[1]).toHaveLength(LEAD_IMPORT_MAX_COLS);
  });

  it("ZIP: haqiqatda ochilgan hajm o'lchanadi", async () => {
    const buf = await buildXlsx([HEADER, ['Agro']]);
    const size = measureZipInflatedSize(buf, LEAD_IMPORT_MAX_UNZIPPED_BYTES);
    expect(size).toBeGreaterThan(buf.length / 4);
    expect(size).toBeLessThan(LEAD_IMPORT_MAX_UNZIPPED_BYTES);
  });

  it('zip-bomba: ochilgan hajm chegaradan oshsa rad etadi', async () => {
    const big = 'A'.repeat(200_000);
    const buf = await buildXlsx([HEADER, ...Array.from({ length: 50 }, () => [big])]);
    const real = measureZipInflatedSize(buf, LEAD_IMPORT_MAX_UNZIPPED_BYTES);
    expect(real).toBeGreaterThan(buf.length * 20); // kuchli siqilgan
    expect(() => measureZipInflatedSize(buf, Math.floor(real / 2))).toThrow('juda katta');
  });

  it("zip-bomba: sarlavhadagi soxta (kichik) hajmga ishonmaydi", async () => {
    const buf = await buildXlsx([HEADER, ['Agro']]);
    const real = measureZipInflatedSize(buf, LEAD_IMPORT_MAX_UNZIPPED_BYTES);
    // Barcha markaziy katalog yozuvlarida "ochilgan hajm"ni 1 bayt deb yozamiz
    const signature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    for (let at = buf.indexOf(signature); at !== -1; at = buf.indexOf(signature, at + 4)) {
      buf.writeUInt32LE(1, at + 24);
    }
    expect(measureZipInflatedSize(buf, LEAD_IMPORT_MAX_UNZIPPED_BYTES)).toBe(real);
    expect(() => measureZipInflatedSize(buf, 100)).toThrow('juda katta');
  });

  it("fayl boshiga bayt qo'shilgan ZIP rad etiladi (ofset siljishi)", async () => {
    const buf = await buildXlsx([HEADER, ['Agro']]);
    const shifted = Buffer.concat([Buffer.from('PK'), Buffer.alloc(64), buf]);
    await expect(parseLeadImportFile(shifted)).rejects.toBeInstanceOf(LeadImportFormatError);
  });

  it('lokal va markaziy sarlavhada siqish usuli farq qilsa rad etiladi', async () => {
    const buf = await buildXlsx([HEADER, ['Agro']]);
    buf.writeUInt16LE(0, 8); // birinchi lokal sarlavha: deflate -> stored
    expect(() => measureZipInflatedSize(buf, LEAD_IMPORT_MAX_UNZIPPED_BYTES)).toThrow(LeadImportFormatError);
  });

  it('notanish siqish usuli rad etiladi', async () => {
    const buf = await buildXlsx([HEADER, ['Agro']]);
    const central = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    buf.writeUInt16LE(14, central + 10); // LZMA
    await expect(parseLeadImportFile(buf)).rejects.toBeInstanceOf(LeadImportFormatError);
  });

  it('prototipni ifloslantirmaydi (__proto__ sarlavhali ustun)', async () => {
    const buf = await buildXlsx([['__proto__', 'constructor'], ['polluted', 'x']]);
    await parseLeadImportFile(buf);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
