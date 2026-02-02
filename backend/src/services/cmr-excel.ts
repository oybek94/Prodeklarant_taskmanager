import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem, Contract } from '@prisma/client';

export type CmrInvoicePayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  contract?: Contract | null;
};

type CmrCellMap = {
  graph1Sender: string;
  graph2Receiver: string;
  graph3UnloadPlace: string;
  graph4LoadPlaceDate: string;
  graph5Documents: string;
  graph7PackagesCount: string;
  graph8PackageType: string;
  graph9GoodsDescription: string;
  graph10HsCode: string;
  graph11GrossWeight: string;
  graph13CustomsInstructions: string;
  graph13TirNumber: string;
  graph16Carrier: string;
  graph25VehicleNumber: string;
  graph25TrailerNumber: string;
};

const REQUIRED_MAP_KEYS: Array<keyof CmrCellMap> = [
  'graph1Sender',
  'graph2Receiver',
  'graph3UnloadPlace',
  'graph4LoadPlaceDate',
  'graph5Documents',
  'graph7PackagesCount',
  'graph8PackageType',
  'graph9GoodsDescription',
  'graph10HsCode',
  'graph11GrossWeight',
  'graph13CustomsInstructions',
  'graph13TirNumber',
  'graph16Carrier',
  'graph25VehicleNumber',
  'graph25TrailerNumber',
];

const getTemplatePath = async () => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', 'cmr_template.xlsx'),
    path.resolve(__dirname, '../../templates/cmr_template.xlsx'),
    path.resolve(__dirname, '../templates/cmr_template.xlsx'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('cmr_template.xlsx not found in backend/templates');
};

const getCellMapPath = () =>
  path.resolve(process.cwd(), 'templates', 'cmr_cell_map.json');

const resolveNamedRange = (workbook: ExcelJS.Workbook, name: string) => {
  const ranges = workbook.definedNames.getRanges(name) as unknown as string[];
  if (!ranges || ranges.length === 0) return null;
  const [range] = ranges;
  if (!range) return null;
  const parts = range.split('!');
  if (parts.length !== 2) return null;
  return parts[1].replace(/\$/g, '');
};

