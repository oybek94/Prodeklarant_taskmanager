import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem, Client, CompanySettings } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface InvoiceData {
  invoice: Invoice & { items: InvoiceItem[] };
  client: Client;
  company: CompanySettings;
  contract?: any; // Contract ma'lumotlari
}

// Helper function to ensure text is a valid UTF-8 string
// Normalize text to ensure proper UTF-8 encoding for PDFKit
function ensureUTF8(text: any): string {
  if (text === null || text === undefined) return '';
  
  // Convert to string first
  let result = String(text);
  
  // Normalize Unicode characters (NFD to NFC) to ensure proper encoding
  // This helps with Cyrillic characters that might be in decomposed form
  try {
    result = result.normalize('NFC');
  } catch (e) {
    // If normalization fails, use the original string
    // This shouldn't happen with valid UTF-8, but we handle it gracefully
  }
  
  // Ensure the string is valid UTF-8 by encoding and decoding
  // This catches any invalid UTF-8 sequences
  try {
    const utf8Buffer = Buffer.from(result, 'utf8');
    result = utf8Buffer.toString('utf8');
  } catch (e) {
    // If encoding fails, return empty string or original
    result = '';
  }
  
  return result;
}

export function generateInvoicePDF(data: InvoiceData): any {
  // Reduce margins to fit more content on one page
  // PDFKit automatically handles UTF-8 encoding, but we ensure proper text handling
  const doc = new PDFDocument({ 
    margin: 30, 
    size: 'A4',
    autoFirstPage: true,
    info: {
      Title: 'Invoice',
      Author: 'Pro Deklarant',
      Subject: 'Invoice PDF',
      Creator: 'Pro Deklarant System'
    },
    // Ensure UTF-8 encoding
    compress: false
  });
  
  // PDFKit's Helvetica font doesn't support Cyrillic characters
  // Try to register a font that supports Cyrillic (Windows system fonts or DejaVu Sans)
  // If font file doesn't exist, fall back to Helvetica (will show garbled text for Cyrillic)
  let fontRegistered = false;
  const fontPaths = [
    path.join(__dirname, '../fonts/DejaVuSans.ttf'),
    path.join(__dirname, '../../fonts/DejaVuSans.ttf'),
    'C:/Windows/Fonts/arial.ttf', // Windows Arial (supports Cyrillic)
    'C:/Windows/Fonts/times.ttf', // Windows Times New Roman (supports Cyrillic)
  ];
  
  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        doc.registerFont('CyrillicFont', fontPath);
        doc.font('CyrillicFont');
        fontRegistered = true;
        break;
      }
    } catch (error) {
      // Continue to next font path
    }
  }
  
  if (!fontRegistered) {
    // Fallback to Helvetica (will show garbled text for Cyrillic)
    doc.font('Helvetica');
  }
  
  // Helper function to set font (uses Cyrillic font if registered, otherwise Helvetica)
  const setFont = (fontName: string = 'Helvetica') => {
    if (fontRegistered) {
      // Use Cyrillic font for all text (Arial supports Cyrillic)
      doc.font('CyrillicFont');
    } else {
      doc.font(fontName);
    }
  };
  
  // Header - Invoice.tsx ga mos (ikki kolonka: chap tomonda invoice/contract info, o'ng tomonda INVOICE)
  const pageWidth = 595; // A4 width in points (210mm)
  const margin = 30;
  const leftColumnX = margin;
  const rightColumnX = pageWidth - margin;
  
  // Chap kolonka: Invoice va Contract raqamlari
  let headerY = 30; // Start from top margin
  doc.fontSize(9);
  setFont('Helvetica');
  
  const invoiceDate = formatDate(data.invoice.date);
  // formatDate already returns date with "г." at the end, so we don't need to add another "г."
  const invoiceText = ensureUTF8(`Инвойс №: ${data.invoice.invoiceNumber} от ${invoiceDate}`);
  doc.text(invoiceText, leftColumnX, headerY);
  
  // Contract number - yaqin joylashgan (space-y-1 kabi)
  headerY += 12; // Kichik oraliq (Invoice.tsx'dagi space-y-1 ga mos)
  if (data.invoice.contractNumber) {
    // Contract number allaqachon " от " ni o'z ichiga olgan bo'lishi mumkin
    // Agar " от " bor bo'lsa, qo'shmaslik kerak
    let contractNumber = data.invoice.contractNumber.trim();
    const contractDate = data.contract?.contractDate ? formatDate(data.contract.contractDate) : '';
    
    // Agar contractNumber allaqachon " от " bilan tugasa, uni olib tashlash
    if (contractNumber.endsWith(' от') || contractNumber.endsWith(' от ')) {
      contractNumber = contractNumber.replace(/\s+от\s*$/, '').trim();
    }
    
    // Endi " от " va sanani qo'shish
    const contractText = ensureUTF8(`Контракт №: ${contractNumber}${contractDate ? ` от ${contractDate}` : ''}`);
    doc.text(contractText, leftColumnX, headerY);
  }
  
  // O'ng kolonka: INVOICE (text-right, katta shrift)
  doc.fontSize(32); // text-4xl ga mos (Invoice.tsx'da text-4xl)
  setFont('Helvetica-Bold');
  const invoiceTitleY = 30; // Yuqoridan boshlash
  const invoiceTitleWidth = doc.widthOfString('INVOICE');
  const invoiceTitleX = rightColumnX - invoiceTitleWidth;
  doc.text('INVOICE', invoiceTitleX, invoiceTitleY); // text-right: o'ng tomonga align qilish
  
  // Ajratuvchi chiziq - Invoice.tsx'dagi kabi
  // Invoice.tsx'da INVOICE pastida mb-6 (24px) va chiziq o'rtasida ko'proq bo'shliq bor
  const separatorY = headerY + 35; // Contract text'dan keyin ko'proq bo'shliq
  doc.moveTo(margin, separatorY).lineTo(pageWidth - margin, separatorY).stroke();
  
  // Keyingi bo'lim uchun Y pozitsiyasini o'rnatish
  doc.y = separatorY + 15; // Chiziqdan keyin bo'shliq
  
  // Sotuvchi va Sotib oluvchi Info - Invoice.tsx ga mos
  // Avval chap kolonkani yozamiz, keyin o'ng kolonkani
  const sellerStartY = doc.y;
  const sellerColumnX = margin; // 30
  const columnGap = 20; // Kolonkalar orasidagi bo'shliq
  const availableWidth = pageWidth - (2 * margin) - columnGap; // Umumiy mavjud kenglik
  const sellerColumnWidth = availableWidth / 2; // Chap kolonka kengligi (yarim)
  const buyerColumnX = sellerColumnX + sellerColumnWidth + columnGap; // O'ng kolonka X pozitsiyasi
  const buyerColumnWidth = availableWidth / 2; // O'ng kolonka kengligi (yarim)
  
  doc.fontSize(8); // Sarlavha font o'lchami
  setFont('Helvetica-Bold');
  doc.text(ensureUTF8('Sotuvchi'), sellerColumnX, sellerStartY);
  doc.fontSize(8); // Ma'lumotlar font o'lchami
  setFont('Helvetica');
  
  let currentY = sellerStartY + 9; // Ko'proq padding
  
  // Contract ma'lumotlaridan olish (Invoice.tsx ga mos)
  if (data.contract) {
    if (data.contract.sellerName) {
      setFont('Helvetica-Bold');
      doc.text(ensureUTF8(data.contract.sellerName), sellerColumnX, currentY, { width: sellerColumnWidth });
      setFont('Helvetica');
      currentY += 8; // Ko'proq padding
    }
    if (data.contract.sellerLegalAddress) {
      const addressHeight = doc.heightOfString(ensureUTF8(data.contract.sellerLegalAddress), { width: sellerColumnWidth });
      doc.text(ensureUTF8(data.contract.sellerLegalAddress), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += addressHeight + 5; // Dynamic height + ko'proq padding
    }
    if (data.contract.sellerInn) {
      doc.text(ensureUTF8(`INN: ${data.contract.sellerInn}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.contract.sellerOgrn) {
      doc.text(ensureUTF8(`OGRN: ${data.contract.sellerOgrn}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.contract.sellerDetails) {
      const detailsHeight = doc.heightOfString(ensureUTF8(data.contract.sellerDetails), { width: sellerColumnWidth });
      doc.text(ensureUTF8(data.contract.sellerDetails), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += detailsHeight + 5; // Ko'proq padding
    } else {
      // Bank ma'lumotlari
      if (data.contract.sellerBankName) {
        const bankText = ensureUTF8(`Bank: ${data.contract.sellerBankName}${data.contract.sellerBankSwift ? `, SWIFT: ${data.contract.sellerBankSwift}` : ''}`);
        const bankHeight = doc.heightOfString(bankText, { width: sellerColumnWidth });
        doc.text(bankText, sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += bankHeight + 5; // Dynamic height + ko'proq padding
      }
      if (data.contract.sellerBankAddress) {
        const addressHeight = doc.heightOfString(ensureUTF8(data.contract.sellerBankAddress), { width: sellerColumnWidth });
        doc.text(ensureUTF8(`Manzil: ${data.contract.sellerBankAddress}`), sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += addressHeight + 5;
      }
      if (data.contract.sellerBankAccount) {
        doc.text(ensureUTF8(`Hisob raqami: ${data.contract.sellerBankAccount}`), sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += 8;
      }
      if (data.contract.sellerCorrespondentBank) {
        const corrBankText = ensureUTF8(`Korrespondent bank: ${data.contract.sellerCorrespondentBank}${data.contract.sellerCorrespondentBankSwift ? `, SWIFT: ${data.contract.sellerCorrespondentBankSwift}` : ''}`);
        const corrBankHeight = doc.heightOfString(corrBankText, { width: sellerColumnWidth });
        doc.text(corrBankText, sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += corrBankHeight + 5;
      }
      if (data.contract.sellerCorrespondentBankAccount) {
        doc.text(ensureUTF8(`Kor. hisob: ${data.contract.sellerCorrespondentBankAccount}`), sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += 8;
      }
    }
  } else {
    // Fallback: Company ma'lumotlari
    doc.text(ensureUTF8(`ООО "${data.company.name}"`), sellerColumnX, currentY, { width: sellerColumnWidth });
    currentY += 8;
    const legalAddrHeight = doc.heightOfString(ensureUTF8(data.company.legalAddress), { width: sellerColumnWidth });
    doc.text(ensureUTF8(`Юридический адрес: ${data.company.legalAddress}`), sellerColumnX, currentY, { width: sellerColumnWidth });
    currentY += legalAddrHeight + 5;
    const actualAddrHeight = doc.heightOfString(ensureUTF8(data.company.actualAddress), { width: sellerColumnWidth });
    doc.text(ensureUTF8(`Фактический адрес: ${data.company.actualAddress}`), sellerColumnX, currentY, { width: sellerColumnWidth });
    currentY += actualAddrHeight + 5;
    if (data.company.inn) {
      doc.text(ensureUTF8(`ИНН: ${data.company.inn}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.phone || data.company.email) {
      const contactText = ensureUTF8(`Тел: ${data.company.phone || ''}${data.company.phone && data.company.email ? '  ' : ''}e-mail: ${data.company.email || ''}`);
      const contactHeight = doc.heightOfString(contactText, { width: sellerColumnWidth });
      doc.text(contactText, sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += contactHeight + 5;
    }
    if (data.company.bankAccount) {
      const accountHeight = doc.heightOfString(ensureUTF8(data.company.bankAccount), { width: sellerColumnWidth });
      doc.text(ensureUTF8(`${data.company.bankAccount}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += accountHeight + 5;
    }
    if (data.company.bankName) {
      doc.text(ensureUTF8(`Банк: ${data.company.bankName}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.bankAddress) {
      const bankAddrHeight = doc.heightOfString(ensureUTF8(data.company.bankAddress), { width: sellerColumnWidth });
      doc.text(ensureUTF8(`Адрес банка: ${data.company.bankAddress}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += bankAddrHeight + 5;
    }
    if (data.company.swiftCode) {
      doc.text(ensureUTF8(`SWIFT: ${data.company.swiftCode}`), sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += 8;
    }
    if (data.company.correspondentBank) {
      const corrBankText = ensureUTF8(`Банк-корреспондент: ${data.company.correspondentBank}`);
      const corrBankHeight = doc.heightOfString(corrBankText, { width: sellerColumnWidth });
      doc.text(corrBankText, sellerColumnX, currentY, { width: sellerColumnWidth });
      currentY += corrBankHeight + 5;
      if (data.company.correspondentBankAddress) {
        const corrAddrHeight = doc.heightOfString(ensureUTF8(data.company.correspondentBankAddress), { width: sellerColumnWidth });
        doc.text(ensureUTF8(`Адрес банка: ${data.company.correspondentBankAddress}`), sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += corrAddrHeight + 5;
      }
      if (data.company.correspondentBankSwift) {
        doc.text(ensureUTF8(`SWIFT: ${data.company.correspondentBankSwift}`), sellerColumnX, currentY, { width: sellerColumnWidth });
        currentY += 8;
      }
    }
  }
  
  // O'ng kolonka: Sotib oluvchi
  const buyerStartY = sellerStartY;
  let buyerCurrentY = buyerStartY + 9; // Ko'proq padding
  
  doc.fontSize(8); // Sarlavha font o'lchami
  setFont('Helvetica-Bold');
  doc.text(ensureUTF8('Sotib oluvchi'), buyerColumnX, buyerStartY);
  doc.fontSize(8); // Ma'lumotlar font o'lchami
  setFont('Helvetica');
  
  // Contract ma'lumotlaridan olish (Invoice.tsx ga mos)
  if (data.contract) {
    if (data.contract.buyerName) {
      setFont('Helvetica-Bold');
      doc.text(ensureUTF8(data.contract.buyerName), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      setFont('Helvetica');
      buyerCurrentY += 8; // Ko'proq padding
    }
    if (data.contract.buyerAddress) {
      const addressHeight = doc.heightOfString(ensureUTF8(data.contract.buyerAddress), { width: buyerColumnWidth });
      doc.text(ensureUTF8(data.contract.buyerAddress), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += addressHeight + 5;
    }
    if (data.contract.buyerInn) {
      doc.text(ensureUTF8(`INN: ${data.contract.buyerInn}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.contract.buyerOgrn) {
      doc.text(ensureUTF8(`OGRN: ${data.contract.buyerOgrn}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.contract.buyerDetails) {
      const detailsHeight = doc.heightOfString(ensureUTF8(data.contract.buyerDetails), { width: buyerColumnWidth });
      doc.text(ensureUTF8(data.contract.buyerDetails), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += detailsHeight + 5; // Ko'proq padding
    } else {
      // Bank ma'lumotlari
      if (data.contract.buyerBankName) {
        const bankText = ensureUTF8(`Bank: ${data.contract.buyerBankName}${data.contract.buyerBankSwift ? `, SWIFT: ${data.contract.buyerBankSwift}` : ''}`);
        const bankHeight = doc.heightOfString(bankText, { width: buyerColumnWidth });
        doc.text(bankText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += bankHeight + 5;
      }
      if (data.contract.buyerBankAddress) {
        const addressHeight = doc.heightOfString(ensureUTF8(data.contract.buyerBankAddress), { width: buyerColumnWidth });
        doc.text(ensureUTF8(`Manzil: ${data.contract.buyerBankAddress}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += addressHeight + 5;
      }
      if (data.contract.buyerBankAccount) {
        doc.text(ensureUTF8(`Hisob raqami: ${data.contract.buyerBankAccount}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
      if (data.contract.buyerCorrespondentBank) {
        const corrBankText = ensureUTF8(`Korrespondent bank: ${data.contract.buyerCorrespondentBank}${data.contract.buyerCorrespondentBankSwift ? `, SWIFT: ${data.contract.buyerCorrespondentBankSwift}` : ''}`);
        const corrBankHeight = doc.heightOfString(corrBankText, { width: buyerColumnWidth });
        doc.text(corrBankText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += corrBankHeight + 5;
      }
      if (data.contract.buyerCorrespondentBankAccount) {
        doc.text(ensureUTF8(`Kor. hisob: ${data.contract.buyerCorrespondentBankAccount}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
    }
  } else {
    // Fallback: Client ma'lumotlari
    doc.text(ensureUTF8(data.client.name), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
    buyerCurrentY += 8;
    if (data.client.address) {
      const addrHeight = doc.heightOfString(ensureUTF8(data.client.address), { width: buyerColumnWidth });
      doc.text(ensureUTF8(`Адрес: ${data.client.address}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += addrHeight + 5;
    }
    if (data.client.inn) {
      doc.text(ensureUTF8(`ИНН: ${data.client.inn}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.phone) {
      doc.text(ensureUTF8(`Тел: ${data.client.phone}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.email) {
      doc.text(ensureUTF8(`E-mail: ${data.client.email}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.bankName) {
      doc.text(ensureUTF8(`Банк получателя: ${data.client.bankName}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.bankAddress) {
      const bankAddrHeight = doc.heightOfString(ensureUTF8(data.client.bankAddress), { width: buyerColumnWidth });
      doc.text(ensureUTF8(`${data.client.bankAddress}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += bankAddrHeight + 5;
    }
    if (data.client.bankSwift) {
      doc.text(ensureUTF8(`SWIFT: ${data.client.bankSwift}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += 8;
    }
    if (data.client.bankAccount) {
      const accountText = ensureUTF8(`Текущий счет (${data.invoice.currency}): ${data.client.bankAccount}`);
      const accountHeight = doc.heightOfString(accountText, { width: buyerColumnWidth });
      doc.text(accountText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += accountHeight + 5;
    }
    if (data.client.transitAccount) {
      const transitText = ensureUTF8(`Транзитный счет (${data.invoice.currency}): ${data.client.transitAccount}`);
      const transitHeight = doc.heightOfString(transitText, { width: buyerColumnWidth });
      doc.text(transitText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += transitHeight + 5;
    }
    if (data.client.correspondentBank) {
      const corrBankText = ensureUTF8(`Наименование банка корреспондента: ${data.client.correspondentBank}`);
      const corrBankHeight = doc.heightOfString(corrBankText, { width: buyerColumnWidth });
      doc.text(corrBankText, buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
      buyerCurrentY += corrBankHeight + 5;
      if (data.client.correspondentBankAccount) {
        doc.text(ensureUTF8(`Кор счет: ${data.client.correspondentBankAccount}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
      if (data.client.correspondentBankSwift) {
        doc.text(ensureUTF8(`SWIFT: ${data.client.correspondentBankSwift}`), buyerColumnX, buyerCurrentY, { width: buyerColumnWidth });
        buyerCurrentY += 8;
      }
    }
  }
  
  // Ikkala kolonkaning eng pastki qismini topish
  const maxY = Math.max(currentY, buyerCurrentY);
  doc.y = maxY;
  doc.moveDown(0.5);
  
  // Дополнительная информация - Invoice.tsx formatiga mos
  if (data.invoice.additionalInfo) {
    const info = data.invoice.additionalInfo as any;
    
    doc.fontSize(9);
    setFont('Helvetica-Bold');
    const additionalInfoText = ensureUTF8('Дополнительная информация');
    doc.text(additionalInfoText, 30, doc.y);
    setFont('Helvetica');
    doc.fontSize(8);
    let infoY = doc.y + 12;
    
    if (info.deliveryTerms) {
      const deliveryTermsText = ensureUTF8(`Условия поставки: ${info.deliveryTerms}`);
      doc.text(deliveryTermsText, 30, infoY);
      infoY += 10;
    }
    if (info.vehicleNumber) {
      doc.text(ensureUTF8(`Номер автотранспорта: ${info.vehicleNumber}`), 30, infoY);
      infoY += 10;
    }
    if (info.shipmentPlace) {
      doc.text(ensureUTF8(`Место отгрузки груза: ${info.shipmentPlace}`), 30, infoY);
      infoY += 10;
    }
    if (info.destination) {
      doc.text(ensureUTF8(`Место назначения: ${info.destination}`), 30, infoY);
      infoY += 10;
    }
    if (info.origin) {
      doc.text(ensureUTF8(`Происхождение товара: ${info.origin}`), 30, infoY);
      infoY += 10;
    }
    if (info.manufacturer) {
      doc.text(ensureUTF8(`Производитель: ${info.manufacturer}`), 30, infoY);
      infoY += 10;
    }
    if (info.orderNumber) {
      doc.text(ensureUTF8(`Номер заказа: ${info.orderNumber}`), 30, infoY);
      infoY += 10;
    }
    if (info.gln) {
      doc.text(ensureUTF8(`Глобальный идентификационный номер GS1 (GLN): ${info.gln}`), 30, infoY);
      infoY += 10;
    }
    if (info.harvestYear) {
      doc.text(ensureUTF8(`Урожай: ${info.harvestYear} года`), 30, infoY);
      infoY += 10;
    }
    
    doc.y = infoY;
    doc.moveDown(0.5);
  }
  
  // Jadval (Товарlar ro'yxati) - compact spacing
  const tableTop = doc.y;
  const itemHeight = 15; // Reduced from 20
  const startX = 30; // Reduced from 50 to match new margin
  
  // Ustunlarni shartli ko'rsatish uchun tekshirish
  const hasTnvedCode = data.invoice.items?.some(item => item.tnvedCode && item.tnvedCode.trim() !== '');
  const hasPluCode = data.invoice.items?.some(item => item.pluCode && item.pluCode.trim() !== '');
  const hasPackageType = data.invoice.items?.some(item => item.packageType && item.packageType.trim() !== '');
  const hasGrossWeight = data.invoice.items?.some(item => item.grossWeight && Number(item.grossWeight) > 0);
  const hasNetWeight = data.invoice.items?.some(item => item.netWeight && Number(item.netWeight) > 0);
  
  // Ustunlar pozitsiyasini hisoblash
  let currentX = startX;
  const colWidths: { [key: string]: number } = {
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
  
  const colPositions: { [key: string]: number } = {};
  colPositions.number = currentX;
  currentX += colWidths.number;
  
  if (hasTnvedCode) {
    colPositions.tnvedCode = currentX;
    currentX += colWidths.tnvedCode;
  }
  
  if (hasPluCode) {
    colPositions.pluCode = currentX;
    currentX += colWidths.pluCode;
  }
  
  colPositions.name = currentX;
  currentX += colWidths.name;
  
  if (hasPackageType) {
    colPositions.packageType = currentX;
    currentX += colWidths.packageType;
  }
  
  colPositions.unit = currentX;
  currentX += colWidths.unit;
  
  colPositions.quantity = currentX;
  currentX += colWidths.quantity;
  
  if (hasGrossWeight) {
    colPositions.grossWeight = currentX;
    currentX += colWidths.grossWeight;
  }
  
  if (hasNetWeight) {
    colPositions.netWeight = currentX;
    currentX += colWidths.netWeight;
  }
  
  colPositions.unitPrice = currentX;
  currentX += colWidths.unitPrice;
  
  colPositions.totalPrice = currentX;
  currentX += colWidths.totalPrice;
  
  // Jadval header - smaller font
  doc.fontSize(7);
  doc.text('№', colPositions.number, tableTop, { width: colWidths.number });
  if (hasTnvedCode) {
    doc.text(ensureUTF8('Код ТН ВЭД'), colPositions.tnvedCode!, tableTop, { width: colWidths.tnvedCode });
  }
  if (hasPluCode) {
    doc.text(ensureUTF8('Код PLU'), colPositions.pluCode!, tableTop, { width: colWidths.pluCode });
  }
  doc.text(ensureUTF8('Наименование'), colPositions.name, tableTop, { width: colWidths.name });
  if (hasPackageType) {
    doc.text(ensureUTF8('Вид упаковки'), colPositions.packageType!, tableTop, { width: colWidths.packageType });
  }
  doc.text(ensureUTF8('Ед. изм.'), colPositions.unit, tableTop, { width: colWidths.unit });
  doc.text(ensureUTF8('Мест'), colPositions.quantity, tableTop, { width: colWidths.quantity });
  if (hasGrossWeight) {
    doc.text(ensureUTF8('Брутто'), colPositions.grossWeight!, tableTop, { width: colWidths.grossWeight });
  }
  if (hasNetWeight) {
    doc.text(ensureUTF8('Нетто'), colPositions.netWeight!, tableTop, { width: colWidths.netWeight });
  }
  doc.text(ensureUTF8('Цена'), colPositions.unitPrice, tableTop, { width: colWidths.unitPrice });
  doc.text(ensureUTF8('Сумма'), colPositions.totalPrice, tableTop, { width: colWidths.totalPrice });
  
  // Header chiziq
  doc.moveTo(startX, tableTop + 15).lineTo(currentX, tableTop + 15).stroke();
  
  // Items - compact
  let y = tableTop + 18; // Reduced spacing
  if (!data.invoice.items || data.invoice.items.length === 0) {
    doc.fontSize(7);
    doc.text('Товары не указаны', startX, y, { width: currentX - startX });
    y += itemHeight;
  } else {
    data.invoice.items.forEach((item, index) => {
    // Check if we need new page - but try to fit everything on one page
    if (y > 750) {
      // Yangi sahifa
      doc.addPage();
      y = 30;
    }
    
    doc.fontSize(7); // Smaller font for items
    doc.text((index + 1).toString(), colPositions.number, y, { width: colWidths.number });
    if (hasTnvedCode) {
      doc.text(ensureUTF8((item.tnvedCode || '').toString()), colPositions.tnvedCode!, y, { width: colWidths.tnvedCode });
    }
    if (hasPluCode) {
      doc.text(ensureUTF8((item.pluCode || '').toString()), colPositions.pluCode!, y, { width: colWidths.pluCode });
    }
    doc.text(ensureUTF8((item.name || '').toString()), colPositions.name, y, { width: colWidths.name });
    if (hasPackageType) {
      doc.text(ensureUTF8((item.packageType || '').toString()), colPositions.packageType!, y, { width: colWidths.packageType });
    }
    doc.text(ensureUTF8((item.unit || '').toString()), colPositions.unit, y, { width: colWidths.unit });
    doc.text((item.quantity || 0).toString(), colPositions.quantity, y, { width: colWidths.quantity });
    if (hasGrossWeight) {
      doc.text((item.grossWeight ? item.grossWeight.toString() : ''), colPositions.grossWeight!, y, { width: colWidths.grossWeight });
    }
    if (hasNetWeight) {
      doc.text((item.netWeight ? item.netWeight.toString() : ''), colPositions.netWeight!, y, { width: colWidths.netWeight });
    }
    doc.text((item.unitPrice || 0).toString(), colPositions.unitPrice, y, { width: colWidths.unitPrice });
    doc.text((item.totalPrice || 0).toString(), colPositions.totalPrice, y, { width: colWidths.totalPrice });
    y += itemHeight;
    });
  }
  
  // Jami chiziq
  doc.moveTo(startX, y).lineTo(currentX, y).stroke();
  
  // Jami
  const totalY = y + 10;
  doc.fontSize(8);
  setFont('Helvetica-Bold');
  doc.text(ensureUTF8('Всего:'), colPositions.name, totalY, { width: colWidths.name });
  
  const totalQuantity = data.invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalGrossWeight = data.invoice.items.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const totalNetWeight = data.invoice.items.reduce((sum, item) => sum + Number(item.netWeight || 0), 0);
  
  doc.text(totalQuantity.toString(), colPositions.quantity, totalY, { width: colWidths.quantity });
  if (hasGrossWeight) {
    doc.text(totalGrossWeight > 0 ? totalGrossWeight.toString() : '', colPositions.grossWeight!, totalY, { width: colWidths.grossWeight });
  }
  if (hasNetWeight) {
    doc.text(totalNetWeight > 0 ? totalNetWeight.toString() : '', colPositions.netWeight!, totalY, { width: colWidths.netWeight });
  }
  const totalAmount = Number(data.invoice.totalAmount) || 0;
  doc.text(`${totalAmount.toFixed(2)} ${data.invoice.currency}`, colPositions.totalPrice, totalY, { width: colWidths.totalPrice });
  setFont('Helvetica');
  
  // Calculate the next Y position after the table
  // Use explicit Y coordinate for the first text after table to ensure doc.y is updated
  const nextY = totalY + 30; // Space after total row
  
  // Сумма прописью - use explicit Y coordinate, smaller font
  doc.fontSize(8);
  const totalAmountForWords = Number(data.invoice.totalAmount) || 0;
  const amountInWords = numberToWords(totalAmountForWords, data.invoice.currency);
  doc.text(ensureUTF8(`Сумма прописью: ${amountInWords}`), startX, nextY);
  // Update doc.y for next section
  doc.y = nextY + 12;
  // Now doc.y should be updated, so we can use moveDown for subsequent text
  doc.moveDown(1);
  
  // Особые примечания
  if (data.invoice.notes) {
    // Use explicit Y coordinate if doc.y is invalid
    let notesY = doc.y;
    if (isNaN(doc.y) || doc.y <= 0 || !isFinite(doc.y)) {
      notesY = (totalY || 400) + 50; // Fallback position
    }
    
    doc.fontSize(8).text('Особые примечания', startX, notesY, { underline: true });
    doc.fontSize(7).text(ensureUTF8(data.invoice.notes), startX, notesY + 10);
    // Update doc.y for next section
    doc.y = notesY + 25;
  }
  
  // Imzolar
  // Calculate signature Y position - use explicit coordinate
  let signatureY = doc.y;
  if (isNaN(doc.y) || doc.y <= 0 || !isFinite(doc.y)) {
    // Calculate from the last known position or use page height
    signatureY = data.invoice.notes ? (doc.y || 500) + 50 : (totalY || 400) + 100;
  } else {
    signatureY = doc.y + 30; // Add space after notes or previous content
  }
  
  doc.fontSize(10);
  
  try {
    const supplierDirector = data.contract?.supplierDirector || '';
    const goodsReleasedBy = data.contract?.goodsReleasedBy || '';
    
    const supplierText = supplierDirector ? `Руководитель Поставщика: ${supplierDirector}` : 'Руководитель Поставщика _________________';
    doc.text(ensureUTF8(supplierText), startX, signatureY);
    
    if (goodsReleasedBy) {
      doc.text(ensureUTF8(`Товар отпустил: ${goodsReleasedBy}`), startX, signatureY + 30);
    } else {
      doc.text('Товар отпустил _________________', startX, signatureY + 30);
    }
  } catch (sigError: any) {
    console.error('Error in signature section:', sigError);
    // Fallback to default text if there's an error
    doc.text('Руководитель Поставщика _________________', startX, doc.y);
    doc.text('Товар отпустил _________________', startX, doc.y + 30);
  }
  
  return doc;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  // Invoice.tsx'da "г." alohida span, shuning uchun bo'shliq qo'shamiz
  return `${day}.${month}.${year} г.`;
}

function numberToWords(num: number, currency: string): string {
  // Soddalashtirilgan versiya - faqat asosiy raqamlarni so'zga o'tkazadi
  // To'liq implementatsiya uchun alohida kutubxona kerak bo'lishi mumkin
  
  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  
  if (num === 0) return 'ноль';
  
  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  
  let result = '';
  
  // Minglar
  const thousands = Math.floor(wholePart / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'одна тысяча ';
    } else if (thousands < 5) {
      result += convertHundreds(thousands, ones, tens, teens, hundreds) + ' тысячи ';
    } else {
      result += convertHundreds(thousands, ones, tens, teens, hundreds) + ' тысяч ';
    }
  }
  
  // Yuzlar, o'nlar, birlar
  const remainder = wholePart % 1000;
  if (remainder > 0) {
    result += convertHundreds(remainder, ones, tens, teens, hundreds);
  }
  
  // Valyuta
  if (currency === 'USD') {
    if (wholePart === 1) {
      result += ' доллар США';
    } else if (wholePart < 5) {
      result += ' доллара США';
    } else {
      result += ' долларов США';
    }
  } else {
    if (wholePart === 1) {
      result += ' сум';
    } else if (wholePart < 5) {
      result += ' сума';
    } else {
      result += ' сумов';
    }
  }
  
  // Sentlar
  if (decimalPart > 0) {
    result += ` ${decimalPart} ${currency === 'USD' ? 'центов' : 'тиин'}`;
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function convertHundreds(num: number, ones: string[], tens: string[], teens: string[], hundreds: string[]): string {
  if (num === 0) return '';
  
  let result = '';
  
  // Yuzlar
  const h = Math.floor(num / 100);
  if (h > 0) {
    result += hundreds[h] + ' ';
  }
  
  // O'nlar va birlar
  const remainder = num % 100;
  if (remainder >= 10 && remainder < 20) {
    result += teens[remainder - 10];
  } else {
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;
    
    if (t > 0) {
      result += tens[t] + ' ';
    }
    if (o > 0) {
      result += ones[o];
    }
  }
  
  return result.trim();
}

