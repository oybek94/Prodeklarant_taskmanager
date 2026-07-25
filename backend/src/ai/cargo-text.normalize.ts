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
  const kept = data.extra_fields.filter((field) => {
    const label = normalizeLabel(field.label);
    return !matchesAny(label, PER_PRODUCT_LABELS) && !matchesAny(label, TOTALS_LABELS);
  });

  // 2) "В упаковочный лист:" bo'limidagi qatorlar packing_fields ga tegishli, lekin
  //    AI ularni ba'zan extra_fields ga qo'yadi — joyini matnning o'zi bo'yicha
  //    hal qilamiz, model qaroriga tashlab qo'ymaymiz
  const sectionLines = packingSectionLines(rawText).map(normalizeLabel);
  const belongsToPacking = (rawLabel: string): boolean => {
    const label = normalizeLabel(rawLabel);
    return label.length > 0 && sectionLines.some((line) => line.startsWith(label));
  };

  const packing_fields = [...data.packing_fields];
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

  return { ...data, extra_fields, packing_fields, destination };
}
