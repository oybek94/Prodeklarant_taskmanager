/** `2026/014` ko'rinishidagi raqamdan tartib qismini ajratadi. Mos kelmasa null. */
function sequenceOf(number: string, year: number): number | null {
  const match = /^(\d{4})\/(\d+)$/.exec(number.trim());
  if (!match) return null;
  if (Number(match[1]) !== year) return null;
  return Number(match[2]);
}

/**
 * Shu yildagi eng katta tartib raqamdan keyingisini qaytaradi.
 * Tartib qismi kamida 3 xonali qilib to'ldiriladi (`2026/007`).
 */
export function nextAgreementNumber(year: number, existing: string[]): string {
  const max = existing.reduce((acc, n) => {
    const seq = sequenceOf(n, year);
    return seq !== null && seq > acc ? seq : acc;
  }, 0);
  return `${year}/${String(max + 1).padStart(3, '0')}`;
}
