/**
 * Cargo matn extraction natijasini deterministik tozalash (Stage 2).
 *
 * Prompt ko'rsatmalari eng yaxshi holatda "iltimos" darajasida ishlaydi —
 * quyidagi qoidalar esa kafolat bo'lishi kerak, shuning uchun AI'dan keyin
 * kod darajasida majburlanadi.
 */

import { CargoTextExtraction } from './cargo-text.schema';

/** Tovarning o'z maydoni bor qiymatlar — extra_fields ga tushmasligi kerak */
const PER_PRODUCT_LABELS = ['квант', 'калибр', 'рц'];

/**
 * Yig'indi qatorlari ("Итого: 18 800 нетто / 20 390 брутто") — invoysga
 * yozilmaydi. Jadval Брутто/Нетто yig'indisini "Всего:" qatorida o'zi
 * hisoblaydi, matndan olingani takror bo'lib, qo'lda tahrirlanganda esa
 * jadval bilan ziddiyatga tushadi.
 */
const TOTALS_LABELS = ['итого', 'всего'];

/** "Выгрузка" sarlavhasi — destination faqat shundan keyin keladi */
const DESTINATION_MARKER = /выгрузка/i;

/**
 * "Номер ТС" qatorida mijozlar ba'zan "40|202GCA / 40|6509BA" kabi ortiqcha
 * ajratgichlar (probel, "|") bilan yozadi. Standart ko'rinish — ortiqcha
 * belgilarsiz, bir nechta raqam "/" bilan ajratilgan: "40202GCA/406509BA".
 * Harflar QAYSI ALIFBODA bo'lsa ham saqlanadi — rus raqamlari kirillcha
 * ("Е200ЕЕ164/АУ699164"); belgilar tartibi o'zgartirilmaydi.
 */
