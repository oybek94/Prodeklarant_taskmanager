/**
 * Inglizcha invoys PDF'i ruscha PDF bilan AYNAN bir xil komponentlardan
 * chiziladi — farq faqat matnda. Bu testning asosiy maqsadi: MATN KALITLARI
 * mos kelishini tekshirish.
 *
 * Xavf shunda: tarjima uchun matnlar `pdfTranslatableTexts.ts` da yig'iladi,
 * chizishda esa komponentlar `i18n.t(key, ...)` bilan so'raydi. Ikki joydagi
 * kalit mos kelmasa hech qanday xato chiqmaydi — komponent JIMGINA ruscha
 * matnga qaytadi va inglizcha invoysda ruscha rekvizit chiqib qoladi (chet el
 * bojxonasida bu hujjat xatosi). Shuning uchun test teskari tomondan
 * tekshiradi: tarjima so'ralgan HAR BIR ruscha matn chizilgan hujjatda
 * QOLMASLIGI kerak.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Font, pdf } from '@react-pdf/renderer';
import { InvoicePDFDocument, type InvoicePDFDocumentProps } from './InvoicePDFDocument';
import { buildPdfTranslatableTexts } from './pdfTranslatableTexts';
import { createPdfI18n } from './pdfI18n';
import type { PdfLayoutNode } from './pdfLayout';
import type { ViewTab } from '../types';

// `fonts.ts` shriftlarni brauzer URL'i (`/fonts/*.ttf`) bilan ro'yxatdan
// o'tkazadi — Node'da ular topilmaydi (qarang: renderAgreementPdf.test.ts).
vi.mock('../../pdf/fonts', () => ({ PDF_FONT_STACK: ['Roboto', 'NotoSans'] }));

const font = (name: string): string => {
  const decoded = decodeURIComponent(new URL(`../../../../public/fonts/${name}`, import.meta.url).pathname);
  return /^\/[A-Za-z]:/.test(decoded) ? decoded.slice(1) : decoded;
};

Font.register({
  family: 'Roboto',
  fonts: [
    { src: font('Roboto-Regular.ttf'), fontWeight: 400 },
    { src: font('Roboto-Medium.ttf'), fontWeight: 500 },
    { src: font('Roboto-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.register({ family: 'NotoSans', fonts: [{ src: font('NotoSans-Regular.ttf'), fontWeight: 400 }] });

// --- Fixture ---

const contract = {
  contractNumber: '77',
  contractDate: '2026-01-15T00:00:00.000Z',
  contractCurrency: 'USD',
  sellerName: 'ООО «Фрукт Водий»',
  sellerLegalAddress: 'Фергана, улица Мустакиллик 12',
  sellerInn: '301234567',
  sellerBankName: 'Ипотека Банк, Фергана',
  sellerBankAddress: 'Фергана, проспект Дустлик 4',
  sellerBankAccount: '20208000000000000001',
  sellerBankSwift: 'IPJSUZ22',
  sellerCorrespondentBank: 'Банк-корреспондент Райффайзен',
  sellerCorrespondentBankAccount: '30111840000000000002',
  buyerName: 'АО «Северный Торговый Дом»',
  buyerAddress: 'Москва, Ленинградское шоссе 25',
  buyerInn: '7701234567',
  buyerBankName: 'Сбербанк России',
  buyerBankAddress: 'Москва, улица Вавилова 19',
  buyerBankAccount: '40702810000000000003',
  shipperName: 'ООО «Логистик Партнёр»',
  shipperAddress: 'Ташкент, улица Амира Темура 8',
  consigneeName: 'ЗАО «Овощебаза Пятая»',
  consigneeAddress: 'Казань, улица Гвардейская 33',
  supplierDirector: 'Каримов Азиз Рустамович',
  goodsReleasedBy: 'Юсупова Дилноза Акмаловна',
};

const items = [
  {
    id: 1,
    tnvedCode: '0806101000',
    name: 'Виноград свежий столовый',
    unit: 'кор.',
    packageType: 'Картонная коробка',
    quantity: 1200,
    packagesCount: 1200,
    grossWeight: 20400,
    netWeight: 19200,
    unitPrice: 9.5,
    totalPrice: 11400,
    customFields: {},
  },
  {
    id: 2,
    tnvedCode: '0809300000',
    name: 'Персики свежие',
    unit: 'кор.',
    packageType: 'Картонная коробка',
    quantity: 800,
    packagesCount: 800,
    grossWeight: 9600,
    netWeight: 8800,
    unitPrice: 7.25,
    totalPrice: 5800,
    customFields: {},
  },
];

const form = {
  invoiceNumber: 'DZA-451',
  date: '2026-02-03T00:00:00.000Z',
  deliveryTerms: 'СРТ Москва',
  vehicleNumber: '40232BAA',
  customsAddress: 'Фергана таможенный пост',
  shipmentPlace: 'Олтиарикский район',
  destination: 'Москва, Россия',
  origin: '',
  manufacturer: 'Фермерское хозяйство Бахор',
  orderNumber: 'ORD-9912',
  temperature: 'от +2 до +6 градусов',
  harvestYear: 'урожай 2026 года',
  notes: 'Товар отгружается в рефрижераторе с непрерывным контролем температуры.',
};

const customFields = [{ id: 'cf1', label: 'Сорт винограда', value: 'Хусайне белый' }];
const specCustomFields = [{ id: 'sf1', label: 'Условия хранения', value: 'В сухом прохладном месте' }];
const packingCustomFields = [{ id: 'pf1', label: 'Маркировка мест', value: 'Наклейка на каждой коробке' }];

const columnLabels: Record<string, string> = {
  index: '№',
  tnved: 'Код ТН ВЭД',
  name: 'Наименование товара',
  package: 'Вид упаковки',
  packagesCount: 'Кол-во упаковки',
  unit: 'Ед. изм.',
  quantity: 'Мест',
  gross: 'Брутто',
  net: 'Нетто',
  unitPrice: 'Цена за ед.изм.',
  total: 'Сумма с НДС',
};

const orderedVisibleColumns = [
  'index', 'tnved', 'name', 'unit', 'package', 'quantity', 'packagesCount', 'gross', 'net', 'unitPrice', 'total',
];

const totalColumnLabel = 'Общая сумма в Долл. США';

/** Barcha qo'shimcha maydonlar ko'rinadi — qamrov eng keng bo'lishi uchun */
const isAdditionalInfoVisible = () => true;

