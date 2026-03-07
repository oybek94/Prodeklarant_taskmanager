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

const splitRequisites = (details?: string | null) => {
  if (!details) return '';
  return String(details).trim();
};

const setCellValue = (sheet: ExcelJS.Worksheet, address: string, value: any) => {
  const cell = sheet.getCell(address);
  const target = cell.isMerged && cell.master ? cell.master : cell;
  target.value = value;
};

const buildBuyerParts = (client: Client, contract?: Contract | null, currency?: string) => {
  if (contract) {
    return {
      name: contract.buyerName || '',
      address: contract.buyerAddress || '',
      requisites: contract.buyerDetails
        ? splitRequisites(contract.buyerDetails)
        : [
            contract.buyerInn ? `INN: ${contract.buyerInn}` : '',
            contract.buyerOgrn ? `OGRN: ${contract.buyerOgrn}` : '',
            contract.buyerBankName
              ? `Bank: ${contract.buyerBankName}${contract.buyerBankSwift ? `, SWIFT: ${contract.buyerBankSwift}` : ''}`
              : '',
            contract.buyerBankAddress ? `Manzil: ${contract.buyerBankAddress}` : '',
            contract.buyerBankAccount ? `Hisob raqami: ${contract.buyerBankAccount}` : '',
            contract.buyerCorrespondentBank
              ? `Korrespondent bank: ${contract.buyerCorrespondentBank}${contract.buyerCorrespondentBankSwift ? `, SWIFT: ${contract.buyerCorrespondentBankSwift}` : ''}`
              : '',
            contract.buyerCorrespondentBankAccount ? `Kor. hisob: ${contract.buyerCorrespondentBankAccount}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
    };
  }
  return {
    name: client.name || '',
    address: client.address || '',
    requisites: [
      client.inn ? `ИНН: ${client.inn}` : '',
      client.phone ? `Тел: ${client.phone}` : '',
      client.email ? `E-mail: ${client.email}` : '',
      client.bankName ? `Банк получателя: ${client.bankName}` : '',
      client.bankAddress ? client.bankAddress : '',
      client.bankSwift ? `SWIFT: ${client.bankSwift}` : '',
      client.bankAccount ? `Текущий счет (${currency || client.dealAmountCurrency || 'USD'}): ${client.bankAccount}` : '',
      client.transitAccount ? `Транзитный счет (${currency || client.dealAmountCurrency || 'USD'}): ${client.transitAccount}` : '',
      client.correspondentBank ? `Наименование банка корреспондента: ${client.correspondentBank}` : '',
      client.correspondentBankAccount ? `Кор счет: ${client.correspondentBankAccount}` : '',
      client.correspondentBankSwift ? `SWIFT: ${client.correspondentBankSwift}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

const buildSellerParts = (contract?: Contract | null, company?: CompanySettings | null) => {
  if (contract) {
    return {
      name: contract.sellerName || '',
      address: contract.sellerLegalAddress || '',
      requisites: contract.sellerDetails
        ? splitRequisites(contract.sellerDetails)
        : [
            contract.sellerInn ? `INN: ${contract.sellerInn}` : '',
            contract.sellerOgrn ? `OGRN: ${contract.sellerOgrn}` : '',
            contract.sellerBankName
              ? `Bank: ${contract.sellerBankName}${contract.sellerBankSwift ? `, SWIFT: ${contract.sellerBankSwift}` : ''}`
              : '',
            contract.sellerBankAddress ? `Manzil: ${contract.sellerBankAddress}` : '',
            contract.sellerBankAccount ? `Hisob raqami: ${contract.sellerBankAccount}` : '',
            contract.sellerCorrespondentBank
              ? `Korrespondent bank: ${contract.sellerCorrespondentBank}${contract.sellerCorrespondentBankSwift ? `, SWIFT: ${contract.sellerCorrespondentBankSwift}` : ''}`
              : '',
            contract.sellerCorrespondentBankAccount ? `Kor. hisob: ${contract.sellerCorrespondentBankAccount}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
    };
  }
  if (company) {
    return {
      name: company.name ? `ООО "${company.name}"` : '',
      address: company.legalAddress || '',
      requisites: [
        company.actualAddress ? `Фактический адрес: ${company.actualAddress}` : '',
        company.inn ? `ИНН: ${company.inn}` : '',
        company.phone ? `Тел: ${company.phone}` : '',
        company.email ? `E-mail: ${company.email}` : '',
        company.bankAccount ? company.bankAccount : '',
        company.bankName ? `Банк: ${company.bankName}` : '',
        company.bankAddress ? `Адрес банка: ${company.bankAddress}` : '',
        company.swiftCode ? `SWIFT: ${company.swiftCode}` : '',
        company.correspondentBank ? `Банк-корреспондент: ${company.correspondentBank}` : '',
        company.correspondentBankAddress ? `Адрес банка: ${company.correspondentBankAddress}` : '',
        company.correspondentBankSwift ? `SWIFT: ${company.correspondentBankSwift}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }
  return { name: '', address: '', requisites: '' };
};

const buildConsigneeParts = (contract?: Contract | null) => {
  if (!contract) return { name: '', address: '', requisites: '' };
  return {
    name: contract.consigneeName || '',
    address: contract.consigneeAddress || '',
    requisites: contract.consigneeDetails
      ? splitRequisites(contract.consigneeDetails)
      : [
          contract.consigneeInn ? `INN: ${contract.consigneeInn}` : '',
          contract.consigneeOgrn ? `OGRN: ${contract.consigneeOgrn}` : '',
          contract.consigneeBankName
            ? `Bank: ${contract.consigneeBankName}${contract.consigneeBankSwift ? `, SWIFT: ${contract.consigneeBankSwift}` : ''}`
            : '',
          contract.consigneeBankAddress ? `Manzil: ${contract.consigneeBankAddress}` : '',
          contract.consigneeBankAccount ? `Hisob raqami: ${contract.consigneeBankAccount}` : '',
          contract.consigneeBankSwift ? `SWIFT: ${contract.consigneeBankSwift}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
  };
};

export const generateInvoiceExcel = async (payload: InvoiceExcelPayload) => {
  const templatePath = await getTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  if (Array.isArray(workbook.definedNames?.model)) {
    workbook.definedNames.model = workbook.definedNames.model
      .map((entry) => ({
        ...entry,
        ranges: entry.ranges.filter(
          (range) => range && !range.includes('[') && !range.includes('#REF!')
        ),
      }))
      .filter((entry) => entry.ranges.length > 0);
  }
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
  setCellValue(sheet, 'J1', invoiceText);
  if (invoice.contractNumber) {
    const contractDate = payload.contract?.contractDate ? formatDate(payload.contract.contractDate) : '';
    const contractText = contractDate ? `${invoice.contractNumber} от ${contractDate}` : invoice.contractNumber;
    setCellValue(sheet, 'J3', contractText);
  }

  const sellerParts = buildSellerParts(payload.contract, payload.company);
  setCellValue(sheet, 'A6', sellerParts.name);
  setCellValue(sheet, 'A7', sellerParts.address);
  setCellValue(sheet, 'A10', sellerParts.requisites);

  const buyerParts = buildBuyerParts(payload.client, payload.contract, invoice.currency);
  setCellValue(sheet, 'H6', buyerParts.name);
  setCellValue(sheet, 'H7', buyerParts.address);
  setCellValue(sheet, 'H10', buyerParts.requisites);

  const consigneeParts = buildConsigneeParts(payload.contract);
  if (consigneeParts.name || consigneeParts.address || consigneeParts.requisites) {
    setCellValue(sheet, 'H21', 'Грузополучатель');
    setCellValue(sheet, 'H22', consigneeParts.name);
    setCellValue(sheet, 'H23', consigneeParts.address);
    setCellValue(sheet, 'H26', consigneeParts.requisites);
  }

  setCellValue(sheet, 'C36', toPlain(additionalInfo.customsAddress));
  setCellValue(sheet, 'C37', toPlain(additionalInfo.deliveryTerms));
  setCellValue(sheet, 'C38', toPlain(additionalInfo.vehicleNumber));

  const ITEMS_START_ROW = 43;
  const ITEMS_END_ROW = 54;
  const ITEMS_MAX_ROWS = ITEMS_END_ROW - ITEMS_START_ROW + 1;

  items.slice(0, ITEMS_MAX_ROWS).forEach((item, index) => {
    const row = ITEMS_START_ROW + index;
    setCellValue(sheet, `A${row}`, index + 1);
    setCellValue(sheet, `B${row}`, toPlain(item.tnvedCode));
    setCellValue(sheet, `C${row}`, toPlain(item.name));
    setCellValue(sheet, `G${row}`, toPlain(item.packageType));
    setCellValue(sheet, `H${row}`, toNumber(item.packagesCount ?? item.quantity) || undefined);
    setCellValue(sheet, `I${row}`, toNumber(item.grossWeight) || undefined);
    setCellValue(sheet, `J${row}`, toNumber(item.netWeight) || undefined);
    setCellValue(sheet, `K${row}`, toNumber(item.unitPrice) || undefined);
    setCellValue(sheet, `L${row}`, toNumber(item.totalPrice) || undefined);
  });

  const totalPackages = items.reduce((sum, item) => sum + toNumber(item.packagesCount ?? item.quantity), 0);
  const totalGrossWeight = items.reduce((sum, item) => sum + toNumber(item.grossWeight), 0);
  const totalNetWeight = items.reduce((sum, item) => sum + toNumber(item.netWeight), 0);
  const totalAmount = toNumber(invoice.totalAmount);

  setCellValue(sheet, 'H55', totalPackages || undefined);
  setCellValue(sheet, 'I55', totalGrossWeight || undefined);
  setCellValue(sheet, 'J55', totalNetWeight || undefined);
  setCellValue(sheet, 'L55', totalAmount || undefined);

  setCellValue(sheet, 'A59', toPlain(invoice.notes));

  if (payload.contract?.supplierDirector) {
    setCellValue(sheet, 'C64', payload.contract.supplierDirector);
  }

  // Ensure first sheet is active
  if (workbook.views?.[0] && typeof workbook.views[0] === 'object') {
    (workbook.views[0] as { activeTab?: number }).activeTab = 0;
  }

  return workbook;
};
