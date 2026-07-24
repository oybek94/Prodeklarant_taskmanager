import {
  buildInvoiceExtractionPrompt,
  buildST1ExtractionPrompt,
  buildFitoPrompt,
  buildCmrExtractionPrompt,
  buildTirExtractionPrompt,
  InvoiceExtraction,
  ST1Extraction,
} from './prompt.builder';
import {
  EXTRACTION_SCHEMAS,
  ExtractionError,
  ExtractableDocType,
  AnyExtraction,
  invoiceExtractionSchema,
  st1ExtractionSchema,
} from './extraction.schemas';
import { normalizeExtraction } from './normalizers';
import { validateInvoiceWithST } from './rule-engine';
import { runStructuredExtraction, DEFAULT_EXTRACTION_TIMEOUT } from './structured-extractor';

const DEFAULT_TIMEOUT = DEFAULT_EXTRACTION_TIMEOUT;

function promptFor(documentType: ExtractableDocType): string {
  switch (documentType) {
    case 'INVOICE':
      return buildInvoiceExtractionPrompt();
    case 'ST':
      return buildST1ExtractionPrompt();
    case 'FITO':
      return buildFitoPrompt();
    case 'CMR':
      return buildCmrExtractionPrompt();
    case 'TIR':
      return buildTirExtractionPrompt();
  }
}

export interface ExtractionOutcome {
  data: AnyExtraction;
  /** true — birinchi javob schema'dan o'tmadi va repair-so'rov kerak bo'ldi */
  repairUsed: boolean;
}

/**
 * Analyze document text and extract structured data (Stage 1).
 *
 * OpenAI structured outputs (strict JSON Schema) + Zod validatsiya ishlatiladi.
 * Birinchi javob schema'dan o'tmasa, xatolar bilan BITTA repair-so'rov
 * yuboriladi; ikkinchisi ham o'tmasa typed ExtractionError tashlanadi —
 * caller buni yutmasdan NEEDS_REVIEW sifatida qayd etishi kerak.
 */
export async function analyzeDocumentDetailed(
  text: string,
  documentType: ExtractableDocType,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ExtractionOutcome> {
  const startTime = Date.now();

  if (!text || text.trim().length === 0) {
    throw new ExtractionError('Document text is empty', 'EMPTY_RESPONSE');
  }

  const { zodSchema, responseFormat } = EXTRACTION_SCHEMAS[documentType];
  const prompt = promptFor(documentType);

  console.log(`[AI] Analyzing ${documentType} document (text length: ${text.length} chars)`);

  const { data: extracted, repairUsed } = await runStructuredExtraction<AnyExtraction>({
    label: documentType,
    systemPrompt:
      'You are a customs document extraction assistant. Extract data exactly as it appears in the document; never invent values.',
    userPrompt: `${prompt}\n\nDocument text:\n${text}`,
    zodSchema,
    responseFormat,
    timeout,
  });

  const data = normalizeExtraction(extracted, documentType);
  const duration = Date.now() - startTime;
  console.log(
    `[AI] ${documentType} analysis completed in ${duration}ms${repairUsed ? ' (repair used)' : ''}`
  );
  return { data, repairUsed };
}

/**
 * Back-compat wrapper: faqat extraction natijasini qaytaradi.
 */
export async function analyzeDocument(
  text: string,
  documentType: ExtractableDocType,
  timeout: number = DEFAULT_TIMEOUT
): Promise<AnyExtraction> {
  const { data } = await analyzeDocumentDetailed(text, documentType, timeout);
  return data;
}

/**
 * Compare Invoice and ST-1 documents using TWO-STAGE ARCHITECTURE
 *
 * STAGE 1: Extract structured data from both documents (AI extraction only)
 * STAGE 2: Validate using deterministic rule engine (NO AI)
 *
 * Oldindan tayyor structured data berilsa Zod orqali tekshiriladi;
 * schema'dan o'tmasa (eski format va h.k.) matndan qayta extraction qilinadi.
 */
export async function compareInvoiceST1(
  invoiceText: string,
  invoiceStructured: InvoiceExtraction | null,
  st1Text: string,
  st1Structured: ST1Extraction | null,
  timeout: number = DEFAULT_TIMEOUT
) {
  const startTime = Date.now();

  try {
    if (!invoiceText || invoiceText.trim().length === 0) {
      throw new Error('Invoice text is empty');
    }
    if (!st1Text || st1Text.trim().length === 0) {
      throw new Error('ST-1 text is empty');
    }

    console.log(`[Two-Stage] Starting Invoice-ST1 comparison`);

    // ==================== STAGE 1: AI EXTRACTION ONLY ====================
    let invoiceData: InvoiceExtraction;
    const invoiceCheck = invoiceExtractionSchema.safeParse(invoiceStructured);
    if (invoiceCheck.success) {
      invoiceData = normalizeExtraction(invoiceCheck.data, 'INVOICE') as InvoiceExtraction;
      console.log(`[Two-Stage] Using provided invoice structured data (${invoiceData.products.length} products)`);
    } else {
      console.log(`[Two-Stage] Extracting invoice data from text...`);
      invoiceData = (await analyzeDocument(invoiceText, 'INVOICE', timeout)) as InvoiceExtraction;
    }

    let st1Data: ST1Extraction;
    const st1Check = st1ExtractionSchema.safeParse(st1Structured);
    if (st1Check.success) {
      st1Data = normalizeExtraction(st1Check.data, 'ST') as ST1Extraction;
      console.log(`[Two-Stage] Using provided ST-1 structured data`);
    } else {
      console.log(`[Two-Stage] Extracting ST-1 data from text...`);
      st1Data = (await analyzeDocument(st1Text, 'ST', timeout)) as ST1Extraction;
    }

    // ==================== STAGE 2: DETERMINISTIC RULE ENGINE ====================
    console.log(`[Two-Stage] Running rule engine validation...`);
    const validationResult = validateInvoiceWithST(invoiceData, st1Data);

    const result = {
      status: validationResult.status === 'XATO' ? ('XATO' as const) : ('OK' as const),
      errors: validationResult.errors,
    };

    const duration = Date.now() - startTime;
    console.log(
      `[Two-Stage] Comparison completed in ${duration}ms (status: ${result.status}, errors: ${result.errors.length})`
    );

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Two-Stage] Comparison failed after ${duration}ms:`, error);

    throw new Error(
      `Document comparison failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
