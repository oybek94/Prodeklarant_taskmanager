import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  IParagraphOptions,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { Contract, CompanySettings, Invoice, InvoiceItem, Prisma } from '@prisma/client';
import { DocImage, loadUploadImage } from './origin-info-doc';

/**
 * Eksportyor korxona nomidan xat yozish uchun firma blankasi (Word).
 *
 * Dizayn backend/templates/Firma_blankasi.docx bilan bir xil: tepada logo va
 * kontaktlar, ikki qavatli ko'k chiziq, pastda rekvizitlar. Ikki xil tana:
 *  - 'blank' — adresat, mavzu va matn bo'sh joy, deklarant Word'da o'zi yozadi;
 *  - 'gmo'   — GMO ishlatilmagani haqida spravka, mahsulot va transport
 *              ma'lumotlari invoysdan to'ldiriladi.
 */

export type LetterheadKind = 'blank' | 'gmo';

export type LetterheadPayload = {
  contract?: Contract | null;
  companySettings?: CompanySettings | null;
  kind?: LetterheadKind;
  /** 'gmo' uchun kerak */
  invoice?: Pick<Invoice, 'invoiceNumber' | 'date' | 'additionalInfo'> | null;
  items?: Array<Pick<InvoiceItem, 'name' | 'netWeight'>>;
};

export type ExporterRequisites = {
  name: string;
  address: string;
  inn: string;
  bankName: string;
  bankAccount: string;
  swift: string;
  mfo: string;
  /** "Qolgan rekvizitlar" erkin matni — bir qatorga yig'ilgan */
  details: string;
  phone: string;
  email: string;
  director: string;
};

const clean = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

/**
 * Eksportyor kim: Грузоотправитель sotuvchidan boshqa korxona bo'lsa — o'sha
 * (kelib chiqish xati va CMR'dagi qoida bilan bir xil), aks holda sotuvchi.
 * Shartnoma bo'lmasa — kompaniya sozlamalari.
 */
export const resolveExporterRequisites = ({ contract, companySettings: cs }: LetterheadPayload): ExporterRequisites => {
  const sellerName = clean(contract?.sellerName);
  const shipperName = clean(contract?.shipperName);

  if (contract && shipperName && shipperName !== sellerName) {
    return {
      name: shipperName,
      address: clean(contract.shipperAddress),
      inn: clean(contract.shipperInn),
      bankName: clean(contract.shipperBankName),
      bankAccount: clean(contract.shipperBankAccount),
      swift: clean(contract.shipperBankSwift),
      mfo: '',
      details: clean(contract.shipperDetails),
      phone: '',
      email: '',
      // supplierDirector — sotuvchining direktori, jo'natuvchiniki emas
      director: '',
    };
  }

  if (contract && sellerName) {
    return {
      name: sellerName,
      address: clean(contract.sellerLegalAddress),
      inn: clean(contract.sellerInn),
      bankName: clean(contract.sellerBankName),
      bankAccount: clean(contract.sellerBankAccount),
      swift: clean(contract.sellerBankSwift),
      mfo: '',
      details: clean(contract.sellerDetails),
      phone: '',
      email: '',
      director: clean(contract.supplierDirector),
    };
  }

  return {
    name: clean(cs?.name),
    address: clean(cs?.legalAddress),
    inn: clean(cs?.inn),
    bankName: clean(cs?.bankName),
    bankAccount: clean(cs?.bankAccount),
    swift: clean(cs?.swiftCode),
    mfo: clean(cs?.mfo),
    details: '',
    phone: clean(cs?.phone),
    email: clean(cs?.email),
    director: clean(cs?.director),
  };
};

// --- Dizayn ---------------------------------------------------------------

const BLUE = '0B4F9A';
const LIGHT = '3F72AF';
const INK = '1F2937';
const MUTED = '6B7280';
const FONT = 'Arial';

