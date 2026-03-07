import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem } from '@prisma/client';

export type ST1ExcelPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
};

const getTemplatePath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', 'ST1_template.xlsx'),
    path.resolve(__dirname, '../../templates', 'ST1_template.xlsx'),
    path.resolve(__dirname, '../templates', 'ST1_template.xlsx'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('ST1_template.xlsx not found in backend/templates');
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
    return String((v as { toString: () => string }).toString());
  return String(v);
};

const toNum = (v: unknown): number | '' => {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
};

/**
 * Вид упаковки. Agar invoysda Мест (quantity — palletlar soni) yozilgan bo'lsa:
 * "Вид упаковки на X паллетах", masalan "дер.ящик. на 33 паллетах".
 */
function buildVidUpakovki(item: InvoiceItem): string {
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
 * ST1 shablonini yuklab, aytilgan kataklarga invoys ma'lumotlarini yozadi.
 * Shablon tuzilishi o'zgartirilmaydi.
 * - A: Наименование товара
 * - B: Код ТН ВЭД
 * - E: Брутто
 * - F: Нетто
 * - H: Кол-во упаковки
 * - J: Вид упаковки (yoki "на X паллетах" agar Мест bor)
 * - L: Инвойс номер (faqat birinchi qator)
 * - M: Invoys sanasi (faqat birinchi qator)
 */
export async function generateST1Excel(payload: ST1ExcelPayload): Promise<ExcelJS.Workbook> {
  const { invoice, items } = payload;
  const templatePath = await getTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('ST1_template.xlsx: birinchi worksheet topilmadi');
  }

  const invoiceNumber = toStr(invoice.invoiceNumber);
  const invoiceDate = formatDate(invoice.date);

  items.forEach((item, index) => {
    const row = 2 + index;
    sheet.getCell(`A${row}`).value = toStr(item.name);
    sheet.getCell(`B${row}`).value = toStr(item.tnvedCode);
    sheet.getCell(`E${row}`).value = toNum(item.grossWeight) !== '' ? toNum(item.grossWeight) : '';
    sheet.getCell(`F${row}`).value = toNum(item.netWeight) !== '' ? toNum(item.netWeight) : '';
    sheet.getCell(`H${row}`).value = toNum(item.packagesCount) !== '' ? toNum(item.packagesCount) : '';
    sheet.getCell(`J${row}`).value = buildVidUpakovki(item);
    if (index === 0) {
      sheet.getCell(`L${row}`).value = invoiceNumber;
      sheet.getCell(`M${row}`).value = invoiceDate;
    }
  });

  return workbook;
}
