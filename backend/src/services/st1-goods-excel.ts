import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem } from '@prisma/client';

export type ST1GoodsExcelPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
};

const TEMPLATE_NAME = 'goods.xlsx';
/** Sarlavha 1-qatorda, ma'lumot 2-qatordan boshlanadi */
const DATA_START_ROW = 2;

const getTemplatePath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', TEMPLATE_NAME),
    path.resolve(__dirname, '../../templates', TEMPLATE_NAME),
    path.resolve(__dirname, '../templates', TEMPLATE_NAME),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(`${TEMPLATE_NAME} not found in backend/templates`);
};

const formatDate = (value?: Date | string | null): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
};

const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v !== null && 'toString' in (v as object))
    return String((v as { toString: () => string }).toString()).trim();
  return String(v).trim();
};

const toNum = (v: unknown): number | '' => {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
};

/**
 * Qadoqlash turi matnini tayyorlaydi.
 * Agar invoysda Мест (quantity — palletlar/joylar soni) yozilgan bo'lsa:
 * "пласт.ящик на 29 паллетах" ko'rinishida yoziladi.
 */
export function buildVidUpakovki(item: Partial<InvoiceItem>): string {
  const pack = toStr(item.packageType).trim();
  const mest = Number(item.quantity ?? 0);
  if (mest > 0 && pack) {
    return `${pack} на ${Math.round(mest)} паллетах`;
  }
  if (mest > 0) {
    return `на ${Math.round(mest)} паллетах`;
  }
  return pack;
}

/**
 * goods.xlsx (yangi ST-1 dasturi uchun tovarlar ro'yxati) shablonini yuklab,
 * 2-qatordan boshlab invoys tovarlarini yozadi. Shablon tuzilishi va
 * "Birliklar" varag'i o'zgartirilmaydi.
 * - A: № (tartib raqami)
 * - B: Tovar tasnifi (nomi)
 * - C: Tovar TIF TN raqami
 * - D: Miqdor (toldirilmaydi)
 * - E: Miqdor birligi (to'ldirilmaydi — dasturning o'zi tanlaydi)
 * - F: Brutto vazn (kg)
 * - G: Netto vazni (kg)
 * - H: Joylar soni
 * - I: Qadoqlash turi (masalan "пласт.ящик на 29 паллетах")
 * - J: Hisob-faktura raqami (faqat birinchi qator)
 * - K: Hisob-faktura sanasi (faqat birinchi qator)
 */
export async function generateST1GoodsExcel(payload: ST1GoodsExcelPayload): Promise<ExcelJS.Workbook> {
  const { invoice, items } = payload;
  const templatePath = await getTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`${TEMPLATE_NAME}: birinchi worksheet topilmadi`);
  }

  const invoiceNumber = toStr(invoice.invoiceNumber);
  const invoiceDate = formatDate(invoice.date);

  items.forEach((item, index) => {
    const row = DATA_START_ROW + index;

    sheet.getCell(`A${row}`).value = index + 1;
    sheet.getCell(`B${row}`).value = toStr(item.name);
    sheet.getCell(`C${row}`).value = toStr(item.tnvedCode);
    sheet.getCell(`D${row}`).value = '';
    sheet.getCell(`E${row}`).value = '';
    sheet.getCell(`F${row}`).value = toNum(item.grossWeight);
    sheet.getCell(`G${row}`).value = toNum(item.netWeight);
    sheet.getCell(`H${row}`).value = toNum(item.packagesCount);
    sheet.getCell(`I${row}`).value = buildVidUpakovki(item);
    if (index === 0) {
      sheet.getCell(`J${row}`).value = invoiceNumber;
      sheet.getCell(`K${row}`).value = invoiceDate;
    }
  });

  return workbook;
}

