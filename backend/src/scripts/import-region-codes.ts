import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../prisma';

const getCellText = (value: ExcelJS.Cell['value']) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(Math.trunc(value));
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((item) => item.text).join('');
  }
  return String(value);
};

const normalizeHeader = (value: string) => value.trim().toLowerCase();
const normalizeName = (value: string) =>
  value
    .replace(/тумani/gi, 'тумани')
    .replace(/tумani/gi, 'тумани')
    .replace(/tумани/gi, 'тумани')
    .replace(/ТУМANI/g, 'ТУМАНИ');

const main = async () => {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error('XLSX fayl yo\'li kerak. Masalan: tsx src/scripts/import-region-codes.ts "C:\\path\\kodlar.xlsx"');
  }
  const shouldReplace = process.argv.includes('--replace');
  const filePath = path.resolve(fileArg);
  const ext = path.extname(filePath).toLowerCase();

  const data: Array<{ name: string; internalCode: string; externalCode: string }> = [];
  const seen = new Set<string>();

  if (ext === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('Sheet topilmadi');
    }

    const headerRow = sheet.getRow(1);
    const headers = headerRow.values as Array<string | number | null | undefined>;
    const headerMap = new Map<string, number>();
    headers.forEach((value, idx) => {
      if (!value || typeof value === 'object') return;
      headerMap.set(normalizeHeader(String(value)), idx);
    });

    const nameCol = headerMap.get('hudud');
    const internalCol = headerMap.get('kod ichki');
    const externalCol = headerMap.get('kod tashqi');

    if (!nameCol || !internalCol || !externalCol) {
      throw new Error('Headerlar topilmadi: "Hudud", "Kod ichki", "Kod tashqi" bo\'lishi kerak');
    }

    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const row = sheet.getRow(rowIndex);
      const name = normalizeName(getCellText(row.getCell(nameCol).value).trim());
      const internalCode = getCellText(row.getCell(internalCol).value).trim();
      const externalCode = getCellText(row.getCell(externalCol).value).trim();
      if (!name && !internalCode && !externalCode) continue;
      if (!name || !internalCode || !externalCode) continue;
      const key = `${name}__${internalCode}__${externalCode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({ name, internalCode, externalCode });
    }
  } else if (ext === '.txt') {
    const raw = await fs.readFile(filePath, 'utf-8');
    raw.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (index === 0 && normalizeHeader(trimmed).includes('hudud')) return;
      const parts = trimmed.split(/\t+/).map((part) => part.trim()).filter(Boolean);
      let name = '';
      let internalCode = '';
      let externalCode = '';
      if (parts.length >= 3) {
        name = normalizeName(parts[0]);
        internalCode = parts[1];
        externalCode = parts[2];
      } else {
        const match = trimmed.match(/^(.*?)(\d{6,})\s+(\d{3,})$/);
        if (match) {
          name = normalizeName(match[1].trim());
          internalCode = match[2].trim();
          externalCode = match[3].trim();
        }
      }
      if (!name || !internalCode || !externalCode) return;
      const key = `${name}__${internalCode}__${externalCode}`;
      if (seen.has(key)) return;
      seen.add(key);
      data.push({ name, internalCode, externalCode });
    });
  } else {
    throw new Error('Faqat .xlsx yoki .txt fayl qabul qilinadi');
  }

  if (data.length === 0) {
    throw new Error('Import uchun ma\'lumot topilmadi');
  }

  if (shouldReplace) {
    if (!('regionCode' in prisma)) {
      throw new Error('Prisma client yangilanmagan. Avval "npx prisma generate" ni ishga tushiring.');
    }
    await prisma.regionCode.deleteMany();
  }

  if (!('regionCode' in prisma)) {
    throw new Error('Prisma client yangilanmagan. Avval "npx prisma generate" ni ishga tushiring.');
  }
  await prisma.regionCode.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Imported ${data.length} region codes`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
