import { PrismaClient, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

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
  private openai: OpenAI | null = null;

  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {
    // Initialize OpenAI client for OCR (JPG/JPEG images)
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
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
   * Filter invoice extracted text to keep only relevant information
   * Removes unnecessary parts like headers, bank details, signatures, etc.
   * 
   * KEEPS ONLY:
   * - Продавец (Seller) name and address (NO bank details, ИНН, etc.)
   * - Инвойс No. and date
   * - Контракт No. and date
   * - Покупатель (Buyer) name and address (NO bank details, ИНН, etc.)
   * - Грузополучатель (Consignee) name and address (NO bank details, ИНН, etc.)
   * - Место таможни (Customs place)
   * - Условия поставки (Delivery terms)
   * - № автотранспорт (Vehicle number)
   * - Products table (formatted)
   * 
   * REMOVES:
   * - INVOICE, НАКЛАДНАЯ СЧЕТ-ФАКТУРА headers
   * - ИНН, Банковские реквизиты, all bank details
   * - Дополнительная информация
   * - Происхождение товара
   * - Сумма прописью
   * - Особые примечания
   * - Директор, Товар отпустил (signatures)
   * - [URGANCH FRUITS SEAL]
   * - All other unnecessary information
   * 
   * @param text Raw extracted text from invoice
   * @returns Filtered text with only relevant information
   */
  private filterInvoiceExtractedText(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }

    const lines = text.split('\n');
    const filteredLines: string[] = [];
    let skipMode = false;
    let inBankSection = false;
    let inSpecialNotes = false;
    let inProductTable = false;
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      // Skip empty lines at the beginning
      if (filteredLines.length === 0 && !line) {
        continue;
      }

      // Skip document headers
      if (lowerLine === 'invoice' || 
          lowerLine.includes('накладная счет-фактура') ||
          (lowerLine.includes('invoice') && filteredLines.length === 0)) {
        continue;
      }

      // Detect and skip bank details section
      if (lowerLine.includes('инн:') || 
          lowerLine.includes('банковские реквизиты') ||
          (lowerLine.includes('банк') && !lowerLine.includes('грузополучатель'))) {
        inBankSection = true;
        skipMode = true;
        continue;
      }

      // Skip bank-related lines
      if (inBankSection && (
          lowerLine.includes('расчетный счет') ||
          lowerLine.includes('валютный счет') ||
          lowerLine.includes('мфо:') ||
          lowerLine.includes('swift:') ||
          lowerLine.includes('кпп') ||
          lowerLine.includes('оргн') ||
          lowerLine.includes('р/с') ||
          lowerLine.includes('корр.счет') ||
          lowerLine.includes('бик') ||
          lowerLine.includes('наименование юр.лица') ||
          lowerLine.includes('raiffeisen') ||
          lowerLine.includes('international ag'))) {
        continue;
      }

      // Stop bank section when we see important sections
      if (inBankSection && (
          lowerLine.includes('инвойс no.') || 
          lowerLine.includes('контракт no.') ||
          lowerLine.includes('продавец:') ||
          lowerLine.includes('покупатель:') ||
          lowerLine.includes('грузополучатель:') ||
          lowerLine.match(/^\d+\s*\|/))) { // Product table row
        inBankSection = false;
        skipMode = false;
      }

      // Skip if in skip mode (for other skip sections)
      if (skipMode && !inBankSection) {
        // Check if we should stop skipping
        if (lowerLine.includes('инвойс no.') || 
            lowerLine.includes('контракт no.') ||
            lowerLine.includes('продавец:') ||
            lowerLine.includes('покупатель:') ||
            lowerLine.includes('грузополучатель:') ||
            lowerLine.includes('место таможни') ||
            lowerLine.includes('условия поставки') ||
            lowerLine.includes('№ автотранспорт') ||
            lowerLine.match(/^\d+\s*\|/)) { // Product table row
          skipMode = false;
        } else {
          continue;
        }
      }

      // Skip additional information sections
      if (lowerLine.includes('дополнительная информация')) {
        skipMode = true;
        continue;
      }

      // Skip origin information
      if (lowerLine.includes('происхождение товара') ||
          (lowerLine.includes('республика узбекистан') && lowerLine.includes('урожай'))) {
        continue;
      }

      // Skip amount in words
      if (lowerLine.includes('сумма прописью') ||
          (lowerLine.includes('тысяч') && lowerLine.includes('доллар'))) {
        continue;
      }

      // Skip special notes section
      if (lowerLine.includes('особые примечания')) {
        inSpecialNotes = true;
        continue;
      }

      if (inSpecialNotes) {
        // Skip until we see a new section (starts with capital Cyrillic) or product table
        if (lowerLine.match(/^[А-ЯЁ]/) || lowerLine.match(/^\d+\s*\|/)) {
          inSpecialNotes = false;
        } else {
          continue;
        }
      }

      // Skip signatures and seals
      if (lowerLine.includes('директор:') ||
          lowerLine.includes('товар отпустил:') ||
          lowerLine.includes('seal') ||
          lowerLine.includes('[urganch fruits') ||
          lowerLine.includes('[urganch fruits seal]')) {
        continue;
      }

      // Skip lines that are just bank account numbers or SWIFT codes
      if (/^\d{20,}$/.test(line) || // Long account numbers
          /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}?$/i.test(line)) { // SWIFT codes
        continue;
      }

      // Skip rekvizitlar lines (ИНН, КПП, ОГРН without labels)
      if (/^инн\s+\d+/.test(lowerLine) || // "ИНН 5410909432"
          /^кпп\s+\d+/.test(lowerLine) || // "КПП 541001001"
          /^огрн\s+\d+/.test(lowerLine)) { // "ОГРН 1215400014764"
        continue;
      }

      // Track which section we're in
      if (lowerLine.includes('продавец:')) {
        currentSection = 'seller';
        inProductTable = false;
      } else if (lowerLine.includes('покупатель:')) {
        currentSection = 'buyer';
        inProductTable = false;
      } else if (lowerLine.includes('грузополучатель:')) {
        currentSection = 'consignee';
        inProductTable = false;
      } else if (lowerLine.includes('инвойс no.')) {
        currentSection = 'invoice';
        inProductTable = false;
      } else if (lowerLine.includes('контракт no.')) {
        currentSection = 'contract';
        inProductTable = false;
      } else if (lowerLine.includes('место таможни')) {
        currentSection = 'customs';
        inProductTable = false;
      } else if (lowerLine.includes('условия поставки')) {
        currentSection = 'delivery';
        inProductTable = false;
      } else if (lowerLine.includes('№ автотранспорт')) {
        currentSection = 'vehicle';
        inProductTable = false;
      } else if (lowerLine.includes('№') && (lowerLine.includes('код тн вэд') || lowerLine.includes('наименование товара'))) {
        currentSection = 'products';
        inProductTable = true;
      } else if (/^\d+\s*\|/.test(line) || /^\d+\s/.test(line)) {
        currentSection = 'products';
        inProductTable = true;
      } else if (inProductTable && (lowerLine.includes('итого:') || lowerLine.includes('всего:'))) {
        currentSection = 'products';
        inProductTable = false; // End of product table
      }

      // Keep the line only if it's part of required sections
      const isRequiredSection = 
        lowerLine.includes('продавец:') ||
        lowerLine.includes('покупатель:') ||
        lowerLine.includes('грузополучатель:') ||
        lowerLine.includes('инвойс no.') ||
        lowerLine.includes('контракт no.') ||
        lowerLine.includes('место таможни') ||
        lowerLine.includes('условия поставки') ||
        lowerLine.includes('№ автотранспорт') ||
        /^\d+\s*\|/.test(line) || // Product table row
        (inProductTable && /^\d+\s/.test(line)); // Product table row (without pipe)

      // Keep address continuation lines (for Продавец, Покупатель, Грузополучатель)
      // But skip if they contain bank details or rekvizitlar
      const isAddressContinuation = 
        (currentSection === 'seller' || currentSection === 'buyer' || currentSection === 'consignee') &&
        !lowerLine.match(/^инн\s*:/i) &&
        !lowerLine.match(/^кпп\s*:/i) &&
        !lowerLine.match(/^оргн\s*:/i) &&
        !lowerLine.match(/^р\/с\s*:/i) &&
        !lowerLine.match(/^бик\s*:/i) &&
        !lowerLine.includes('расчетный счет') &&
        !lowerLine.includes('валютный счет') &&
        !lowerLine.includes('корр.счет') &&
        !lowerLine.includes('swift:') &&
        !lowerLine.includes('мфо:') &&
        !lowerLine.includes('банк') &&
        !/^\d{20,}$/.test(line) && // Not a long account number
        !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}?$/i.test(line) && // Not a SWIFT code
        !/^инн\s+\d+/.test(lowerLine) && // Not "ИНН 5410909432"
        !/^кпп\s+\d+/.test(lowerLine) && // Not "КПП 541001001"
        !/^огрн\s+\d+/.test(lowerLine) && // Not "ОГРН 1215400014764"
        (line.match(/^[А-ЯЁа-яё\s,.\-0-9]+$/) && line.length > 3); // Looks like address text

      // Keep section content lines (for Инвойс, Контракт, Место таможни, Условия поставки, № автотранспорт)
      const isSectionContent = 
        (currentSection === 'invoice' || 
         currentSection === 'contract' || 
         currentSection === 'customs' || 
         currentSection === 'delivery' || 
         currentSection === 'vehicle') &&
        !lowerLine.match(/^инн\s*:/i) &&
        !lowerLine.match(/^кпп\s*:/i) &&
        !lowerLine.match(/^оргн\s*:/i) &&
        !lowerLine.match(/^р\/с\s*:/i) &&
        !lowerLine.match(/^бик\s*:/i) &&
        !lowerLine.includes('расчетный счет') &&
        !lowerLine.includes('валютный счет') &&
        !lowerLine.includes('корр.счет') &&
        !lowerLine.includes('swift:') &&
        !lowerLine.includes('мфо:') &&
        !lowerLine.includes('банк');

      // Keep product table lines
      const isProductTable = currentSection === 'products';

      if (isRequiredSection || isAddressContinuation || isSectionContent || isProductTable) {
        filteredLines.push(lines[i]);
      }
    }

    let filteredText = filteredLines.join('\n').trim();
    
    // Format product table at the end
    filteredText = this.formatProductTable(filteredText);
    
    return filteredText;
  }

  /**
   * Format product table in invoice text
   * Converts table rows to structured format:
   * №: 1
   * Код ТН ВЭД: 0810700009
   * Наименование товара: Хурма свежая
   * Вид упаковки: дер.ящик
   * Мест: 2124
   * Брутто: 22090
   * Нетто: 18904
   * Общая сумма: 13 232,80
   */
  private formatProductTable(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }

    const lines = text.split('\n');
    const formattedLines: string[] = [];
    let inProductTable = false;
    let headerLineIndex = -1;
    let lastProductFormatted: string[] = []; // Store last formatted product to add Общая сумма from Итого

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      // Detect table header
      if (lowerLine.includes('№') && 
          (lowerLine.includes('код тн вэд') || lowerLine.includes('наименование товара'))) {
        inProductTable = true;
        headerLineIndex = i;
        // Keep header line but mark we're in table
        formattedLines.push(lines[i]);
        continue;
      }

      // If we're in product table and see a row starting with number
      if (inProductTable && /^\d+\s/.test(line)) {
        // Try different splitting methods
        let parts: string[] = [];
        if (line.includes('|')) {
          parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length > 0 && parts[0] === '') parts.shift();
          if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        } else {
          parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
        }
        
        // Expected columns:
        // 0: №, 1: Код ТН ВЭД, 2: Наименование товара, 3: Вид упаковки
        // 4: Мест, 5: Брутто, 6: Нетто, 7: Цена за кг (skip), 8: Общая сумма
        
        if (parts.length >= 6) {
          const formattedProduct: string[] = [];
          
          // 1-ustun: № (index 0)
          if (parts[0] && /^\d+$/.test(parts[0].trim())) {
            formattedProduct.push(`№: ${parts[0].trim()}`);
          }
          
          // 2-ustun: Код ТН ВЭД (index 1)
          if (parts[1] && /^\d{10}$/.test(parts[1].trim())) {
            formattedProduct.push(`Код ТН ВЭД: ${parts[1].trim()}`);
          }
          
          // 3-ustun: Наименование товара (index 2, may span multiple parts)
          let nameIndex = 2;
          let nameParts: string[] = [];
          while (nameIndex < parts.length) {
            const part = parts[nameIndex]?.trim() || '';
            if (part.match(/^[а-яё]+\.[а-яё]+$/) || /^\d+$/.test(part)) {
              break;
            }
            nameParts.push(parts[nameIndex]);
            nameIndex++;
          }
          if (nameParts.length > 0) {
            formattedProduct.push(`Наименование товара: ${nameParts.join(' ').trim()}`);
          }
          
          // 4-ustun: Вид упаковки
          let packagingIndex = nameIndex;
          if (packagingIndex < parts.length) {
            const packaging = parts[packagingIndex].trim();
            if (packaging.match(/^[а-яё]+\.[а-яё]+$|^[а-яё]+$|^[a-z]+$/i) && 
                !/^\d+[,.]?\d*$/.test(packaging) && packaging.length < 20) {
              formattedProduct.push(`Вид упаковки: ${packaging}`);
              packagingIndex++;
            }
          }
          
          // Extract all numeric values starting from packagingIndex
          // Expected order: Мест, Брутто, Нетто, Цена за кг, Общая сумма
          const numbers: string[] = [];
          for (let j = packagingIndex; j < parts.length; j++) {
            const part = parts[j].trim();
            // Match numbers with optional spaces/commas/dots
            // Examples: "2124", "22090", "0,70", "13,232.80", "13 232,80"
            if (/^\d+$/.test(part) || // Integer
                /^\d+[,.]\d+$/.test(part) || // Decimal like "0,70" or "13.80"
                /^\d+\s+\d+[,.]\d+$/.test(part) || // With spaces like "13 232,80"
                /^\d+[,.]\d+[,.]\d+$/.test(part)) { // With multiple separators like "13,232.80"
              numbers.push(part);
            }
          }
          
          // 5-ustun: Мест (1st number - integer, usually 4 digits)
          if (numbers.length >= 1 && /^\d+$/.test(numbers[0].trim())) {
            formattedProduct.push(`Мест: ${numbers[0]}`);
          }
          
          // 6-ustun: Брутто (2nd number - integer, usually 5 digits)
          if (numbers.length >= 2 && /^\d+$/.test(numbers[1].trim())) {
            formattedProduct.push(`Брутто: ${numbers[1]}`);
          }
          
          // 7-ustun: Нетто (3rd number - integer, usually 5 digits)
          if (numbers.length >= 3 && /^\d+$/.test(numbers[2].trim())) {
            formattedProduct.push(`Нетто: ${numbers[2]}`);
          }
          
          // 8-ustun: Цена за кг - SKIP (4th number, usually small decimal like "0,70")
          
          // 9-ustun: Общая сумма (5th number, usually large with spaces/commas like "13,232.80" or "13 232,80")
          // Общая сумма is usually the last number and has spaces/commas/dots
          // NOTE: If only 4 numbers, the 4th is usually Цена за кг (small like "0,70"), not Общая сумма
          // Общая сумма will be extracted from "Итого:" line if available
          if (numbers.length >= 5) {
            // 5th number is Общая сумма
            formattedProduct.push(`Общая сумма: ${numbers[4]}`);
          } else if (numbers.length === 4) {
            // If only 4 numbers, the last one is usually Цена за кг (small decimal like "0,70")
            // Don't add Общая сумма here - it will be extracted from "Итого:" line
            // Only add if it's clearly Общая сумма (large number with spaces)
            const lastNumber = numbers[3];
            const cleanedLast = lastNumber.replace(/\s/g, '').replace(/,/g, '.');
            const lastValue = parseFloat(cleanedLast);
            // Only if it's clearly Общая сумма (has spaces and is large > 10)
            if ((lastNumber.includes(' ') || lastNumber.includes(',')) && 
                !isNaN(lastValue) && lastValue > 10) {
              formattedProduct.push(`Общая сумма: ${lastNumber}`);
            }
            // Otherwise, skip - Общая сумма will come from "Итого:" line
          }
          
          // Store last formatted product
          lastProductFormatted = formattedProduct;
          
          formattedLines.push(...formattedProduct);
          formattedLines.push(''); // Empty line between products
          continue;
        }
      }

      // Check if we should exit product table
      if (inProductTable) {
        if (lowerLine.includes('итого:') || lowerLine.includes('всего:')) {
          // Extract Общая сумма from Итого line if available
          // Итого line usually has format: "Итого: 2124 22909 18904 13,232.80"
          // Split by spaces and find all numbers
          const itogoParts = line.split(/\s+/).filter(p => p.trim().length > 0);
          const itogoNumbers: string[] = [];
          
          for (const part of itogoParts) {
            // Skip "Итого:" or "Всего:" label
            if (part.toLowerCase().includes('итого') || part.toLowerCase().includes('всего')) {
              continue;
            }
            // Match numbers with optional spaces/commas/dots
            if (/^\d+$/.test(part) || 
                /^\d+\.\d+$/.test(part) ||
                /^\d+,\d+$/.test(part) ||
                /^\d+\s+\d+[,.]\d+$/.test(part) ||
                /^\d+[,.]\d+[,.]\d+$/.test(part)) {
              itogoNumbers.push(part);
            }
          }
          
          // Usually the last number in Итого is Общая сумма (large number with spaces/commas)
          if (itogoNumbers.length > 0) {
            // Find the largest number with spaces/commas - that's Общая сумма
            let obshayaSumma = '';
            let maxValue = 0;
            
            for (const num of itogoNumbers) {
              const cleaned = num.replace(/\s/g, '').replace(/,/g, '.');
              const value = parseFloat(cleaned);
              // Общая сумма usually has spaces/commas and is the largest (> 10)
              if (!isNaN(value) && value > maxValue && 
                  (num.includes(' ') || num.includes(',') || num.includes('.')) &&
                  value > 10) {
                maxValue = value;
                obshayaSumma = num;
              }
            }
            
            // If no number with spaces found, use the last one if it's large
            if (!obshayaSumma && itogoNumbers.length > 0) {
              const lastNum = itogoNumbers[itogoNumbers.length - 1];
              const cleanedLast = lastNum.replace(/\s/g, '').replace(/,/g, '.');
              const lastValue = parseFloat(cleanedLast);
              if (!isNaN(lastValue) && lastValue > 10) {
                obshayaSumma = lastNum;
              }
            }
            
            if (obshayaSumma) {
              // Add or update Общая сумма in last formatted product
              if (lastProductFormatted.length > 0) {
                // Find if Общая сумма already exists
                const obshayaSummaIndex = lastProductFormatted.findIndex(p => p.includes('Общая сумма:'));
                if (obshayaSummaIndex >= 0) {
                  // Replace existing Общая сумма
                  lastProductFormatted[obshayaSummaIndex] = `Общая сумма: ${obshayaSumma}`;
                  // Update in formattedLines - find the line
                  for (let k = formattedLines.length - 1; k >= 0; k--) {
                    if (formattedLines[k].includes('Общая сумма:')) {
                      formattedLines[k] = `Общая сумма: ${obshayaSumma}`;
                      break;
                    }
                  }
                } else {
                  // Add Общая сумма to last formatted product
                  const lastIndex = formattedLines.length - 1;
                  if (lastIndex >= 0 && formattedLines[lastIndex] === '') {
                    formattedLines[lastIndex] = `Общая сумма: ${obshayaSumma}`;
                    formattedLines.push(''); // Add empty line back
                  } else {
                    formattedLines.push(`Общая сумма: ${obshayaSumma}`);
                    formattedLines.push('');
                  }
                }
              }
            }
          }
          
          inProductTable = false;
          // Skip "Итого:" line - don't add it
          continue;
        }
        if ((line.trim().length === 0 && i > headerLineIndex + 5) ||
            (/^[А-ЯЁ]/.test(line) && !lowerLine.includes('№'))) {
          inProductTable = false;
        }
      }

      // Keep non-table lines as is
      if (!inProductTable) {
        formattedLines.push(lines[i]);
      }
    }

    return formattedLines.join('\n');
  }

  /**
   * Extract text from JPG/JPEG image using OpenAI Vision API
   * @param filePath Path to image file
   * @returns Extracted text
   */
  async extractTextFromImage(filePath: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Read image file and convert to base64
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Determine MIME type from file extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

      // Use OpenAI Vision API to extract text
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Vision-capable model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return the text exactly as it appears, preserving structure and formatting. If the image contains a document (invoice, certificate, etc.), extract all visible text including numbers, dates, names, and addresses.',
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
        max_tokens: 4096,
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
    // Extract text from PDF first (this doesn't require database)
    let { text, pageCount } = await this.extractTextFromPdf(filePath);

    // Filter text if it's an Invoice document
    try {
      const taskDocument = await this.prisma.taskDocument.findUnique({
        where: { id: taskDocumentId },
        select: { documentType: true },
      });

      if (taskDocument?.documentType === 'INVOICE') {
        text = this.filterInvoiceExtractedText(text);
      }
    } catch (error) {
      // If we can't determine document type, continue without filtering
      console.warn('Could not determine document type for filtering, using raw text');
    }

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
      // Check for foreign key constraint error
      if (error?.code === 'P2003' || error?.code === '23503') {
        // Foreign key constraint failed - TaskDocument might not exist
        // This can happen if the TaskDocument was created in a transaction that hasn't committed yet
        // In this case, we should verify the TaskDocument exists in the current transaction context
        try {
          const taskDocument = await this.prisma.taskDocument.findUnique({
            where: { id: taskDocumentId },
            select: { id: true },
          });

          if (!taskDocument) {
            // TaskDocument doesn't exist - this is a real error
            throw new Error(`TaskDocument with id ${taskDocumentId} does not exist`);
          }

          // TaskDocument exists in transaction, but foreign key constraint failed
          // This might be a timing issue - retry once
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
    // Extract text from image using OCR
    let text = await this.extractTextFromImage(filePath);

    // Filter text if it's an Invoice document
    try {
      const taskDocument = await this.prisma.taskDocument.findUnique({
        where: { id: taskDocumentId },
        select: { documentType: true },
      });

      if (taskDocument?.documentType === 'INVOICE') {
        text = this.filterInvoiceExtractedText(text);
      }
    } catch (error) {
      // If we can't determine document type, continue without filtering
      console.warn('Could not determine document type for filtering, using raw text');
    }

    // Store metadata - check if table exists first
    try {
      await this.prisma.documentMetadata.upsert({
        where: { taskDocumentId },
        create: {
          taskDocumentId,
          extractedText: text,
          pageCount: 1, // Images are single "page"
        },
        update: {
          extractedText: text,
          pageCount: 1,
        },
      });
    } catch (error: any) {
      // Check for foreign key constraint error
      if (error?.code === 'P2003' || error?.code === '23503') {
        // Retry once
        try {
          await this.prisma.documentMetadata.upsert({
            where: { taskDocumentId },
            create: {
              taskDocumentId,
              extractedText: text,
              pageCount: 1,
            },
            update: {
              extractedText: text,
              pageCount: 1,
            },
          });
        } catch (retryError: any) {
          console.error(`Failed to save metadata for taskDocumentId ${taskDocumentId}:`, retryError.message);
        }
        return;
      }
      
      // Table doesn't exist or other error
      const isTableMissing = 
        error?.code === 'P2021' || 
        error?.code === 'P2010' ||
        error?.message?.includes('does not exist');
      
      if (isTableMissing) {
        console.warn('DocumentMetadata table does not exist, skipping metadata save');
      } else {
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

