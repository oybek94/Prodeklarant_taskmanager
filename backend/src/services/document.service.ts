import { PrismaClient, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import OpenAIClient from '../ai/openai.client';

// pdf-parse is a CommonJS module
// Try to get the actual function - it might be exported as default or directly
let pdfParseModule: any;
try {
  pdfParseModule = require('pdf-parse');
} catch (e) {
  // Fallback
  pdfParseModule = null;
}

function ocrModel(): string {
  return process.env.OPENAI_OCR_MODEL ?? 'gpt-4o';
}

/**
 * PDF/rasm hujjatlaridan matnni OCR qilish uchun Vision prompt.
 * Bojxona hujjatlari (invoys, ST-1, CMR, TIR, fito) ko'pincha skanerlangan
 * bo'ladi va rus (kirill), o'zbek, ingliz matni + jadvallarni o'z ichiga oladi.
 */
const DOCUMENT_OCR_PROMPT = `Extract ALL text from this customs/trade document exactly as it appears. It may be an invoice, ST-1 certificate of origin, CMR, TIR carnet, or phytosanitary certificate, and may contain Russian (Cyrillic), Uzbek, and English text, tables, stamps, numbers, dates, names and addresses.

Rules:
- Output the raw transcribed text ONLY. Do NOT summarize, translate, explain, or add any commentary or markdown fences.
- Preserve the document's reading order and structure. Keep each table row on its own line and separate columns with spaces/tabs so the layout is recoverable.
- Transcribe every number, code, date, weight, and quantity precisely — do not round or reformat them.
- Do not invent or guess text that is not visible. If a fragment is unreadable, write [unreadable] in its place.`;

/**
 * Document service for PDF ingestion and text extraction
 *
 * MUHIM: OCR natijasi XOM holicha saqlanadi — hech qanday qo'lda yozilgan
 * filtr/format heuristikasi qo'llanmaydi. Strukturani ajratish Stage 1
 * (document.analyzer.ts, strict JSON Schema) zimmasida.
 */
export class DocumentService {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  /** Singleton OpenAI client (120s timeout bilan) */
  private getOpenAI(): OpenAI {
    return OpenAIClient.getClient();
  }

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
   * Extract text from JPG/JPEG image using OpenAI Vision API
   * @param filePath Path to image file
   * @returns Extracted text
   */
  async extractTextFromImage(filePath: string): Promise<string> {
    try {
      // Read image file and convert to base64
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');

      // Determine MIME type from file extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

      // PDF yo'li bilan bir xil kuchli OCR prompt + deterministik sozlamalar
      const response = await this.getOpenAI().chat.completions.create({
        model: ocrModel(),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: DOCUMENT_OCR_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 8192,
      });

      const extractedText = response.choices[0]?.message?.content || '';

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text extracted from image');
      }

      return extractedText;
    } catch (error) {
      throw new Error(
        `Image text extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * PDF'dan matnni OpenAI Vision orqali ajratish (OCR).
   *
   * MUHIM: pdf-parse faqat PDF ichidagi tayyor matn qatlamini o'qiydi. Skanerlangan
   * yoki shrifti buzuq (ToUnicode CMap yo'q) hujjatlarda u "gibberish" qaytaradi
   * (masalan: "O(X) OP {)RCr\\Nl(l"), bu esa AI extractor'ga berilib noto'g'ri
   * tekshiruv natijasiga olib keladi. Vision esa PDF sahifalarini rasm sifatida
   * ko'radi va haqiqiy OCR qiladi, shu bilan skanerlangan hujjatlarni ham to'g'ri o'qiydi.
   *
   * @param filePath PDF fayl yo'li
   * @returns Ajratilgan matn va sahifalar soni
   */
  async extractTextFromPdfViaVision(filePath: string): Promise<{
    text: string;
    pageCount: number;
  }> {
    const dataBuffer = await fs.readFile(filePath);
    const base64Pdf = dataBuffer.toString('base64');
    const filename = path.basename(filePath);

    const response = await this.getOpenAI().chat.completions.create({
      model: ocrModel(),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: {
                filename,
                file_data: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
            {
              type: 'text',
              text: DOCUMENT_OCR_PROMPT,
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 8192,
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    if (!text) {
      throw new Error('No text extracted from PDF via Vision');
    }

    // Sahifalar sonini pdf-parse'dan olishga urinamiz (u matnsiz ham sahifa
    // daraxtini to'g'ri sanaydi). Ishlamasa, standart 1 sahifa.
    let pageCount = 1;
    try {
      const parsed = await this.extractTextFromPdf(filePath);
      pageCount = parsed.pageCount || 1;
    } catch {
      // pdf-parse ishlamasa e'tiborsiz qoldiramiz — matn Vision'dan olindi
    }

    return { text, pageCount };
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
    // PDF matnini OpenAI Vision OCR orqali ajratamiz. pdf-parse
    // skanerlangan/buzuq shriftli PDFlarda gibberish qaytaradi va noto'g'ri
    // tekshiruvga sabab bo'ladi. Vision ishlamasa (kalit yo'q / API xatosi),
    // ma'lumot yo'qolmasligi uchun pdf-parse'ga qaytamiz.
    let text: string;
    let pageCount: number;
    try {
      ({ text, pageCount } = await this.extractTextFromPdfViaVision(filePath));
    } catch (error) {
      console.warn(
        `[PDF] Vision OCR ishlamadi, pdf-parse'ga qaytilmoqda: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      ({ text, pageCount } = await this.extractTextFromPdf(filePath));
    }

    await this.saveMetadata(taskDocumentId, text, pageCount);
  }

  /**
   * Process uploaded JPG/JPEG image document
   * - Extract text using OCR (OpenAI Vision API)
   * - Store metadata
   * - Link to task document
   * @param taskDocumentId TaskDocument ID
   * @param filePath Path to uploaded image file
   */
  async processImageDocument(
    taskDocumentId: number,
    filePath: string
  ): Promise<void> {
    const text = await this.extractTextFromImage(filePath);
    await this.saveMetadata(taskDocumentId, text, 1);
  }

  /**
   * Ajratilgan matnni DocumentMetadata'ga saqlash.
   * Jadval yo'qligi / FK poygasi kabi holatlarda yuklash oqimini buzmaydi.
   */
  private async saveMetadata(
    taskDocumentId: number,
    text: string,
    pageCount: number
  ): Promise<void> {
    try {
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
      // Check for foreign key constraint error
      if (error?.code === 'P2003' || error?.code === '23503') {
        // TaskDocument tranzaksiyasi hali commit bo'lmagan bo'lishi mumkin — bir marta qayta urinamiz
        try {
          const taskDocument = await this.prisma.taskDocument.findUnique({
            where: { id: taskDocumentId },
            select: { id: true },
          });

          if (!taskDocument) {
            throw new Error(`TaskDocument with id ${taskDocumentId} does not exist`);
          }

          console.warn(`Foreign key constraint failed for taskDocumentId ${taskDocumentId}, retrying...`);
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
        } catch (retryError: any) {
          // If retry also fails, log and continue (text extraction was successful)
          console.error(`Failed to save metadata for taskDocumentId ${taskDocumentId}:`, retryError.message);
          // Don't throw - text extraction was successful, metadata can be saved later
        }
        return;
      }

      // Table doesn't exist or other error - log and continue
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
