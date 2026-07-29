/**
 * Fayl nomi ASCII bo'lmagan belgilardan (kirill, o'zbek harflari) iborat bo'lsa,
 * Node.js `Content-Disposition` headerini ERR_INVALID_CHAR bilan rad etadi.
 * RFC 5987 bo'yicha: latin1 fallback + `filename*=UTF-8''...`.
 */

/** RFC 5987 attr-char bo'lmagan belgilarni percent-encode qilish */
const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replace(/['()*!]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/** Faqat xavfsiz ASCII qoldiradigan zaxira nom (eski brauzerlar uchun) */
const toAsciiFallback = (fileName: string): string => {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').trim();
  return ascii.replace(/_+/g, '_') || 'file';
};

/** `attachment; filename="..."; filename*=UTF-8''...` header qiymatini qaytaradi */
export const attachmentDisposition = (fileName: string): string => {
  const safe = (fileName || '').replace(/[\r\n]/g, ' ');
  return `attachment; filename="${toAsciiFallback(safe)}"; filename*=UTF-8''${encodeRfc5987(safe)}`;
};
