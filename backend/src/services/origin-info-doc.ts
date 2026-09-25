import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs/promises';
import path from 'path';
import { Prisma, Invoice, InvoiceItem, Contract, CompanySettings } from '@prisma/client';

/**
 * "Информация о происхождении товара" (ПКМ № 994) — eksportyor nomidan
 * mahsulot O'zbekistonda yetishtirilgani haqidagi xat. Shablon:
 * templates/Информация_о_происхождении_товара.docx, teglari `$...$`.
 */

const TEMPLATE_NAME = 'Информация_о_происхождении_товара.docx';

export type OriginInfoDocPayload = {
  invoice: Invoice;
  items: InvoiceItem[];
  contract?: Contract | null;
  companySettings?: CompanySettings | null;
};

const resolveTemplatePath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), 'templates', TEMPLATE_NAME),
    path.resolve(__dirname, '../../templates', TEMPLATE_NAME),
    path.resolve(__dirname, '../templates', TEMPLATE_NAME),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // keyingi nomzod
    }
  }
  throw new Error(`${TEMPLATE_NAME} not found in backend/templates`);
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
// docxtemplater'ning rasm moduli pullik, shuning uchun teg o'rniga avval
// marker yoziladi, keyin document.xml'da marker turgan run inline rasmga
// almashtiriladi.

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

const loadUploadImage = async (url?: string | null): Promise<DocImage | null> => {
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

const EMU_PER_CM = 360000;

const drawingRunXml = (relId: string, docPrId: number, image: DocImage, heightEmu: number) => {
  const cy = Math.round(heightEmu);
  const cx = Math.round((cy * image.widthPx) / image.heightPx);
  const name = `Picture ${docPrId}`;
  return (
    '<w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${docPrId}" name="${name}"/>` +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
  );
};

type ImageSlot = { marker: string; image: DocImage | null; heightEmu: number };

const embedImages = (zip: PizZip, slots: ImageSlot[]) => {
  const docPath = 'word/document.xml';
  const relsPath = 'word/_rels/document.xml.rels';
  const typesPath = '[Content_Types].xml';
  let docXml = zip.file(docPath)!.asText();
  let relsXml = zip.file(relsPath)!.asText();
  let typesXml = zip.file(typesPath)!.asText();

  const usedRelIds = new Set(Array.from(relsXml.matchAll(/Id="([^"]+)"/g), (m) => m[1]));
  let relCounter = 1000;
  let docPrId = 1000;
  const runsForSlot = new Map<string, string>();

  slots.forEach((slot, index) => {
    if (!slot.image) {
      runsForSlot.set(slot.marker, '');
      return;
    }
    while (usedRelIds.has(`rId${relCounter}`)) relCounter++;
    const relId = `rId${relCounter}`;
    usedRelIds.add(relId);
    const mediaName = `origin_info_${index + 1}.${slot.image.ext}`;
    zip.file(`word/media/${mediaName}`, slot.image.data);
    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/></Relationships>`
    );
    if (!new RegExp(`Extension="${slot.image.ext}"`, 'i').test(typesXml)) {
      typesXml = typesXml.replace(
        '<Default ',
        `<Default Extension="${slot.image.ext}" ContentType="image/${slot.image.ext}"/><Default `
      );
    }
    runsForSlot.set(slot.marker, drawingRunXml(relId, docPrId++, slot.image, slot.heightEmu));
  });

  const markerPattern = new RegExp(`(${slots.map((s) => s.marker).join('|')})`);
  docXml = docXml.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (run) => {
    const textMatch = run.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/);
    if (!textMatch || !markerPattern.test(textMatch[1])) return run;
    const rPr = run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || '';
    return textMatch[1]
      .split(markerPattern)
      .map((part) => {
        if (runsForSlot.has(part)) return runsForSlot.get(part)!;
        return part ? `<w:r>${rPr}<w:t xml:space="preserve">${part}</w:t></w:r>` : '';
      })
      .join('');
  });

  // Rasm XML'i wp: va r: prefikslarini ishlatadi — shablon ildizida bo'lmasa qo'shiladi
  const rootNs: Record<string, string> = {
    wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  };
  for (const [prefix, uri] of Object.entries(rootNs)) {
    if (!docXml.includes(`xmlns:${prefix}=`)) {
      docXml = docXml.replace('<w:document ', `<w:document xmlns:${prefix}="${uri}" `);
    }
  }

  zip.file(docPath, docXml);
  zip.file(relsPath, relsXml);
  zip.file(typesPath, typesXml);
};

// --------------------------------------------------------------------------

/** Imzo va muhr balandligi — muhr invoys PDF'idagi (SEAL_HEIGHT) bilan bir xil */
export const SIGNATURE_HEIGHT_CM = 1.5;
export const SEAL_HEIGHT_CM = 3.8;

export type OriginInfoFields = {
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

/** Docx va PDF uchun umumiy: shablon teglari qiymatlari + imzo/muhr rasmlari */
export const buildOriginInfoData = async (payload: OriginInfoDocPayload): Promise<OriginInfoData> => {
  const { invoice, items, contract, companySettings } = payload;

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

export const generateOriginInfoDocx = async (payload: OriginInfoDocPayload): Promise<Buffer> => {
  const content = await fs.readFile(await resolveTemplatePath(), 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '$', end: '$' },
    nullGetter: () => '',
  });

  const { fields, signature, seal } = await buildOriginInfoData(payload);

  const IMZO_MARKER = '@@IMZO@@';
  const MUHR_MARKER = '@@MUHR@@';

  doc.render({ ...fields, Imzo: IMZO_MARKER, Muhr: MUHR_MARKER });

  embedImages(doc.getZip(), [
    { marker: IMZO_MARKER, image: signature, heightEmu: SIGNATURE_HEIGHT_CM * EMU_PER_CM },
    { marker: MUHR_MARKER, image: seal, heightEmu: SEAL_HEIGHT_CM * EMU_PER_CM },
  ]);

  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
};
