import { analyzeDocument } from '../ai/document.analyzer';
import { InvoiceExtraction } from '../ai/prompt.builder';
import { handleAIError } from '../utils/error-handler';

/**
 * Invoice service for business logic and validation
 * 
 * Uses DocumentAnalyzer to extract invoice data
 * Validates extracted fields and applies business rules
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

      // Use AI analyzer to extract structured data
      const structuredData = await analyzeDocument(text, 'INVOICE');

      // Validate and normalize business rules
      return this.validateAndNormalize(structuredData as any);
    } catch (error) {
      const aiError = handleAIError(error);
      throw new Error(`Invoice analysis failed: ${aiError.message}`);
    }
  }

  /**
   * Validate and normalize extracted invoice data
   * Applies business rules like date format validation, number parsing, etc.
   */
  private validateAndNormalize(data: InvoiceExtraction): InvoiceExtraction {
    const normalized: InvoiceExtraction = { ...data };

    // Validate date format (YYYY-MM-DD)
    if (normalized.invoice_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalized.invoice_date)) {
        console.warn(`⚠️  Invalid invoice date format: ${normalized.invoice_date}`);
        // Try to parse and reformat if possible
        const parsed = new Date(normalized.invoice_date);
        if (!isNaN(parsed.getTime())) {
          normalized.invoice_date = parsed.toISOString().split('T')[0];
        } else {
          normalized.invoice_date = null;
        }
      }
    }

    // Normalize products array
    if (normalized.products && Array.isArray(normalized.products)) {
      normalized.products = normalized.products.map((product) => ({
        name: product.name || '',
        package_count: typeof product.package_count === 'number' ? product.package_count : null,
        gross_weight: typeof product.gross_weight === 'number' ? product.gross_weight : null,
        net_weight: typeof product.net_weight === 'number' ? product.net_weight : null,
      }));
    } else {
      // Ensure products array exists
      normalized.products = [];
    }

    return normalized;
  }
}

