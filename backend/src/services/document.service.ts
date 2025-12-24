import { PrismaClient, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

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
      // pdf-parse is a CommonJS module, handle default export
      const pdfParseFn = (pdfParse as any).default || pdfParse;
      const pdfData = await pdfParseFn(dataBuffer);

      return {
        text: pdfData.text,
        pageCount: pdfData.numpages,
      };
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

    // Store metadata
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
  }

  /**
   * Get extracted text for a document
   * @param taskDocumentId TaskDocument ID
   * @returns Extracted text or null
   */
  async getExtractedText(taskDocumentId: number): Promise<string | null> {
    const metadata = await this.prisma.documentMetadata.findUnique({
      where: { taskDocumentId },
      select: { extractedText: true },
    });

    return metadata?.extractedText || null;
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

