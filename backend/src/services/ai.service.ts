import OpenAI from 'openai';
import { PrismaClient, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * AI service for document structuring and comparison
 */
export class AiService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaClient | Prisma.TransactionClient,
    apiKey?: string
  ) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
    });
  }

  // AI Prompts as constants
  private readonly INVOICE_STRUCTURE_PROMPT = `Extract the following information from the invoice text and return ONLY valid JSON (no markdown, no explanations):

{
  "invoice_number": string,
  "invoice_date": string (YYYY-MM-DD format),
  "seller": string,
  "buyer": string,
  "product": string,
  "quantity_kg": number,
  "price": number,
  "delivery_term": string
}

If any field is not found, use null. Return ONLY the JSON object.`;

  private readonly ST_STRUCTURE_PROMPT = `Extract the following information from the ST (Certificate of Origin) text and return ONLY valid JSON (no markdown, no explanations):

{
  "st_number": string,
  "st_date": string (YYYY-MM-DD format),
  "exporter": string,
  "importer": string,
  "product": string,
  "origin_country": string,
  "quantity_kg": number
}

If any field is not found, use null. Return ONLY the JSON object.`;

  private readonly COMPARISON_PROMPT = `Compare Invoice and ST documents. Check for:
1. Product name consistency
2. Quantity (allow 5% tolerance)
3. Exporter/Seller name match
4. Importer/Buyer name match
5. Delivery term consistency
6. Date logical consistency (invoice date should be before or equal to ST date)

Return ONLY a JSON array of findings:
[
  {
    "field": string,
    "invoice_value": any,
    "st_value": any,
    "severity": "critical" | "warning",
    "explanation": string
  }
]

If no issues found, return empty array [].`;

  /**
   * Structure document text into JSON using AI
   * @param text Extracted text from PDF
   * @param documentType Document type (INVOICE or ST)
   * @returns Structured JSON data
   */
  async structureDocument(
    text: string,
    documentType: DocumentType
  ): Promise<any> {
    const prompt =
      documentType === 'INVOICE'
        ? this.INVOICE_STRUCTURE_PROMPT
        : this.ST_STRUCTURE_PROMPT;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are a document extraction assistant. Return ONLY valid JSON, no markdown, no explanations.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nDocument text:\n${text}`,
          },
        ],
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI response is empty');
      }

      // Remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Parse JSON response
      const structured = JSON.parse(cleanedContent);
      return structured;
    } catch (error) {
      throw new Error(
        `AI structuring failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compare Invoice and ST documents using AI
   * @param invoiceText Invoice extracted text
   * @param invoiceStructured Invoice structured data
   * @param stText ST extracted text
   * @param stStructured ST structured data
   * @returns Array of comparison findings
   */
  async compareDocuments(
    invoiceText: string,
    invoiceStructured: any,
    stText: string,
    stStructured: any
  ): Promise<
    Array<{
      field: string;
      invoice_value: any;
      st_value: any;
      severity: 'critical' | 'warning';
      explanation: string;
    }>
  > {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a document comparison assistant. Return ONLY valid JSON array, no markdown, no explanations.',
          },
          {
            role: 'user',
            content: `${this.COMPARISON_PROMPT}\n\nInvoice structured data:\n${JSON.stringify(invoiceStructured, null, 2)}\n\nST structured data:\n${JSON.stringify(stStructured, null, 2)}`,
          },
        ],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('AI response is empty');
      }

      // Remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanedContent);
      // Handle different response formats
      let findings: any[] = [];
      
      if (Array.isArray(parsed)) {
        findings = parsed;
      } else if (parsed.findings && Array.isArray(parsed.findings)) {
        findings = parsed.findings;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        findings = parsed.results;
      } else if (typeof parsed === 'object') {
        // Try to find array values
        const values = Object.values(parsed);
        const arrayValue = values.find((v) => Array.isArray(v));
        if (arrayValue) {
          findings = arrayValue as any[];
        }
      }

      return findings;
    } catch (error) {
      throw new Error(
        `AI comparison failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
        structuredData,
      },
      update: {
        structuredData,
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
      invoice_value: any;
      st_value: any;
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

    if (!invoiceDocs || !invoiceDocs.metadata || !invoiceDocs.structuredData) {
      throw new Error('Invoice document or structured data not found');
    }

    if (!stDocs || !stDocs.metadata || !stDocs.structuredData) {
      throw new Error('ST document or structured data not found');
    }

    // Run AI comparison
    const findings = await this.compareDocuments(
      invoiceDocs.metadata.extractedText,
      invoiceDocs.structuredData.structuredData,
      stDocs.metadata.extractedText,
      stDocs.structuredData.structuredData
    );

    // Determine result: FAIL if any critical errors, otherwise PASS
    const hasCriticalErrors = findings.some((f) => f.severity === 'critical');
    const result: 'PASS' | 'FAIL' = hasCriticalErrors ? 'FAIL' : 'PASS';

    // Save AI check result
    await this.prisma.aiCheck.create({
      data: {
        taskId,
        checkType: 'INVOICE_ST',
        result: hasCriticalErrors ? 'FAIL' : 'PASS',
        details: { findings },
      },
    });

    return { result, findings };
  }
}

