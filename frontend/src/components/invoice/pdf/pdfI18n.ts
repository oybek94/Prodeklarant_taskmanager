/**
 * Invoys PDF'ining TILI.
 *
 * Ruscha va inglizcha PDF AYNAN bir xil `Pdf*` komponentlaridan chiziladi —
 * ko'rinish (masshtab, ustun kengliklari, chegaralar, imzo/pechat) bir xil
 * bo'lishi uchun boshqa yo'l yo'q. Farq faqat MATNDA:
 *
 *   - statik yorliqlar ("Продавец", "Всего:", ...) — shu yerdagi lug'atdan;
 *   - foydalanuvchi kiritgan matnlar (rekvizitlar, tovar nomlari, izohlar) —
 *     backend AI tarjimasidan (`translations` xaritasi, qarang:
 *     `POST /invoices/:id/translations-en` va `pdfTranslatableTexts.ts`).
 *
 * Tarjima topilmasa asl (ruscha) matn chiziladi — hujjat baribir yaratiladi.
 */

import { numberToWordsRu, numberToWordsEn } from '../invoiceUtils';

export type PdfLang = 'ru' | 'en';

export interface PdfLabels {
  // --- Sarlavha ---
  titleInvoice: string;
  titleSpec: string;
  titlePacking: string;
  titlePriceList: string;
  docNoInvoice: string;
  docNoSpec: string;
  docNoPacking: string;
  docNoPriceList: string;
  contractNo: string;
  /** "12 от 01.02.2026 г." / "12 dated 01.02.2026" */
  numberDated: (number: string, date: string) => string;
  /** Sanadan oldingi so'z — "Контракт №: 5 от 01.02.2026" */
  dated: string;

  // --- Tomonlar ---
  sellerShipper: string;
  seller: string;
  buyerConsignee: string;
  buyer: string;
  shipperManufacturer: string;
  consignee: string;
  tin: string;
  ogrn: string;
  bankDetails: string;
  paymentDetails: string;
  bank: string;
  address: string;
  account: string;
  correspondentBank: string;
  corrAccount: string;
  tel: string;
  email: string;
  noClient: string;

  // --- Qo'shimcha ma'lumot ---
  additionalInfoTitle: string;
  deliveryTerms: string;
  vehicleNumber: string;
  customsAddress: string;
  shipmentPlace: string;
  destination: string;
  origin: string;
  manufacturer: string;
  orderNumber: string;
  gln: string;
  temperature: string;
  harvestYear: string;

  // --- Tovarlar jadvali ---
  pieces: string;
  totalRow: string;
  amountInWords: string;

  // --- Izohlar ---
  notesTitle: string;

  // --- Imzolar ---
  signaturesTitle: string;
  partySeller: string;
  partyBuyer: string;
  partyShipper: string;
  partyConsignee: string;
  directorPrefix: string;
  supplierDirector: string;
  goodsReleasedBy: string;
}

const RU: PdfLabels = {
  titleInvoice: 'Инвойс',
  titleSpec: 'Спецификация',
  titlePacking: 'Упаковочный лист',
  titlePriceList: 'Прайс-лист',
  docNoInvoice: 'Инвойс №:',
  docNoSpec: 'Спецификация №:',
  docNoPacking: 'Упаковочный лист №:',
  docNoPriceList: 'Прайс-лист №:',
  contractNo: 'Контракт №:',
  numberDated: (number, date) => `${number} от ${date} г.`,
  dated: 'от',

  sellerShipper: 'Продавец/Грузоотправитель',
  seller: 'Продавец',
  buyerConsignee: 'Покупатель/Грузополучатель',
  buyer: 'Покупатель',
  shipperManufacturer: 'Грузоотправитель/Изготовитель',
  consignee: 'Грузополучатель',
  tin: 'ИНН',
  ogrn: 'ОГРН',
  bankDetails: "Bank ma'lumotlari:",
  paymentDetails: 'Платежные реквизиты:',
  bank: 'Bank',
  address: 'Manzil',
  account: 'Hisob raqami',
  correspondentBank: 'Korrespondent bank',
  corrAccount: 'Kor. hisob',
  tel: 'Tel',
  email: 'Email',
  noClient: 'Mijoz tanlanmagan',

  additionalInfoTitle: 'Дополнительная информация',
  deliveryTerms: 'Условия поставки',
  vehicleNumber: 'Номер автотранспорта',
  customsAddress: 'Место там. очистки',
  shipmentPlace: 'Место отгрузки груза',
  destination: 'Место назначения',
  origin: 'Происхождение товара',
  manufacturer: 'Производитель',
  orderNumber: 'Номер заказа',
  gln: 'Глобальный идентификационный номер GS1 (GLN)',
  temperature: 'Температура',
  harvestYear: 'Урожай',

  pieces: 'шт',
  totalRow: 'Всего:',
  amountInWords: 'Сумма прописью',

  notesTitle: 'Примечания:',

  signaturesTitle: 'Подписи сторон',
  partySeller: 'Продавец',
  partyBuyer: 'Покупатель',
  partyShipper: 'Грузоотправитель/Изготовитель',
  partyConsignee: 'Грузополучатель',
  directorPrefix: 'Директор',
  supplierDirector: 'Руководитель Поставщика:',
  goodsReleasedBy: 'Товар отпустил:',
};

