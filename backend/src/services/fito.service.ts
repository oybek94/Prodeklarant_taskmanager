import { analyzeDocument } from '../ai/document.analyzer';
import { FitoExtraction } from '../ai/prompt.builder';
import { handleAIError } from '../utils/error-handler';

/**
 * Fito (Phytosanitary Certificate) service for business logic and validation
 * 
 * Uses DocumentAnalyzer to extract Fito certificate data
 * Validates extracted fields and applies business rules
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

      // Use AI analyzer to extract structured data
      const structuredData = await analyzeDocument(text, 'FITO');

      // Validate and normalize business rules
      return this.validateAndNormalize(structuredData);
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`Fito certificate analysis failed: ${aiError.message}`);
    }
  }

  /**
   * Validate and normalize extracted Fito certificate data
   * Applies business rules like date format validation, etc.
   */
  private validateAndNormalize(data: FitoExtraction): FitoExtraction {
    const normalized: FitoExtraction = { ...data };

    // Validate date format (YYYY-MM-DD)
    if (normalized.issue_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalized.issue_date)) {
        console.warn(`⚠️  Invalid Fito certificate date format: ${normalized.issue_date}`);
        // Try to parse and reformat if possible
        const parsed = new Date(normalized.issue_date);
        if (!isNaN(parsed.getTime())) {
          normalized.issue_date = parsed.toISOString().split('T')[0];
        } else {
          normalized.issue_date = null;
        }
      }
    }

    return normalized;
  }
}

