import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem } from '@prisma/client';

const TEMPLATE_NAME = 'CommodityEk_New2.xlsx';
const SHEET_NAME = 'Образец';

export type ContractSpecRow = {
  specNumber?: string | null;
  productNumber?: string | null;
  productName?: string | null;
  tnvedCode?: string | null;
  [key: string]: unknown;
};

export type CommodityEkExcelPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  /** Shartnoma spetsifikatsiyasi (B va C ustunlari) va Продавец INN (H4) */
  contract?: { specification: unknown; sellerInn?: string | null } | null;
  /** I4 uchun majburiy ichki tuman kodi (masalan Oltiariq) */
  forcedRegionInternalCode?: string | null;
};

type CellMap = {
  dataStartRow: number;
  columns: Record<string, string>;
};

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

const getCellMapPath = (): string => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', 'commodity-ek_cell_map.json'),
    path.resolve(__dirname, '../../templates/commodity-ek_cell_map.json'),
    path.resolve(__dirname, '../templates/commodity-ek_cell_map.json'),
  ];
  for (const candidate of candidates) {
    try {
      require('fs').accessSync(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return path.resolve(__dirname, '../../templates/commodity-ek_cell_map.json');
};

const loadCellMap = async (): Promise<CellMap> => {
  const mapPath = getCellMapPath();
  const raw = await fs.readFile(mapPath, 'utf-8');
  const data = JSON.parse(raw) as CellMap;
  if (!data.dataStartRow || !data.columns) {
    throw new Error('commodity-ek_cell_map.json must have dataStartRow and columns');
  }
  return data;
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

const getPackageTypeCode = (item: InvoiceItem, additionalInfo: Record<string, unknown>): string => {
  const typeName = toStr(item?.packageType);
  if (!typeName) return '';
  const list = Array.isArray(additionalInfo.packagingTypeCodes)
    ? (additionalInfo.packagingTypeCodes as Array<{ name?: string; code?: string }>)
    : [];
  const match = list.find((entry) => (entry.name || '').trim() === typeName);
  return match?.code ? toStr(match.code) : '';
};

const normalizeForMatch = (s: string): string => toStr(s).toLowerCase().trim();

/** Invoysdagi tovar qatori uchun shartnoma spetsifikatsiyasidan mos qatorni topadi (TN VED va nom bo'yicha). */
const findSpecRowForItem = (
  item: InvoiceItem,
  contractSpec: ContractSpecRow[]
): ContractSpecRow | null => {
  const itemTnved = normalizeForMatch(toStr(item.tnvedCode));
  const itemName = normalizeForMatch(toStr(item.name));
  if (!itemTnved && !itemName) return null;
  for (const row of contractSpec) {
    const rowTnved = normalizeForMatch(toStr(row.tnvedCode));
    const rowName = normalizeForMatch(toStr(row.productName));
    const tnvedMatch = !itemTnved || !rowTnved || rowTnved === itemTnved;
    const nameMatch = !itemName || !rowName || rowName === itemName;
    if (tnvedMatch && nameMatch) return row;
  }
  return null;
};

/**
 * CommodityEk_New2.xlsx shablonini yuklab, aytilgan kataklarga invoys va tovar ma'lumotlarini yozadi.
 * Shablon fayl va uning tuzilishi o'zgartirilmaydi — faqat ma'lumot kataklari to'ldiriladi.
 * Ma'lumotlar commodity-ek_cell_map.json dagi ustun xaritasiga ko'ra 4-qatordan boshlab yoziladi.
 */
export async function generateCommodityEkExcel(
  payload: CommodityEkExcelPayload
): Promise<ExcelJS.Workbook> {
  const { invoice, items } = payload;
  const templatePath = await getTemplatePath();
  const cellMap = await loadCellMap();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`${TEMPLATE_NAME}: "${SHEET_NAME}" varaqi topilmadi`);
  }

  const additionalInfo = (invoice.additionalInfo || {}) as Record<string, unknown>;
  // H4 — Продавец (Sotuvchi) INN; I4 — Tanlangan tuman ichki kodi
  const sellerInn = payload.contract?.sellerInn ? toStr(payload.contract.sellerInn) : '';
  const regionInternalCode = toStr(
    payload.forcedRegionInternalCode ??
    additionalInfo.fssRegionInternalCode ??
    additionalInfo.producerRegionCode ??
    additionalInfo.regionCode
  );

  const setFixedCell = (sheetToUse: ExcelJS.Worksheet, cell: string, value: string) => {
    const c = sheetToUse.getCell(cell);
    c.value = value;
    // Shablonda formula bo'lsa, qiymat ko'rinsin degan formula ni olib tashlaymiz
    const cellAny = c as { formula?: unknown };
    if (cellAny.formula !== undefined) {
      try {
        delete cellAny.formula;
      } catch {
        // ignore
      }
    }
  };

  setFixedCell(sheet, 'H4', sellerInn);
  setFixedCell(sheet, 'I4', regionInternalCode);
  // Birinchi varaqda ham yozish (shablon birinchi varaqda sarlavha bo'lsa)
  try {
    const firstSheet = workbook.worksheets[0];
    if (firstSheet && firstSheet !== sheet) {
      setFixedCell(firstSheet, 'H4', sellerInn);
      setFixedCell(firstSheet, 'I4', regionInternalCode);
    }
  } catch (_) {
    // Birinchi varaqda H4/I4 bo'lmasa e'tiborsiz qoldirish
  }

  // B va C: Shartnoma spetsifikatsiyasidan (Clients -> Shartnoma -> Spetsifikatsiya bo'limi)
  const contractSpec = ((): ContractSpecRow[] => {
    if (!payload.contract?.specification) return [];
    const s = payload.contract.specification;
    if (!Array.isArray(s)) return [];
    return s as ContractSpecRow[];
  })();
  const producerInn = toStr(
    additionalInfo.producerInn ??
    additionalInfo.inn ??
    sellerInn
  );
  const producerRegionCode = toStr(
    additionalInfo.producerRegionCode ??
    additionalInfo.regionCode ??
    additionalInfo.fssRegionInternalCode ??
    regionInternalCode
  );

  const startRow = cellMap.dataStartRow;
  const col = cellMap.columns;

  items.forEach((item, index) => {
    const row = startRow + index;
    const packageTypeCode = getPackageTypeCode(item, additionalInfo);
    const packagesCount = toNum(item.packagesCount ?? item.quantity) !== '' ? toNum(item.packagesCount ?? item.quantity) : '';
    const grossWeight = toNum(item.grossWeight) !== '' ? toNum(item.grossWeight) : '';
    const netWeight = toNum(item.netWeight) !== '' ? toNum(item.netWeight) : '';
    // B va C: shu tovarga tegishli spetsifikatsiya qatorini TN VED va nom bo'yicha topamiz
    const specRow = findSpecRowForItem(item, contractSpec);
    const specNumberFromContract = specRow != null ? toStr(specRow.specNumber) : '';
    const productNumberFromContract = specRow != null ? toStr(specRow.productNumber) : '';

    const set = (key: keyof typeof col, value: string | number) => {
      const letter = col[key];
      if (!letter) return;
      const cell = sheet.getCell(`${letter}${row}`);
      cell.value = value === '' ? '' : value;
    };

    set('sequenceNumber', index + 1);
    set('specificationNumber', specNumberFromContract);
    set('specificationOrder', productNumberFromContract);
    set('tnvedCode', toStr(item.tnvedCode));
    set('goodsName', toStr(item.name));
    set('brandModel', toStr(additionalInfo.brandModel) || 'БЕЗ МАРКИ');
    set('countryOfOrigin', '000');
    set('producerInn', producerInn);
    set('producerRegionCode', producerRegionCode);
    set('graph43', '0');
    set('procedureCode', '000');
    set('packageTypeCode', packageTypeCode);
    set('packagesCount', packagesCount === '' ? '' : packagesCount);
    set('netWeightN', netWeight === '' ? '' : netWeight);
    set('grossWeight', grossWeight === '' ? '' : grossWeight);
    set('netWeight', netWeight === '' ? '' : netWeight);
    // Q, R, S, T, U, V, W, X — to'ldirilmaydi
  });

  return workbook;
}
