import { analyzeDocument } from '../ai/document.analyzer';
import { ST1Extraction } from '../ai/prompt.builder';
import { handleAIError } from '../utils/error-handler';

/**
 * ST-1 (Certificate of Origin) service for business logic and validation
 * 
 * Uses DocumentAnalyzer to extract ST-1 data
 * Validates extracted fields and applies business rules
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

      // Use AI analyzer to extract structured data
      const structuredData = await analyzeDocument(text, 'ST');

      // Validate and normalize business rules
      return this.validateAndNormalize(structuredData);
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`ST-1 analysis failed: ${aiError.message}`);
    }
  }

  /**
   * Validate and normalize extracted ST-1 data
   * Applies business rules like date format validation, number parsing, etc.
   */
  private validateAndNormalize(data: ST1Extraction): ST1Extraction {
    const normalized: ST1Extraction = { ...data };

    // Validate date format (YYYY-MM-DD)
    if (normalized.st_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalized.st_date)) {
        console.warn(`⚠️  Invalid ST-1 date format: ${normalized.st_date}`);
        // Try to parse and reformat if possible
        const parsed = new Date(normalized.st_date);
        if (!isNaN(parsed.getTime())) {
          normalized.st_date = parsed.toISOString().split('T')[0];
        } else {
          normalized.st_date = null;
        }
      }
    }

    // Ensure quantity is numeric
    if (normalized.quantity_kg !== null && typeof normalized.quantity_kg !== 'number') {
      const parsed = parseFloat(String(normalized.quantity_kg));
      normalized.quantity_kg = isNaN(parsed) ? null : parsed;
    }

    return normalized;
  }
}

