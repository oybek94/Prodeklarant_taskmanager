import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem, Client, CompanySettings } from '@prisma/client';

interface InvoiceData {
  invoice: Invoice & { items: InvoiceItem[] };
  client: Client;
  company: CompanySettings;
}

export function generateInvoicePDF(data: InvoiceData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  // Header
  doc.fontSize(20).text('INVOICE', { align: 'center' });
  doc.fontSize(16).text('НАКЛАДНАЯ-СЧЕТ-ФАКТУРА', { align: 'center' });
  doc.moveDown(2);
  
  // Продавец/Грузоотправитель
  doc.fontSize(12).text('Продавец/Грузоотправитель:', { underline: true });
  doc.fontSize(10);
  doc.text(`ООО "${data.company.name}"`);
  doc.text(`Юридический адрес: ${data.company.legalAddress}`);
  doc.text(`Фактический адрес: ${data.company.actualAddress}`);
  if (data.company.inn) {
    doc.text(`ИНН: ${data.company.inn}`);
  }
  if (data.company.phone || data.company.email) {
    doc.text(`Тел: ${data.company.phone || ''}${data.company.phone && data.company.email ? '  ' : ''}e-mail: ${data.company.email || ''}`);
  }
  if (data.company.bankAccount) {
    doc.text(`${data.company.bankAccount}`);
  }
  if (data.company.bankName) {
    doc.text(`Банк: ${data.company.bankName}`);
  }
  if (data.company.bankAddress) {
    doc.text(`Адрес банка: ${data.company.bankAddress}`);
  }
  if (data.company.swiftCode) {
    doc.text(`SWIFT: ${data.company.swiftCode}`);
  }
  if (data.company.correspondentBank) {
    doc.text(`Банк-корреспондент: ${data.company.correspondentBank}`);
    if (data.company.correspondentBankAddress) {
      doc.text(`Адрес банка: ${data.company.correspondentBankAddress}`);
    }
    if (data.company.correspondentBankSwift) {
      doc.text(`SWIFT: ${data.company.correspondentBankSwift}`);
    }
  }
  doc.moveDown();
  
  // Покупатель/Грузополучатель
  doc.fontSize(12).text('Покупатель/Грузополучатель:', { underline: true });
  doc.fontSize(10);
  doc.text(data.client.name);
  if (data.client.address) {
    doc.text(`Адрес: ${data.client.address}`);
  }
  if (data.client.inn) {
    doc.text(`ИНН: ${data.client.inn}`);
  }
  if (data.client.phone) {
    doc.text(`Тел: ${data.client.phone}`);
  }
  if (data.client.email) {
    doc.text(`E-mail: ${data.client.email}`);
  }
  if (data.client.bankName) {
    doc.text(`Банк получателя: ${data.client.bankName}`);
  }
  if (data.client.bankAddress) {
    doc.text(`${data.client.bankAddress}`);
  }
  if (data.client.bankSwift) {
    doc.text(`SWIFT: ${data.client.bankSwift}`);
  }
  if (data.client.bankAccount) {
    doc.text(`Текущий счет (${data.invoice.currency}): ${data.client.bankAccount}`);
  }
  if (data.client.transitAccount) {
    doc.text(`Транзитный счет (${data.invoice.currency}): ${data.client.transitAccount}`);
  }
  if (data.client.correspondentBank) {
    doc.text(`Наименование банка корреспондента: ${data.client.correspondentBank}`);
    if (data.client.correspondentBankAccount) {
      doc.text(`Кор счет: ${data.client.correspondentBankAccount}`);
    }
    if (data.client.correspondentBankSwift) {
      doc.text(`SWIFT: ${data.client.correspondentBankSwift}`);
    }
  }
  doc.moveDown();
  
  // Invoice ma'lumotlari
  doc.fontSize(12);
  const invoiceDate = formatDate(data.invoice.date);
  doc.text(`Инвойс №: ${data.invoice.invoiceNumber} от ${invoiceDate}`);
  if (data.invoice.contractNumber) {
    doc.text(`Контракт №: ${data.invoice.contractNumber}`);
  }
  doc.moveDown();
  
  // Дополнительная информация
  if (data.invoice.additionalInfo) {
    const info = data.invoice.additionalInfo as any;
    doc.fontSize(10);
    if (info.deliveryTerms) {
      doc.text(`Условия поставки: ${info.deliveryTerms}`);
    }
    if (info.vehicleNumber) {
      doc.text(`№ автотранспорта: ${info.vehicleNumber}`);
    }
    if (info.shipmentPlace) {
      doc.text(`Место отгрузки груза: ${info.shipmentPlace}`);
    }
    if (info.destination) {
      doc.text(`Место назначения: ${info.destination}`);
    }
    if (info.origin) {
      doc.text(`Происхождение товара: ${info.origin}`);
    }
    if (info.manufacturer) {
      doc.text(`Производитель: ${info.manufacturer}`);
    }
    if (info.orderNumber) {
      doc.text(`Номер заказа: ${info.orderNumber}`);
    }
    if (info.gln) {
      doc.text(`Глобальный идентификационный номер GS1 (GLN): ${info.gln}`);
    }
    if (info.harvestYear) {
      doc.text(`Урожай-${info.harvestYear} года`);
    }
    doc.moveDown();
  }
  
  // Jadval (Товарlar ro'yxati)
  const tableTop = doc.y;
  const itemHeight = 20;
  const startX = 50;
  
  // Ustunlarni shartli ko'rsatish uchun tekshirish
  const hasTnvedCode = data.invoice.items?.some(item => item.tnvedCode && item.tnvedCode.trim() !== '');
  const hasPluCode = data.invoice.items?.some(item => item.pluCode && item.pluCode.trim() !== '');
  const hasPackageType = data.invoice.items?.some(item => item.packageType && item.packageType.trim() !== '');
  const hasGrossWeight = data.invoice.items?.some(item => item.grossWeight && item.grossWeight > 0);
  const hasNetWeight = data.invoice.items?.some(item => item.netWeight && item.netWeight > 0);
  
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
  
  // Jadval header
  doc.fontSize(9);
  doc.text('№', colPositions.number, tableTop, { width: colWidths.number });
  if (hasTnvedCode) {
    doc.text('Код ТН ВЭД', colPositions.tnvedCode!, tableTop, { width: colWidths.tnvedCode });
  }
  if (hasPluCode) {
    doc.text('Код PLU', colPositions.pluCode!, tableTop, { width: colWidths.pluCode });
  }
  doc.text('Наименование', colPositions.name, tableTop, { width: colWidths.name });
  if (hasPackageType) {
    doc.text('Вид упаковки', colPositions.packageType!, tableTop, { width: colWidths.packageType });
  }
  doc.text('Ед. изм.', colPositions.unit, tableTop, { width: colWidths.unit });
  doc.text('Мест', colPositions.quantity, tableTop, { width: colWidths.quantity });
  if (hasGrossWeight) {
    doc.text('Брутто', colPositions.grossWeight!, tableTop, { width: colWidths.grossWeight });
  }
  if (hasNetWeight) {
    doc.text('Нетто', colPositions.netWeight!, tableTop, { width: colWidths.netWeight });
  }
  doc.text('Цена', colPositions.unitPrice, tableTop, { width: colWidths.unitPrice });
  doc.text('Сумма', colPositions.totalPrice, tableTop, { width: colWidths.totalPrice });
  
  // Header chiziq
  doc.moveTo(startX, tableTop + 15).lineTo(currentX, tableTop + 15).stroke();
  
  // Items
  let y = tableTop + 25;
  if (!data.invoice.items || data.invoice.items.length === 0) {
    doc.fontSize(8);
    doc.text('Товары не указаны', startX, y, { width: currentX - startX });
    y += itemHeight;
  } else {
    data.invoice.items.forEach((item, index) => {
    if (y > 700) {
      // Yangi sahifa
      doc.addPage();
      y = 50;
    }
    
    doc.fontSize(8);
    doc.text((index + 1).toString(), colPositions.number, y, { width: colWidths.number });
    if (hasTnvedCode) {
      doc.text((item.tnvedCode || '').toString(), colPositions.tnvedCode!, y, { width: colWidths.tnvedCode });
    }
    if (hasPluCode) {
      doc.text((item.pluCode || '').toString(), colPositions.pluCode!, y, { width: colWidths.pluCode });
    }
    doc.text((item.name || '').toString(), colPositions.name, y, { width: colWidths.name });
    if (hasPackageType) {
      doc.text((item.packageType || '').toString(), colPositions.packageType!, y, { width: colWidths.packageType });
    }
    doc.text((item.unit || '').toString(), colPositions.unit, y, { width: colWidths.unit });
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
  doc.fontSize(10);
  doc.font('Helvetica-Bold');
  doc.text('Всего:', colPositions.name, totalY, { width: colWidths.name });
  
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
  doc.font('Helvetica');
  
  // Сумма прописью
  doc.moveDown(2);
  doc.fontSize(10);
  const totalAmountForWords = Number(data.invoice.totalAmount) || 0;
  const amountInWords = numberToWords(totalAmountForWords, data.invoice.currency);
  doc.text(`Сумма прописью: ${amountInWords}`);
  
  // Особые примечания
  if (data.invoice.notes) {
    doc.moveDown();
    doc.fontSize(12).text('Особые примечания', { underline: true });
    doc.fontSize(10).text(data.invoice.notes);
  }
  
  // Imzolar
  doc.moveDown(3);
  doc.fontSize(10);
  doc.text('Руководитель Поставщика _________________', startX, doc.y);
  doc.text('Товар отпустил _________________', startX, doc.y + 30);
  
  return doc;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}г.`;
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

