/** Summa maydoni: yozish paytida "1 250 000" (faqat butun so'm; kasr qismi tashlanadi). */
export function formatAmountInput(raw: string): string {
  const whole = raw.split(/[.,]/)[0];
  const digits = whole.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Tahrirlash faqat admin uchun va faqat so'mdagi yozuvda (eski USD yozuvlar so'mga aylanib ketmasin). */
export function canEditTransaction(t: { currency: string }, isAdmin: boolean): boolean {
  return isAdmin && t.currency === 'UZS';
}

/** Mahalliy vaqt bo'yicha YYYY-MM-DD (toISOString UTC beradi — tunda kechagi sana chiqardi). */
export function localIsoDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return localIsoDate(new Date(y, m - 1, d + days));
}
