/**
 * Xodim telefoni — tizimga kirish logini bo'ladi, shuning uchun bazada bitta ko'rinishda
 * (`+998XXXXXXXXX`) saqlanadi: "90 123 45 67" va "+998901234567" bitta raqam hisoblanadi.
 * O'zbekiston raqami bo'lmasa yoki uzunligi noto'g'ri bo'lsa — null.
 */
export function normalizeStaffPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

export const INVALID_PHONE_MESSAGE = "Telefon raqam noto'g'ri. Namuna: 90 123 45 67";
export const PHONE_TAKEN_MESSAGE = 'Bu telefon raqam boshqa xodimga biriktirilgan';
