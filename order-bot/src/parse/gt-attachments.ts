import type { MailAttachment } from '../mail/watcher.js';
import { normalizeGtNumber } from './gt-table.js';

/**
 * Магнит xatidagi ilovalarni turkumlash.
 *
 * Uch guruh:
 *   - zakaz PDF'i   — `GT-773211.pdf`, aynan bitta zakazga tegishli
 *   - umumiy hujjat — CMR yo'riqnomasi, РЦ manzillari, invoys, qadoqlash varag'i
 *   - qolganlari    — yuborilmaydi, lekin nomlari xabarda ko'rsatiladi
 */

export type ClassifiedAttachments = {
  /** GT raqami -> o'sha zakazning PDF'i */
  orderPdfs: Map<string, MailAttachment>;
  /** Hamma zakazga tegishli hujjatlar */
  shared: MailAttachment[];
  /** GT raqami nomida uchragan, lekin PDF bo'lmagan hujjatlar */
  perOrderExtras: Map<string, MailAttachment[]>;
  /** Yuborilmaydigan ilovalar */
  other: MailAttachment[];
};

type SharedRule = { label: string; all: string[] };

/**
 * Umumiy hujjatlarni nom bo'yicha aniqlash.
 * `all` — nomda HAMMA satr uchrashi kerak (kichik harfda).
 */
const SHARED_RULES: SharedRule[] = [
  { label: 'CMR yo\'riqnomasi', all: ['инструкц', 'cmr'] },
  { label: 'РЦ manzillari', all: ['адрес', 'рц'] },
  { label: 'Invoys', all: ['инвойс'] },
  { label: 'Invoys', all: ['invoice'] },
  { label: 'Qadoqlash varag\'i', all: ['упаковочн'] },
  { label: 'Qadoqlash varag\'i', all: ['packing'] },
];

const isOrderPdf = (filename: string): string | null => {
  if (!/\.pdf$/i.test(filename)) return null;
  // Faqat butunlay GT raqamidan iborat nom: "GT-773211.pdf".
  // "Инвойс GT-773211.pdf" zakaz blankasi emas — u qo'shimcha hujjat.
  const base = filename.replace(/\.pdf$/i, '').trim();
  return /^gt[\s\-_]*\d{4,}$/i.test(base) ? normalizeGtNumber(base) : null;
};

const isShared = (filename: string): boolean => {
  const name = filename.toLowerCase();
  return SHARED_RULES.some((rule) => rule.all.every((needle) => name.includes(needle)));
};

export const classifyAttachments = (attachments: MailAttachment[]): ClassifiedAttachments => {
  const orderPdfs = new Map<string, MailAttachment>();
  const shared: MailAttachment[] = [];
  const perOrderExtras = new Map<string, MailAttachment[]>();
  const other: MailAttachment[] = [];

  for (const attachment of attachments) {
    const gtNumber = isOrderPdf(attachment.filename);
    if (gtNumber) {
      orderPdfs.set(gtNumber, attachment);
      continue;
    }

    if (isShared(attachment.filename)) {
      // Nomida GT raqami bo'lsa — bu aynan o'sha zakazniki, umumiy emas.
      const owner = normalizeGtNumber(attachment.filename);
      if (owner) {
        const list = perOrderExtras.get(owner) ?? [];
        list.push(attachment);
        perOrderExtras.set(owner, list);
      } else {
        shared.push(attachment);
      }
      continue;
    }

    other.push(attachment);
  }

  return { orderPdfs, shared, perOrderExtras, other };
};

/** Xat GT zakaz xatimi? Kamida bitta `GT-raqam.pdf` ilovasi bo'lishi kerak. */
export const hasOrderPdf = (attachments: MailAttachment[]): boolean =>
  attachments.some((attachment) => isOrderPdf(attachment.filename) !== null);
