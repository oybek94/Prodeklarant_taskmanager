import { analyzeDocument } from '../ai/document.analyzer';
import { FitoExtraction } from '../ai/prompt.builder';
import { handleAIError } from '../utils/error-handler';

/**
 * Fito (Phytosanitary Certificate) service for business logic and validation
 *
 * Extraction pipeline (document.analyzer.ts) o'zi strict JSON Schema
 * validatsiya + sana normalizatsiyasini bajaradi — bu yerda qo'shimcha
 * qo'lda normalizatsiya kerak emas.
 */
export class FitoService {
  /**
   * Analyze Fito certificate document text and extract structured data
   *
   * @param text Extracted text from PDF
   * @returns Structured Fito certificate data
   * @throws Error if analysis fails
   */
  async analyze(text: string): Promise<FitoExtraction> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Fito certificate text is empty');
      }

      return (await analyzeDocument(text, 'FITO')) as FitoExtraction;
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`Fito certificate analysis failed: ${aiError.message}`);
    }
  }
}
