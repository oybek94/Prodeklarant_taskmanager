import { analyzeDocument } from '../ai/document.analyzer';
import { InvoiceExtraction } from '../ai/prompt.builder';
import { handleAIError } from '../utils/error-handler';

/**
 * Invoice service for business logic and validation
 *
 * Extraction pipeline (document.analyzer.ts) o'zi strict JSON Schema
 * validatsiya + sana/valyuta normalizatsiyasini bajaradi — bu yerda
 * qo'shimcha qo'lda normalizatsiya kerak emas.
 */
export class InvoiceService {
  /**
   * Analyze invoice document text and extract structured data
   *
   * @param text Extracted text from PDF
   * @returns Structured invoice data
   * @throws Error if analysis fails
   */
  async analyze(text: string): Promise<InvoiceExtraction> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Invoice text is empty');
      }

      return (await analyzeDocument(text, 'INVOICE')) as InvoiceExtraction;
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`Invoice analysis failed: ${aiError.message}`);
    }
  }
}
