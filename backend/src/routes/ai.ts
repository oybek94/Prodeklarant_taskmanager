import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { InvoiceService } from '../services/invoice.service';
import { ST1Service } from '../services/st1.service';
import { FitoService } from '../services/fito.service';
import { compareInvoiceST1 } from '../ai/document.analyzer';
import { InvoiceExtraction, ST1Extraction, ComparisonResult } from '../ai/prompt.builder';

const router = Router();

// Validation schemas
const analyzeInvoiceSchema = z.object({
  text: z.string().min(1, 'Document text is required'),
});

const analyzeST1Schema = z.object({
  text: z.string().min(1, 'Document text is required'),
});

const analyzeFitoSchema = z.object({
  text: z.string().min(1, 'Document text is required'),
});

const compareInvoiceST1Schema = z.object({
  invoiceText: z.string().min(1, 'Invoice text is required'),
  st1Text: z.string().min(1, 'ST-1 text is required'),
  invoiceStructured: z.any().optional(),
  st1Structured: z.any().optional(),
});

/**
 * POST /api/ai/analyze/invoice
 * Analyze invoice document text and extract structured data
 * 
 * Security: Requires authentication, never exposes OpenAI API key
 */
router.post(
  '/analyze/invoice',
  requireAuth(),
  async (req: AuthRequest, res) => {
    try {
      // Validate request
      const parsed = analyzeInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { text } = parsed.data;

      // Analyze invoice
      const invoiceService = new InvoiceService();
      const structuredData = await invoiceService.analyze(text);

      res.json({
        success: true,
        data: structuredData,
      });
    } catch (error: any) {
      console.error('[AI Route] Invoice analysis error:', error);
      res.status(500).json({
        error: error.message || 'Failed to analyze invoice document',
      });
    }
  }
);

/**
 * POST /api/ai/analyze/st1
 * Analyze ST-1 (Certificate of Origin) document text and extract structured data
 * 
 * Security: Requires authentication, never exposes OpenAI API key
 */
router.post(
  '/analyze/st1',
  requireAuth(),
  async (req: AuthRequest, res) => {
    try {
      // Validate request
      const parsed = analyzeST1Schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { text } = parsed.data;

      // Analyze ST-1
      const st1Service = new ST1Service();
      const structuredData = await st1Service.analyze(text);

      res.json({
        success: true,
        data: structuredData,
      });
    } catch (error: any) {
      console.error('[AI Route] ST-1 analysis error:', error);
      res.status(500).json({
        error: error.message || 'Failed to analyze ST-1 document',
      });
    }
  }
);

/**
 * POST /api/ai/analyze/fito
 * Analyze Fito (Phytosanitary Certificate) document text and extract structured data
 * 
 * Security: Requires authentication, never exposes OpenAI API key
 */
router.post(
  '/analyze/fito',
  requireAuth(),
  async (req: AuthRequest, res) => {
    try {
      // Validate request
      const parsed = analyzeFitoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { text } = parsed.data;

      // Analyze Fito certificate
      const fitoService = new FitoService();
      const structuredData = await fitoService.analyze(text);

      res.json({
        success: true,
        data: structuredData,
      });
    } catch (error: any) {
      console.error('[AI Route] Fito analysis error:', error);
      res.status(500).json({
        error: error.message || 'Failed to analyze Fito certificate',
      });
    }
  }
);

/**
 * POST /api/ai/compare/invoice-st1
 * Compare Invoice and ST-1 documents for consistency
 * 
 * Security: Requires authentication, never exposes OpenAI API key
 */
router.post(
  '/compare/invoice-st1',
  requireAuth(),
  async (req: AuthRequest, res) => {
    try {
      // Validate request
      const parsed = compareInvoiceST1Schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { invoiceText, st1Text, invoiceStructured, st1Structured } = parsed.data;

      // Compare documents (strict mode - only real mismatches)
      const result = await compareInvoiceST1(
        invoiceText,
        invoiceStructured as InvoiceExtraction | null,
        st1Text,
        st1Structured as ST1Extraction | null
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[AI Route] Comparison error:', error);
      res.status(500).json({
        error: error.message || 'Failed to compare documents',
      });
    }
  }
);

export default router;

