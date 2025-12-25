import { PrismaClient, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// pdf-parse is a CommonJS module
// Try to get the actual function - it might be exported as default or directly
let pdfParseModule: any;
try {
  pdfParseModule = require('pdf-parse');
} catch (e) {
  // Fallback
  pdfParseModule = null;
}

/**
 * Document service for PDF ingestion and text extraction
 */
export class DocumentService {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  /**
   * Extract text from PDF file
   * @param filePath Path to PDF file
   * @returns Extracted text and metadata
   */
  async extractTextFromPdf(filePath: string): Promise<{
    text: string;
    pageCount: number;
  }> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      // Try standard pdf-parse function first (most common)
      if (typeof pdfParseModule === 'function') {
        const pdfData = await pdfParseModule(dataBuffer);
        return {
          text: pdfData.text,
          pageCount: pdfData.numpages,
        };
      }
      
      // Try default export
      if (pdfParseModule?.default && typeof pdfParseModule.default === 'function') {
        const pdfData = await pdfParseModule.default(dataBuffer);
        return {
          text: pdfData.text,
          pageCount: pdfData.numpages,
        };
      }
      
      // Try PDFParse as a function (not a class)
      if (pdfParseModule?.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
        // Check if it's a class (has prototype) or a function
        const isClass = pdfParseModule.PDFParse.prototype && pdfParseModule.PDFParse.prototype.constructor === pdfParseModule.PDFParse;
        
        if (isClass) {
          // It's a class - use new
          const pdfParser = new pdfParseModule.PDFParse({ data: dataBuffer });
          const textResult = await pdfParser.getText();
          await pdfParser.destroy();
          return {
            text: textResult.text,
            pageCount: textResult.total,
          };
        } else {
          // It's a function - call directly
          const pdfData = await pdfParseModule.PDFParse(dataBuffer);
          return {
            text: pdfData.text,
            pageCount: pdfData.numpages,
          };
        }
      }
      
      throw new Error(`PDFParse not found or not callable. Module type: ${typeof pdfParseModule}, Keys: ${pdfParseModule ? Object.keys(pdfParseModule).join(', ') : 'null'}`);
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process uploaded PDF document
   * - Extract text
   * - Store metadata
   * - Link to task document
   * @param taskDocumentId TaskDocument ID
   * @param filePath Path to uploaded PDF file
   */
  async processPdfDocument(
    taskDocumentId: number,
    filePath: string
  ): Promise<void> {
    // Extract text from PDF
    const { text, pageCount } = await this.extractTextFromPdf(filePath);

    // Store metadata - check if table exists first
    try {
      // Try to save metadata directly - if table doesn't exist, it will throw an error
      await this.prisma.documentMetadata.upsert({
        where: { taskDocumentId },
        create: {
          taskDocumentId,
          extractedText: text,
          pageCount,
        },
        update: {
          extractedText: text,
          pageCount,
        },
      });
    } catch (error: any) {
      // Table doesn't exist or other error - log and continue
      // Check for various error codes and messages indicating table doesn't exist
      const isTableMissing = 
        error?.code === 'P2021' || 
        error?.code === 'P2010' ||
        error?.prismaError?.code === '42P01' ||
        error?.message?.includes('does not exist') ||
        error?.message?.includes('не существует') ||
        error?.message?.includes('relation') && error?.message?.includes('does not exist');
      
      if (isTableMissing) {
        console.warn('DocumentMetadata table does not exist, skipping metadata save');
        // Continue without saving metadata - text extraction was successful
      } else {
        // Other error - rethrow
        throw error;
      }
    }
  }

  /**
   * Get extracted text for a document
   * @param taskDocumentId TaskDocument ID
   * @returns Extracted text or null
   */
  async getExtractedText(taskDocumentId: number): Promise<string | null> {
    try {
      const metadata = await this.prisma.documentMetadata.findUnique({
        where: { taskDocumentId },
        select: { extractedText: true },
      });

      return metadata?.extractedText || null;
    } catch (error: any) {
      // Table doesn't exist or other error - return null
      const isTableMissing = 
        error?.code === 'P2021' || 
        error?.code === 'P2010' ||
        error?.prismaError?.code === '42P01' ||
        error?.message?.includes('does not exist') ||
        error?.message?.includes('не существует') ||
        error?.message?.includes('relation') && error?.message?.includes('does not exist');
      
      if (isTableMissing) {
        return null;
      } else {
        // Other error - rethrow
        throw error;
      }
    }
  }

  /**
   * Get all documents of a specific type for a task
   * @param taskId Task ID
   * @param documentType Document type
   * @returns Array of task documents with metadata
   */
  async getDocumentsByType(
    taskId: number,
    documentType: DocumentType
  ): Promise<
    Array<{
      id: number;
      name: string;
      fileUrl: string;
      metadata: { extractedText: string } | null;
      structuredData: { structuredData: any } | null;
    }>
  > {
    const documents = await this.prisma.taskDocument.findMany({
      where: {
        taskId,
        documentType,
      },
      include: {
        metadata: {
          select: { extractedText: true },
        },
        structuredData: {
          select: { structuredData: true },
        },
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      metadata: doc.metadata,
      structuredData: doc.structuredData,
    }));
  }
}