const baseProps = (viewTab: ViewTab): Omit<InvoicePDFDocumentProps, 'lang' | 'translations'> => ({
  viewTab: viewTab as InvoicePDFDocumentProps['viewTab'],
  form,
  invoice: { invoiceNumber: form.invoiceNumber },
  selectedContract: contract,
  contracts: [contract],
  task: { client: { name: 'Клиент из карточки', inn: '301234567' } },
  isSellerShipper: false,
  isBuyerConsignee: false,
  isAdditionalInfoVisible,
  customFields,
  specCustomFields,
  packingCustomFields,
  additionalFieldsOrder: undefined,
  items,
  orderedVisibleColumns,
  columnLabels,
  totalColumnLabel,
  invoiceCurrency: 'USD',
  pdfIncludeSeal: false,
  scaleOverride: 1,
});

const texts = (viewTab: ViewTab) => buildPdfTranslatableTexts({
  viewTab,
  form,
  selectedContract: contract,
  task: baseProps(viewTab).task,
  isAdditionalInfoVisible,
  customFields,
  specCustomFields,
  packingCustomFields,
  items,
  orderedVisibleColumns,
  columnLabels,
  totalColumnLabel,
});

// --- Chizish ---

interface TextLine { string?: string }
interface TextNode extends PdfLayoutNode { lines?: TextLine[] }

