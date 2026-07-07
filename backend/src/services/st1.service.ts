import { analyzeDocument } from '../ai/document.analyzer';
import { ST1Extraction } from '../ai/prompt.builder';
import { handleAIError } from '../utils/error-handler';

/**
 * ST-1 (Certificate of Origin) service for business logic and validation
 *
 * Extraction pipeline (document.analyzer.ts) o'zi strict JSON Schema
 * validatsiya + sana normalizatsiyasini bajaradi — bu yerda qo'shimcha
 * qo'lda normalizatsiya kerak emas.
 */
export class ST1Service {
  /**
   * Analyze ST-1 document text and extract structured data
   *
   * @param text Extracted text from PDF
   * @returns Structured ST-1 data
   * @throws Error if analysis fails
   */
  async analyze(text: string): Promise<ST1Extraction> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('ST-1 text is empty');
      }

      return (await analyzeDocument(text, 'ST')) as ST1Extraction;
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`ST-1 analysis failed: ${aiError.message}`);
    }
  }
}
