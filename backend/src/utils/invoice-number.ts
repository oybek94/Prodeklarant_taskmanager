/**
 * Invoice raqamini keyingi raqamga oshiradi.
 * DZA-140 → DZA-141, 5 → 6, 2-B → 3-B formatlarini qo'llab-quvvatlaydi.
 */
export function getNextInvoiceNumber(current: string): string {
  if (!current || !current.trim()) return '1';
  const match = current.trim().match(/(.*?)(\d+)([^\d]*)$/);
  if (!match) return ((parseInt(current, 10) || 0) + 1).toString();
  const [, prefix, numStr, suffix] = match;
  const num = parseInt(numStr, 10);
  return `${prefix || ''}${num + 1}${suffix || ''}`;
}
