import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem, Client, CompanySettings } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface InvoiceDataEn {
  invoice: Invoice & { items: (InvoiceItem & { nameEn?: string | null })[] };
  client: Client;
  company: CompanySettings;
  contract?: any;
  translatedRequisites: Record<string, string>;
}

function ensureUTF8(text: any): string {
  if (text === null || text === undefined) return '';
  let result = String(text);
  try { result = result.normalize('NFC'); } catch { }
  try { result = Buffer.from(result, 'utf8').toString('utf8'); } catch { result = ''; }
  return result;
}

function getCurrencySymbol(currency?: string | null): string {
  const cur = (currency || '').toUpperCase();
  if (cur === 'USD') return '$';
  if (cur === 'EUR') return '€';
  if (cur === 'RUB') return '₽';
  return '';
}

const resolveUploadImagePath = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return null;
  const clean = url.split('?')[0];
  if (!clean.startsWith('/uploads/')) return null;
  const relativePath = clean.replace(/^\//, '');
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
};

function tr(translated: Record<string, string>, key: string, fallback: string): string {
  return translated[key] || fallback;
}

export function generateInvoicePDFEnglish(data: InvoiceDataEn): any {
  const t = data.translatedRequisites;
  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
    autoFirstPage: true,
    info: {
      Title: 'Invoice (English)',
      Author: 'Pro Deklarant',
      Subject: 'Invoice PDF',
      Creator: 'Pro Deklarant System',
    },
    compress: false,
  });

  let fontRegistered = false;
  let boldFontRegistered = false;
  const fontPaths = [
    path.join(__dirname, '../fonts/DejaVuSans.ttf'),
    path.join(__dirname, '../../fonts/DejaVuSans.ttf'),
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/times.ttf',
  ];
  const boldFontPaths = [
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/timesbd.ttf',
  ];

  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        doc.registerFont('CyrillicFont', fontPath);
        doc.font('CyrillicFont');
        fontRegistered = true;
        break;
      }
    } catch { }
  }
  for (const boldPath of boldFontPaths) {
    try {
      if (fs.existsSync(boldPath)) {
        doc.registerFont('CyrillicFont-Bold', boldPath);
        boldFontRegistered = true;
        break;
      }
    } catch { }
  }

  if (!fontRegistered) doc.font('Helvetica');

  const setFont = (fontName: string = 'Helvetica') => {
    if (fontName.includes('Bold') || fontName === 'Bold') {
      if (boldFontRegistered) doc.font('CyrillicFont-Bold');
      else if (fontRegistered) doc.font('CyrillicFont'); // fallback to normal cyrillic if no bold cyrillic
      else doc.font('Helvetica-Bold');
    } else {
      if (fontRegistered) doc.font('CyrillicFont');
      else doc.font('Helvetica');
    }
  };

  const pageWidth = 595;
  const margin = 30;
  const leftColumnX = margin;
  const rightColumnX = pageWidth - margin;

  // Header
  let headerY = 30;
  doc.fontSize(9);
  setFont('Helvetica');

  const invoiceDate = formatDate(data.invoice.date);
  setFont('Helvetica-Bold');
  doc.text('Invoice No: ', leftColumnX, headerY, { continued: true });
  setFont('Helvetica');
  doc.text(ensureUTF8(`${data.invoice.invoiceNumber} `), { continued: true });
  setFont('Helvetica-Bold');
  doc.text('dated ', { continued: true });
  setFont('Helvetica');
  doc.text(ensureUTF8(`${invoiceDate}`));

  headerY += 12;
  if (data.invoice.contractNumber) {
    let contractNumber = data.invoice.contractNumber.trim();
    const contractDate = data.contract?.contractDate ? formatDate(data.contract.contractDate) : '';
    if (contractNumber.endsWith(' от') || contractNumber.endsWith(' от ')) {
      contractNumber = contractNumber.replace(/\s+от\s*$/, '').trim();
    }
    setFont('Helvetica-Bold');
    doc.text('Contract No: ', leftColumnX, headerY, { continued: true });
    setFont('Helvetica');
    doc.text(ensureUTF8(`${contractNumber} `), { continued: true });
    
    if (contractDate) {
      setFont('Helvetica-Bold');
      doc.text('dated ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${contractDate}`));
    } else {
      doc.text(''); // end continued text
    }
  }

  // INVOICE title
  doc.fontSize(32);
  setFont('Helvetica-Bold');
  const invoiceTitleWidth = doc.widthOfString('INVOICE');
  doc.text('INVOICE', rightColumnX - invoiceTitleWidth, 30);

  // Separator
  const separatorY = headerY + 20;
  doc.lineWidth(1.2).moveTo(margin, separatorY).lineTo(pageWidth - margin, separatorY).stroke();
  doc.y = separatorY + 15;

  // Two columns: Seller and Buyer
  const sellerStartY = doc.y;
  const columnGap = 20;
  const availableWidth = pageWidth - (2 * margin) - columnGap;
  const sellerColumnWidth = availableWidth / 2;
  const buyerColumnX = leftColumnX + sellerColumnWidth + columnGap;
  const buyerColumnWidth = availableWidth / 2;

  // --- SELLER ---
  doc.fontSize(8);
  setFont('Helvetica-Bold');
  doc.text('Seller', leftColumnX, sellerStartY);
  doc.fontSize(8);
  setFont('Helvetica');

  let currentY = sellerStartY + 9;

  if (data.contract) {
    if (data.contract.sellerName) {
      setFont('Helvetica-Bold');
      const _txtS = ensureUTF8(tr(t, 'sellerName', data.contract.sellerName));
      const _hS = doc.heightOfString(_txtS, { width: sellerColumnWidth });
      doc.text(_txtS, leftColumnX, currentY, { width: sellerColumnWidth });
      setFont('Helvetica');
      currentY += _hS + 3;
    }
    if (data.contract.sellerLegalAddress) {
      const text = ensureUTF8(tr(t, 'sellerAddress', data.contract.sellerLegalAddress));
      const h = doc.heightOfString(text, { width: sellerColumnWidth });
      doc.text(text, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    }
    if (data.contract.sellerInn) {
      const _txt1 = ensureUTF8(`TIN: ${data.contract.sellerInn}`);
      const _h1 = doc.heightOfString(_txt1, { width: sellerColumnWidth });
      doc.text(_txt1, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h1 + 3;
    }
    if (data.contract.sellerOgrn) {
      const _txt2 = ensureUTF8(`OGRN: ${data.contract.sellerOgrn}`);
      const _h2 = doc.heightOfString(_txt2, { width: sellerColumnWidth });
      doc.text(_txt2, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h2 + 3;
    }
    if (data.contract.sellerDetails) {
      const text = ensureUTF8(tr(t, 'sellerDetails', data.contract.sellerDetails)).replace(/\n{2,}/g, '\n').trim();
      const h = doc.heightOfString(text, { width: sellerColumnWidth });
      doc.text(text, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    } else {
      if (data.contract.sellerBankName) {
        const bankName = tr(t, 'sellerBankName', data.contract.sellerBankName);
        const bankText = ensureUTF8(`Bank: ${bankName}${data.contract.sellerBankSwift ? `, SWIFT: ${data.contract.sellerBankSwift}` : ''}`);
        const h = doc.heightOfString(bankText, { width: sellerColumnWidth });
        doc.text(bankText, leftColumnX, currentY, { width: sellerColumnWidth });
        currentY += h + 5;
      }
      if (data.contract.sellerBankAddress) {
        const addr = tr(t, 'sellerBankAddress', data.contract.sellerBankAddress);
        const _txt3 = ensureUTF8(`Address: ${addr}`);
      const _h3 = doc.heightOfString(_txt3, { width: sellerColumnWidth });
      doc.text(_txt3, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h3 + 3;
      }
      if (data.contract.sellerBankAccount) {
        const _txt4 = ensureUTF8(`Account No: ${data.contract.sellerBankAccount}`);
      const _h4 = doc.heightOfString(_txt4, { width: sellerColumnWidth });
      doc.text(_txt4, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h4 + 3;
      }
      if (data.contract.sellerCorrespondentBank) {
        const corrBank = tr(t, 'sellerCorrespondentBank', data.contract.sellerCorrespondentBank);
        const corrText = ensureUTF8(`Correspondent bank: ${corrBank}${data.contract.sellerCorrespondentBankSwift ? `, SWIFT: ${data.contract.sellerCorrespondentBankSwift}` : ''}`);
        const h = doc.heightOfString(corrText, { width: sellerColumnWidth });
        doc.text(corrText, leftColumnX, currentY, { width: sellerColumnWidth });
        currentY += h + 5;
      }
      if (data.contract.sellerCorrespondentBankAccount) {
        const _txt5 = ensureUTF8(`Corr. account: ${data.contract.sellerCorrespondentBankAccount}`);
      const _h5 = doc.heightOfString(_txt5, { width: sellerColumnWidth });
      doc.text(_txt5, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h5 + 3;
      }
    }
  } else {
    const companyName = tr(t, 'sellerName', `LLC "${data.company.name}"`);
    const _txt6 = ensureUTF8(companyName);
      const _h6 = doc.heightOfString(_txt6, { width: sellerColumnWidth });
      doc.text(_txt6, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h6 + 3;
    if (data.company.legalAddress) {
      const addr = tr(t, 'sellerAddress', data.company.legalAddress);
      const h = doc.heightOfString(ensureUTF8(addr), { width: sellerColumnWidth });
      doc.text(ensureUTF8(`Legal address: ${addr}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    }
    if (data.company.actualAddress) {
      const addr = tr(t, 'sellerActualAddress', data.company.actualAddress);
      const h = doc.heightOfString(ensureUTF8(addr), { width: sellerColumnWidth });
      doc.text(ensureUTF8(`Actual address: ${addr}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    }
    if (data.company.inn) {
      const _txt7 = ensureUTF8(`TIN: ${data.company.inn}`);
      const _h7 = doc.heightOfString(_txt7, { width: sellerColumnWidth });
      doc.text(_txt7, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h7 + 3;
    }
    if (data.company.phone || data.company.email) {
      const contactText = ensureUTF8(`Tel: ${data.company.phone || ''}${data.company.phone && data.company.email ? '  ' : ''}E-mail: ${data.company.email || ''}`);
      const h = doc.heightOfString(contactText, { width: sellerColumnWidth });
      doc.text(contactText, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    }
    if (data.company.bankAccount) {
      const _txtAcc = ensureUTF8(data.company.bankAccount);
      const _hAcc = doc.heightOfString(_txtAcc, { width: sellerColumnWidth });
      doc.text(_txtAcc, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _hAcc + 3;
    }
    if (data.company.bankName) {
      const bankName = tr(t, 'sellerBankName', data.company.bankName);
      const _txt8 = ensureUTF8(`Bank: ${bankName}`);
      const _h8 = doc.heightOfString(_txt8, { width: sellerColumnWidth });
      doc.text(_txt8, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h8 + 3;
    }
    if (data.company.bankAddress) {
      const addr = tr(t, 'sellerBankAddress', data.company.bankAddress);
      const _txt9 = ensureUTF8(`Bank address: ${addr}`);
      const _h9 = doc.heightOfString(_txt9, { width: sellerColumnWidth });
      doc.text(_txt9, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h9 + 3;
    }
    if (data.company.swiftCode) {
      const _txt10 = ensureUTF8(`SWIFT: ${data.company.swiftCode}`);
      const _h10 = doc.heightOfString(_txt10, { width: sellerColumnWidth });
      doc.text(_txt10, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h10 + 3;
    }
    if (data.company.correspondentBank) {
      const corrBank = tr(t, 'sellerCorrespondentBank', data.company.correspondentBank);
      const _txt11 = ensureUTF8(`Correspondent bank: ${corrBank}`);
      const _h11 = doc.heightOfString(_txt11, { width: sellerColumnWidth });
      doc.text(_txt11, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h11 + 3;
    }
    if (data.company.correspondentBankSwift) {
      const _txt12 = ensureUTF8(`SWIFT: ${data.company.correspondentBankSwift}`);
      const _h12 = doc.heightOfString(_txt12, { width: sellerColumnWidth });
      doc.text(_txt12, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += _h12 + 3;
    }
  }

  // --- BUYER ---
  let buyerCurrentY = sellerStartY + 9;
  doc.fontSize(8);
  setFont('Helvetica-Bold');
  doc.text('Buyer', buyerColumnX, sellerStartY);
  doc.fontSize(8);
  setFont('Helvetica');

  if (data.contract) {
    if (data.contract.buyerName) {
      setFont('Helvetica-Bold');
      const _txtB = ensureUTF8(tr(t, 'buyerName', data.contract.buyerName));
      const _hB = doc.heightOfString(_txtB, { width: buyerColumnWidth });
      doc.text(_txtB, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      setFont('Helvetica');
      buyerCurrentY += _hB + 3;
    }
    if (data.contract.buyerAddress) {
      const text = ensureUTF8(tr(t, 'buyerAddress', data.contract.buyerAddress));
      const h = doc.heightOfString(text, { width: buyerColumnWidth });
      doc.text(text, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += h + 5;
    }
    if (data.contract.buyerInn) {
      const _txt13 = ensureUTF8(`TIN: ${data.contract.buyerInn}`);
      const _h13 = doc.heightOfString(_txt13, { width: buyerColumnWidth });
      doc.text(_txt13, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h13 + 3;
    }
    if (data.contract.buyerOgrn) {
      const _txt14 = ensureUTF8(`OGRN: ${data.contract.buyerOgrn}`);
      const _h14 = doc.heightOfString(_txt14, { width: buyerColumnWidth });
      doc.text(_txt14, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h14 + 3;
    }
    if (data.contract.buyerDetails) {
      const text = ensureUTF8(tr(t, 'buyerDetails', data.contract.buyerDetails)).replace(/\n{2,}/g, '\n').trim();
      const h = doc.heightOfString(text, { width: buyerColumnWidth });
      doc.text(text, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += h + 5;
    } else {
      if (data.contract.buyerBankName) {
        const bankName = tr(t, 'buyerBankName', data.contract.buyerBankName);
        const bankText = ensureUTF8(`Bank: ${bankName}${data.contract.buyerBankSwift ? `, SWIFT: ${data.contract.buyerBankSwift}` : ''}`);
        const h = doc.heightOfString(bankText, { width: buyerColumnWidth });
        doc.text(bankText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += h + 5;
      }
      if (data.contract.buyerBankAddress) {
        const addr = tr(t, 'buyerBankAddress', data.contract.buyerBankAddress);
        const _txt15 = ensureUTF8(`Address: ${addr}`);
      const _h15 = doc.heightOfString(_txt15, { width: buyerColumnWidth });
      doc.text(_txt15, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h15 + 3;
      }
      if (data.contract.buyerBankAccount) {
        const _txt16 = ensureUTF8(`Account No: ${data.contract.buyerBankAccount}`);
      const _h16 = doc.heightOfString(_txt16, { width: buyerColumnWidth });
      doc.text(_txt16, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h16 + 3;
      }
      if (data.contract.buyerCorrespondentBank) {
        const corrBank = tr(t, 'buyerCorrespondentBank', data.contract.buyerCorrespondentBank);
        const corrText = ensureUTF8(`Correspondent bank: ${corrBank}${data.contract.buyerCorrespondentBankSwift ? `, SWIFT: ${data.contract.buyerCorrespondentBankSwift}` : ''}`);
        const h = doc.heightOfString(corrText, { width: buyerColumnWidth });
        doc.text(corrText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += h + 5;
      }
      if (data.contract.buyerCorrespondentBankAccount) {
        const _txt17 = ensureUTF8(`Corr. account: ${data.contract.buyerCorrespondentBankAccount}`);
      const _h17 = doc.heightOfString(_txt17, { width: buyerColumnWidth });
      doc.text(_txt17, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h17 + 3;
      }
    }
  } else {
    const clientName = tr(t, 'buyerName', data.client.name);
    const _txt18 = ensureUTF8(clientName);
      const _h18 = doc.heightOfString(_txt18, { width: buyerColumnWidth });
      doc.text(_txt18, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h18 + 3;
    if (data.client.address) {
      const addr = tr(t, 'buyerAddress', data.client.address);
      const _txt19 = ensureUTF8(`Address: ${addr}`);
      const _h19 = doc.heightOfString(_txt19, { width: buyerColumnWidth });
      doc.text(_txt19, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h19 + 3;
    }
    if (data.client.inn) {
      const _txt20 = ensureUTF8(`TIN: ${data.client.inn}`);
      const _h20 = doc.heightOfString(_txt20, { width: buyerColumnWidth });
      doc.text(_txt20, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h20 + 3;
    }
    if (data.client.phone) {
      const _txt21 = ensureUTF8(`Tel: ${data.client.phone}`);
      const _h21 = doc.heightOfString(_txt21, { width: buyerColumnWidth });
      doc.text(_txt21, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h21 + 3;
    }
    if (data.client.email) {
      const _txt22 = ensureUTF8(`E-mail: ${data.client.email}`);
      const _h22 = doc.heightOfString(_txt22, { width: buyerColumnWidth });
      doc.text(_txt22, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h22 + 3;
    }
    if (data.client.bankName) {
      const bankName = tr(t, 'buyerBankName', data.client.bankName);
      const _txt23 = ensureUTF8(`Beneficiary's bank: ${bankName}`);
      const _h23 = doc.heightOfString(_txt23, { width: buyerColumnWidth });
      doc.text(_txt23, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h23 + 3;
    }
    if (data.client.bankSwift) {
      const _txt24 = ensureUTF8(`SWIFT: ${data.client.bankSwift}`);
      const _h24 = doc.heightOfString(_txt24, { width: buyerColumnWidth });
      doc.text(_txt24, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h24 + 3;
    }
    if (data.client.bankAccount) {
      const _txt25 = ensureUTF8(`Current account (${data.invoice.currency}): ${data.client.bankAccount}`);
      const _h25 = doc.heightOfString(_txt25, { width: buyerColumnWidth });
      doc.text(_txt25, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h25 + 3;
    }
    if (data.client.correspondentBank) {
      const corrBank = tr(t, 'buyerCorrespondentBank', data.client.correspondentBank);
      const _txt26 = ensureUTF8(`Correspondent bank: ${corrBank}`);
      const _h26 = doc.heightOfString(_txt26, { width: buyerColumnWidth });
      doc.text(_txt26, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h26 + 3;
    }
    if (data.client.correspondentBankSwift) {
      const _txt27 = ensureUTF8(`SWIFT: ${data.client.correspondentBankSwift}`);
      const _h27 = doc.heightOfString(_txt27, { width: buyerColumnWidth });
      doc.text(_txt27, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += _h27 + 3;
    }
  }

  const maxY = Math.max(currentY, buyerCurrentY);
  
  // Separator after Seller/Buyer sections
  const partySeparatorY = maxY + 10;
  doc.lineWidth(1.2).moveTo(margin, partySeparatorY).lineTo(pageWidth - margin, partySeparatorY).stroke();
  
  // Vertical separator line
  const centerX = margin + sellerColumnWidth + (columnGap / 2);
  doc.lineWidth(1.2).moveTo(centerX, separatorY).lineTo(centerX, partySeparatorY).stroke();
  
  doc.y = partySeparatorY + 10;
  doc.moveDown(0.5);

  // Additional Information
  if (data.invoice.additionalInfo) {
    const info = data.invoice.additionalInfo as any;
    doc.fontSize(9);
    setFont('Helvetica-Bold');
    doc.text('Additional Information', 30, doc.y);
    setFont('Helvetica');
    doc.fontSize(8);
    doc.x = 30;
    doc.moveDown(0.5);
    if (info.deliveryTerms) {
      const terms = tr(t, 'deliveryTerms', info.deliveryTerms);
      setFont('Helvetica-Bold');
      doc.text('Delivery Terms: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${terms}`));
      doc.moveDown(0.2);
    }
    if (info.vehicleNumber) {
      setFont('Helvetica-Bold');
      doc.text('Vehicle No: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${info.vehicleNumber}`));
      doc.moveDown(0.2);
    }
    if (info.shipmentPlace) {
      const place = tr(t, 'shipmentPlace', info.shipmentPlace);
      setFont('Helvetica-Bold');
      doc.text('Place of Shipment: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${place}`));
      doc.moveDown(0.2);
    }
    if (info.destination) {
      const dest = tr(t, 'destination', info.destination);
      setFont('Helvetica-Bold');
      doc.text('Destination: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${dest}`));
      doc.moveDown(0.2);
    }
    if (info.origin) {
      const origin = tr(t, 'origin', info.origin);
      setFont('Helvetica-Bold');
      doc.text('Country of Origin: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${origin}`));
      doc.moveDown(0.2);
    }
    if (info.manufacturer) {
      const mfr = tr(t, 'manufacturer', info.manufacturer);
      setFont('Helvetica-Bold');
      doc.text('Manufacturer: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${mfr}`));
      doc.moveDown(0.2);
    }
    if (info.orderNumber) {
      setFont('Helvetica-Bold');
      doc.text('Order No: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${info.orderNumber}`));
      doc.moveDown(0.2);
    }
    if (info.gln) {
      setFont('Helvetica-Bold');
      doc.text('GS1 Global Location Number (GLN): ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${info.gln}`));
      doc.moveDown(0.2);
    }
    if (info.harvestYear) {
      setFont('Helvetica-Bold');
      doc.text('Harvest: ', { continued: true });
      setFont('Helvetica');
      doc.text(ensureUTF8(`${info.harvestYear}`));
      doc.moveDown(0.2);
    }
    
    // Separator after Additional Info
    const infoSeparatorY = doc.y + 5;
    doc.lineWidth(1.2).moveTo(margin, infoSeparatorY).lineTo(pageWidth - margin, infoSeparatorY).stroke();
    doc.y = infoSeparatorY + 10;
    doc.moveDown(0.5);
  }

  // Items table
  const tableTop = doc.y;
  const itemHeight = 25;
  const startX = 30;

  const hasTnvedCode = data.invoice.items?.some(item => item.tnvedCode && item.tnvedCode.trim() !== '');
  const hasPluCode = data.invoice.items?.some(item => item.pluCode && item.pluCode.trim() !== '');
  const hasPackageType = data.invoice.items?.some(item => item.packageType && item.packageType.trim() !== '');
  const hasPackagesCount = data.invoice.items?.some(item => item.packagesCount != null);
  const hasGrossWeight = data.invoice.items?.some(item => item.grossWeight && Number(item.grossWeight) > 0);
  const hasNetWeight = data.invoice.items?.some(item => item.netWeight && Number(item.netWeight) > 0);

  let currentX = startX;
  const colWidths: Record<string, number> = {
    number: 15,
    tnvedCode: hasTnvedCode ? 55 : 0,
    pluCode: hasPluCode ? 45 : 0,
    name: 90,
    unit: 25,
    packageType: hasPackageType ? 45 : 0,
    quantity: 35,
    packagesCount: hasPackagesCount ? 40 : 0,
    grossWeight: hasGrossWeight ? 45 : 0,
    netWeight: hasNetWeight ? 45 : 0,
    unitPrice: 40,
    totalPrice: 50,
  };

  const colPositions: Record<string, number> = {};
  colPositions.number = currentX; currentX += colWidths.number;
  if (hasTnvedCode) { colPositions.tnvedCode = currentX; currentX += colWidths.tnvedCode; }
  if (hasPluCode) { colPositions.pluCode = currentX; currentX += colWidths.pluCode; }
  colPositions.name = currentX; currentX += colWidths.name;
  colPositions.unit = currentX; currentX += colWidths.unit;
  if (hasPackageType) { colPositions.packageType = currentX; currentX += colWidths.packageType; }
  colPositions.quantity = currentX; currentX += colWidths.quantity;
  if (hasPackagesCount) { colPositions.packagesCount = currentX; currentX += colWidths.packagesCount; }
  if (hasGrossWeight) { colPositions.grossWeight = currentX; currentX += colWidths.grossWeight; }
  if (hasNetWeight) { colPositions.netWeight = currentX; currentX += colWidths.netWeight; }
  colPositions.unitPrice = currentX; currentX += colWidths.unitPrice;
  colPositions.totalPrice = currentX; currentX += colWidths.totalPrice;

  // Draw full table boundary and header background
  const finalYEstimate = 480; // We'll trace the rows and draw horizontal lines, we don't draw a single giant rect yet.
  
  
  
  doc.fillColor('black');
  
  // Table header
  doc.fontSize(7);
  doc.text('No.', colPositions.number, tableTop, { width: colWidths.number });
  if (hasTnvedCode) doc.text('HS Code', colPositions.tnvedCode!, tableTop, { width: colWidths.tnvedCode });
  if (hasPluCode) doc.text('PLU Code', colPositions.pluCode!, tableTop, { width: colWidths.pluCode });
  doc.text('Description', colPositions.name, tableTop, { width: colWidths.name });
  doc.text('Unit', colPositions.unit, tableTop, { width: colWidths.unit });
  if (hasPackageType) doc.text('Pkg Type', colPositions.packageType!, tableTop, { width: colWidths.packageType });
  doc.text('Places', colPositions.quantity, tableTop, { width: colWidths.quantity });
  if (hasPackagesCount) doc.text('Qty', colPositions.packagesCount!, tableTop, { width: colWidths.packagesCount });
  if (hasGrossWeight) doc.text('Gross', colPositions.grossWeight!, tableTop, { width: colWidths.grossWeight });
  if (hasNetWeight) doc.text('Net', colPositions.netWeight!, tableTop, { width: colWidths.netWeight });
  doc.text('Price', colPositions.unitPrice, tableTop, { width: colWidths.unitPrice });
  doc.text('Amount', colPositions.totalPrice, tableTop, { width: colWidths.totalPrice });

  doc.lineWidth(0.5).strokeColor('#4b5563').moveTo(startX, tableTop + 15).lineTo(currentX, tableTop + 15).stroke();

  let y = tableTop + 20; // Adjusted spacing
  if (!data.invoice.items || data.invoice.items.length === 0) {
    doc.fontSize(7);
    doc.text('No items', startX, y, { width: currentX - startX });
    y += itemHeight;
  } else {
    data.invoice.items.forEach((item, index) => {
      if (y > 750) { doc.addPage(); y = 30; }
      doc.fontSize(7);
      doc.text((index + 1).toString(), colPositions.number, y, { width: colWidths.number });
      if (hasTnvedCode) doc.text(ensureUTF8(item.tnvedCode || ''), colPositions.tnvedCode!, y, { width: colWidths.tnvedCode });
      if (hasPluCode) doc.text(ensureUTF8(item.pluCode || ''), colPositions.pluCode!, y, { width: colWidths.pluCode });
      const keySuffix = item.id || index;
      const itemName = tr(t, `item_name_${keySuffix}`, item.name || '');
      doc.text(ensureUTF8(itemName), colPositions.name, y, { width: colWidths.name });
      
      const itemUnit = tr(t, `item_unit_${keySuffix}`, item.unit || '');
      doc.text(ensureUTF8(itemUnit), colPositions.unit, y, { width: colWidths.unit });
      if (hasPackageType) {
        const pkgType = item.packageType ? tr(t, `pkg_${item.packageType}`, item.packageType) : '';
        doc.text(ensureUTF8(pkgType), colPositions.packageType!, y, { width: colWidths.packageType });
      }
      doc.text((item.quantity || 0).toString(), colPositions.quantity, y, { width: colWidths.quantity });
      if (hasPackagesCount) doc.text(((item as any).packagesCount || '').toString(), colPositions.packagesCount!, y, { width: colWidths.packagesCount });
      if (hasGrossWeight) doc.text(item.grossWeight ? item.grossWeight.toString() : '', colPositions.grossWeight!, y, { width: colWidths.grossWeight });
      if (hasNetWeight) doc.text(item.netWeight ? item.netWeight.toString() : '', colPositions.netWeight!, y, { width: colWidths.netWeight });
      doc.text((item.unitPrice || 0).toString(), colPositions.unitPrice, y, { width: colWidths.unitPrice });
      doc.text(Number(item.totalPrice || 0).toFixed(2), colPositions.totalPrice, y, { width: colWidths.totalPrice });
      y += itemHeight;
      doc.lineWidth(0.5).strokeColor('#e5e7eb').moveTo(startX, y - 5).lineTo(currentX, y - 5).stroke();
    });
  }

  // Total line
  doc.lineWidth(1.2).strokeColor('#111827').moveTo(startX, y - 5).lineTo(currentX, y - 5).stroke();

  const totalY = y - 2;
  doc.fontSize(8);
  setFont('Helvetica-Bold');
  doc.text('Total:', colPositions.name, totalY, { width: colWidths.name });

  const totalQuantity = data.invoice.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPackagesCount = data.invoice.items.reduce((sum, item) => sum + Number((item as any).packagesCount || 0), 0);
  const totalGrossWeight = data.invoice.items.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const totalNetWeight = data.invoice.items.reduce((sum, item) => sum + Number(item.netWeight || 0), 0);

  doc.text(totalQuantity.toString(), colPositions.quantity, totalY, { width: colWidths.quantity });
  if (hasPackagesCount) doc.text(totalPackagesCount.toString(), colPositions.packagesCount!, totalY, { width: colWidths.packagesCount });
  if (hasGrossWeight) doc.text(totalGrossWeight > 0 ? totalGrossWeight.toString() : '', colPositions.grossWeight!, totalY, { width: colWidths.grossWeight });
  if (hasNetWeight) doc.text(totalNetWeight > 0 ? totalNetWeight.toString() : '', colPositions.netWeight!, totalY, { width: colWidths.netWeight });
  doc.text(`${getCurrencySymbol(data.invoice.currency)} ${Number(data.invoice.totalAmount || 0).toFixed(2)}`, colPositions.totalPrice, totalY, { width: colWidths.totalPrice });
  setFont('Helvetica');

  // Amount in words (English)
  const nextY = totalY + 30;
  doc.fontSize(8);
  const totalAmount = Number(data.invoice.totalAmount) || 0;
  const amountInWords = numberToWordsEn(totalAmount, data.invoice.currency);
  doc.text(ensureUTF8(`Amount in words: ${amountInWords}`), startX, nextY);
  doc.y = nextY + 12;
  doc.moveDown(1);

  // Notes
  if (data.invoice.notes) {
    let notesY = doc.y + 15;
    if (isNaN(doc.y) || doc.y <= 0 || !isFinite(doc.y)) notesY = (totalY || 400) + 50;
    
    const notesText = ensureUTF8(tr(t, 'notes', data.invoice.notes));
    const notesContentWidth = pageWidth - 2 * margin - 20;
    const notesTextHeight = doc.fontSize(7).heightOfString(notesText, { width: notesContentWidth });
    
    // Draw rounded outer bounding box for notes
    doc.lineWidth(1)
       .strokeColor('#d1d5db')
       .roundedRect(startX, notesY - 10, pageWidth - 2 * margin, notesTextHeight + 35, 8)
       .stroke();
    
    doc.fillColor('black');
    doc.fontSize(8).text('Special Notes', startX + 10, notesY);
    
    doc.fontSize(7).text(notesText, startX + 10, notesY + 15, { width: notesContentWidth });
    doc.y = notesY + notesTextHeight + 35;
  }

  // Signatures
  let signatureY = doc.y;
  if (isNaN(doc.y) || doc.y <= 0 || !isFinite(doc.y)) {
    signatureY = data.invoice.notes ? (doc.y || 500) + 50 : (totalY || 400) + 100;
  } else {
    signatureY = doc.y + 30;
  }

  doc.fontSize(8);

  try {
    const supplierDirector = tr(t, 'supplierDirector', data.contract?.supplierDirector || '');
    const goodsReleasedBy = tr(t, 'goodsReleasedBy', data.contract?.goodsReleasedBy || '');
    const signaturePath = resolveUploadImagePath(data.contract?.signatureUrl);
    const sealPath = resolveUploadImagePath(data.contract?.sealUrl);

    const supplierText = supplierDirector ? `Supplier Director: ${supplierDirector}` : 'Supplier Director _________________';
    doc.text(ensureUTF8(supplierText), startX, signatureY);

    let imageX = startX + doc.widthOfString(ensureUTF8(supplierText)) + 10;
    const imageY = signatureY - 10;
    if (signaturePath) { doc.image(signaturePath, imageX, imageY, { height: 30 }); imageX += 90; }
    if (sealPath) { doc.image(sealPath, imageX, imageY - 4, { height: 40 }); }

    if (goodsReleasedBy) {
      doc.text(ensureUTF8(`Goods Released By: ${goodsReleasedBy}`), startX, signatureY + 30);
    } else {
      doc.text('Goods Released By _________________', startX, signatureY + 30);
    }
  } catch (sigError: any) {
    console.error('Error in signature section:', sigError);
    doc.text('Supplier Director _________________', startX, doc.y);
    doc.text('Goods Released By _________________', startX, doc.y + 30);
  }

  return doc;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function numberToWordsEn(num: number, currency: string): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'zero';

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  function convert(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    return convert(Math.floor(n / 1000000000)) + ' billion' + (n % 1000000000 ? ' ' + convert(n % 1000000000) : '');
  }

  let result = convert(wholePart);

  if (currency === 'USD') {
    result += wholePart === 1 ? ' US Dollar' : ' US Dollars';
  } else {
    result += wholePart === 1 ? ' Sum' : ' Sums';
  }

  if (decimalPart > 0) {
    result += ` ${decimalPart} ${currency === 'USD' ? 'cents' : 'tiyin'}`;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}
