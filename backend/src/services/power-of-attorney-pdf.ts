import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Contract, PowerOfAttorney } from '@prisma/client';
import { DocImage, loadUploadImage, SEAL_HEIGHT_CM, SIGNATURE_HEIGHT_CM } from './origin-info-doc';
import { ExporterRequisites } from './exporter-letterhead';
import { cityFromAddress, RuDateParts, ruDateParts, validUntilParts } from './power-of-attorney';

/**
 * Haydovchiga ishonchnoma — korxona firma blankasida (PDF), direktor imzosi va
 * muhr bilan. Serverda LibreOffice yo'q, shuning uchun pdfkit (kelib chiqish
 * xati bilan bir xil yondashuv va shrift).
 */

export type PowerOfAttorneyPdfPayload = {
  record: PowerOfAttorney;
  exporter: ExporterRequisites;
  exporterInn: string;
  contract: Contract | null;
  /** Ishonchnoma sanasi (invoys sanasi) */
  issueDate: Date;
};

const PT_PER_CM = 72 / 2.54;
const PAGE_MARGIN = { left: 56, right: 48 };
const FOOTER_RESERVE = 70;
const BLUE = '#0B4F9A';
const LIGHT = '#3F72AF';
const INK = '#1F2937';
const MUTED = '#6B7280';

const FONT_REGULAR = 'PoaSerif';
const FONT_BOLD = 'PoaSerif-Bold';
const BODY_SIZE = 12;

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

const clean = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

const dateText = (parts: RuDateParts) => `«${parts.day}» ${parts.monthName} ${parts.year} г.`;

/** Direktor imzosi va muhri faqat sotuvchi korxonaniki; boshqa jo'natuvchi bo'lsa — boshqa korxona muhrini qo'ymaymiz */
const signsForExporter = async (contract: Contract | null) => {
  if (!contract) return { signature: null, seal: null };
  const sellerName = clean(contract.sellerName);
  const shipperName = clean(contract.shipperName);
  if (shipperName && shipperName !== sellerName) return { signature: null, seal: null };
  const [signature, seal] = await Promise.all([
    loadUploadImage(contract.sellerSignatureUrl || contract.signatureUrl),
    loadUploadImage(contract.sellerSealUrl || contract.sealUrl),
  ]);
  return { signature, seal };
};

