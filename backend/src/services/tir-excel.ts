import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem, Contract } from '@prisma/client';

export type TirInvoicePayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  contract?: Contract | null;
};

const getTemplatePath = async () => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', 'TIR_template.xlsx'),
    path.resolve(__dirname, '../../templates/TIR_template.xlsx'),
    path.resolve(__dirname, '../templates/TIR_template.xlsx'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('TIR_template.xlsx not found in backend/templates');
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

/** Filial nomiga qarab viloyat matni (TIR/SMR shablonlarida) */
const getRegionByBranchName = (branchName?: string | null): string => {
  if (!branchName) return '';
  const n = String(branchName).trim().toLowerCase();
  if (n.includes('oltiariq') || n.includes('oltariq')) return 'Ферганская область';
  if (n.includes('toshkent')) return 'Ташкентская область';
  if (n.includes('sirdaryo')) return 'Сурхандаринская область';
  return '';
};

type TirCellMap = {
  invoiceCell: string;
  smrCell: string;
  vehicleCell: string;
  regionCell: string;
  tableStartRow: number;
  tableEndRow: number;
  placesPackCol: string;
  nameTnvedCol: string;
  grossCol: string;
  totalGrossCell: string;
  totalPlacesCell: string;
};

const REQUIRED_TIR_KEYS: Array<keyof TirCellMap> = [
  'invoiceCell',
  'smrCell',
  'vehicleCell',
  'regionCell',
  'tableStartRow',
  'tableEndRow',
  'placesPackCol',
  'nameTnvedCol',
  'grossCol',
  'totalGrossCell',
  'totalPlacesCell',
];

const getMapPath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', 'tir_cell_map.json'),
    path.resolve(__dirname, '../../templates/tir_cell_map.json'),
    path.resolve(__dirname, '../templates/tir_cell_map.json'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('tir_cell_map.json not found in backend/templates');
};

const loadTirCellMap = async (): Promise<TirCellMap> => {
  const mapPath = await getMapPath();
  const raw = await fs.readFile(mapPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<TirCellMap>;
  const missing = REQUIRED_TIR_KEYS.filter((key) => parsed[key] === undefined || parsed[key] === null || parsed[key] === '');
  if (missing.length > 0) {
    throw new Error(`TIR cell map missing keys: ${missing.join(', ')}. Update templates/tir_cell_map.json.`);
  }
  return parsed as TirCellMap;
};

export const generateTirExcel = async (payload: TirInvoicePayload) => {
  const templatePath = await getTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  if (Array.isArray(workbook.definedNames?.model)) {
    workbook.definedNames.model = workbook.definedNames.model
      .map((entry) => ({
        ...entry,
        ranges: entry.ranges.filter((range) => !range.includes('[')),
      }))
      .filter((entry) => entry.ranges.length > 0);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('TIR template sheet not found');
  }

  const additionalInfo = (payload.invoice.additionalInfo || {}) as Record<string, any>;
  const invoiceDate = formatDate(payload.invoice.date);
  const invoiceNumber = payload.invoice.invoiceNumber || '';
  const smrNumber = toPlain(additionalInfo.smrNumber);
  const vehicleNumber = toPlain(additionalInfo.vehicleNumber);

  const map = await loadTirCellMap();

  const branchName = (payload.invoice as { branch?: { name: string } }).branch?.name;
  const regionText = getRegionByBranchName(branchName);
  if (regionText) {
    sheet.getCell(map.regionCell).value = regionText;
  }

  // Fixed cells per template requirements: H10 = invoys raqami va sanasi
  if (invoiceNumber || invoiceDate) {
    sheet.getCell(map.invoiceCell).value = invoiceNumber
      ? `${invoiceNumber} от ${invoiceDate}`
      : invoiceDate;
  }
  // SMR № bo'sh bo'lsa "Б/н от {sana}" yoziladi
  const smrText = smrNumber ? `${smrNumber} от ${invoiceDate}` : `Б/н от ${invoiceDate}`;
  sheet.getCell(map.smrCell).value = smrText;
  if (vehicleNumber) {
    sheet.getCell(map.vehicleCell).value = vehicleNumber;
  }

  const tableStartRow = map.tableStartRow;
  const tableEndRow = map.tableEndRow;
  const totalGross = payload.items.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const getPlaces = (item: InvoiceItem) => Number(item.packagesCount ?? item.quantity ?? 0);
  const totalPlaces = payload.items.reduce((sum, item) => sum + getPlaces(item), 0);
  const buildPlacesText = (item: InvoiceItem) => {
    const places = Number(item.quantity ?? 0);
    const packages = Number(item.packagesCount ?? 0);
    const pack = item.packageType || '';
    const base = [packages ? String(Math.round(packages)) : '', pack].filter(Boolean).join(' ').trim();
    if (!base) return '';
    if (places > 0) {
      return `${base} на ${Math.round(places)} паллетах`.trim();
    }
    return base;
  };
  payload.items.forEach((item, index) => {
    const rowIndex = tableStartRow + index;
    if (rowIndex > tableEndRow) return;
    const places = Math.round(getPlaces(item));
    sheet.getCell(`${map.placesPackCol}${rowIndex}`).value = buildPlacesText(item);
    sheet.getCell(`${map.nameTnvedCol}${rowIndex}`).value = item.tnvedCode
      ? `${item.name || ''} (${item.tnvedCode})`
      : (item.name || '');
    sheet.getCell(`${map.grossCol}${rowIndex}`).value = item.grossWeight
      ? `${Math.round(Number(item.grossWeight))} кг`
      : '';
  });
  for (let rowIndex = tableStartRow + payload.items.length; rowIndex <= tableEndRow; rowIndex += 1) {
    sheet.getCell(`${map.placesPackCol}${rowIndex}`).value = '';
    sheet.getCell(`${map.nameTnvedCol}${rowIndex}`).value = '';
    sheet.getCell(`${map.grossCol}${rowIndex}`).value = '';
  }
  sheet.getCell(map.totalGrossCell).value = totalGross ? `${Math.round(totalGross)} кг` : '';
  sheet.getCell(map.totalPlacesCell).value = totalPlaces ? `${Math.round(totalPlaces)}` : '';

  // Ensure first sheet is active when file is opened (only mutate existing view to satisfy WorkbookView type)
  if (workbook.views?.[0] && typeof workbook.views[0] === 'object') {
    (workbook.views[0] as { activeTab?: number }).activeTab = 0;
  }

  return workbook;
};

export const writeTirToFile = async (payload: TirInvoicePayload, fileName: string) => {
  const workbook = await generateTirExcel(payload);
  const outputDir = path.resolve(process.cwd(), 'uploads', 'tir');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);
  const buffer = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
  await fs.writeFile(outputPath, Buffer.from(buffer as ArrayBuffer));
  return outputPath;
};
