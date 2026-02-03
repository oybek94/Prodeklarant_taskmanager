import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Client, CompanySettings, Contract, Invoice, InvoiceItem } from '@prisma/client';

export type InvoiceExcelPayload = {
  invoice: Invoice & { items: InvoiceItem[] };
  client: Client;
  contract?: Contract | null;
  company?: CompanySettings | null;
};

const getTemplatePath = async () => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', 'invoice_template.xlsx'),
    path.resolve(__dirname, '../../templates/invoice_template.xlsx'),
    path.resolve(__dirname, '../templates/invoice_template.xlsx'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('invoice_template.xlsx not found in backend/templates');
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
};

const toPlain = (value?: string | null) => (value ? String(value) : '');

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const buildSellerText = (contract?: Contract | null, company?: CompanySettings | null) => {
  if (contract) {
    const lines: string[] = [];
    if (contract.sellerName) lines.push(contract.sellerName);
    if (contract.sellerLegalAddress) lines.push(contract.sellerLegalAddress);
    if (contract.sellerInn) lines.push(`INN: ${contract.sellerInn}`);
    if (contract.sellerOgrn) lines.push(`OGRN: ${contract.sellerOgrn}`);
    if (contract.sellerDetails) {
      lines.push(contract.sellerDetails);
    } else {
      if (contract.sellerBankName) {
        lines.push(
          `Bank: ${contract.sellerBankName}${contract.sellerBankSwift ? `, SWIFT: ${contract.sellerBankSwift}` : ''}`
        );
      }
      if (contract.sellerBankAddress) lines.push(`Manzil: ${contract.sellerBankAddress}`);
      if (contract.sellerBankAccount) lines.push(`Hisob raqami: ${contract.sellerBankAccount}`);
      if (contract.sellerCorrespondentBank) {
        lines.push(
          `Korrespondent bank: ${contract.sellerCorrespondentBank}${contract.sellerCorrespondentBankSwift ? `, SWIFT: ${contract.sellerCorrespondentBankSwift}` : ''}`
        );
      }
      if (contract.sellerCorrespondentBankAccount) {
        lines.push(`Kor. hisob: ${contract.sellerCorrespondentBankAccount}`);
      }
    }
    return lines.filter(Boolean).join('\n');
  }

  if (company) {
    const lines: string[] = [];
    if (company.name) lines.push(`ООО "${company.name}"`);
    if (company.legalAddress) lines.push(`Юридический адрес: ${company.legalAddress}`);
    if (company.actualAddress) lines.push(`Фактический адрес: ${company.actualAddress}`);
    if (company.inn) lines.push(`ИНН: ${company.inn}`);
    if (company.phone || company.email) {
      lines.push(`Тел: ${company.phone || ''}${company.phone && company.email ? '  ' : ''}e-mail: ${company.email || ''}`);
    }
    if (company.bankAccount) lines.push(company.bankAccount);
    if (company.bankName) lines.push(`Банк: ${company.bankName}`);
    if (company.bankAddress) lines.push(`Адрес банка: ${company.bankAddress}`);
    if (company.swiftCode) lines.push(`SWIFT: ${company.swiftCode}`);
    if (company.correspondentBank) lines.push(`Банк-корреспондент: ${company.correspondentBank}`);
    if (company.correspondentBankAddress) lines.push(`Адрес банка: ${company.correspondentBankAddress}`);
    if (company.correspondentBankSwift) lines.push(`SWIFT: ${company.correspondentBankSwift}`);
    return lines.filter(Boolean).join('\n');
  }

  return '';
};

