import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs/promises';
import path from 'path';
import { Invoice, InvoiceItem, Contract } from '@prisma/client';

export type CmrDocPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  contract?: Contract | null;
  client?: any;
  companySettings?: any;
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

export const generateCmrDocx = async (payload: CmrDocPayload): Promise<Buffer> => {
  const templatePath = path.resolve(process.cwd(), 'templates', 'CMR template.docx');
  const content = await fs.readFile(templatePath, 'binary');

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '$', end: '$' },
  });

  const { invoice, items, contract, client, companySettings } = payload;
  const additionalInfo = (invoice.additionalInfo || {}) as Record<string, any>;

  const sellerName = contract?.sellerName || companySettings?.name || '';
  const sellerAddress = contract?.sellerLegalAddress || companySettings?.legalAddress || '';
  const buyerName = contract?.buyerName || client?.name || '';
  const buyerAddress = contract?.buyerAddress || client?.address || '';

  const branchName = String((invoice as any).branch?.name || '').toLowerCase();
  let defaultRegion = '';
  if (branchName.includes('oltiariq')) defaultRegion = 'Ферганская область';
  else if (branchName.includes('toshkent')) defaultRegion = 'Ташкентская область';
  else if (branchName.includes('sirdaryo')) defaultRegion = 'Сырдарьинская область';
  else if (branchName.includes('surxondaryo')) defaultRegion = 'Сурхандарьинская область';

  const totalPackages = items.reduce((sum, item) => sum + Number(item.packagesCount || item.quantity || 0), 0);
  const totalGrossWeight = items.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const totalNetWeight = items.reduce((sum, item) => sum + Number(item.netWeight || 0), 0);

  const itemRows = items.map((i, index) => {
    const mqsParts: string[] = [];
    if (i.packagesCount) mqsParts.push(String(i.packagesCount));
    if (i.packageType) mqsParts.push(i.packageType);
    if (i.quantity && Number(i.quantity) > 0) mqsParts.push(`на ${i.quantity} паллетах`);
    
    return {
      MTR: String(index + 1),
      MQS: mqsParts.join(' '),
      MN: i.name || '',
      MKT: i.tnvedCode || '',
      MB: i.grossWeight ? String(i.grossWeight) : '',
      MUB: ''
    };
  });

  if (additionalInfo.temperature) {
    itemRows.push({ MTR: '', MQS: '', MN: '', MKT: '', MB: '', MUB: '' });
    itemRows.push({
      MTR: '',
      MQS: `Примечание: Температура при транспортировке ${additionalInfo.temperature}`,
      MN: '',
      MKT: '',
      MB: '',
      MUB: ''
    });
  }

  const data = {
    Sotuvchi_korxona_nomi: sellerName,
    Sotuvchi_korxona_manzili: sellerAddress,
    Sotib_oluvchi_korxona_nomi: buyerName,
    Sotib_oluvchi_korxona_manzili: buyerAddress,
    smr_number: additionalInfo.smrNumber || '',
    Место_разгрузки: additionalInfo.destination || '',
    Filial: defaultRegion || additionalInfo.origin || '',
    invoys_sanasi: formatDate(invoice.date),
    'Особые примечания': invoice.notes || '',
    invoys_raqami: invoice.invoiceNumber || '',
    'TIR №:': additionalInfo.tirNumber || '',
    items: itemRows,
    MUB: totalGrossWeight ? String(totalGrossWeight) : '',
    'Место там. очистки:': additionalInfo.customsAddress || '',
    'Условия поставки:': additionalInfo.deliveryTerms || '',
    'Номер автотранспорта:': [additionalInfo.vehicleNumber, additionalInfo.trailerNumber].filter(Boolean).join(' / ') || '',
  };

  doc.render(data);

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buffer;
};
