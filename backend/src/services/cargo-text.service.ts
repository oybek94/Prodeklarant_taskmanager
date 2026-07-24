import { buildCargoTextPrompt } from '../ai/cargo-text.prompt';
import {
  cargoTextExtractionSchema,
  CARGO_TEXT_RESPONSE_FORMAT,
  CargoTextExtraction,
} from '../ai/cargo-text.schema';
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
   * @param deliveryTermsOptions Shartnomadagi "Условия поставки" variantlari —
   *   AI eng yaqinini shu ro'yxatdan tanlaydi
   */
  async parse(text: string, deliveryTermsOptions: string[] = []): Promise<CargoTextExtraction> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Cargo text is empty');
      }

      const { data } = await runStructuredExtraction<CargoTextExtraction>({
        label: 'CARGO_TEXT',
        systemPrompt:
          'You are a customs declarant assistant. Extract data exactly as it appears in the message; never invent values.',
        userPrompt: `${buildCargoTextPrompt(deliveryTermsOptions)}\n\nMijoz xabari:\n${text}`,
        zodSchema: cargoTextExtractionSchema,
        responseFormat: CARGO_TEXT_RESPONSE_FORMAT,
      });

      return data;
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`Cargo text parsing failed: ${aiError.message}`);
    }
  }
}
