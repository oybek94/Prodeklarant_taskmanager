import { buildCargoTextPrompt, CargoTextPromptOptions } from '../ai/cargo-text.prompt';
import {
  cargoTextExtractionSchema,
  CARGO_TEXT_RESPONSE_FORMAT,
  CargoTextExtraction,
} from '../ai/cargo-text.schema';
import { normalizeCargoExtraction } from '../ai/cargo-text.normalize';
import { runStructuredExtraction } from '../ai/structured-extractor';
import { handleAIError } from '../utils/error-handler';

/**
 * Mijozning Telegram shablon matnini invoys maydonlariga aylantiruvchi servis.
 *
 * Extraction konveyeri (structured-extractor.ts) strict JSON Schema validatsiya
 * va repair-retry ni o'zi bajaradi — bu yerda qo'shimcha normalizatsiya yo'q.
 */
export class CargoTextService {
  /**
   * @param text Mijozdan kelgan xom matn
   * @param options Shartnoma/baza ro'yxatlari — AI tanlovli maydonlar uchun
   *   eng yaqin variantni shulardan tanlaydi
   */
  async parse(text: string, options: CargoTextPromptOptions = {}): Promise<CargoTextExtraction> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Cargo text is empty');
      }

      const { data } = await runStructuredExtraction<CargoTextExtraction>({
        label: 'CARGO_TEXT',
        systemPrompt:
          'You are a customs declarant assistant. Extract data exactly as it appears in the message; never invent values.',
        userPrompt: `${buildCargoTextPrompt(options)}\n\nMijoz xabari:\n${text}`,
        zodSchema: cargoTextExtractionSchema,
        responseFormat: CARGO_TEXT_RESPONSE_FORMAT,
      });

      return normalizeCargoExtraction(data, text);
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`Cargo text parsing failed: ${aiError.message}`);
    }
  }
}
