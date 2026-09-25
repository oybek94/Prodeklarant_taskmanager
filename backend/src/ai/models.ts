/**
 * OpenAI model tanlovi va modelga mos namuna olish parametrlari.
 *
 * Yangi modellar (gpt-5.x, gpt-6-*) `temperature` ni faqat sukut qiymatida
 * qabul qiladi (boshqa qiymat → 400) — ularda determinizm o'rniga
 * `reasoning_effort` boshqariladi. Eski gpt-4* modellar esa aksincha.
 */

/** Maydon ajratish (cargo matni, hujjat extraction) va tarjima uchun sukut model */
export const DEFAULT_EXTRACTION_MODEL = 'gpt-6-luna';

/** Tarjima modeli (env orqali almashtiriladi) */
export function translationModel(): string {
  return process.env.OPENAI_TRANSLATION_MODEL ?? DEFAULT_EXTRACTION_MODEL;
}

/** CRM tahlili (lid bali, xulosa, dashboard, xabar) va suhbat tahlili */
export function crmModel(): string {
  return process.env.OPENAI_CRM_MODEL ?? 'gpt-6-luna';
}

/** Ma'lumot yordamchisi — SQL yozadi, shuning uchun kuchliroq model */
export function assistantModel(): string {
  return process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-6-sol';
}

function isLegacyModel(model: string): boolean {
  return model.startsWith('gpt-4') || model.startsWith('gpt-3');
}

/**
 * Modelga qarab `temperature` yoki `reasoning_effort` qaytaradi.
 * Yangi modellarda reasoning o'chiq ('none') — extraction/tarjimada
 * fikrlash tokenlari sifatni oshirmagan, faqat narx va kechikishni oshiradi.
 */
export function samplingParams(
  model: string,
  temperature: number
): { temperature: number } | { reasoning_effort: 'none' } {
  return isLegacyModel(model) ? { temperature } : { reasoning_effort: 'none' };
}