const buildBuyerText = (client: Client, contract?: Contract | null, currency?: string) => {
  if (contract) {
    const lines: string[] = [];
    if (contract.buyerName) lines.push(contract.buyerName);
    if (contract.buyerAddress) lines.push(contract.buyerAddress);
    if (contract.buyerInn) lines.push(`INN: ${contract.buyerInn}`);
    if (contract.buyerOgrn) lines.push(`OGRN: ${contract.buyerOgrn}`);
    if (contract.buyerDetails) {
      lines.push(contract.buyerDetails);
    } else {
      if (contract.buyerBankName) {
        lines.push(
          `Bank: ${contract.buyerBankName}${contract.buyerBankSwift ? `, SWIFT: ${contract.buyerBankSwift}` : ''}`
        );
      }
      if (contract.buyerBankAddress) lines.push(`Manzil: ${contract.buyerBankAddress}`);
      if (contract.buyerBankAccount) lines.push(`Hisob raqami: ${contract.buyerBankAccount}`);
      if (contract.buyerCorrespondentBank) {
        lines.push(
          `Korrespondent bank: ${contract.buyerCorrespondentBank}${contract.buyerCorrespondentBankSwift ? `, SWIFT: ${contract.buyerCorrespondentBankSwift}` : ''}`
        );
      }
      if (contract.buyerCorrespondentBankAccount) {
        lines.push(`Kor. hisob: ${contract.buyerCorrespondentBankAccount}`);
      }
    }
    const contractText = lines.filter(Boolean).join('\n');
    if (contractText.trim()) {
      return contractText;
    }
  }

  const lines: string[] = [];
  if (client.name) lines.push(client.name);
  if (client.address) lines.push(`Адрес: ${client.address}`);
  if (client.inn) lines.push(`ИНН: ${client.inn}`);
  if (client.phone) lines.push(`Тел: ${client.phone}`);
  if (client.email) lines.push(`E-mail: ${client.email}`);
  if (client.bankName) lines.push(`Банк получателя: ${client.bankName}`);
  if (client.bankAddress) lines.push(client.bankAddress);
  if (client.bankSwift) lines.push(`SWIFT: ${client.bankSwift}`);
  if (client.bankAccount) {
    lines.push(`Текущий счет (${currency || client.dealAmountCurrency || 'USD'}): ${client.bankAccount}`);
  }
  if (client.transitAccount) {
    lines.push(`Транзитный счет (${currency || client.dealAmountCurrency || 'USD'}): ${client.transitAccount}`);
  }
  if (client.correspondentBank) lines.push(`Наименование банка корреспондента: ${client.correspondentBank}`);
  if (client.correspondentBankAccount) lines.push(`Кор счет: ${client.correspondentBankAccount}`);
  if (client.correspondentBankSwift) lines.push(`SWIFT: ${client.correspondentBankSwift}`);
  return lines.filter(Boolean).join('\n');
};

