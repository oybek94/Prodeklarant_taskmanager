import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem, Prisma } from '@prisma/client';

/** Shartnoma spetsifikatsiyasi qatori (Tovar nomi bo'yicha qidirish uchun) */
type SpecRow = { productName?: string; botanicalName?: string };

export type FssExcelPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  regionInternalCode?: string;
  regionName?: string;
  regionExternalCode?: string;
  templateType?: 'ichki' | 'tashqi';
  /** Tashqi shablon C3: spetsifikatsiyadan tovar nomi bo'yicha botanik nom qidirish uchun */
  contract?: { specification: unknown } | null;
  /** Sozlamalar bo'limidagi qadoq turlari — har doim shu ro'yxatdan L3 to'ldiriladi */
  packagingTypeCodesFromSettings?: Array<{ name: string; code: string }>;
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

/** Tovar nomini qidiruv uchun normalizatsiya (kichik harf, bo'shliq birlashtirish) */
const normalizeNameForLookup = (name: string): string => {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
};

/**
 * Botanik nomni "Наименование товара" (tovar nomi) bo'yicha topish.
 */
const BOTANICAL_BY_PRODUCT_NAME: { keys: string[]; botanical: string }[] = [
  { keys: ['вишня', 'черешня', 'cherry'], botanical: 'Prunus avium' },
  { keys: ['нектарин', 'nectarine'], botanical: 'Prunus persica var.nucipersica' },
  { keys: ['персик', 'peach', 'shaftoli'], botanical: 'Prunus persica' },
  { keys: ['абрикос', 'apricot', "o'rik", 'orik'], botanical: 'Prunus armeniaca' },
  { keys: ['гранат', 'pomegranate', 'anor'], botanical: 'Punica granatum' },
  { keys: ['помидор', 'томат', 'tomat', 'tomato', 'pomidor'], botanical: 'Solanum lycopersicum' },
  { keys: ['чеснок', 'garlic', 'sarimsoq'], botanical: 'Allium sativum' },
  { keys: ['цветная капуста', 'cauliflower'], botanical: 'Brassica oleracea var. botrytis' },
  { keys: ['морковь', 'carrot', 'sabzi'], botanical: 'Daucus carota subsp.sativus' },
  { keys: ['свекла', 'beet', 'lavlagi'], botanical: 'Beta vulgaris' },
  { keys: ['лимон', 'lemon', 'limon'], botanical: 'Citrus limon' },
  { keys: ['петрушка', 'parsley'], botanical: 'Petroselinum sativum' },
  { keys: ['пекинская капуста', 'pekin', 'peking'], botanical: 'Brassica rapa subsp. Pekinensis' },
  { keys: ['огурец', 'cucumber', 'bodring'], botanical: 'Cucumis sativus' },
  { keys: ['перец', 'pepper', 'qalampir', 'capsicum'], botanical: 'Capsicum annuum' },
  { keys: ['лук репчатый', 'onion', 'piyoz'], botanical: 'Allium cepa' },
  { keys: ['лук-порей', 'порей', 'leek'], botanical: 'Allium fistulosum' },
  { keys: ['баклажан', 'eggplant', 'baqlajon'], botanical: 'Solanum melongena' },
  { keys: ['яблоко', 'apple', 'olma'], botanical: 'Malus domestica' },
  { keys: ['дыня', 'melon', 'qovun'], botanical: 'Cucumis melo' },
  { keys: ['арбуз', 'watermelon', 'tarvuz'], botanical: 'Citrullus lanatus' },
  { keys: ['редис', 'radish', 'turp'], botanical: 'Raphanus sativus' },
  { keys: ['капуста белокочанная', 'cabbage', 'karam'], botanical: 'Brassica oleracea' },
  { keys: ['брюква', 'репа', 'turnip', 'napus'], botanical: 'Brassika napus' },
  { keys: ['слива', 'plum', "olxo'ri", 'olxori'], botanical: 'Prunus domestica' },
  { keys: ['виноград', 'grape', 'uzum'], botanical: 'Vitis vinifera' },
  { keys: ['инжир', 'fig', 'anjir'], botanical: 'Ficus carica' },
  { keys: ['груша', 'pear', 'nok'], botanical: 'Pyrus communis' },
  { keys: ['хурма', 'persimmon', 'behi'], botanical: 'Diospyros kaki' },
  { keys: ['айва', 'quince'], botanical: 'Cydonia oblonga' },
  { keys: ['лайм', 'lime', 'laim'], botanical: 'Citrus aurantiifolia' },
  { keys: ['кукуруза', 'corn', "makkajo'xori", 'makkajoxori'], botanical: 'Zea mays' },
];

