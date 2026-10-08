/**
 * Og'irlikni gramm aniqligida (3 xona) formatlaydi; ortiqcha nollar olib tashlanadi.
 * Float yig'indi shovqinini (1234.5600000001) bartaraf etadi.
 */
export const formatWeight = (value: unknown): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return String(Math.round(num * 1000) / 1000);
};
