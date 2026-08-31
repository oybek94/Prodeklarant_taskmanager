/**
 * Xabar matni va "Bajarildi / Bajarilmadi" tugmasi.
 *
 * Bajarilgan zakaz matni ustidan chiziladi (`<s>`), shuning uchun HTML rejimi
 * kerak. Zakaz qiymatlarida `&`, `<`, `>` uchrashi mumkin — ular avval
 * ekranlanadi, aks holda Telegram xabarni rad etadi yoki matnni yeb qo'yadi.
 * `«»`, tirnoq, `№` HTML uchun xavfsiz, ular o'zgarmaydi.
 */

export const DONE_CALLBACK = 'order:done';
export const UNDONE_CALLBACK = 'order:undone';

export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Bajarilgan bo'lsa butun matn chizilgan holda qaytadi. */
export const renderText = (plain: string, done: boolean): string => {
  const escaped = escapeHtml(plain);
  return done ? `<s>${escaped}</s>` : escaped;
};

/**
 * Tugma joriy holatning TESKARISINI taklif qiladi:
 * bajarilmagan xabarda — «Bajarildi», bajarilganda — «Bajarilmadi».
 */
export const statusKeyboard = (done: boolean): InlineKeyboard => ({
  inline_keyboard: [
    done
      ? [{ text: "↩️ Bajarilmadi", callback_data: UNDONE_CALLBACK }]
      : [{ text: '✅ Bajarildi', callback_data: DONE_CALLBACK }],
  ],
});

/** Callback ma'lumotidan yangi holatni aniqlaydi. Notanish bo'lsa — null. */
export const doneFromCallback = (data: string | undefined): boolean | null => {
  if (data === DONE_CALLBACK) return true;
  if (data === UNDONE_CALLBACK) return false;
  return null;
};
