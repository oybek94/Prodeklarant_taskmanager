import type { IncomingMail, MailAttachment } from '../mail/watcher.js';
import { classifyAttachments } from './gt-attachments.js';
import { extractGtRows } from './gt-table.js';

/** Telegramga yuboriladigan bitta Магнит zakazi. */
export type GtOrder = {
  gtNumber: string;
  customsPlace: string | null;
  product: string | null;
  /** Bir zakaz bir nechta РЦ ga ketishi mumkin. */
  arrivalPlaces: string[];
  /** Shu zakaz bilan yuboriladigan fayllar (PDF birinchi). */
  files: MailAttachment[];
  /** Ilovada `GT-raqam.pdf` yo'q. */
  missingPdf: boolean;
  /** Jadvalda bu zakaz uchun qator yo'q. */
  missingTableRow: boolean;
  /** Yuborilmagan ilovalar nomlari (xabarda ko'rsatiladi). */
  skippedFiles: string[];
};

/**
 * Xatdan zakazlar ro'yxatini yig'adi.
 *
 * Zakazlar = PDF'dagi GT raqamlar ∪ jadvaldagi GT raqamlar. Faqat bittasiga
 * tayanish xavfli: PDF bo'lmasa jadvaldagi zakaz jim yo'qoladi, jadval
 * bo'lmasa PDF'li zakaz yo'qoladi. Yetishmayotgan tomon belgilab qo'yiladi.
 */
export const buildGtOrders = (mail: IncomingMail): GtOrder[] => {
  const rows = extractGtRows(mail.html);
  const { orderPdfs, shared, perOrderExtras, other } = classifyAttachments(mail.attachments);

  const gtNumbers = new Set<string>([...orderPdfs.keys(), ...rows.map((row) => row.gtNumber)]);
  const skippedFiles = other.map((attachment) => attachment.filename);

  const orders: GtOrder[] = [];

  for (const gtNumber of [...gtNumbers].sort()) {
    const ownRows = rows.filter((row) => row.gtNumber === gtNumber);
    const pdf = orderPdfs.get(gtNumber);

    // Bir zakazning bir nechta qatori bo'lsa, Место ТО va Товар ularda bir xil —
    // birinchi to'lgan qiymat olinadi.
    const firstFilled = (pick: (row: (typeof ownRows)[number]) => string | null): string | null =>
      ownRows.map(pick).find((value) => value !== null) ?? null;

    const arrivalPlaces = ownRows
      .map((row) => row.arrivalPlace)
      .filter((place): place is string => place !== null);

    orders.push({
      gtNumber,
      customsPlace: firstFilled((row) => row.customsPlace),
      product: firstFilled((row) => row.product),
      // Bir xil РЦ ikki marta yozilgan bo'lsa takrorlanmasin.
      arrivalPlaces: [...new Set(arrivalPlaces)],
      files: [...(pdf ? [pdf] : []), ...(perOrderExtras.get(gtNumber) ?? []), ...shared],
      missingPdf: pdf === undefined,
      missingTableRow: ownRows.length === 0,
      skippedFiles,
    });
  }

  return orders;
};