export function normalizeVehicleNumber(value: string | null): string | null {
  if (!value) return value;
  const cleaned = value
    .split('/')
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((part) => part.length > 0)
    .join('/');
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Matndagi "Номер ТС: ..." qatorining qiymati. AI raqamni "tuzatib" yuborishi
 * mumkin (kirill harfini lotinchaga almashtirish, tartibni o'zgartirish) —
 * shuning uchun qator matnda bo'lsa qiymat aynan o'sha yerdan olinadi.
 */
const VEHICLE_NUMBER_LINE = /^\s*номер\s+т\.?\s*с\.?\s*[:\-–—]?\s*(.+?)\s*$/i;

function vehicleNumberFromText(rawText: string): string | null {
  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(VEHICLE_NUMBER_LINE);
    // "Номер ТС / прицепа: ..." kabi boshqa yorliqli qatorlarni tanimaymiz — AI qiymati qoladi
    if (match && !match[1].includes(':')) return normalizeVehicleNumber(match[1]);
  }
  return null;
}

/**
 * Tizimda shartnoma va mijoz yozuvlaridan olinadigan tomonlar — matndan
 * hech qayerga yozilmaydi (prompt ham shuni so'raydi, bu esa kafolat).
 */
const PARTY_LINE = /^\s*(отправител\S*|изготовител\S*|клиент\S*|экспортер\S*|экспортёр\S*)\s*[:\-–—]\s*(.*?)\s*$/i;
const PARTY_LABELS = ['отправитель', 'изготовитель', 'клиент', 'экспортер', 'экспортёр'];

/** Matndagi tomonlar qatorlarining qiymatlari (kichik harfda) */
function partyValues(rawText: string): Set<string> {
  const values = new Set<string>();
  rawText.split(/\r?\n/).forEach((line) => {
    const value = line.match(PARTY_LINE)?.[2]?.trim().toLowerCase();
    if (value) values.add(value);
  });
  return values;
}

/**
 * "Номер инвойса" qatorida sana ham kelishi mumkin: "№ 8/26 от 16.09.2026 г".
 * AI odatda ajratadi, lekin kafolat uchun bu bo'linish kod darajasida ham
 * amalga oshiriladi: raqamdan "№" va "от DD.MM.YYYY" qismi tozalanadi,
 * sana esa (agar AI invoice_date ni bo'sh qoldirgan bo'lsa) o'shandan olinadi.
 */
const INVOICE_NUMBER_DATE_SUFFIX =
  /^(.*?)\s*от\s*(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\s*г?\.?\s*$/i;

function normalizeInvoiceNumberAndDate(
  invoiceNumber: string | null,
  invoiceDate: string | null
): { invoice_number: string | null; invoice_date: string | null } {
  if (!invoiceNumber) return { invoice_number: invoiceNumber, invoice_date: invoiceDate };

  let number = invoiceNumber.trim();
  let date = invoiceDate;

  const match = number.match(INVOICE_NUMBER_DATE_SUFFIX);
  if (match) {
    const [, numberPart, day, month, yearRaw] = match;
    number = numberPart.trim();
    if (!date) {
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  number = number.replace(/^№\s*/, '').trim();

  return { invoice_number: number.length > 0 ? number : null, invoice_date: date };
}

/** "В упаковочный лист:" — undan keyingi qatorlar packing_fields ga tegishli */
const PACKING_SECTION_MARKER = /^\s*в\s+упаковочн\S*\s+лист\s*:?/i;

/** Packing bo'limi shu sarlavhalardan birida tugaydi */
const NEXT_SECTION_MARKERS = [/^\s*таможн\S*\s*:?/i, /^\s*выгрузк\S*\s*:?/i];

const normalizeLabel = (label: string): string =>
  label.trim().toLowerCase().replace(/[:.]+$/, '');

/** Yorliq berilgan nomlardan biriga tengmi yoki shu nom bilan boshlanadimi */
const matchesAny = (label: string, names: string[]): boolean =>
  names.some(
    (name) => label === name || label.startsWith(`${name} `) || label.startsWith(`${name}(`)
  );

/**
 * Matndagi "В упаковочный лист:" bo'limining qatorlarini qaytaradi.
 * Bo'lim keyingi sarlavhagacha ("Таможня:", "Выгрузка:") yoki matn oxirigacha davom etadi.
 */
function packingSectionLines(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/);
  const start = lines.findIndex((line) => PACKING_SECTION_MARKER.test(line));
  if (start === -1) return [];

  const section: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (NEXT_SECTION_MARKERS.some((marker) => marker.test(lines[i]))) break;
    const trimmed = lines[i].trim();
    if (trimmed) section.push(trimmed);
  }
  return section;
}

/**
 * @param data AI qaytargan xom natija
 * @param rawText Mijozning asl xabari — destination tekshiruvi uchun
 */
export function normalizeCargoExtraction(
  data: CargoTextExtraction,
  rawText: string
): CargoTextExtraction {
  // 1) Квант / Калибр / РЦ tovar maydonlarida yashaydi, Итого esa jadval o'zi
  //    hisoblaydigan yig'indi — ikkalasi ham extra_fields dan olib tashlanadi,
  //    aks holda bir xil ma'lumot ikki joyda ikki xil ko'rinishda paydo bo'ladi
  //    Отправитель / Изготовитель / Клиент / Экспортер ham — yorlig'i bo'yicha yoki
  //    (AI boshqa yorliq qo'ygan bo'lsa) qiymati matndagi o'sha qatorga tengligi bo'yicha
  const parties = partyValues(rawText);
  const isPartyField = (field: { label: string; value: string }): boolean =>
    matchesAny(normalizeLabel(field.label), PARTY_LABELS) ||
    parties.has(field.value.trim().toLowerCase());

  const kept = data.extra_fields.filter((field) => {
    const label = normalizeLabel(field.label);
    return (
      !matchesAny(label, PER_PRODUCT_LABELS) &&
      !matchesAny(label, TOTALS_LABELS) &&
      !isPartyField(field)
    );
  });

  // 2) "В упаковочный лист:" bo'limidagi qatorlar packing_fields ga tegishli, lekin
  //    AI ularni ba'zan extra_fields ga qo'yadi — joyini matnning o'zi bo'yicha
  //    hal qilamiz, model qaroriga tashlab qo'ymaymiz
  const sectionLines = packingSectionLines(rawText).map(normalizeLabel);
  const belongsToPacking = (rawLabel: string): boolean => {
    const label = normalizeLabel(rawLabel);
    return label.length > 0 && sectionLines.some((line) => line.startsWith(label));
  };

  const packing_fields = data.packing_fields.filter((field) => !isPartyField(field));
  const seen = new Set(packing_fields.map((field) => normalizeLabel(field.label)));
  const extra_fields = kept.filter((field) => {
    if (!belongsToPacking(field.label)) return true;
    // Bir yorliq ikkala massivda turmasligi kerak
    if (!seen.has(normalizeLabel(field.label))) {
      seen.add(normalizeLabel(field.label));
      packing_fields.push(field);
    }
    return false;
  });

  // 3) Matnda "Выгрузка" sarlavhasi bo'lmasa destination bo'sh bo'lishi shart —
  //    AI ba'zan uni "DAP Москва" dan to'qib chiqaradi
  const destination = DESTINATION_MARKER.test(rawText) ? data.destination : null;

  // 4) Номер ТС — matndagi qatorning o'zidan (AI "tuzatgan" bo'lsa ham), ortiqcha
  //    probel/"|" kabi belgilarsiz; harflar alifbosi va tartibi saqlanadi
  const vehicle_number = vehicleNumberFromText(rawText) ?? normalizeVehicleNumber(data.vehicle_number);

  // 5) Номер инвойса qatoridagi "от DD.MM.YYYY" sanasi invoice_date ga ajratiladi
  const { invoice_number, invoice_date } = normalizeInvoiceNumberAndDate(
    data.invoice_number,
    data.invoice_date
  );

  return {
    ...data,
    extra_fields,
    packing_fields,
    destination,
    vehicle_number,
    invoice_number,
    invoice_date,
  };
}
