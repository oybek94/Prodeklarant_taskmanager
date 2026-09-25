import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import {
  buildOriginInfoData,
  OriginInfoDocPayload,
  DocImage,
  SIGNATURE_HEIGHT_CM,
  SEAL_HEIGHT_CM,
} from './origin-info-doc';

/**
 * "Информация о происхождении товара" PDF varianti.
 *
 * Docx shablonini serverda PDF'ga aylantirish uchun LibreOffice kerak bo'lardi —
 * shuning uchun xat pdfkit bilan alohida chiziladi. MATN VA JOYLASHUV
 * templates/Информация_о_происхождении_товара.docx dan KO'CHIRILGAN: shablon
 * o'zgarsa, shu fayl ham qo'lda moslanadi. Qiymatlar esa umumiy
 * buildOriginInfoData'dan olinadi.
 *
 * Shrift — Liberation Serif: Times New Roman bilan bir xil o'lchamli, shuning
 * uchun qatorlar Word'dagidek bo'linadi.
 */

const PT_PER_CM = 72 / 2.54;
const TWIP = 1 / 20; // shablon o'lchamlari twip'da (1/20 pt)

// Shablon sectPr: A4, chegaralar top 1258 / right 850 / bottom 1134 / left 900
const MARGIN = { top: 1258 * TWIP, right: 850 * TWIP, bottom: 1134 * TWIP, left: 900 * TWIP };
const FONT_SIZE = 12;
const BODY_INDENT = 284 * TWIP; // matn abzaslarining w:ind left
const BODY_RIGHT_INDENT = -50 * TWIP; // w:ind right — matn o'ng chegaradan biroz chiqadi
const TAB_STOP = 708 * TWIP; // abzas boshidagi <w:tab/> — birinchi tab to'xtashi
const SIGN_COLUMNS = [3333 * TWIP, 4033 * TWIP, 2496 * TWIP]; // imzo jadvali ustunlari
const SIGN_TABLE_INDENT = 284 * TWIP; // jadval tblInd (katak chegarasigacha)
const CELL_PADDING = 108 * TWIP; // katak ichki chetlari (chap/o'ng)

const FONT_REGULAR = 'OriginSerif';
const FONT_BOLD = 'OriginSerif-Bold';

const resolveFont = (fileName: string): string => {
  const candidates = [
    path.resolve(__dirname, '../fonts', fileName),
    path.resolve(process.cwd(), 'src/fonts', fileName),
    path.resolve(process.cwd(), 'dist/fonts', fileName),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`${fileName} not found in fonts`);
  return found;
};

type Segment = { text: string; bold?: boolean };

