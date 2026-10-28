import fs from 'fs/promises';
import path from 'path';
import { Prisma, Invoice, InvoiceItem, Contract, CompanySettings } from '@prisma/client';

/**
 * "Информация о происхождении товара" (ПКМ № 994) — eksportyor nomidan
 * mahsulot O'zbekistonda yetishtirilgani haqidagi xat. PDF origin-info-pdf.ts
 * da chiziladi; bu yerda uning qiymatlari va imzo/muhr rasmlari tayyorlanadi.
 */

export type OriginInfoDocPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  contract?: Contract | null;
  companySettings?: CompanySettings | null;
  /** Invoys filiali nomi — xat qaysi ekspertiza filialiga yozilishini belgilaydi */
  branchName?: string | null;
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

/** 20000 → "20 000", 1234.5 → "1 234,5" (rus yozuvi) */
const formatNumber = (value: Prisma.Decimal) => {
  const [intPart, fracPart] = value.toDecimalPlaces(2).toString().split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fracPart ? `${grouped},${fracPart}` : grouped;
};

const sumDecimal = (values: Array<Prisma.Decimal | null | undefined>) =>
  values.reduce<Prisma.Decimal>((acc, v) => (v ? acc.plus(v) : acc), new Prisma.Decimal(0));

const uniqueNonEmpty = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((v) => (v || '').trim()).filter(Boolean)));

// --- Imzo / muhr rasmlari -------------------------------------------------

export type DocImage = {
  data: Buffer;
  ext: 'png' | 'jpeg';
  widthPx: number;
  heightPx: number;
};

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const readImageSize = (data: Buffer): Omit<DocImage, 'data'> | null => {
  // PNG: 8 baytli imzo, IHDR ichida kenglik/balandlik
  if (data.length > 24 && data.readUInt32BE(0) === 0x89504e47) {
    return { ext: 'png', widthPx: data.readUInt32BE(16), heightPx: data.readUInt32BE(20) };
  }
  // JPEG: SOFn markerini qidirish
  if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { ext: 'jpeg', heightPx: data.readUInt16BE(offset + 5), widthPx: data.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
};

export const loadUploadImage = async (url?: string | null): Promise<DocImage | null> => {
  if (!url || !url.startsWith('/uploads/')) return null;
  const filePath = path.resolve(UPLOADS_DIR, decodeURIComponent(url.slice('/uploads/'.length)));
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return null;
  try {
    const data = await fs.readFile(filePath);
    const size = readImageSize(data);
    if (!size || !size.widthPx || !size.heightPx) return null;
    return { data, ...size };
  } catch {
    return null;
  }
};

// --------------------------------------------------------------------------

/** Imzo va muhr balandligi — muhr invoys PDF'idagi (SEAL_HEIGHT) bilan bir xil */
export const SIGNATURE_HEIGHT_CM = 1.5;
export const SEAL_HEIGHT_CM = 3.8;

/**
 * Invoys filialiga bog'liq qiymatlar: xat adresati (ekspertiza filiali va uning
 * direktori) hamda mahsulot sotib olingan viloyat
 */
type ExpertizaRecipient = { filial: string; filial_direktori: string; viloyat: string };

const FERGANA_RECIPIENT: ExpertizaRecipient = {
  filial: 'Ферганаэкспертиза',
  filial_direktori: 'И.О.Азимову',
  viloyat: 'Ферганской области',
};

// Xat doim Farg'ona ekspertiza filialiga yoziladi (filialdan qat'i nazar)
const resolveRecipient = (_branchName?: string | null): ExpertizaRecipient => FERGANA_RECIPIENT;

export type OriginInfoFields = ExpertizaRecipient & {
  Invoys_sana: string;
  invoys_raqam: string;
  eksportyor_nomi: string;
  tovar_nomi: string;
  qadoq_soni: string;
  qadoq_turi: string;
  brutto: string;
  netto: string;
  Direktor: string;
};

export type OriginInfoData = {
  fields: OriginInfoFields;
  signature: DocImage | null;
  seal: DocImage | null;
};

/** Xat maydonlari qiymatlari + imzo/muhr rasmlari */
export const buildOriginInfoData = async (payload: OriginInfoDocPayload): Promise<OriginInfoData> => {
  const { invoice, items, contract, companySettings, branchName } = payload;

  // Грузоотправитель/Изготовитель sotuvchidan boshqa korxona bo'lsa — xatni
  // mahsulotni yetishtirgan/jo'natgan korxona beradi (CMR'dagi qoida bilan bir xil)
  const sellerName = contract?.sellerName || companySettings?.name || '';
  const shipperName = (contract?.shipperName || '').trim();
  const exporterName = shipperName && shipperName !== sellerName.trim() ? shipperName : sellerName;

  const [signature, seal] = await Promise.all([
    loadUploadImage(contract?.sellerSignatureUrl || contract?.signatureUrl),
    loadUploadImage(contract?.sellerSealUrl || contract?.sealUrl),
  ]);

  return {
    fields: {
      ...resolveRecipient(branchName),
      Invoys_sana: formatDate(invoice.date),
      invoys_raqam: invoice.invoiceNumber || '',
      eksportyor_nomi: exporterName,
      tovar_nomi: uniqueNonEmpty(items.map((i) => i.name)).join(', '),
      qadoq_soni: formatNumber(sumDecimal(items.map((i) => i.packagesCount))),
      qadoq_turi: uniqueNonEmpty(items.map((i) => i.packageType)).join(', '),
      brutto: formatNumber(sumDecimal(items.map((i) => i.grossWeight))),
      netto: formatNumber(sumDecimal(items.map((i) => i.netWeight))),
      Direktor: contract?.supplierDirector || '',
    },
    signature,
    seal,
  };
};
