import { describe, expect, it } from 'vitest';
import { extractGtRows, normalizeGtNumber } from '../src/parse/gt-table.js';
import { classifyAttachments, hasOrderPdf } from '../src/parse/gt-attachments.js';
import { buildGtOrders } from '../src/parse/gt-orders.js';
import { formatGtMessage } from '../src/format/gt-message.js';
import type { IncomingMail, MailAttachment } from '../src/mail/watcher.js';
import {
  buildGtEmailHtml,
  PLAIN_REPLY_HTML,
  ROW_773210,
  ROW_773211_KIROV,
  ROW_773211_ZELENODOLSK,
  type GtFixtureRow,
} from './fixtures/gt-email.js';

const file = (filename: string): MailAttachment => ({
  filename,
  content: Buffer.from(`${filename} mazmuni`),
  contentType: 'application/octet-stream',
});

const PDF_773210 = file('GT-773210.pdf');
const PDF_773211 = file('GT-773211.pdf');
const CMR = file('Инструкция к 13гр CMR.xlsx');
const RC_ADDRESSES = file('Адреса РЦ Магнит.xlsx');
const BOX = file('GT box UZ.xlsx');
const STICKER = file('Pallet sticker SAMPLE.DOC');

const ALL_ROWS: GtFixtureRow[] = [ROW_773210, ROW_773211_KIROV, ROW_773211_ZELENODOLSK];

const mail = (rows: GtFixtureRow[], attachments: MailAttachment[]): IncomingMail => ({
  messageId: '<test@mail>',
  subject: 'Fwd: Магнит, 35 нед -GT-773210 GT-773211- VOSTOCHNIY PRODUKT LLC',
  from: 'vostochniy-produkt@mail.ru',
  date: new Date('2026-08-30T10:08:12Z'),
  html: buildGtEmailHtml(rows),
  attachments,
});

const names = (files: MailAttachment[]): string[] => files.map((f) => f.filename);

describe('normalizeGtNumber', () => {
  it('turli yozilishlarni bir ko\'rinishga keltiradi', () => {
    expect(normalizeGtNumber('GT-773211')).toBe('GT-773211');
    expect(normalizeGtNumber('gt 773211')).toBe('GT-773211');
    expect(normalizeGtNumber('Заказ GT773211 для РЦ')).toBe('GT-773211');
  });

  it('GT raqami yo\'q matnda null qaytaradi', () => {
    expect(normalizeGtNumber('Замечаний нет')).toBeNull();
    expect(normalizeGtNumber('')).toBeNull();
  });
});

describe('extractGtRows', () => {
  it('zakaz jadvalini topib qatorlarni o\'qiydi', () => {
    const rows = extractGtRows(buildGtEmailHtml(ALL_ROWS));

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      gtNumber: 'GT-773210',
      customsPlace: 'Оренбург',
      product: 'Свежий столовый виноград Дамский палец / Fresh table Grape',
      arrivalPlace: 'РЦ ГТ ПроФреш Санкт-Петербург',
    });
    expect(rows[2]!.arrivalPlace).toBe('РЦ Зеленодольск 10000 кг');
  });

  it('zakaz jadvali yo\'q xatda bo\'sh qaytaradi', () => {
    expect(extractGtRows(PLAIN_REPLY_HTML)).toEqual([]);
  });
});

describe('hasOrderPdf', () => {
  it('GT-raqam.pdf bo\'lsa zakaz xati deb taniydi', () => {
    expect(hasOrderPdf([CMR, PDF_773210])).toBe(true);
  });

  it('boshqa PDF zakaz xati deb tanilmaydi', () => {
    expect(hasOrderPdf([CMR, file('Инвойс GT-773211.pdf')])).toBe(false);
    expect(hasOrderPdf([])).toBe(false);
  });
});

describe('classifyAttachments', () => {
  it('zakaz PDF, umumiy va qolgan fayllarni ajratadi', () => {
    const result = classifyAttachments([PDF_773210, PDF_773211, CMR, RC_ADDRESSES, BOX, STICKER]);

    expect([...result.orderPdfs.keys()].sort()).toEqual(['GT-773210', 'GT-773211']);
    expect(names(result.shared)).toEqual(['Инструкция к 13гр CMR.xlsx', 'Адреса РЦ Магнит.xlsx']);
    expect(names(result.other)).toEqual(['GT box UZ.xlsx', 'Pallet sticker SAMPLE.DOC']);
  });

  it('nomida GT raqami bor hujjatni o\'sha zakazga biriktiradi', () => {
    const invoice = file('Инвойс GT-773211.pdf');
    const result = classifyAttachments([PDF_773211, invoice]);

    expect(result.shared).toEqual([]);
    expect(names(result.perOrderExtras.get('GT-773211') ?? [])).toEqual(['Инвойс GT-773211.pdf']);
  });
});

