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
      // Type assertion: analyzeDocument with 'ST' always returns ST1Extraction
      return this.validateAndNormalize(structuredData as ST1Extraction);
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
    const normalized: any = { ...data };

    // Validate date format (YYYY-MM-DD) - if certification_date exists
    if (normalized.certification_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalized.certification_date)) {
        console.warn(`⚠️  Invalid ST-1 date format: ${normalized.certification_date}`);
        // Try to parse and reformat if possible
        const parsed = new Date(normalized.certification_date);
        if (!isNaN(parsed.getTime())) {
          normalized.certification_date = parsed.toISOString().split('T')[0];
        } else {
          normalized.certification_date = null;
        }
      }
    }

    // Normalize products weights if needed
    if (normalized.products && Array.isArray(normalized.products)) {
      normalized.products = normalized.products.map((product: any) => {
        if (product.gross_weight !== null && typeof product.gross_weight !== 'number') {
          const parsed = parseFloat(String(product.gross_weight));
          product.gross_weight = isNaN(parsed) ? null : parsed;
        }
        if (product.net_weight !== null && typeof product.net_weight !== 'number') {
          const parsed = parseFloat(String(product.net_weight));
          product.net_weight = isNaN(parsed) ? null : parsed;
        }
        return product;
      });
    }

    return normalized as ST1Extraction;
  }
}