const numberToWords = (num: number, currency: string): string => {
  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  if (num === 0) return currency === 'USD' ? 'ноль долларов США' : 'ноль сумов';

  const whole = Math.floor(num);
  const dec = Math.round((num - whole) * 100);
  let result = '';

  const th = Math.floor(whole / 1000);
  if (th > 0) {
    if (th === 1) result += 'одна тысяча ';
    else if (th < 5) result += `${convertHundreds(th, ones, tens, teens, hundreds)} тысячи `;
    else result += `${convertHundreds(th, ones, tens, teens, hundreds)} тысяч `;
  }
  const rem = whole % 1000;
  if (rem > 0) result += convertHundreds(rem, ones, tens, teens, hundreds);

  if (currency === 'USD') {
    if (whole === 1) result += ' доллар США';
    else if (whole < 5) result += ' доллара США';
    else result += ' долларов США';
  } else {
    if (whole === 1) result += ' сум';
    else if (whole < 5) result += ' сума';
    else result += ' сумов';
  }
  if (dec > 0) result += ` ${dec} ${currency === 'USD' ? 'центов' : 'тиин'}`;
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const convertHundreds = (
  num: number,
  ones: string[],
  tens: string[],
  teens: string[],
  hundreds: string[]
) => {
  if (num === 0) return '';
  let result = '';
  const h = Math.floor(num / 100);
  if (h > 0) result += hundreds[h] + ' ';
  const remainder = num % 100;
  if (remainder >= 10 && remainder < 20) {
    result += teens[remainder - 10];
  } else {
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;
    if (t > 0) result += tens[t] + ' ';
    if (o > 0) result += ones[o];
  }
  return result.trim();
};

const safeMergeCells = (sheet: ExcelJS.Worksheet, range: string) => {
  try {
    sheet.mergeCells(range);
  } catch {
    // ignore if already merged
  }
};

export const generateInvoiceExcel = async (payload: InvoiceExcelPayload) => {
  const templatePath = await getTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Invoice template sheet not found');
  }

  const invoice = payload.invoice;
  const items = invoice.items || [];
  const additionalInfo = (invoice.additionalInfo || {}) as Record<string, any>;

  const invoiceDate = formatDate(invoice.date);
  const invoiceNumber = invoice.invoiceNumber || '';
  const invoiceText = invoiceNumber ? `${invoiceNumber} от ${invoiceDate}` : invoiceDate;
  sheet.getCell('C1').value = invoiceText;
  if (invoice.contractNumber) {
    sheet.getCell('C2').value = invoice.contractNumber;
  }

  sheet.getCell('A5').value = buildSellerText(payload.contract, payload.company);
  sheet.getCell('F5').value = buildBuyerText(payload.client, payload.contract, invoice.currency);

  const additionalRows = [
    { row: 13, value: additionalInfo.deliveryTerms },
    { row: 14, value: additionalInfo.vehicleNumber },
    { row: 15, value: additionalInfo.shipmentPlace },
    { row: 16, value: additionalInfo.destination },
    { row: 17, value: additionalInfo.origin },
    { row: 18, value: additionalInfo.manufacturer },
    { row: 19, value: additionalInfo.orderNumber },
    { row: 20, value: additionalInfo.gln },
    { row: 21, value: additionalInfo.harvestYear },
  ];
  additionalRows.forEach(({ row, value }) => {
    sheet.getCell(`E${row}`).value = toPlain(value);
  });

  const ITEMS_START_ROW = 23;
  const ITEMS_MAX_ROWS = 20;
  const BASE_TOTAL_ROW = 43;
  const BASE_AMOUNT_WORDS_ROW = 45;
  const BASE_NOTES_LABEL_ROW = 47;
  const BASE_NOTES_ROW_START = 48;
  const BASE_NOTES_ROW_END = 50;
  const BASE_SIGNATURE_ROW = 52;
  const BASE_RELEASE_ROW = 54;

  const extraRows = Math.max(0, items.length - ITEMS_MAX_ROWS);
  if (extraRows > 0) {
    sheet.spliceRows(BASE_TOTAL_ROW, 0, ...Array.from({ length: extraRows }, () => []));
  }

  const tableRowCount = Math.max(items.length, ITEMS_MAX_ROWS);
  const tableEndRow = ITEMS_START_ROW + tableRowCount - 1;

  items.forEach((item, index) => {
    const row = ITEMS_START_ROW + index;
    sheet.getCell(`A${row}`).value = index + 1;
    sheet.getCell(`B${row}`).value = toPlain(item.tnvedCode);
    sheet.getCell(`C${row}`).value = toPlain(item.pluCode);
    sheet.getCell(`D${row}`).value = toPlain(item.name);
    sheet.getCell(`E${row}`).value = toPlain(item.packageType);
    sheet.getCell(`F${row}`).value = toPlain(item.unit);
    sheet.getCell(`G${row}`).value = toNumber(item.quantity) || undefined;
    sheet.getCell(`H${row}`).value = toNumber(item.grossWeight) || undefined;
    sheet.getCell(`I${row}`).value = toNumber(item.netWeight) || undefined;
    sheet.getCell(`J${row}`).value = toNumber(item.unitPrice) || undefined;
    sheet.getCell(`K${row}`).value = toNumber(item.totalPrice) || undefined;
  });

  const totalQuantity = items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  const totalGrossWeight = items.reduce((sum, item) => sum + toNumber(item.grossWeight), 0);
  const totalNetWeight = items.reduce((sum, item) => sum + toNumber(item.netWeight), 0);
  const totalAmount = toNumber(invoice.totalAmount);

  const totalRow = BASE_TOTAL_ROW + extraRows;
  sheet.getCell(`G${totalRow}`).value = totalQuantity || undefined;
  sheet.getCell(`H${totalRow}`).value = totalGrossWeight || undefined;
  sheet.getCell(`I${totalRow}`).value = totalNetWeight || undefined;
  sheet.getCell(`K${totalRow}`).value = totalAmount || undefined;

  const amountWordsRow = BASE_AMOUNT_WORDS_ROW + extraRows;
  const amountInWords = numberToWords(totalAmount, invoice.currency || 'USD');
  sheet.getCell(`A${amountWordsRow}`).value = `Сумма прописью: ${amountInWords}`;

  const notesLabelRow = BASE_NOTES_LABEL_ROW + extraRows;
  const notesRowStart = BASE_NOTES_ROW_START + extraRows;
  const notesRowEnd = BASE_NOTES_ROW_END + extraRows;
  sheet.getCell(`A${notesLabelRow}`).value = 'Особые примечания';
  sheet.getCell(`A${notesRowStart}`).value = toPlain(invoice.notes);
  safeMergeCells(sheet, `A${notesRowStart}:K${notesRowEnd}`);

  const signatureRow = BASE_SIGNATURE_ROW + extraRows;
  const releaseRow = BASE_RELEASE_ROW + extraRows;
  if (payload.contract?.supplierDirector) {
    sheet.getCell(`A${signatureRow}`).value = `Руководитель Поставщика: ${payload.contract.supplierDirector}`;
  }
  if (payload.contract?.goodsReleasedBy) {
    sheet.getCell(`A${releaseRow}`).value = `Товар отпустил: ${payload.contract.goodsReleasedBy}`;
  }

  // Ensure first sheet is active
  if (workbook.views?.[0] && typeof workbook.views[0] === 'object') {
    (workbook.views[0] as { activeTab?: number }).activeTab = 0;
  }

  return workbook;
};