const EN: PdfLabels = {
  titleInvoice: 'Invoice',
  titleSpec: 'Specification',
  titlePacking: 'Packing List',
  titlePriceList: 'Price List',
  docNoInvoice: 'Invoice No:',
  docNoSpec: 'Specification No:',
  docNoPacking: 'Packing List No:',
  docNoPriceList: 'Price List No:',
  contractNo: 'Contract No:',
  numberDated: (number, date) => `${number} dated ${date}`,
  dated: 'dated',

  sellerShipper: 'Seller/Shipper',
  seller: 'Seller',
  buyerConsignee: 'Buyer/Consignee',
  buyer: 'Buyer',
  shipperManufacturer: 'Shipper/Manufacturer',
  consignee: 'Consignee',
  tin: 'TIN',
  ogrn: 'OGRN',
  bankDetails: 'Bank details:',
  paymentDetails: 'Payment details:',
  bank: 'Bank',
  address: 'Address',
  account: 'Account No',
  correspondentBank: 'Correspondent bank',
  corrAccount: 'Corr. account',
  tel: 'Tel',
  email: 'E-mail',
  noClient: 'Client not selected',

  additionalInfoTitle: 'Additional Information',
  deliveryTerms: 'Delivery Terms',
  vehicleNumber: 'Vehicle No',
  customsAddress: 'Place of Customs Clearance',
  shipmentPlace: 'Place of Shipment',
  destination: 'Destination',
  origin: 'Country of Origin',
  manufacturer: 'Manufacturer',
  orderNumber: 'Order No',
  gln: 'GS1 Global Location Number (GLN)',
  temperature: 'Temperature',
  harvestYear: 'Harvest',

  pieces: 'pcs',
  totalRow: 'Total:',
  amountInWords: 'Amount in words',

  notesTitle: 'Notes:',

  signaturesTitle: 'Signatures of the parties',
  partySeller: 'Seller',
  partyBuyer: 'Buyer',
  partyShipper: 'Shipper/Manufacturer',
  partyConsignee: 'Consignee',
  directorPrefix: 'Director',
  supplierDirector: 'Supplier Director:',
  goodsReleasedBy: 'Goods Released By:',
};

export const PDF_LABELS: Record<PdfLang, PdfLabels> = { ru: RU, en: EN };

/**
 * AI ba'zan tarjimaga bo'lmagan savdo belgisini qo'shib yuboradi
 * ("ООО Хоразм" -> "Khorazm™ LLC"). Bojxona hujjatida bu YANGI xato bo'lardi.
 * Yangi tarjimalar `translate.service.ts` da tozalanadi — bu yerdagi tozalash
 * ESKI keshdagi qiymatlar uchun.
 */
const stripTrademarks = (text: string): string =>
  text
    .replace(/[™®]/g, '')
    .replace(/ТМ/g, '')
    // FAQAT gorizontal bo'shliq yig'iladi. `\s` qator ko'chirishini ham
    // qamrab olardi — natijada shartnomadan ko'chirilgan ko'p qatorli
    // rekvizit inglizcha PDF'da bitta uzun qatorga yopishib qolardi.
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[^\S\r\n]+\./g, '.')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

export interface PdfI18n {
  lang: PdfLang;
  /** Statik yorliqlar */
  L: PdfLabels;
  /**
   * Foydalanuvchi matni. `key` — `pdfTranslatableTexts.ts` dagi kalit,
   * `source` — asl (ruscha) matn. Tarjima yo'q bo'lsa `source` qaytadi.
   */
  t: (key: string, source: string) => string;
  /** Summani so'z bilan — hujjat tilida */
  numberToWords: (amount: number, currency: string) => string;
}

export const createPdfI18n = (
  lang: PdfLang = 'ru',
  translations?: Record<string, string>,
): PdfI18n => {
  if (lang !== 'en') {
    return {
      lang: 'ru',
      L: RU,
      t: (_key, source) => source,
      numberToWords: numberToWordsRu,
    };
  }

  return {
    lang: 'en',
    L: EN,
    t: (key, source) => {
      const translated = translations?.[key];
      if (!translated || !translated.trim()) return source;
      return stripTrademarks(translated);
    },
    numberToWords: numberToWordsEn,
  };
};