const collectText = (node: PdfLayoutNode | undefined, out: string[] = []): string[] => {
  if (!node) return out;
  if (node.type === 'TEXT') {
    (node as TextNode).lines?.forEach((line) => { if (line.string) out.push(line.string); });
  }
  node.children?.forEach((child) => collectText(child, out));
  return out;
};

/**
 * Hujjatni chizib, undagi BARCHA matnni bitta satr sifatida qaytaradi.
 *
 * Layout matnni ustun kengligiga qarab qatorlarga bo'ladi ("Виноград свежий " +
 * "столовый"), shuning uchun bo'shliqlar yagona ko'rinishga keltiriladi — aks
 * holda uzun matn qidiruvda topilmay, tekshiruv YOLG'ON o'tib ketardi.
 */
const renderLines = async (props: InvoicePDFDocumentProps): Promise<string[]> => {
  let layout: PdfLayoutNode | undefined;
  await pdf(
    React.createElement(InvoicePDFDocument, {
      ...props,
      onRender: (info) => { layout = info._INTERNAL__LAYOUT__DATA_; },
    }),
  ).toBlob();
  return collectText(layout).map((line) => line.trim());
};

const renderText = async (props: InvoicePDFDocumentProps): Promise<string> =>
  collapse((await renderLines(props)).join(' '));

/** Bo'shliqlarni (shu jumladan uzilmas bo'shliqni) yagona ko'rinishga keltiradi */
const collapse = (text: string): string => text.replace(/\s+/gu, ' ').trim();

/**
 * Har bir kalit uchun soxta tarjima. Kalitning O'ZIDA ruscha matn bo'lishi
 * mumkin (`pkg_Картонная коробка`), shuning uchun tarjima matniga faqat lotin
 * belgilari kiritiladi — aks holda "ruscha matn qolmadi" tekshiruvi soxta
 * tarjimaning o'zidan xato topib qolardi.
 */
const fakeTranslations = (requested: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.keys(requested).map((key, i) => [key, `EN${i}-${key.replace(/[^A-Za-z0-9_]/g, '')}`]),
  );