export const generateOriginInfoPdf = async (payload: OriginInfoDocPayload): Promise<Buffer> => {
  const { fields: f, signature, seal } = await buildOriginInfoData(payload);

  const doc = new PDFDocument({
    size: 'A4',
    margins: MARGIN,
    info: { Title: 'Информация о происхождении товара', Creator: 'Pro Deklarant' },
  });
  doc.registerFont(FONT_REGULAR, resolveFont('LiberationSerif-Regular.ttf'));
  doc.registerFont(FONT_BOLD, resolveFont('LiberationSerif-Bold.ttf'));
  doc.font(FONT_REGULAR).fontSize(FONT_SIZE);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const left = MARGIN.left;
  const contentWidth = doc.page.width - MARGIN.left - MARGIN.right;
  const lineHeight = doc.currentLineHeight(true);
  const emptyLine = (count = 1) => {
    doc.y += lineHeight * count;
  };

  // --- Sarlavha: ilova belgisi (o'ngda) ---
  doc.font(FONT_REGULAR);
  for (const line of [
    'Приложение ',
    'к постановлению Кабинетом Министров Республики Узбекистан ',
    'за № 994 от 13.12.2019 г.',
  ]) {
    doc.text(line, left, doc.y, { width: contentWidth, align: 'right' });
  }
  emptyLine(3);

  // --- Sana (chapda) va adresat (o'ngda, qalin) bitta qatorda boshlanadi ---
  const headerTop = doc.y;
  doc.font(FONT_REGULAR).text(`от ${f.Invoys_sana}`, left + TAB_STOP, headerTop, { lineBreak: false });
  doc.font(FONT_BOLD).text('Директору\nДХО ООО «Наманганэкспертиза»\nМусаеву Ш.М.', left, headerTop, {
    width: contentWidth,
    align: 'right',
  });
  emptyLine(2);

  doc.font(FONT_BOLD).text('Информация о происхождении товара', left, doc.y, {
    width: contentWidth,
    align: 'center',
  });
  emptyLine();

  // --- Asosiy matn: aralash qalin/oddiy qismlar, eni bo'yicha tekislangan ---
  // pdfkit'ning `continued` + `justify` rejimi faqat oxirgi bo'lakni tekislaydi va
  // bo'lak boshidagi bo'sh joyni yutadi — shuning uchun qatorlar shu yerda teriladi.
  const bodyX = left + BODY_INDENT;
  const bodyWidth = contentWidth - BODY_INDENT - BODY_RIGHT_INDENT;
  const firstLineIndent = TAB_STOP - BODY_INDENT;
  const paragraph = (segments: Segment[], align: 'justify' | 'left' = 'justify') => {
    type Piece = { text: string; font: string; width: number };
    type Word = { pieces: Piece[]; width: number };

    // So'zlar: bo'sh joy bilan ajraladi; bitta so'z turli shriftli bo'laklardan iborat bo'lishi mumkin
    const words: Word[] = [];
    let current: Word | null = null;
    for (const segment of segments) {
      const font = segment.bold ? FONT_BOLD : FONT_REGULAR;
      for (const token of segment.text.split(/(\s+)/)) {
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          current = null;
          continue;
        }
        if (!current) {
          current = { pieces: [], width: 0 };
          words.push(current);
        }
        const width = doc.font(font).widthOfString(token);
        current.pieces.push({ text: token, font, width });
        current.width += width;
      }
    }
    const spaceWidth = doc.font(FONT_REGULAR).widthOfString(' ');

    const lines: Word[][] = [];
    let line: Word[] = [];
    let lineWidth = 0;
    for (const word of words) {
      const available = bodyWidth - (lines.length === 0 ? firstLineIndent : 0);
      const nextWidth = line.length ? lineWidth + spaceWidth + word.width : word.width;
      if (line.length && nextWidth > available) {
        lines.push(line);
        line = [word];
        lineWidth = word.width;
      } else {
        line.push(word);
        lineWidth = nextWidth;
      }
    }
    if (line.length) lines.push(line);

    lines.forEach((lineWords, lineIndex) => {
      const indent = lineIndex === 0 ? firstLineIndent : 0;
      const available = bodyWidth - indent;
      const wordsWidth = lineWords.reduce((sum, w) => sum + w.width, 0);
      const isLast = lineIndex === lines.length - 1;
      const gap =
        align === 'justify' && !isLast && lineWords.length > 1
          ? (available - wordsWidth) / (lineWords.length - 1)
          : spaceWidth;
      const y = doc.y;
      let x = bodyX + indent;
      for (const word of lineWords) {
        for (const piece of word.pieces) {
          doc.font(piece.font).text(piece.text, x, y, { lineBreak: false });
          x += piece.width;
        }
        x += gap;
      }
      doc.x = left;
      doc.y = y + lineHeight;
    });
  };

  paragraph([
    { text: 'Настоящим ' },
    { text: `${f.eksportyor_nomi},`, bold: true },
    {
      text:
        ` подтверждает, что экспортируемые сельскохозяйственная продукция: ${f.tovar_nomi} ` +
        `в ${f.qadoq_soni} ${f.qadoq_turi}, уложенные в 33 паллета, весом брутто ${f.brutto} кг, ` +
        `весом нетто ${f.netto} кг.; указанные в инвойсе № ${f.invoys_raqam} от ${f.Invoys_sana}, ` +
        'выращены и собраны на территории Республики Узбекистан, закуплены у населения ' +
        'Наманганской области Республики Узбекистан.',
    },
  ]);
  emptyLine();

  paragraph([
    {
      text:
        'Вместе с тем сообщаем, что в случае поступления запроса от таможенных органов страны ' +
        'импорта указанной плодоовощной сельхоз продукции ',
    },
    { text: `${f.eksportyor_nomi},`, bold: true },
    {
      text:
        ' гарантирует предоставление необходимых документов, содержащих сведения об изготовителе ' +
        'товара (договоров закупа и/или закупочных актов и др.) в установленном порядке.',
    },
  ]);
  emptyLine();

  paragraph(
    [
      { text: f.eksportyor_nomi, bold: true },
      {
        text:
          ', настоящим заявляет, что несет ответственность за достоверность информации ' +
          'предоставлении товара, в соответствии с постановлением Кабинетом Министров ' +
          'Республики Узбекистан за № 994 от 13.12.2019 г.',
      },
    ],
    'left'
  );
  emptyLine(6);

  // --- Imzo jadvali: Представитель | imzo + muhr | direktor ---
  const sealHeight = SEAL_HEIGHT_CM * PT_PER_CM;
  const signatureHeight = SIGNATURE_HEIGHT_CM * PT_PER_CM;
  const rowHeight = Math.max(seal ? sealHeight : 0, signature ? signatureHeight : 0, lineHeight * 2);
  if (doc.y + rowHeight > doc.page.height - MARGIN.bottom) doc.addPage();

  const rowTop = doc.y;
  const [col1, col2, col3] = SIGN_COLUMNS;
  const tableX = left + SIGN_TABLE_INDENT + CELL_PADDING; // birinchi katak matni

  doc.font(FONT_BOLD).text(`Представитель\n${f.eksportyor_nomi}:`, tableX, rowTop, {
    width: col1 - 2 * CELL_PADDING,
  });
  doc.font(FONT_BOLD).text(f.Direktor, tableX + col1 + col2, rowTop, {
    width: col3 - 2 * CELL_PADDING,
    align: 'right',
  });

  // Word'dagi kabi rasmlar bitta qatorda, pastki chetlari bir chiziqda
  const rowBottom = rowTop + rowHeight;
  let imageX = tableX + col1;
  const drawImage = (image: DocImage | null, height: number) => {
    if (!image) return;
    const width = (height * image.widthPx) / image.heightPx;
    doc.image(image.data, imageX, rowBottom - height, { width, height });
    imageX += width + doc.widthOfString(' ');
  };
  drawImage(signature, signatureHeight);
  drawImage(seal, sealHeight);

  doc.end();
  return done;
};
