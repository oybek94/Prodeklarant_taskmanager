/**
 * Cargo matn extraction natijasini deterministik tozalash (Stage 2).
 *
 * Prompt ko'rsatmalari eng yaxshi holatda "iltimos" darajasida ishlaydi —
 * quyidagi ikki qoida esa kafolat bo'lishi kerak, shuning uchun AI'dan keyin
 * kod darajasida majburlanadi.
 */

import { CargoTextExtraction } from './cargo-text.schema';

/** Tovarning o'z maydoni bor qiymatlar — extra_fields ga tushmasligi kerak */
const PER_PRODUCT_LABELS = ['квант', 'калибр', 'рц'];

/** "Выгрузка" sarlavhasi — destination faqat shundan keyin keladi */
const DESTINATION_MARKER = /выгрузка/i;

const normalizeLabel = (label: string): string =>
  label.trim().toLowerCase().replace(/[:.]+$/, '');

/**
 * @param data AI qaytargan xom natija
 * @param rawText Mijozning asl xabari — destination tekshiruvi uchun
 */
export function normalizeCargoExtraction(
  data: CargoTextExtraction,
  rawText: string
): CargoTextExtraction {
  // 1) Квант / Калибр / РЦ tovar maydonlarida yashaydi — extra_fields dan olib tashlaymiz,
  //    aks holda bir xil ma'lumot ikki joyda ikki xil ko'rinishda paydo bo'ladi
  const extra_fields = data.extra_fields.filter((field) => {
    const label = normalizeLabel(field.label);
    return !PER_PRODUCT_LABELS.some((skip) => label === skip || label.startsWith(`${skip} `) || label.startsWith(`${skip}(`));
  });

  // 2) Matnda "Выгрузка" sarlavhasi bo'lmasa destination bo'sh bo'lishi shart —
  //    AI ba'zan uni "DAP Москва" dan to'qib chiqaradi
  const destination = DESTINATION_MARKER.test(rawText) ? data.destination : null;

  return { ...data, extra_fields, destination };
}
