import OpenAIClient from '../ai/openai.client';

interface TranslatedRequisites {
  sellerName?: string;
  sellerAddress?: string;
  sellerDetails?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerDetails?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeDetails?: string;
  deliveryTerms?: string;
  notes?: string;
  [key: string]: string | undefined;
}

/**
 * Tidy up an AI translation before it is drawn / cached.
 *
 * The model sometimes invents a trademark sign ("ООО Хоразм" -> "Khorazm™ LLC"),
 * which would be a NEW error in a customs document, so those are removed and the
 * gap they leave behind is closed.
 *
 * Only HORIZONTAL whitespace is collapsed. `\s` also covers `\n`, and collapsing
 * that flattened multi-line requisites — copied verbatim out of the contract,
 * where the line breaks carry meaning (bank, account, SWIFT each on their own
 * line) — into one long paragraph. The Russian PDF never touches the text, so
 * the English one must keep the exact same layout.
 */
export const cleanTranslatedText = (text: string): string =>
  text
    .replace(/[™®]/g, '')
    .replace(/ТМ/g, '') // Cyrillic TM
    .replace(/\bTM\b/g, '') // Latin TM whole word
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[^\S\r\n]+\./g, '.') // fix the space before a dot left by TM removal
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n')
    .trim();

/**
 * Whether a cached translation may still be used.
 *
 * A changed source obviously invalidates it. On top of that, translations cached
 * before 2026-08-11 had their line breaks collapsed away by the bug described in
 * `cleanTranslatedText` — those entries are treated as stale too, otherwise the
 * fix would never reach invoices that were already translated once.
 */
export const isCachedTranslationUsable = (
  source: string,
  cached: { source: string; translated: string },
): boolean => {
  if (cached.source !== source) return false;
  if (source.includes('\n') && !cached.translated.includes('\n')) return false;
  return true;
};

/**
 * Translate invoice requisites from Russian to English using OpenAI.
 * Sends all texts in a single API call for efficiency.
 */
export async function translateRequisites(
  texts: Record<string, string>
): Promise<TranslatedRequisites> {
  // Pre-process texts for specific hardcoded translations
  const preProcessedTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(texts)) {
    if (v) {
      // Hardcoded translation for АРВИАЙ
      preProcessedTexts[k] = v.replace(/АО ["«]АРВИАЙ \(РАШЕН ВЕНЧУР ИНВЕСТМЕНТС\)["»]/gi, 'JSC "RVI (RUSSIAN VENTURE INVESTMENTS)"');
    }
  }

  // Filter out empty values
  const entries = Object.entries(preProcessedTexts).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return {};

  try {
    const client = OpenAIClient.getClient();

    const fieldsJson = JSON.stringify(Object.fromEntries(entries), null, 2);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for international trade documents. Translate the given JSON fields from Russian to English. Keep INN numbers, bank account numbers, SWIFT codes, phone numbers, email addresses, and other identifiers unchanged. For company names, transliterate them if they don't have a common English equivalent (e.g. "ООО" → "LLC", "ЗАО" → "CJSC"). For addresses, transliterate city/region names. Preserve the line structure of every value exactly: a value containing line breaks must come back with the same number of lines in the same order, translating each line in place — never merge lines into a paragraph, never split one line into several, never add or drop blank lines. Do not add any trademark symbols (like ™, ®, TM) or other special characters that are not present in the original text. Return a JSON object with the same keys but English values.`,
        },
        {
          role: 'user',
          content: fieldsJson,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return Object.fromEntries(entries);

    const parsed = JSON.parse(content) as TranslatedRequisites;

    for (const key in parsed) {
      const value = parsed[key];
      if (typeof value === 'string') parsed[key] = cleanTranslatedText(value);
    }

    return parsed;
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback: return original texts
    return Object.fromEntries(entries);
  }
}
