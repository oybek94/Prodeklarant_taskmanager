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
  try { result = result.normalize('NFC'); } catch {}
  try { result = Buffer.from(result, 'utf8').toString('utf8'); } catch { result = ''; }
  return result;
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
  const fontPaths = [
    path.join(__dirname, '../fonts/DejaVuSans.ttf'),
    path.join(__dirname, '../../fonts/DejaVuSans.ttf'),
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/times.ttf',
  ];
  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        doc.registerFont('CyrillicFont', fontPath);
        doc.font('CyrillicFont');
        fontRegistered = true;
        break;
      }
    } catch {}
  }
  if (!fontRegistered) doc.font('Helvetica');

  const setFont = (fontName: string = 'Helvetica') => {
    if (fontRegistered) doc.font('CyrillicFont');
    else doc.font(fontName);
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
  doc.text(ensureUTF8(`Invoice No: ${data.invoice.invoiceNumber} dated ${invoiceDate}`), leftColumnX, headerY);

  headerY += 12;
  if (data.invoice.contractNumber) {
    let contractNumber = data.invoice.contractNumber.trim();
    const contractDate = data.contract?.contractDate ? formatDate(data.contract.contractDate) : '';
    if (contractNumber.endsWith(' от') || contractNumber.endsWith(' от ')) {
      contractNumber = contractNumber.replace(/\s+от\s*$/, '').trim();
    }
    doc.text(ensureUTF8(`Contract No: ${contractNumber}${contractDate ? ` dated ${contractDate}` : ''}`), leftColumnX, headerY);
  }

  // INVOICE title
  doc.fontSize(32);
  setFont('Helvetica-Bold');
  const invoiceTitleWidth = doc.widthOfString('INVOICE');
  doc.text('INVOICE', rightColumnX - invoiceTitleWidth, 30);

  // Separator
  const separatorY = headerY + 35;
  doc.moveTo(margin, separatorY).lineTo(pageWidth - margin, separatorY).stroke();
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
      doc.text(ensureUTF8(tr(t, 'sellerName', data.contract.sellerName)), leftColumnX, currentY, { width: sellerColumnWidth });
      setFont('Helvetica');
      currentY += 8;
    }
    if (data.contract.sellerLegalAddress) {
      const text = ensureUTF8(tr(t, 'sellerAddress', data.contract.sellerLegalAddress));
      const h = doc.heightOfString(text, { width: sellerColumnWidth });
      doc.text(text, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    }
    if (data.contract.sellerInn) {
      doc.text(ensureUTF8(`TIN: ${data.contract.sellerInn}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.contract.sellerOgrn) {
      doc.text(ensureUTF8(`OGRN: ${data.contract.sellerOgrn}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.contract.sellerDetails) {
      const text = ensureUTF8(tr(t, 'sellerDetails', data.contract.sellerDetails));
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
        doc.text(ensureUTF8(`Address: ${addr}`), leftColumnX, currentY, { width: sellerColumnWidth });
        currentY += 8;
      }
      if (data.contract.sellerBankAccount) {
        doc.text(ensureUTF8(`Account No: ${data.contract.sellerBankAccount}`), leftColumnX, currentY, { width: sellerColumnWidth });
        currentY += 8;
      }
      if (data.contract.sellerCorrespondentBank) {
        const corrBank = tr(t, 'sellerCorrespondentBank', data.contract.sellerCorrespondentBank);
        const corrText = ensureUTF8(`Correspondent bank: ${corrBank}${data.contract.sellerCorrespondentBankSwift ? `, SWIFT: ${data.contract.sellerCorrespondentBankSwift}` : ''}`);
        const h = doc.heightOfString(corrText, { width: sellerColumnWidth });
        doc.text(corrText, leftColumnX, currentY, { width: sellerColumnWidth });
        currentY += h + 5;
      }
      if (data.contract.sellerCorrespondentBankAccount) {
        doc.text(ensureUTF8(`Corr. account: ${data.contract.sellerCorrespondentBankAccount}`), leftColumnX, currentY, { width: sellerColumnWidth });
        currentY += 8;
      }
    }
  } else {
    const companyName = tr(t, 'sellerName', `LLC "${data.company.name}"`);
    doc.text(ensureUTF8(companyName), leftColumnX, currentY, { width: sellerColumnWidth });
    currentY += 8;
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
      doc.text(ensureUTF8(`TIN: ${data.company.inn}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.phone || data.company.email) {
      const contactText = ensureUTF8(`Tel: ${data.company.phone || ''}${data.company.phone && data.company.email ? '  ' : ''}E-mail: ${data.company.email || ''}`);
      const h = doc.heightOfString(contactText, { width: sellerColumnWidth });
      doc.text(contactText, leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += h + 5;
    }
    if (data.company.bankName) {
      const bankName = tr(t, 'sellerBankName', data.company.bankName);
      doc.text(ensureUTF8(`Bank: ${bankName}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.bankAddress) {
      const addr = tr(t, 'sellerBankAddress', data.company.bankAddress);
      doc.text(ensureUTF8(`Bank address: ${addr}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.swiftCode) {
      doc.text(ensureUTF8(`SWIFT: ${data.company.swiftCode}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.correspondentBank) {
      const corrBank = tr(t, 'sellerCorrespondentBank', data.company.correspondentBank);
      doc.text(ensureUTF8(`Correspondent bank: ${corrBank}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.correspondentBankSwift) {
      doc.text(ensureUTF8(`SWIFT: ${data.company.correspondentBankSwift}`), leftColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
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
      doc.text(ensureUTF8(tr(t, 'buyerName', data.contract.buyerName)), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      setFont('Helvetica');
      buyerCurrentY += 8;
    }
    if (data.contract.buyerAddress) {
      const text = ensureUTF8(tr(t, 'buyerAddress', data.contract.buyerAddress));
      const h = doc.heightOfString(text, { width: buyerColumnWidth });
      doc.text(text, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += h + 5;
    }
    if (data.contract.buyerInn) {
      doc.text(ensureUTF8(`TIN: ${data.contract.buyerInn}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.contract.buyerOgrn) {
      doc.text(ensureUTF8(`OGRN: ${data.contract.buyerOgrn}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.contract.buyerDetails) {
      const text = ensureUTF8(tr(t, 'buyerDetails', data.contract.buyerDetails));
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
        doc.text(ensureUTF8(`Address: ${addr}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
      if (data.contract.buyerBankAccount) {
        doc.text(ensureUTF8(`Account No: ${data.contract.buyerBankAccount}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
      if (data.contract.buyerCorrespondentBank) {
        const corrBank = tr(t, 'buyerCorrespondentBank', data.contract.buyerCorrespondentBank);
        const corrText = ensureUTF8(`Correspondent bank: ${corrBank}${data.contract.buyerCorrespondentBankSwift ? `, SWIFT: ${data.contract.buyerCorrespondentBankSwift}` : ''}`);
        const h = doc.heightOfString(corrText, { width: buyerColumnWidth });
        doc.text(corrText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += h + 5;
      }
      if (data.contract.buyerCorrespondentBankAccount) {
        doc.text(ensureUTF8(`Corr. account: ${data.contract.buyerCorrespondentBankAccount}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
    }
  } else {
    const clientName = tr(t, 'buyerName', data.client.name);
    doc.text(ensureUTF8(clientName), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
    buyerCurrentY += 8;
    if (data.client.address) {
      const addr = tr(t, 'buyerAddress', data.client.address);
      doc.text(ensureUTF8(`Address: ${addr}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.inn) {
      doc.text(ensureUTF8(`TIN: ${data.client.inn}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.phone) {
      doc.text(ensureUTF8(`Tel: ${data.client.phone}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.email) {
      doc.text(ensureUTF8(`E-mail: ${data.client.email}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.bankName) {
      const bankName = tr(t, 'buyerBankName', data.client.bankName);
      doc.text(ensureUTF8(`Beneficiary's bank: ${bankName}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.bankSwift) {
      doc.text(ensureUTF8(`SWIFT: ${data.client.bankSwift}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.bankAccount) {
      doc.text(ensureUTF8(`Current account (${data.invoice.currency}): ${data.client.bankAccount}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.correspondentBank) {
      const corrBank = tr(t, 'buyerCorrespondentBank', data.client.correspondentBank);
      doc.text(ensureUTF8(`Correspondent bank: ${corrBank}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.correspondentBankSwift) {
      doc.text(ensureUTF8(`SWIFT: ${data.client.correspondentBankSwift}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
  }

  const maxY = Math.max(currentY, buyerCurrentY);
  doc.y = maxY;
  doc.moveDown(0.5);

  // Additional Information
  if (data.invoice.additionalInfo) {
    const info = data.invoice.additionalInfo as any;
    doc.fontSize(9);
    setFont('Helvetica-Bold');
    doc.text('Additional Information', 30, doc.y);
    setFont('Helvetica');
    doc.fontSize(8);
    let infoY = doc.y + 12;

    if (info.deliveryTerms) {
      const terms = tr(t, 'deliveryTerms', info.deliveryTerms);
      doc.text(ensureUTF8(`Delivery Terms: ${terms}`), 30, infoY);
      infoY += 10;
    }
    if (info.vehicleNumber) {
      doc.text(ensureUTF8(`Vehicle No: ${info.vehicleNumber}`), 30, infoY);
      infoY += 10;
    }
    if (info.shipmentPlace) {
      const place = tr(t, 'shipmentPlace', info.shipmentPlace);
      doc.text(ensureUTF8(`Place of Shipment: ${place}`), 30, infoY);
      infoY += 10;
    }
    if (info.destination) {
      const dest = tr(t, 'destination', info.destination);
      doc.text(ensureUTF8(`Destination: ${dest}`), 30, infoY);
      infoY += 10;
    }
    if (info.origin) {
      const origin = tr(t, 'origin', info.origin);
      doc.text(ensureUTF8(`Country of Origin: ${origin}`), 30, infoY);
      infoY += 10;
    }
    if (info.manufacturer) {
      const mfr = tr(t, 'manufacturer', info.manufacturer);
      doc.text(ensureUTF8(`Manufacturer: ${mfr}`), 30, infoY);
      infoY += 10;
    }
    if (info.orderNumber) {
      doc.text(ensureUTF8(`Order No: ${info.orderNumber}`), 30, infoY);
      infoY += 10;
    }
    if (info.gln) {
      doc.text(ensureUTF8(`GS1 Global Location Number (GLN): ${info.gln}`), 30, infoY);
      infoY += 10;
    }
    if (info.harvestYear) {
      doc.text(ensureUTF8(`Harvest: ${info.harvestYear}`), 30, infoY);
      infoY += 10;
    }
    doc.y = infoY;
    doc.moveDown(0.5);
  }

  // Items table
  const tableTop = doc.y;
  const itemHeight = 15;
  const startX = 30;

  const hasTnvedCode = data.invoice.items?.some(item => item.tnvedCode && item.tnvedCode.trim() !== '');
  const hasPluCode = data.invoice.items?.some(item => item.pluCode && item.pluCode.trim() !== '');
  const hasPackageType = data.invoice.items?.some(item => item.packageType && item.packageType.trim() !== '');
  const hasGrossWeight = data.invoice.items?.some(item => item.grossWeight && Number(item.grossWeight) > 0);
  const hasNetWeight = data.invoice.items?.some(item => item.netWeight && Number(item.netWeight) > 0);

  let currentX = startX;
  const colWidths: Record<string, number> = {
    number: 20,
    tnvedCode: hasTnvedCode ? 60 : 0,
    pluCode: hasPluCode ? 50 : 0,
    name: 120,
    packageType: hasPackageType ? 60 : 0,
    unit: 40,
    quantity: 40,
    grossWeight: hasGrossWeight ? 50 : 0,
    netWeight: hasNetWeight ? 50 : 0,
    unitPrice: 50,
    totalPrice: 60,
  };

  const colPositions: Record<string, number> = {};
  colPositions.number = currentX; currentX += colWidths.number;
  if (hasTnvedCode) { colPositions.tnvedCode = currentX; currentX += colWidths.tnvedCode; }
  if (hasPluCode) { colPositions.pluCode = currentX; currentX += colWidths.pluCode; }
  colPositions.name = currentX; currentX += colWidths.name;
  if (hasPackageType) { colPositions.packageType = currentX; currentX += colWidths.packageType; }
  colPositions.unit = currentX; currentX += colWidths.unit;
  colPositions.quantity = currentX; currentX += colWidths.quantity;
  if (hasGrossWeight) { colPositions.grossWeight = currentX; currentX += colWidths.grossWeight; }
  if (hasNetWeight) { colPositions.netWeight = currentX; currentX += colWidths.netWeight; }
  colPositions.unitPrice = currentX; currentX += colWidths.unitPrice;
  colPositions.totalPrice = currentX; currentX += colWidths.totalPrice;

  // Table header
  doc.fontSize(7);
  doc.text('No.', colPositions.number, tableTop, { width: colWidths.number });
  if (hasTnvedCode) doc.text('HS Code', colPositions.tnvedCode!, tableTop, { width: colWidths.tnvedCode });
  if (hasPluCode) doc.text('PLU Code', colPositions.pluCode!, tableTop, { width: colWidths.pluCode });
  doc.text('Description', colPositions.name, tableTop, { width: colWidths.name });
  if (hasPackageType) doc.text('Package Type', colPositions.packageType!, tableTop, { width: colWidths.packageType });
  doc.text('Unit', colPositions.unit, tableTop, { width: colWidths.unit });
  doc.text('Qty', colPositions.quantity, tableTop, { width: colWidths.quantity });
  if (hasGrossWeight) doc.text('Gross', colPositions.grossWeight!, tableTop, { width: colWidths.grossWeight });
  if (hasNetWeight) doc.text('Net', colPositions.netWeight!, tableTop, { width: colWidths.netWeight });
  doc.text('Price', colPositions.unitPrice, tableTop, { width: colWidths.unitPrice });
  doc.text('Amount', colPositions.totalPrice, tableTop, { width: colWidths.totalPrice });

  doc.moveTo(startX, tableTop + 15).lineTo(currentX, tableTop + 15).stroke();

  let y = tableTop + 18;
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
      // Use English name if available, fallback to original
      const itemName = (item as any).nameEn || item.name || '';
      doc.text(ensureUTF8(itemName), colPositions.name, y, { width: colWidths.name });
      if (hasPackageType) doc.text(ensureUTF8(item.packageType || ''), colPositions.packageType!, y, { width: colWidths.packageType });
      doc.text(ensureUTF8(item.unit || ''), colPositions.unit, y, { width: colWidths.unit });
      doc.text((item.quantity || 0).toString(), colPositions.quantity, y, { width: colWidths.quantity });
      if (hasGrossWeight) doc.text(item.grossWeight ? item.grossWeight.toString() : '', colPositions.grossWeight!, y, { width: colWidths.grossWeight });
      if (hasNetWeight) doc.text(item.netWeight ? item.netWeight.toString() : '', colPositions.netWeight!, y, { width: colWidths.netWeight });
      doc.text((item.unitPrice || 0).toString(), colPositions.unitPrice, y, { width: colWidths.unitPrice });
      doc.text((item.totalPrice || 0).toString(), colPositions.totalPrice, y, { width: colWidths.totalPrice });
      y += itemHeight;
    });
  }

  // Total line
  doc.moveTo(startX, y).lineTo(currentX, y).stroke();

  const totalY = y + 10;
  doc.fontSize(8);
  setFont('Helvetica-Bold');
  doc.text('Total:', colPositions.name, totalY, { width: colWidths.name });

  const totalQuantity = data.invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalGrossWeight = data.invoice.items.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const totalNetWeight = data.invoice.items.reduce((sum, item) => sum + Number(item.netWeight || 0), 0);

  doc.text(totalQuantity.toString(), colPositions.quantity, totalY, { width: colWidths.quantity });
  if (hasGrossWeight) doc.text(totalGrossWeight > 0 ? totalGrossWeight.toString() : '', colPositions.grossWeight!, totalY, { width: colWidths.grossWeight });
  if (hasNetWeight) doc.text(totalNetWeight > 0 ? totalNetWeight.toString() : '', colPositions.netWeight!, totalY, { width: colWidths.netWeight });
  const totalAmount = Number(data.invoice.totalAmount) || 0;
  doc.text(`${totalAmount.toFixed(2)} ${data.invoice.currency}`, colPositions.totalPrice, totalY, { width: colWidths.totalPrice });
  setFont('Helvetica');

  // Amount in words (English)
  const nextY = totalY + 30;
  doc.fontSize(8);
  const amountInWords = numberToWordsEn(totalAmount, data.invoice.currency);
  doc.text(ensureUTF8(`Amount in words: ${amountInWords}`), startX, nextY);
  doc.y = nextY + 12;
  doc.moveDown(1);

  // Notes
  if (data.invoice.notes) {
    let notesY = doc.y;
    if (isNaN(doc.y) || doc.y <= 0 || !isFinite(doc.y)) notesY = (totalY || 400) + 50;
    doc.fontSize(8).text('Special Notes', startX, notesY, { underline: true });
    const notesText = ensureUTF8(data.invoice.notes);
    const notesContentWidth = pageWidth - 2 * margin;
    const notesTextHeight = doc.fontSize(7).heightOfString(notesText, { width: notesContentWidth });
    doc.fontSize(7).text(notesText, startX, notesY + 10, { width: notesContentWidth });
    doc.y = notesY + 10 + notesTextHeight + 4;
  }

  // Signatures
  let signatureY = doc.y;
  if (isNaN(doc.y) || doc.y <= 0 || !isFinite(doc.y)) {
    signatureY = data.invoice.notes ? (doc.y || 500) + 50 : (totalY || 400) + 100;
  } else {
    signatureY = doc.y + 30;
  }

  doc.fontSize(10);

  try {
    const supplierDirector = data.contract?.supplierDirector || '';
    const goodsReleasedBy = data.contract?.goodsReleasedBy || '';
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
