import { PrismaClient, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { analyzeDocument, compareInvoiceST1 } from '../ai/document.analyzer';
import { InvoiceExtraction, ST1Extraction } from '../ai/prompt.builder';
import { ExtractableDocType } from '../ai/extraction.schemas';

/**
 * AI service for document structuring and comparison
 *
 * Extraction endi document.analyzer.ts dagi yagona pipeline orqali bajariladi
 * (strict JSON Schema + repair-retry + normalizatsiya) — bu yerda alohida
 * prompt/parsing yo'q.
 */
export class AiService {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  /**
   * Structure document text into JSON using AI
   * @param text Extracted text from PDF
   * @param documentType Document type
   * @returns Structured JSON data
   */
  async structureDocument(
    text: string,
    documentType: DocumentType
  ): Promise<InvoiceExtraction | ST1Extraction> {
    const extractable: ExtractableDocType = documentType === 'INVOICE' ? 'INVOICE' : 'ST';
    const structured = await analyzeDocument(text, extractable);
    return structured as InvoiceExtraction | ST1Extraction;
  }

  /**
   * Process document: extract text, structure with AI, save to DB
   * @param taskDocumentId TaskDocument ID
   * @param documentType Document type
   * @param extractedText Extracted text from PDF
   */
  async processDocument(
    taskDocumentId: number,
    taskId: number,
    documentType: DocumentType,
    extractedText: string
  ): Promise<void> {
    // Structure document with AI
    const structuredData = await this.structureDocument(
      extractedText,
      documentType
    );

    // Save structured data
    await this.prisma.structuredDocument.upsert({
      where: { taskDocumentId },
      create: {
        taskDocumentId,
        taskId,
        documentType,
        structuredData: structuredData as unknown as Prisma.InputJsonValue,
      },
      update: {
        structuredData: structuredData as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Run Invoice-ST comparison check
   * @param taskId Task ID
   * @returns Comparison findings
   */
  async runInvoiceStComparison(taskId: number): Promise<{
    result: 'PASS' | 'FAIL';
    findings: Array<{
      field: string;
      invoice_value: string;
      st_value: string;
      severity: 'critical' | 'warning';
      explanation: string;
    }>;
  }> {
    // Get Invoice and ST documents
    const invoiceDocs = await this.prisma.taskDocument.findFirst({
      where: {
        taskId,
        documentType: 'INVOICE',
      },
      include: {
        metadata: true,
        structuredData: true,
      },
    });

    const stDocs = await this.prisma.taskDocument.findFirst({
      where: {
        taskId,
        documentType: 'ST',
      },
      include: {
        metadata: true,
        structuredData: true,
      },
    });

    if (!invoiceDocs || !invoiceDocs.metadata) {
      throw new Error('Invoice document or extracted text not found');
    }

    if (!stDocs || !stDocs.metadata) {
      throw new Error('ST document or extracted text not found');
    }

    // compareInvoiceST1 structured data'ni Zod orqali tekshiradi;
    // schema'dan o'tmasa (eski format) matndan qayta extraction qiladi.
    const comparisonResult = await compareInvoiceST1(
      invoiceDocs.metadata.extractedText,
      (invoiceDocs.structuredData?.structuredData ?? null) as InvoiceExtraction | null,
      stDocs.metadata.extractedText,
      (stDocs.structuredData?.structuredData ?? null) as ST1Extraction | null
    );

    // Determine result: FAIL if status is XATO, otherwise PASS
    const result: 'PASS' | 'FAIL' = (comparisonResult.status === 'XATO') ? 'FAIL' : 'PASS';

    // Convert to legacy findings format for backward compatibility
    const findings = comparisonResult.errors.map((error) => ({
      field: error.field,
      invoice_value: error.invoice,
      st_value: error.st,
      severity: 'critical' as const,
      explanation: error.description,
    }));

    // Save AI check result
    await this.prisma.aiCheck.create({
      data: {
        taskId,
        checkType: 'INVOICE_ST',
        result,
        details: comparisonResult as unknown as Prisma.InputJsonValue,
      },
    });

    return { result, findings };
  }
}
