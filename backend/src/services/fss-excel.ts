import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem, Prisma } from '@prisma/client';

export type FssExcelPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  regionInternalCode?: string;
  regionName?: string;
  regionExternalCode?: string;
  templateType?: 'ichki' | 'tashqi';
};

const getTemplatePath = async (templateType?: 'ichki' | 'tashqi') => {
  const fileName =
    templateType === 'ichki' ? 'IchkiFSSMahsulotlariShabloni.xlsx' : 'FSS_template.xlsx';
  const candidates = [
    path.resolve(process.cwd(), 'templates', fileName),
    path.resolve(__dirname, '../../templates', fileName),
    path.resolve(__dirname, '../templates', fileName),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(`${fileName} not found in backend/templates`);
};

type CellValue = string | number | null | undefined | Prisma.Decimal;

const toPlain = (value?: CellValue) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value && 'toString' in value) {
    return (value as { toString: () => string }).toString();
  }
  return String(value);
};

const setTextCell = (sheet: ExcelJS.Worksheet, address: string, value?: CellValue) => {
  const cell = sheet.getCell(address);
  cell.numFmt = '@';
  cell.value = toPlain(value);
};

/** C ustunida raqamlar yoziladi — format General (Общий) */
const setGeneralCell = (sheet: ExcelJS.Worksheet, address: string, value?: CellValue) => {
  const cell = sheet.getCell(address);
  cell.numFmt = 'General';
  if (value === null || value === undefined) {
    cell.value = null;
    return;
  }
  const num = Number(value);
  cell.value = Number.isFinite(num) ? num : toPlain(value);
};

const BOTANICAL_BY_TNVED: Record<string, string> = {
  '0809290001': 'Prunus avium',
  '0809301001': 'Prunus persica var.nucipersica',
  '0809309001': 'Prunus persica',
  '0809100009': 'Prunus armeniaca',
  '0810907502': 'Punica granatum',
  '0809210001': 'Prúnus subg. Cérasus',
  '0702000001': 'Solanum lycopersicum',
  '0703200000': 'Allium sativum',
  '0704100000': 'Brassica oleracea var. botrytis',
  '0706100004': 'Daucus carota subsp.sativus',
  '0706909001': 'Beta vulgaris',
  '0706100008': 'Brassika napus',
  '0706909007': 'Raphanus sativus',
  '0805501001': 'Citrus limon',
  '0709999000': 'Petroselinum sativum',
  '0704908000': 'Brassica rapa subsp. Pekinensis',
  '0707000501': 'Cucumis sativus',
  '0709609900': 'Capsicum annuum',
  '0709601000': 'Capsicum annuum',
  '0703101900': 'Allium cepa',
  '0703900000': 'Allium fistulosum',
  '0709300000': 'Solanum melongena',
  '0808108001': 'Malus domestica',
  '0807190001': 'Cucumis melo',
  '0807110001': 'Citrullus lanatus',
  '0706909009': 'Raphanus sativus var.sativus',
  '0704901001': 'Brássica olerácea',
  '0809400501': 'Prunus domestica',
  '0806101009': 'Vitis vinifera',
  '0804201000': 'Ficus carica',
  '0808309001': 'Pyrus communis',
  '0810700009': 'Diospyros kaki',
  '0808400001': 'Cydonia oblonga',
  '0805509000': 'Citrus aurantiifolia',
  '0709996000': 'Zea mays',
};

const getBotanicalName = (item: InvoiceItem) => {
  const code = item?.tnvedCode ? String(item.tnvedCode).trim() : '';
  if (code && BOTANICAL_BY_TNVED[code]) return BOTANICAL_BY_TNVED[code];
  return '';
};

const getPackagingCode = (item: InvoiceItem, additionalInfo: Record<string, any>) => {
  const typeName = item?.packageType ? String(item.packageType).trim() : '';
  if (!typeName) return '';
  const list = Array.isArray(additionalInfo.packagingTypeCodes)
    ? (additionalInfo.packagingTypeCodes as Array<{ name?: string; code?: string }>)
    : [];
  const match = list.find((entry) => (entry.name || '').trim() === typeName);
  return match?.code ? String(match.code).trim() : '';
};

export const generateFssExcel = async (payload: FssExcelPayload) => {
  const templatePath = await getTemplatePath(payload.templateType);
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
    throw new Error('FSS template sheet not found');
  }

  const additionalInfo = (payload.invoice.additionalInfo || {}) as Record<string, any>;
  const regionInternalCode =
    payload.regionInternalCode || toPlain(additionalInfo.fssRegionInternalCode);
  const regionName = payload.regionName || toPlain(additionalInfo.fssRegionName);
  const regionExternalCode =
    payload.regionExternalCode || toPlain(additionalInfo.fssRegionExternalCode);
  const regionExternalPrefix = regionExternalCode ? regionExternalCode.slice(0, 3) : '';

  if (payload.templateType === 'ichki') {
    const startRow = 2;
    payload.items.forEach((item, index) => {
      const row = startRow + index;
      setTextCell(sheet, `A${row}`, item?.tnvedCode);
      setTextCell(sheet, `B${row}`, item?.name);
      setGeneralCell(sheet, `C${row}`, item?.netWeight);
      setTextCell(sheet, `D${row}`, '166');
      setTextCell(sheet, `E${row}`, additionalInfo.vehicleNumber);
      setTextCell(sheet, `I${row}`, regionInternalCode);
      setTextCell(sheet, `J${row}`, regionName);
    });
  } else {
    const startRow = 3;
    // Jami Мест (quantity) yig‘indisi — M3 va N3 uchun
    const jamiMest = payload.items.reduce(
      (sum, item) => sum + Number(item?.quantity ?? 0),
      0
    );
    payload.items.forEach((item, index) => {
      const row = startRow + index;
      const packageCode = getPackagingCode(item, additionalInfo);
      setTextCell(sheet, `A${row}`, item?.tnvedCode); // Код ТН ВЭД
      setTextCell(sheet, `B${row}`, item?.name); // Наименование товара
      setTextCell(sheet, `C${row}`, getBotanicalName(item)); // Ботаник номи
      setTextCell(sheet, `D${row}`, 'UZ');
      setTextCell(sheet, `E${row}`, regionExternalPrefix);
      setTextCell(sheet, `F${row}`, regionExternalCode);
      setTextCell(sheet, `G${row}`, item?.netWeight);
      setTextCell(sheet, `H${row}`, '166');
      setTextCell(sheet, `I${row}`, item?.grossWeight);
      setTextCell(sheet, `J${row}`, '166');
      setTextCell(sheet, `K${row}`, item?.packagesCount ?? item?.quantity);
      setTextCell(sheet, `L${row}`, packageCode);
      setTextCell(sheet, `O${row}`, '04');
      setTextCell(sheet, `P${row}`, additionalInfo.vehicleNumber);
    });
    // Tovarlar sonidan qat’i nazar M3 va N3 ni bir marta to‘ldirish yetarli
    setTextCell(sheet, 'M3', jamiMest > 0 ? jamiMest : '');
    setTextCell(sheet, 'N3', jamiMest > 0 ? '017' : '');
  }

  if (workbook.views?.[0] && typeof workbook.views[0] === 'object') {
    (workbook.views[0] as { activeTab?: number }).activeTab = 0;
  }

  return workbook;
};
