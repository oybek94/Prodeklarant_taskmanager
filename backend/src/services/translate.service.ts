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
          content: `You are a professional translator for international trade documents. Translate the given JSON fields from Russian to English. Keep INN numbers, bank account numbers, SWIFT codes, phone numbers, email addresses, and other identifiers unchanged. For company names, transliterate them if they don't have a common English equivalent (e.g. "ООО" → "LLC", "ЗАО" → "CJSC"). For addresses, transliterate city/region names. Do not add any trademark symbols (like ™, ®, TM) or other special characters that are not present in the original text. Return a JSON object with the same keys but English values.`,
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
    
    // Clean up hallucinated TM symbols from values
    for (const key in parsed) {
      if (typeof parsed[key] === 'string') {
        parsed[key] = parsed[key]
          .replace(/™/g, '')
          .replace(/ТМ/g, '') // Cyrillic TM
          .replace(/®/g, '')
          .replace(/\bTM\b/g, '') // Latin TM whole word
          .replace(/\s+/g, ' ') // Collapse multiple spaces
          .replace(/\s+\./g, '.') // Fix spaces before dots left by TM removal
          .trim();
      }
    }

    return parsed;
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback: return original texts
    return Object.fromEntries(entries);
  }
}