describe('Invoys PDF — til', () => {
  it('ruscha hujjat ruscha yorliqlar bilan chiziladi', async () => {
    const drawn = await renderText(baseProps('invoice'));

    expect(drawn).toContain('Инвойс №:');
    expect(drawn).toContain('Продавец');
    expect(drawn).toContain('Покупатель');
    expect(drawn).toContain('Дополнительная информация');
    expect(drawn).toContain('Всего:');
    expect(drawn).toContain('Сумма прописью');
    expect(drawn).toContain('Примечания:');
    expect(drawn).toContain('Руководитель Поставщика:');
    // Tarjima berilmagani uchun asl matnlar chiziladi
    expect(drawn).toContain(collapse(contract.sellerName));
    expect(drawn).toContain(collapse(items[0].name));
  }, 60_000);

  it('inglizcha hujjat inglizcha yorliqlar bilan chiziladi', async () => {
    const drawn = await renderText({
      ...baseProps('invoice'),
      lang: 'en',
      translations: fakeTranslations(texts('invoice')),
    });

    expect(drawn).toContain('Invoice No:');
    expect(drawn).toContain('Contract No:');
    expect(drawn).toContain('Seller');
    expect(drawn).toContain('Buyer');
    expect(drawn).toContain('Shipper/Manufacturer');
    expect(drawn).toContain('Consignee');
    expect(drawn).toContain('TIN:');
    expect(drawn).toContain('Additional Information');
    expect(drawn).toContain('Total:');
    expect(drawn).toContain('Amount in words');
    expect(drawn).toContain('Notes:');
    expect(drawn).toContain('Supplier Director:');
    expect(drawn).toContain('Goods Released By:');

    // Ruscha yorliqlardan asar qolmasligi kerak
    expect(drawn).not.toContain('Инвойс');
    expect(drawn).not.toContain('Продавец');
    expect(drawn).not.toContain('Покупатель');
    expect(drawn).not.toContain('Всего:');
    expect(drawn).not.toContain('Примечания');
  }, 60_000);

  it('tarjima so\'ralgan har bir ruscha matn inglizcha hujjatda qolmaydi', async () => {
    for (const viewTab of ['invoice', 'spec', 'packing'] as const) {
      const requested = texts(viewTab);
      const drawn = await renderText({
        ...baseProps(viewTab),
        lang: 'en',
        translations: fakeTranslations(requested),
      });

      const leaked = Object.entries(requested)
        .filter(([, source]) => drawn.includes(collapse(source)))
        .map(([key, source]) => `${viewTab}: ${key} = "${source}"`);

      expect(leaked).toEqual([]);

      // Yuqoridagi tekshiruv faqat SO'RALGAN matnlarni ko'radi. Umuman
      // so'ralmay qolgan maydon (yangi maydon qo'shilib, `pdfTranslatableTexts`
      // ga kiritilmasa) esa hujjatda kirill matni bo'lib qolaveradi — shuni
      // ushlash uchun butun hujjat bo'yicha tekshiramiz.
      const cyrillic = drawn.match(/[Ѐ-ӿ][Ѐ-ӿ\s.,«»"'()-]*/gu) || [];
      expect({ viewTab, cyrillic }).toEqual({ viewTab, cyrillic: [] });
    }
  }, 180_000);

  it('tarjimasi yo\'q matn ruscha holicha chiziladi (hujjat baribir yaratiladi)', async () => {
    const drawn = await renderText({ ...baseProps('invoice'), lang: 'en', translations: {} });

    expect(drawn).toContain('Invoice No:');
    expect(drawn).toContain(collapse(contract.sellerName));
    expect(drawn).toContain(collapse(items[0].name));
  }, 60_000);
});

/**
 * Rekvizitlar shartnomadan ERKIN MATN sifatida ko'chiriladi — qator ko'chirishi
 * ma'noli (bank, hisob raqami, SWIFT alohida qatorlarda turadi). Ruscha PDF
 * matnga tegmaydi, shuning uchun inglizcha PDF ham AYNAN o'sha joylashuvni
 * saqlashi kerak.
 */
describe('Invoys PDF — rekvizitlar joylashuvi', () => {
  const detailsRu = [
    'Банк: Ипотека Банк',
    'Счёт: 20208000000000000001',
    'SWIFT: IPJSUZ22',
  ].join('\n');

  const detailsEn = [
    'Bank: Ipoteka Bank',
    'Account: 20208000000000000001',
    'SWIFT: IPJSUZ22',
  ].join('\n');

  it('tarjimadagi qator ko\'chirishi saqlanadi', () => {
    const { t } = createPdfI18n('en', { sellerDetails: detailsEn });

    expect(t('sellerDetails', detailsRu)).toBe(detailsEn);
  });

  it('ortiqcha bo\'shliq va ™ baribir tozalanadi (qator buzilmagan holda)', () => {
    const { t } = createPdfI18n('en', { sellerDetails: 'Ipoteka™   Bank\nAccount:   2020' });

    expect(t('sellerDetails', detailsRu)).toBe('Ipoteka Bank\nAccount: 2020');
  });

  it('ko\'p qatorli rekvizit PDF\'da alohida qatorlarda chiziladi', async () => {
    const withDetails = { ...contract, sellerDetails: detailsRu };
    const lines = await renderLines({
      ...baseProps('invoice'),
      selectedContract: withDetails,
      contracts: [withDetails],
      lang: 'en',
      translations: { ...fakeTranslations(texts('invoice')), sellerDetails: detailsEn },
    });

    for (const expected of detailsEn.split('\n')) {
      expect(lines).toContain(expected);
    }
  }, 60_000);
});