// A4 (twip), chegaralar Firma_blankasi.docx dagidek
const PAGE = { width: 11906, height: 16838 };
const MARGIN_L = 1134;
const MARGIN_R = 850;
const CONTENT = PAGE.width - MARGIN_L - MARGIN_R;
const LOGO_COL = 5400;
const ADDRESSEE_INDENT = 5200;
const SIGN_CENTER = 5000;

const LOGO_MAX = { width: 250, height: 70 }; // px

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

type RunStyle = { size?: number; color?: string; bold?: boolean; italics?: boolean };

const run = (text: string, s: RunStyle = {}) =>
  new TextRun({ text, font: FONT, size: s.size ?? 22, color: s.color ?? INK, bold: s.bold, italics: s.italics });

type ParaOptions = {
  align?: IParagraphOptions['alignment'];
  after?: number;
  line?: number;
  indent?: IParagraphOptions['indent'];
  border?: IParagraphOptions['border'];
  tabs?: IParagraphOptions['tabStops'];
};

const para = (children: Array<TextRun | ImageRun>, o: ParaOptions = {}) =>
  new Paragraph({
    children,
    alignment: o.align,
    spacing: { before: 0, after: o.after ?? 0, line: o.line ?? 276 },
    indent: o.indent,
    border: o.border,
    tabStops: o.tabs,
  });

const logoSize = (img: DocImage) => {
  const scale = Math.min(LOGO_MAX.width / img.widthPx, LOGO_MAX.height / img.heightPx);
  return { width: Math.round(img.widthPx * scale), height: Math.round(img.heightPx * scale) };
};

const contactLine = (label: string, value: string) =>
  para([run(`${label}  `, { size: 16, color: MUTED }), run(value, { size: 17, bold: true })], {
    align: AlignmentType.RIGHT,
    after: 20,
  });

const buildHeader = (r: ExporterRequisites, logo: DocImage | null) => {
  // Logo bo'lmasa uning o'rnida korxona nomi yoziladi
  const brand = logo
    ? para([new ImageRun({ type: logo.ext === 'png' ? 'png' : 'jpg', data: logo.data, transformation: logoSize(logo) })])
    : para([run(r.name || '[Наименование организации]', { size: 30, bold: true, color: BLUE })]);

  const contacts = [
    r.address && contactLine('Адрес', r.address),
    r.phone && contactLine('Тел.', r.phone),
    r.email && contactLine('E-mail', r.email),
    r.inn && contactLine('ИНН', r.inn),
  ].filter((p): p is Paragraph => Boolean(p));

  return new Header({
    children: [
      new Table({
        width: { size: CONTENT, type: WidthType.DXA },
        columnWidths: [LOGO_COL, CONTENT - LOGO_COL],
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: LOGO_COL, type: WidthType.DXA },
                borders: NO_BORDERS,
                verticalAlign: VerticalAlign.CENTER,
                children: [brand],
              }),
              new TableCell({
                width: { size: CONTENT - LOGO_COL, type: WidthType.DXA },
                borders: NO_BORDERS,
                verticalAlign: VerticalAlign.CENTER,
                children: contacts.length ? contacts : [para([])],
              }),
            ],
          }),
        ],
      }),
      para([], { border: { bottom: { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 24, color: BLUE, space: 4 } } }),
    ],
  });
};

const SEPARATOR = '   •   ';

/** Rekvizit juftliklarini " • " bilan bitta qatorga terib chiqadi */
const requisiteLine = (pairs: Array<[string, string]>) => {
  const filled = pairs.filter(([, value]) => value);
  if (!filled.length) return null;
  const runs: TextRun[] = [];
  filled.forEach(([label, value], i) => {
    if (i > 0) runs.push(run(SEPARATOR, { size: 15, color: LIGHT }));
    if (label) runs.push(run(`${label}: `, { size: 15, color: MUTED }));
    runs.push(run(value, { size: 15 }));
  });
  return para(runs, { align: AlignmentType.CENTER, after: 20 });
};