export const generatePowerOfAttorneyPdf = async (payload: PowerOfAttorneyPdfPayload): Promise<Buffer> => {
  const { record, exporter, exporterInn, contract, issueDate } = payload;
  const [{ signature, seal }, logo] = await Promise.all([
    signsForExporter(contract),
    loadUploadImage(contract?.companyLogoUrl),
  ]);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 0, left: PAGE_MARGIN.left, right: PAGE_MARGIN.right },
    info: { Title: `Доверенность № ${record.sequence}`, Creator: 'Pro Deklarant' },
  });
  doc.registerFont(FONT_REGULAR, resolveFont('LiberationSerif-Regular.ttf'));
  doc.registerFont(FONT_BOLD, resolveFont('LiberationSerif-Bold.ttf'));

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const left = PAGE_MARGIN.left;
  const width = doc.page.width - PAGE_MARGIN.left - PAGE_MARGIN.right;
  const right = left + width;
  const exporterName = exporter.name || '[Наименование организации]';

  // --- Firma blankasi: tepa ---------------------------------------------------
  const headerTop = 40;
  const logoBox = { width: 190, height: 52 };
  let headerBottom = headerTop;
  if (logo) {
    const scale = Math.min(logoBox.width / logo.widthPx, logoBox.height / logo.heightPx);
    const w = logo.widthPx * scale;
    const h = logo.heightPx * scale;
    doc.image(logo.data, left, headerTop, { width: w, height: h });
    headerBottom = headerTop + h;
  } else {
    doc.font(FONT_BOLD).fontSize(15).fillColor(BLUE);
    const nameHeight = doc.heightOfString(exporterName, { width: 250 });
    doc.text(exporterName, left, headerTop + 4, { width: 250 });
    headerBottom = headerTop + 4 + nameHeight;
  }

  const contacts: Array<[string, string]> = [
    ['Адрес', exporter.address],
    ['Тел.', exporter.phone],
    ['E-mail', exporter.email],
    ['ИНН', exporterInn],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]));
  let contactY = headerTop;
  const contactWidth = 270;
  for (const [label, value] of contacts) {
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(INK);
    const text = `${label}  ${value}`;
    const h = doc.heightOfString(text, { width: contactWidth, align: 'right' });
    doc.text(text, right - contactWidth, contactY, { width: contactWidth, align: 'right' });
    contactY += h + 2;
  }
  headerBottom = Math.max(headerBottom, contactY);

  const ruleY = headerBottom + 6;
  doc.lineWidth(2).strokeColor(BLUE).moveTo(left, ruleY).lineTo(right, ruleY).stroke();
  doc.lineWidth(0.6).strokeColor(BLUE).moveTo(left, ruleY + 3.2).lineTo(right, ruleY + 3.2).stroke();

  // --- Firma blankasi: past (rekvizitlar) -------------------------------------
  const footerTop = doc.page.height - FOOTER_RESERVE;
  doc.lineWidth(0.6).strokeColor(BLUE).moveTo(left, footerTop).lineTo(right, footerTop).stroke();
  doc.lineWidth(1.6).strokeColor(BLUE).moveTo(left, footerTop + 2.8).lineTo(right, footerTop + 2.8).stroke();
  doc.font(FONT_BOLD).fontSize(8).fillColor(BLUE).text(exporterName, left, footerTop + 9, { width, align: 'center' });
  const bankPairs: Array<[string, string]> = [
    ['Р/с', exporter.bankAccount],
    ['Банк', exporter.bankName],
    ['МФО', exporter.mfo],
    ['SWIFT', exporter.swift],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]));
  const bankLine = bankPairs.length
    ? bankPairs.map(([label, value]) => `${label}: ${value}`).join('   •   ')
    : exporter.details;
  if (bankLine) {
    doc.font(FONT_REGULAR).fontSize(7.5).fillColor(MUTED);
    doc.text(bankLine, left, footerTop + 22, { width, align: 'center', lineGap: 1 });
  }

  // --- Matn ---------------------------------------------------------------------
  doc.fillColor(INK);
  let y = ruleY + 34;
  const lineHeight = () => doc.font(FONT_REGULAR).fontSize(BODY_SIZE).currentLineHeight(true);

  doc.font(FONT_BOLD).fontSize(14).text(`ДОВЕРЕННОСТЬ № ${record.sequence}`, left, y, { width, align: 'center' });
  y = doc.y + 14;

  const city = cityFromAddress(exporter.address);
  doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
  doc.text(`г. ${city ?? '____________'}`, left, y, { width: width / 2, align: 'left' });
  doc.text(dateText(ruDateParts(issueDate)), left + width / 2, y, { width: width / 2, align: 'right' });
  y = doc.y + 12;

  const director = clean(exporter.director) || '____________________';
  doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
  doc.text(
    `${exporterName}, ИНН: ${exporterInn}, в лице директора ${director}, действующего на основании Устава, ` +
      'настоящей доверенностью уполномочивает:',
    left,
    y,
    { width, align: 'justify' },
  );
  y = doc.y + 8;

  const fullName = [record.lastName, record.firstName, record.patronymic]
    .map((part) => clean(part).toUpperCase())
    .filter(Boolean)
    .join(' ');
  const labelled = (label: string, value: string) => {
    doc.font(FONT_REGULAR).fontSize(BODY_SIZE).text(`${label}: `, left, y, { width, continued: true });
    doc.font(FONT_BOLD).text(value);
    y = doc.y + 3;
  };
  labelled('Гражданина', fullName);
  labelled('Паспорт', clean(record.passport));
  labelled('ЖШШИР', record.pinfl);
  y += 6;

  doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
  doc.text(
    'Представлять интересы предприятия при осуществлении таможенных операций, связанных с ' +
      'перемещением экспортных грузов, а именно:',
    left,
    y,
    { width, align: 'justify' },
  );
  y = doc.y + 6;

  const duties = [
    'Предъявлять транспортное средство и перевозимый груз сотрудникам таможенных органов для проведения таможенного досмотра и осмотра.',
    'Обеспечивать предоставление транспортного средства и груза для проведения таможенного контроля.',
    'Присутствовать при проведении таможенного досмотра (осмотра) груза.',
    'Подписывать документы, акты и иные материалы, непосредственно связанные с проведением таможенного досмотра (осмотра).',
    'Выполнять необходимые действия, связанные с прохождением таможенного контроля в пределах настоящей доверенности.',
  ];
  const numberIndent = 22;
  duties.forEach((duty, index) => {
    doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
    doc.text(`${index + 1}.`, left, y, { width: numberIndent, lineBreak: false });
    doc.text(duty, left + numberIndent, y, { width: width - numberIndent, align: 'justify' });
    y = doc.y + 6;
  });
  y += 12;

  doc.font(FONT_REGULAR).fontSize(BODY_SIZE);
  doc.text(`Доверенность выдана сроком до ${dateText(validUntilParts(issueDate))}`, left, y, { width });
  y = doc.y + 2;
  doc.text('Без права передоверия.', left, y, { width });
  y = doc.y + 30;

  // --- Imzo qatori: Директор | imzo + muhr | F.I.Sh. -------------------------------
  const sealHeight = SEAL_HEIGHT_CM * PT_PER_CM;
  const signatureHeight = SIGNATURE_HEIGHT_CM * PT_PER_CM;
  // Direktor ismi imzo chizig'ining ostida, alohida pastki qatorda
  const nameRowHeight = lineHeight() + 4;
  const rowHeight = Math.max(seal ? sealHeight : 0, signature ? signatureHeight : 0, lineHeight() * 2);
  if (y + rowHeight + nameRowHeight > footerTop - 8) {
    // Bitta sahifaga sig'masa ham imzo matndan ajralib qolmasin — joyni siqamiz
    y = Math.max(ruleY + 34, footerTop - 8 - rowHeight - nameRowHeight);
  }

  const rowBottom = y + rowHeight;
  const baseline = rowBottom - lineHeight();
  doc.font(FONT_BOLD).fontSize(BODY_SIZE);
  doc.text('Директор:', left, baseline, { lineBreak: false });
  const directorLabelWidth = doc.widthOfString('Директор: ');

  const lineStart = left + directorLabelWidth + 6;
  const signatureColumnWidth = 190;
  doc.lineWidth(0.6).strokeColor(INK);
  doc.moveTo(lineStart, rowBottom - 3).lineTo(lineStart + signatureColumnWidth, rowBottom - 3).stroke();

  // Ism chiziq ostida markazda; uzun bo'lsa chiziqdan kengroq maydonda turadi
  const directorName = clean(exporter.director) || '____________________';
  const nameWidth = Math.max(signatureColumnWidth, 240);
  doc.font(FONT_BOLD).fontSize(BODY_SIZE);
  doc.text(directorName, lineStart + signatureColumnWidth / 2 - nameWidth / 2, rowBottom + 2, {
    width: nameWidth,
    align: 'center',
    lineBreak: false,
  });

  // Qog'ozdagidek: muhr imzo chizig'ining ustida markazda, imzo esa muhr ustidan
  // chiziladi. Ikkalasining pastki chetlari bir chiziqda; ism ochiq qoladi.
  const lineCenter = lineStart + signatureColumnWidth / 2;
  const drawCentered = (image: DocImage | null, height: number) => {
    if (!image) return;
    const imageWidth = (height * image.widthPx) / image.heightPx;
    doc.image(image.data, lineCenter - imageWidth / 2, rowBottom - height, { width: imageWidth, height });
  };
  drawCentered(seal, sealHeight);
  drawCentered(signature, signatureHeight);

  doc.end();
  return done;
};