describe('buildGtOrders', () => {
  const orders = buildGtOrders(mail(ALL_ROWS, [PDF_773210, PDF_773211, CMR, RC_ADDRESSES, BOX, STICKER]));

  it('har GT raqamga bitta zakaz beradi', () => {
    expect(orders.map((order) => order.gtNumber)).toEqual(['GT-773210', 'GT-773211']);
  });

  it('bir GT ning bir nechta РЦ sini bitta zakazga yig\'adi', () => {
    const order = orders[1]!;
    expect(order.arrivalPlaces).toEqual(['РЦ Киров 10000 кг', 'РЦ Зеленодольск 10000 кг']);
    expect(order.customsPlace).toBe('Оренбург');
  });

  it('har zakazga o\'z PDF i va umumiy fayllarni biriktiradi', () => {
    expect(names(orders[0]!.files)).toEqual([
      'GT-773210.pdf',
      'Инструкция к 13гр CMR.xlsx',
      'Адреса РЦ Магнит.xlsx',
    ]);
    expect(names(orders[1]!.files)).toEqual([
      'GT-773211.pdf',
      'Инструкция к 13гр CMR.xlsx',
      'Адреса РЦ Магнит.xlsx',
    ]);
  });

  it('boshqa zakazning PDF ini aralashtirmaydi', () => {
    expect(names(orders[0]!.files)).not.toContain('GT-773211.pdf');
    expect(names(orders[1]!.files)).not.toContain('GT-773210.pdf');
  });

  it('yuborilmaydigan ilovalarni ro\'yxatlaydi', () => {
    expect(orders[0]!.skippedFiles).toEqual(['GT box UZ.xlsx', 'Pallet sticker SAMPLE.DOC']);
  });

  it('jadvalda bor, lekin PDF i yo\'q zakazni ham beradi', () => {
    const result = buildGtOrders(mail(ALL_ROWS, [PDF_773210, CMR]));
    const missing = result.find((order) => order.gtNumber === 'GT-773211')!;

    expect(missing.missingPdf).toBe(true);
    expect(missing.missingTableRow).toBe(false);
    expect(names(missing.files)).toEqual(['Инструкция к 13гр CMR.xlsx']);
  });

  it('PDF i bor, lekin jadvalda yo\'q zakazni ham beradi', () => {
    const result = buildGtOrders(mail([ROW_773210], [PDF_773210, PDF_773211]));
    const orphan = result.find((order) => order.gtNumber === 'GT-773211')!;

    expect(orphan.missingTableRow).toBe(true);
    expect(orphan.missingPdf).toBe(false);
    expect(orphan.arrivalPlaces).toEqual([]);
  });
});

describe('formatGtMessage', () => {
  const orders = buildGtOrders(mail(ALL_ROWS, [PDF_773210, PDF_773211, CMR, RC_ADDRESSES, BOX]));
  const subject = 'Fwd: Магнит, 35 нед -GT-773210 GT-773211- VOSTOCHNIY PRODUKT LLC';

  it('bitta РЦ li zakazni tekis yozadi', () => {
    const text = formatGtMessage(orders[0]!, subject);

    expect(text).toContain('🟠 Магнит — GT-773210');
    expect(text).toContain('Место ТО: Оренбург');
    expect(text).toContain('Место прибытия: РЦ ГТ ПроФреш Санкт-Петербург');
    expect(text).toContain('Yuborilmagan ilovalar: GT box UZ.xlsx');
    expect(text).not.toContain('⚠️');
  });

  it('ko\'p РЦ li zakazni raqamlangan ro\'yxat bilan yozadi', () => {
    const text = formatGtMessage(orders[1]!, subject);

    expect(text).toContain('Место прибытия:\n  1) РЦ Киров 10000 кг\n  2) РЦ Зеленодольск 10000 кг');
  });

  it('yetishmayotgan PDF haqida ogohlantiradi', () => {
    const [order] = buildGtOrders(mail([ROW_773210], [file('Адреса РЦ Магнит.xlsx'), PDF_773211]))
      .filter((o) => o.gtNumber === 'GT-773210');

    expect(formatGtMessage(order!, subject)).toContain("⚠️ GT-773210.pdf ilovada yo'q");
  });
});
