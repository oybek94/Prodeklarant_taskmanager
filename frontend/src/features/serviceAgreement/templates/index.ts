import type { AgreementTemplate } from './types';
import { v1 } from './v1';

const TEMPLATES: Record<string, AgreementTemplate> = { v1 };

/** Eng so'nggi versiya — yangi shartnomalar shu bilan yaratiladi */
export const CURRENT_TEMPLATE_VERSION = 'v1';

/**
 * Imzolangan shartnoma AYNAN o'z versiyasida qayta chiqishi kerak, shuning
 * uchun noma'lum versiyada eng so'nggisiga tushib qolmaymiz — xato beramiz.
 */
export function getTemplate(version: string): AgreementTemplate {
  const template = TEMPLATES[version];
  if (!template) throw new Error(`Noma'lum shablon versiyasi: ${version}`);
  return template;
}

export { v1 };