/** Shartnoma spetsifikatsiyasidan faqat Tovar nomi (productName) bo'yicha botanik nomni topadi. */
function getBotanicalNameFromSpec(
  productName: string,
  contractSpec: unknown
): string {
  if (!productName || !contractSpec || !Array.isArray(contractSpec)) return '';
  const normalizedSearch = normalizeNameForLookup(productName);
  if (!normalizedSearch) return '';
  const rows = contractSpec as SpecRow[];
  for (const row of rows) {
    const specName = row?.productName ? String(row.productName).trim() : '';
    if (!specName) continue;
    const normalizedRow = normalizeNameForLookup(specName);
    if (normalizedRow === normalizedSearch || normalizedRow.includes(normalizedSearch) || normalizedSearch.includes(normalizedRow)) {
      const botanical = row?.botanicalName ? String(row.botanicalName).trim() : '';
      if (botanical) return botanical;
    }
  }
  return '';
}

const getBotanicalName = (item: InvoiceItem): string => {
  const name = item?.name ? String(item.name).trim() : '';
  if (!name) return '';
  const normalized = normalizeNameForLookup(name);
  for (const { keys, botanical } of BOTANICAL_BY_PRODUCT_NAME) {
    for (const key of keys) {
      if (normalized.includes(normalizeNameForLookup(key))) return botanical;
    }
  }
  return '';
};

/** TN VED kodini 10 xonali formatga keltiradi (oldingi nollar bilan) — BOTANICAL_BY_TNVED kalitlari bilan moslashish uchun */
function normalizeTnvedCode(code: string): string {
  const digits = (code || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length <= 10 ? digits.padStart(10, '0') : digits.slice(0, 10);
}

/** Qadoq kodi: avval Sozlamalar (packagingList) dan, keyin invoydagi additionalInfo dan qidiriladi */
const getPackagingCode = (
  item: InvoiceItem,
  additionalInfo: Record<string, any>,
  packagingListFromSettings?: Array<{ name: string; code: string }>
) => {
  const typeName = item?.packageType ? String(item.packageType).trim() : '';
  if (!typeName) return '';
  const list =
    Array.isArray(packagingListFromSettings) && packagingListFromSettings.length > 0
      ? packagingListFromSettings
      : Array.isArray(additionalInfo.packagingTypeCodes)
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
  const packagingListFromSettings = payload.packagingTypeCodesFromSettings;
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
    // FSS_template.xlsx: barcha ma'lumotlar 3-qatordan boshlanadi
    const startRow = 3;
    const contractSpec = payload.contract?.specification;
    // Botanik nom: spetsifikatsiya → kalit-so'z → TN VED kodi (C ustuni har doim to'ldirilishi uchun)
    const resolveBotanical = (item: InvoiceItem): string => {
      const name = item?.name ? String(item.name).trim() : '';
      if (name) {
        const fromSpec = getBotanicalNameFromSpec(name, contractSpec);
        if (fromSpec) return fromSpec;
      }
      const fromKeyword = getBotanicalName(item);
      if (fromKeyword) return fromKeyword;
      const normalizedCode = normalizeTnvedCode(String(item?.tnvedCode ?? ''));
      return normalizedCode ? (BOTANICAL_BY_TNVED[normalizedCode] ?? '') : '';
    };
    const firstItem = payload.items[0];
    if (firstItem) {
      setTextCell(sheet, `C${startRow}`, resolveBotanical(firstItem));
    }
    // Jami Мест (quantity) yig‘indisi — M3 va N3 uchun
    const jamiMest = payload.items.reduce(
      (sum, item) => sum + Number(item?.quantity ?? 0),
      0
    );
    payload.items.forEach((item, index) => {
      const row = startRow + index;
      const packageCode = getPackagingCode(item, additionalInfo, packagingListFromSettings);
      setTextCell(sheet, `A${row}`, item?.tnvedCode); // Код ТН ВЭД
      setTextCell(sheet, `B${row}`, item?.name); // Наименование товара
      setTextCell(sheet, `C${row}`, resolveBotanical(item)); // Ботаник номи: spetsifikatsiyadan tovar nomi bo'yicha, keyin fallback
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
    setTextCell(sheet, `M${startRow}`, jamiMest > 0 ? jamiMest : '');
    setTextCell(sheet, `N${startRow}`, jamiMest > 0 ? '017' : '');
  }

  if (workbook.views?.[0] && typeof workbook.views[0] === 'object') {
    (workbook.views[0] as { activeTab?: number }).activeTab = 0;
  }

  return workbook;
};