const loadCellMap = async (workbook: ExcelJS.Workbook): Promise<CmrCellMap> => {
  try {
    const mapPath = getCellMapPath();
    const raw = await fs.readFile(mapPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CmrCellMap>;
    const missing = REQUIRED_MAP_KEYS.filter((key) => !parsed[key]);
    if (missing.length === 0) {
      return parsed as CmrCellMap;
    }
  } catch {
    // fallback to named ranges
  }

  const named: Partial<CmrCellMap> = {
    graph1Sender: resolveNamedRange(workbook, 'CMR_GRAPH_1') || '',
    graph2Receiver: resolveNamedRange(workbook, 'CMR_GRAPH_2') || '',
    graph3UnloadPlace: resolveNamedRange(workbook, 'CMR_GRAPH_3') || '',
    graph4LoadPlaceDate: resolveNamedRange(workbook, 'CMR_GRAPH_4') || '',
    graph5Documents: resolveNamedRange(workbook, 'CMR_GRAPH_5') || '',
    graph7PackagesCount: resolveNamedRange(workbook, 'CMR_GRAPH_7') || '',
    graph8PackageType: resolveNamedRange(workbook, 'CMR_GRAPH_8') || '',
    graph9GoodsDescription: resolveNamedRange(workbook, 'CMR_GRAPH_9') || '',
    graph10HsCode: resolveNamedRange(workbook, 'CMR_GRAPH_10') || '',
    graph11GrossWeight: resolveNamedRange(workbook, 'CMR_GRAPH_11') || '',
    graph13CustomsInstructions: resolveNamedRange(workbook, 'CMR_GRAPH_13') || '',
    graph13TirNumber: resolveNamedRange(workbook, 'CMR_GRAPH_13_TIR') || '',
    graph16Carrier: resolveNamedRange(workbook, 'CMR_GRAPH_16') || '',
    graph25VehicleNumber: resolveNamedRange(workbook, 'CMR_GRAPH_25_VEHICLE') || '',
    graph25TrailerNumber: resolveNamedRange(workbook, 'CMR_GRAPH_25_TRAILER') || '',
  };

  const missing = REQUIRED_MAP_KEYS.filter((key) => !named[key]);
  if (missing.length > 0) {
    throw new Error(
      `CMR cell map missing keys: ${missing.join(', ')}. Provide templates/cmr_cell_map.json or named ranges.`
    );
  }
  return named as CmrCellMap;
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

/** Filial nomiga qarab viloyat matni (SMR E23, H67) */
const getRegionByBranchName = (branchName?: string | null): string => {
  if (!branchName) return '';
  const n = String(branchName).trim().toLowerCase();
  if (n.includes('oltiariq') || n.includes('oltariq')) return 'Ферганская область';
  if (n.includes('toshkent')) return 'Ташкентская область';
  if (n.includes('sirdaryo')) return 'Сурхандаринская область';
  return '';
};

const buildGoodsDescription = (items: InvoiceItem[]) => {
  if (!items.length) return '';
  return items
    .map((item) => {
      const qty = item.quantity ? Math.round(Number(item.quantity)) : '';
      const pack = item.packageType || '';
      const name = item.name || '';
      return [qty, pack, name].filter(Boolean).join(' ');
    })
    .join('\n');
};

const buildSender = (contract?: Contract | null) => {
  if (!contract) return '';
  return [contract.sellerName, contract.sellerLegalAddress].filter(Boolean).join('\n');
};

const buildReceiver = (contract?: Contract | null) => {
  if (!contract) return '';
  const consigneeName = contract.consigneeName || '';
  const consigneeAddress = contract.consigneeAddress || '';
  const buyerName = contract.buyerName || '';

  if (consigneeName && buyerName && consigneeName !== buyerName) {
    return [
      consigneeName,
      consigneeAddress,
      `п/п ${buyerName}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const name = consigneeName || buyerName;
  const address = consigneeAddress || contract.buyerAddress || '';
  return [name, address].filter(Boolean).join('\n');
};

const getTotalGrossWeight = (items: InvoiceItem[]) =>
  items.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);

const getTotalPackages = (items: InvoiceItem[]) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const getFirstItem = (items: InvoiceItem[]) => (items.length ? items[0] : null);

const getCellText = (value: ExcelJS.Cell['value']) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((item) => item.text).join('');
  }
  return String(value);
};

const replacePlaceholders = (text: string, replacements: Record<string, string>) => {
  let next = text;
  Object.entries(replacements).forEach(([placeholder, value]) => {
    if (!placeholder) return;
    next = next.split(placeholder).join(value);
  });
  return next;
};

const applyTemplatePlaceholders = (
  sheet: ExcelJS.Worksheet,
  replacements: Record<string, string>
) => {
  const multiRowPlaceholders = new Set([
    '$Продавец/Грузоотправитель$',
    '$Покупатель/Грузополучатель$',
  ]);
  const minRowByPlaceholder = new Map<string, number>();

  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.isMerged && cell.address !== cell.master?.address) return;
      const raw = getCellText(cell.value);
      if (!raw.includes('$')) return;
      raw.match(/\$[^$]+\$/g)?.forEach((placeholder) => {
        if (!multiRowPlaceholders.has(placeholder)) return;
        const currentMin = minRowByPlaceholder.get(placeholder);
        if (!currentMin || row.number < currentMin) {
          minRowByPlaceholder.set(placeholder, row.number);
        }
      });
    });
  });

  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.isMerged && cell.address !== cell.master?.address) return;
      const raw = getCellText(cell.value);
      if (!raw.includes('$')) return;
      const placeholders = raw.match(/\$[^$]+\$/g) || [];
      const shouldClear = placeholders.some((placeholder) => {
        const minRow = minRowByPlaceholder.get(placeholder);
        return minRow && row.number > minRow;
      });
      if (shouldClear) {
        const cleared = placeholders.reduce((text, placeholder) => {
          const minRow = minRowByPlaceholder.get(placeholder);
          if (minRow && row.number > minRow) {
            return text.split(placeholder).join('');
          }
          return text;
        }, raw);
        cell.value = cleared.trim();
        return;
      }
      const updated = replacePlaceholders(raw, replacements);
      if (updated !== raw) {
        cell.value = updated;
      }
    });
  });
};

export const generateCmrExcel = async (payload: CmrInvoicePayload) => {
  const templatePath = await getTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const cellMap = await loadCellMap(workbook);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('CMR template sheet not found');
  }

  const additionalInfo = (payload.invoice.additionalInfo || {}) as Record<string, any>;
  const firstItem = getFirstItem(payload.items);
  const packagesCount = getTotalPackages(payload.items);
  const grossWeight = getTotalGrossWeight(payload.items);
  const invoiceDate = formatDate(payload.invoice.date);
  const invoiceNumber = payload.invoice.invoiceNumber;

  const placeholders: Record<string, string> = {
    '$Продавец/Грузоотправитель$': buildSender(payload.contract),
    '$Покупатель/Грузополучатель$': buildReceiver(payload.contract),
    '$дата инвойса$': invoiceDate,
    '$номер и дата инвойса$': invoiceNumber ? `${invoiceNumber} от ${invoiceDate}` : invoiceDate,
    '$номер товара$': '1',
    '$Мест + Вид упаковки$': firstItem
      ? `${Math.round(Number(firstItem.quantity || 0))} ${firstItem.packageType || ''}`.trim()
      : '',
    '$Наименование товара$': buildGoodsDescription(payload.items),
    '$Код ТН ВЭД$': toPlain(firstItem?.tnvedCode),
    '$Брутто$': firstItem?.grossWeight ? `${Math.round(Number(firstItem.grossWeight))}` : '',
    '$Общий вес брутто$': grossWeight ? `${Math.round(grossWeight)} кг` : '',
    '$Место там. очистки:$': toPlain(additionalInfo.customsAddress),
    '$Условия поставки$': toPlain(additionalInfo.deliveryTerms),
    '$Номер автотранспорта$': toPlain(additionalInfo.vehicleNumber),
    '$Особые примечания$': toPlain(payload.invoice.notes),
  };

  const cellValues: Record<keyof CmrCellMap, string> = {
    graph1Sender: buildSender(payload.contract),
    graph2Receiver: buildReceiver(payload.contract),
    graph3UnloadPlace: toPlain(additionalInfo.destination),
    graph4LoadPlaceDate: [toPlain(additionalInfo.shipmentPlace), formatDate(payload.invoice.date)]
      .filter(Boolean)
      .join(' '),
    graph5Documents: toPlain(additionalInfo.documents),
    graph7PackagesCount: packagesCount ? String(packagesCount) : '',
    graph8PackageType: toPlain(firstItem?.packageType),
    graph9GoodsDescription: buildGoodsDescription(payload.items),
    graph10HsCode: toPlain(firstItem?.tnvedCode),
    graph11GrossWeight: grossWeight ? `${Math.round(grossWeight)} кг` : '',
    graph13CustomsInstructions: toPlain(additionalInfo.customsAddress),
    graph13TirNumber: toPlain(additionalInfo.tirNumber),
    graph16Carrier: toPlain(additionalInfo.carrier),
    graph25VehicleNumber: toPlain(additionalInfo.vehicleNumber),
    graph25TrailerNumber: toPlain(additionalInfo.trailerNumber),
  };

  const labelMap: Partial<Record<keyof CmrCellMap, string>> = {
    graph7PackagesCount: 'Кол-во мест',
    graph8PackageType: 'Упаковка',
    graph9GoodsDescription: 'Груз',
    graph13TirNumber: 'TIR №',
    graph25VehicleNumber: 'Тягач',
    graph25TrailerNumber: 'Прицеп',
  };

  const templateHasPlaceholders = (() => {
    let found = false;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (found) return;
        const raw = getCellText(cell.value);
        if (raw.includes('$')) found = true;
      });
    });
    return found;
  })();

  const addressCounts = REQUIRED_MAP_KEYS.reduce<Record<string, number>>((acc, key) => {
    const address = cellMap[key];
    if (address) acc[address] = (acc[address] || 0) + 1;
    return acc;
  }, {});

  const addressValues = new Map<string, string[]>();
  if (!templateHasPlaceholders) {
    REQUIRED_MAP_KEYS.forEach((key) => {
      const address = cellMap[key];
      const value = cellValues[key];
      if (!address || !value) return;
      const needsLabel = (addressCounts[address] || 0) > 1;
      const label = labelMap[key];
      const finalValue = needsLabel && label ? `${label}: ${value}` : value;
      const list = addressValues.get(address) || [];
      list.push(finalValue);
      addressValues.set(address, list);
    });
  }

  addressValues.forEach((values, address) => {
    const cell = sheet.getCell(address);
    const existing = getCellText(cell.value);
    const next = existing ? `${existing}\n${values.join('\n')}` : values.join('\n');
    cell.value = next;
  });

  applyTemplatePlaceholders(sheet, placeholders);

  if (additionalInfo.tirNumber) {
    sheet.getCell('J30').value = toPlain(additionalInfo.tirNumber);
  }
  if (additionalInfo.destination) {
    sheet.getCell('E18').value = toPlain(additionalInfo.destination);
  }
  if (payload.invoice.notes) {
    sheet.getCell('AF27').value = toPlain(payload.invoice.notes);
  }
  const branchName = (payload.invoice as { branch?: { name: string } }).branch?.name;
  const regionByBranch = getRegionByBranchName(branchName);
  const shipmentPlaceText = regionByBranch || toPlain(additionalInfo.shipmentPlace);
  if (shipmentPlaceText) {
    sheet.getCell('E23').value = shipmentPlaceText;
    sheet.getCell('H67').value = shipmentPlaceText;
  }

  const tableStartRow = 34;
  const tableEndRow = 41;
  const writeItemCell = (row: number, col: string, value: string) => {
    sheet.getCell(`${col}${row}`).value = value;
  };
  const buildG34Text = (item?: InvoiceItem) => {
    if (!item) return '';
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
  const formatPackage = (item: InvoiceItem) => {
    const places = Math.round(Number(item.packagesCount ?? item.quantity ?? 0));
    const pack = item.packageType || '';
    return [places ? String(places) : '', pack].filter(Boolean).join(' ').trim();
  };

  payload.items.forEach((item, index) => {
    const row = tableStartRow + index;
    if (row > tableEndRow) return;
    writeItemCell(row, 'B', String(index + 1));
    writeItemCell(row, 'K', formatPackage(item));
    writeItemCell(row, 'U', item.name || '');
    writeItemCell(row, 'AM', item.tnvedCode || '');
    writeItemCell(row, 'AT', item.grossWeight ? `${Math.round(Number(item.grossWeight))}` : '');
  });
  for (let row = tableStartRow + payload.items.length; row <= tableEndRow; row += 1) {
    writeItemCell(row, 'B', '');
    writeItemCell(row, 'K', '');
    writeItemCell(row, 'U', '');
    writeItemCell(row, 'AM', '');
    writeItemCell(row, 'AT', '');
  }

  // K34 ni tozalash va G34 ni format bo'yicha yozish
  writeItemCell(34, 'K', '');
  writeItemCell(34, 'G', buildG34Text(firstItem));

  return workbook;
};

export const writeCmrToFile = async (
  payload: CmrInvoicePayload,
  fileName: string
) => {
  const workbook = await generateCmrExcel(payload);
  const outputDir = path.resolve(process.cwd(), 'uploads', 'cmr');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
};