const buildFooter = (r: ExporterRequisites) => {
  const bankLine = requisiteLine([
    ['Р/с', r.bankAccount],
    ['Банк', r.bankName],
    ['МФО', r.mfo],
    ['SWIFT', r.swift],
  ]);
  // Tuzilgan bank maydonlari bo'sh bo'lsa, "Qolgan rekvizitlar" matni chiqadi
  const detailsLine = r.details ? requisiteLine([['', r.details]]) : null;

  const lines = [
    para([], { border: { top: { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 12, color: BLUE, space: 4 } } }),
    para([run(r.name || '[Наименование организации]', { size: 16, bold: true, color: BLUE })], { align: AlignmentType.CENTER, after: 30 }),
    // Адрес va ИНН tepada (kontaktlarda), bu yerda faqat bank rekvizitlari
    bankLine ?? detailsLine,
  ].filter((p): p is Paragraph => Boolean(p));

  return new Footer({ children: lines });
};

const buildBody = (r: ExporterRequisites) => [
  para(
    [
      run('Исх. № ', { size: 20, color: MUTED }),
      run('________', { size: 20 }),
      run('\t', { size: 20 }),
      run('«____» ______________ 20___ г.', { size: 20 }),
    ],
    { tabs: [{ type: TabStopType.RIGHT, position: CONTENT }], after: 60 },
  ),
  para([run('На № ________ от «____» ______________ 20___ г.', { size: 18, color: MUTED, italics: true })], { after: 480 }),

  para([run('[Наименование организации]', { bold: true })], { indent: { left: ADDRESSEE_INDENT }, after: 40 }),
  para([run('[Должность]')], { indent: { left: ADDRESSEE_INDENT }, after: 40 }),
  para([run('[Ф.И.О.]', { bold: true })], { indent: { left: ADDRESSEE_INDENT }, after: 600 }),

  para([run('[Тема письма]', { bold: true, size: 24, color: BLUE })], { align: AlignmentType.CENTER, after: 360 }),
  para([run('Уважаемый(-ая) [Имя Отчество]!', { bold: true })], { align: AlignmentType.CENTER, after: 240 }),
  para([run('[Текст письма.]')], {
    align: AlignmentType.JUSTIFIED,
    indent: { firstLine: 709 },
    line: 360,
    after: 120,
  }),
  para([], { line: 360, after: 120 }),
  para([], { line: 360, after: 120 }),
  para([], { line: 360, after: 900 }),

  para(
    [
      run('Директор', { bold: true }),
      run('\t'),
      run('_______________', { color: MUTED }),
      run('\t'),
      run(r.director || '[Ф.И.О.]', { bold: true }),
    ],
    { tabs: [{ type: TabStopType.CENTER, position: SIGN_CENTER }, { type: TabStopType.RIGHT, position: CONTENT }] },
  ),
  para([run('\t'), run('М.П.', { size: 16, color: MUTED })], {
    tabs: [{ type: TabStopType.CENTER, position: SIGN_CENTER }],
    after: 900,
  }),

  para([run('Исп.: [Ф.И.О.]', { size: 16, color: MUTED })]),
  para([run('Тел.: [__________]', { size: 16, color: MUTED })]),
];

// --- GMO spravkasi --------------------------------------------------------

