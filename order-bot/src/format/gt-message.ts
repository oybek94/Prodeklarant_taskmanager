import type { GtOrder } from '../parse/gt-orders.js';

const EMPTY = '—';

const value = (raw: string | null): string => (raw && raw.trim() ? raw.trim() : EMPTY);

/**
 * Bitta Магнит zakazining Telegram matni.
 *
 * Har xabar o'zicha to'liq: boshqa xabarga qarash shart emas.
 * Yetishmayotgan ma'lumot va yuborilmagan ilovalar ochiq yoziladi —
 * hech narsa jim yo'qolmasligi kerak.
 */
export const formatGtMessage = (order: GtOrder, subject: string): string => {
  const lines: string[] = [`🟠 Магнит — ${order.gtNumber}`, ''];

  lines.push(`Место ТО: ${value(order.customsPlace)}`);
  lines.push(`Товар: ${value(order.product)}`);

  if (order.arrivalPlaces.length <= 1) {
    lines.push(`Место прибытия: ${value(order.arrivalPlaces[0] ?? null)}`);
  } else {
    lines.push('Место прибытия:');
    order.arrivalPlaces.forEach((place, index) => lines.push(`  ${index + 1}) ${place}`));
  }

  lines.push('', `Хат: ${subject}`);

  if (order.files.length > 0) {
    lines.push(`Hujjatlar: ${order.files.map((file) => file.filename).join(', ')}`);
  }
  if (order.skippedFiles.length > 0) {
    lines.push(`Yuborilmagan ilovalar: ${order.skippedFiles.join(', ')}`);
  }

  const warnings: string[] = [];
  if (order.missingPdf) warnings.push(`⚠️ ${order.gtNumber}.pdf ilovada yo'q`);
  if (order.missingTableRow) warnings.push('⚠️ xat jadvalida bu zakaz uchun qator yo\'q');
  if (warnings.length > 0) lines.push('', ...warnings);

  return lines.join('\n');
};