const formatDate = (value: Date) => {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${value.getFullYear()}`;
};

/** 20987 → "20987", 1234.5 → "1234,5" (spravka namunasidagidek, guruhlashsiz) */
const formatNet = (value: Prisma.Decimal) => value.toDecimalPlaces(3).toString().replace('.', ',');

const infoString = (info: Prisma.JsonValue | undefined, key: string) => {
  if (!info || typeof info !== 'object' || Array.isArray(info)) return '';
  const value = (info as Prisma.JsonObject)[key];
  return typeof value === 'string' || typeof value === 'number' ? clean(String(value)) : '';
};

export type GmoProductLine = { name: string; net: string };

/** Bir xil nomli qatorlar bitta mahsulotga birlashadi, netto yig'iladi */
export const buildGmoProductLines = (
  items: Array<Pick<InvoiceItem, 'name' | 'netWeight'>>,
  harvestYear: string,
): GmoProductLine[] => {
  const totals = new Map<string, Prisma.Decimal>();
  for (const item of items) {
    const name = clean(item.name);
    if (!name) continue;
    const prev = totals.get(name) ?? new Prisma.Decimal(0);
    totals.set(name, item.netWeight ? prev.plus(item.netWeight) : prev);
  }
  return Array.from(totals, ([name, net]) => ({
    name: harvestYear && !/урожай/i.test(name) ? `${name}, урожай ${harvestYear} года` : name,
    net: formatNet(net),
  }));
};

const buildGmoBody = (r: ExporterRequisites, payload: LetterheadPayload) => {
  const info = payload.invoice?.additionalInfo;
  const exporter = r.name || '[Наименование организации]';
  const lines = buildGmoProductLines(payload.items ?? [], infoString(info, 'harvestYear'));
  const transport = [infoString(info, 'vehicleNumber'), infoString(info, 'trailerNumber')].filter(Boolean).join('/');

  const invoiceRef = payload.invoice
    ? `Инвойс № ${payload.invoice.invoiceNumber || '____'} от ${formatDate(payload.invoice.date)} г.`
    : '';
  const refs = [
    invoiceRef,
    infoString(info, 'smrNumber') && `CMR: ${infoString(info, 'smrNumber')}`,
    infoString(info, 'tirNumber') && `Тир: ${infoString(info, 'tirNumber')}`,
    transport && `АВТО: ${transport}`,
  ].filter(Boolean);

  const text = (value: string, after = 120) =>
    para([run(value, { size: 24 })], { line: 360, after });

  return [
    para([run('СПРАВКА', { bold: true, size: 32, color: BLUE })], { align: AlignmentType.CENTER, after: 480 }),
    para(
      [
        run(`${exporter} заверяет вас, что в процессе производства нижеследующих продуктов не использовались генетически модифицированные продукты.`, { size: 24 }),
      ],
      { indent: { firstLine: 709 }, line: 360, after: 240 },
    ),
    ...(lines.length
      ? lines.map((l, i) => text(`${i + 1}. ${l.name} - Нетто: ${l.net} кг`, i === lines.length - 1 ? 360 : 60))
      : [text('1. [Наименование продукта] - Нетто: [____] кг', 360)]),
    ...refs.map((ref, i) => para([run(ref, { size: 22 })], { after: i === refs.length - 1 ? 600 : 40 })),
    text('Справка дана для предъявления по месту требования.', 900),

    para([run(exporter, { bold: true })], { after: 360 }),
    para(
      [
        run('Директор', { bold: true }),
        run('\t'),
        run('_______________', { color: MUTED }),
        run('\t'),
        run(r.director || '[Ф.И.О.]', { bold: true }),
      ],
      { tabs: [{ type: TabStopType.CENTER, position: SIGN_CENTER }, { type: TabStopType.RIGHT, position: CONTENT }] },
    ),
    para([run('\t'), run('М.П.', { size: 16, color: MUTED })], {
      tabs: [{ type: TabStopType.CENTER, position: SIGN_CENTER }],
    }),
  ];
};

export const generateExporterLetterhead = async (payload: LetterheadPayload): Promise<Buffer> => {
  const requisites = resolveExporterRequisites(payload);
  const logo = await loadUploadImage(payload.contract?.companyLogoUrl);

  const doc = new Document({
    creator: 'Pro Deklarant',
    title: payload.kind === 'gmo' ? 'Справка' : requisites.name ? `${requisites.name} — бланк` : 'Фирменный бланк',
    styles: { default: { document: { run: { font: FONT, size: 22, color: INK } } } },
    sections: [
      {
        properties: {
          page: {
            size: PAGE,
            margin: { top: 2500, bottom: 1500, left: MARGIN_L, right: MARGIN_R, header: 500, footer: 400 },
          },
        },
        headers: { default: buildHeader(requisites, logo) },
        footers: { default: buildFooter(requisites) },
        children: payload.kind === 'gmo' ? buildGmoBody(requisites, payload) : buildBody(requisites),
      },
    ],
  });

  return Packer.toBuffer(doc);
};
