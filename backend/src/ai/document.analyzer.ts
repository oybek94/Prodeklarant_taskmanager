import OpenAIClient from './openai.client';
import {
  buildInvoiceExtractionPrompt,
  buildST1ExtractionPrompt,
  InvoiceExtraction,
  ST1Extraction,
} from './prompt.builder';
import { validateInvoiceWithST } from './rule-engine';
import { validateInvoiceResponse, validateST1Response } from './response.validator';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.1;

/**
 * Analyze document text and extract structured data
 * 
 * @param text Extracted text from PDF
 * @param documentType Document type (INVOICE, ST, or FITO)
 * @param timeout Optional timeout in milliseconds (default: 30000)
 * @returns Structured document data
 * @throws Error if analysis fails or times out
 */
export async function analyzeDocument(
  text: string,
  documentType: 'INVOICE' | 'ST' | 'FITO',
  timeout: number = DEFAULT_TIMEOUT
): Promise<InvoiceExtraction | ST1Extraction> {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Document text is empty');
    }

    // Get OpenAI client
    const openai = OpenAIClient.getClient();

    // Select appropriate prompt
    let prompt: string;
    let expectedType: 'invoice' | 'st1';
    
    switch (documentType) {
      case 'INVOICE':
        prompt = buildInvoiceExtractionPrompt();
        expectedType = 'invoice';
        break;
      case 'ST':
        prompt = buildST1ExtractionPrompt();
        expectedType = 'st1';
        break;
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Log analysis start
    console.log(`[AI] Analyzing ${documentType} document (text length: ${text.length} chars)`);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI analysis timeout after ${timeout}ms`));
      }, timeout);
    });

    // Make OpenAI API call with timeout
    const apiCall = openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            documentType === 'INVOICE'
              ? 'You are a document extraction assistant. Return ONLY valid JSON, no markdown, no explanations.'
              : 'You are a certificate extraction assistant. Return ONLY valid JSON, no markdown, no explanations.',
        },
        {
          role: 'user',
          content: `${prompt}\n\nDocument text:\n${text}`,
        },
      ],
      temperature: DEFAULT_TEMPERATURE,
    });

    const response = await Promise.race([apiCall, timeoutPromise]);
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('AI response is empty');
    }

    // Validate and normalize response
    let structuredData: InvoiceExtraction | ST1Extraction;
    
    switch (expectedType) {
      case 'invoice':
        const invoiceData = validateInvoiceResponse(content);
        // Apply normalization with fallback extraction if products are empty
        structuredData = normalizeInvoiceExtraction(invoiceData, text);
        break;
      case 'st1':
        structuredData = validateST1Response(content);
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`[AI] ${documentType} analysis completed in ${duration}ms`);

    return structuredData;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AI] ${documentType} analysis failed after ${duration}ms:`, error);
    
    // Wrap error with context
    throw new Error(
      `AI document analysis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Compare Invoice and ST-1 documents using TWO-STAGE ARCHITECTURE
 * 
 * STAGE 1: Extract structured data from both documents (AI extraction only)
 * STAGE 2: Validate using deterministic rule engine (NO AI)
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
    // Validate input
    if (!invoiceText || invoiceText.trim().length === 0) {
      throw new Error('Invoice text is empty');
    }
    if (!st1Text || st1Text.trim().length === 0) {
      throw new Error('ST-1 text is empty');
    }

    console.log(`[Two-Stage] Starting Invoice-ST1 comparison`);

    // ==================== STAGE 1: AI EXTRACTION ONLY ====================
    let invoiceData: InvoiceExtraction;
    let st1Data: ST1Extraction;

    if (invoiceStructured) {
      console.log(`[Two-Stage] Using provided invoice structured data`);
      console.log(`[Two-Stage] Invoice structured data products count: ${Array.isArray(invoiceStructured.products) ? invoiceStructured.products.length : 0}`);
      invoiceData = normalizeInvoiceExtraction(invoiceStructured, invoiceText);
      console.log(`[Two-Stage] After normalization, products count: ${invoiceData.products.length}`);
      
      // If still empty after normalization, try fallback extraction
      if (invoiceData.products.length === 0 && invoiceText && invoiceText.trim().length > 0) {
        console.warn(`[Two-Stage] Products still empty after normalization, attempting aggressive fallback extraction`);
        const fallbackProducts = extractProductsFromText(invoiceText);
        if (fallbackProducts.length > 0) {
          console.log(`[Two-Stage] Fallback extraction found ${fallbackProducts.length} products`);
          invoiceData.products = fallbackProducts;
        }
      }
    } else {
      console.log(`[Two-Stage] Extracting invoice data...`);
      const extractedData = await analyzeDocument(invoiceText, 'INVOICE', timeout) as InvoiceExtraction;
      // Normalize with fallback extraction
      invoiceData = normalizeInvoiceExtraction(extractedData, invoiceText);
      console.log(`[Two-Stage] After normalization, products count: ${invoiceData.products.length}`);
    }

    if (st1Structured) {
      st1Data = normalizeST1Extraction(st1Structured);
      console.log(`[Two-Stage] Using provided ST-1 structured data`);
    } else {
      console.log(`[Two-Stage] Extracting ST-1 data...`);
      st1Data = await analyzeDocument(st1Text, 'ST', timeout) as ST1Extraction;
    }

    // ==================== STAGE 2: DETERMINISTIC RULE ENGINE ====================
    console.log(`[Two-Stage] Running rule engine validation...`);
    const validationResult = validateInvoiceWithST(invoiceData as any, st1Data as any);
    
    // Convert ValidationResult to ComparisonResult format
    const result = {
      status: validationResult.status === 'XATO' ? 'XATO' : 'OK' as 'OK' | 'XATO',
      errors: validationResult.errors,
    };

    const duration = Date.now() - startTime;
    console.log(`[Two-Stage] Comparison completed in ${duration}ms (status: ${result.status}, errors: ${result.errors.length})`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Two-Stage] Comparison failed after ${duration}ms:`, error);
    
    throw new Error(
      `Document comparison failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Deterministic fallback: Extract products from raw invoice text
 * Used when AI extraction returns empty products array
 */
function extractProductsFromText(text: string): Array<{
  name: string;
  package_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
}> {
  const products: Array<{
    name: string;
    package_count: number | null;
    gross_weight: number | null;
    net_weight: number | null;
  }> = [];

  if (!text || text.trim().length === 0) {
    console.log('[ExtractProducts] Empty text provided');
    return products;
  }

  console.log(`[ExtractProducts] Starting extraction from text (length: ${text.length} chars)`);

  // Normalize text: replace multiple spaces with single space, normalize line breaks
  const normalizedText = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Pattern 1: Look for table-like structures with "Наименование товара" header
  // Example: | Наименование товара | Мест | Брутто | Нетто |
  const tableHeaderPattern = /наименование\s+товара|товар|наименование/gi;
  const tableMatch = normalizedText.match(tableHeaderPattern);
  
  console.log(`[ExtractProducts] Pattern 1: Table header found: ${!!tableMatch}`);
  
  if (tableMatch) {
    // Find lines that look like product rows (contain Cyrillic and numbers)
    // Cyrillic product name pattern: at least 3 Cyrillic characters
    const cyrillicPattern = /[А-ЯЁа-яё]{3,}/;
    
    // Split by lines and look for product rows
    const lines = normalizedText.split('\n');
    let foundTable = false;
    let headerLineIndex = -1;
    
    // Find table header line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (tableHeaderPattern.test(line)) {
        foundTable = true;
        headerLineIndex = i;
        break;
      }
    }
    
    // If table header found, look for product rows after it (up to 20 lines)
    if (foundTable && headerLineIndex >= 0) {
      for (let i = headerLineIndex + 1; i < Math.min(lines.length, headerLineIndex + 21); i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (line.length === 0) {
          continue;
        }
        
        // Skip if it looks like another header or footer
        if (/итого|всего|сумма|total|header|footer/i.test(line)) {
          break;
        }
        
        // If line contains Cyrillic, try to extract product
        if (cyrillicPattern.test(line)) {
          const product = extractProductFromLine(line);
          if (product && product.name.length > 0) {
            products.push(product);
          }
        }
      }
    }
    console.log(`[ExtractProducts] Pattern 1 extracted ${products.length} products`);
  }

  // Pattern 2: Look for standalone product lines with Cyrillic names and numbers
  // Example: "Хурма свежая сорт Королёк 3670 23130 20190"
  if (products.length === 0) {
    const lines = normalizedText.split('\n');
    const cyrillicPattern = /[А-ЯЁа-яё]{3,}/;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip header lines, skip very short lines, skip lines without Cyrillic
      if (
        trimmedLine.length < 10 ||
        !cyrillicPattern.test(trimmedLine) ||
        /наименование|товар|место|брутто|нетто|итого|всего/i.test(trimmedLine)
      ) {
        continue;
      }
      
      // Extract product from line
      const product = extractProductFromLine(trimmedLine);
      if (product && product.name.length >= 3) {
        // Add product even if no numeric values (name is enough for fallback)
        // This ensures we don't return empty products array when products exist
        products.push(product);
      }
    }
    console.log(`[ExtractProducts] Pattern 2 extracted ${products.length} products`);
  }

  // Pattern 3: More aggressive search - look for any line with Cyrillic + numbers
  // This catches cases where table structure is broken or OCR is imperfect
  if (products.length === 0) {
    const lines = normalizedText.split(/\n|;/); // Split by newline or semicolon
    const cyrillicPattern = /[А-ЯЁа-яё]{4,}/; // At least 4 Cyrillic characters
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // More lenient: just check for Cyrillic and numbers
      if (
        trimmedLine.length < 5 ||
        !cyrillicPattern.test(trimmedLine) ||
        /наименование|товар|место|брутто|нетто|итого|всего|счет|фактур/i.test(trimmedLine)
      ) {
        continue;
      }
      
      // Check if line has numbers
      const hasNumbers = /\d+/.test(trimmedLine);
      if (!hasNumbers) {
        continue;
      }
      
      // Extract product from line
      const product = extractProductFromLine(trimmedLine);
      if (product && product.name.length >= 3) {
        // Be more lenient: add even if no numeric values (name is enough)
        products.push(product);
        // Limit to prevent too many false positives
        if (products.length >= 10) {
          break;
        }
      }
    }
    console.log(`[ExtractProducts] Pattern 3 extracted ${products.length} products`);
  }

  console.log(`[ExtractProducts] Total products extracted: ${products.length}`);
  return products;
}

/**
 * Extract product data from a single line of text
 */
function extractProductFromLine(line: string): {
  name: string;
  package_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
} | null {
  if (!line || line.trim().length === 0) {
    return null;
  }

  // Find product name (Cyrillic text, possibly with spaces)
  // Product name is typically at the start, before numbers
  // Try multiple patterns to catch different formats
  
  let productName = '';
  
  // Pattern 1: Look for Cyrillic text at the start (before first number or separator)
  const cyrillicPattern = /[А-ЯЁа-яё][А-ЯЁа-яё\s\-\.]{2,}/;
  const nameMatch = line.match(cyrillicPattern);
  
  if (nameMatch) {
    // Extract text from start until first number or pipe separator
    const beforeFirstNumber = line.substring(0, line.search(/\d/));
    if (beforeFirstNumber.length > 0) {
      productName = beforeFirstNumber.trim();
    } else {
      // If no number found, use the matched Cyrillic text
      productName = nameMatch[0].trim();
    }
  } else {
    // Pattern 2: Look for any Cyrillic text in the line
    const anyCyrillic = line.match(/[А-ЯЁа-яё]+(?:\s+[А-ЯЁа-яё]+)*/);
    if (anyCyrillic) {
      productName = anyCyrillic[0].trim();
    }
  }
  
  if (!productName || productName.length < 3) {
    return null;
  }
  
  // Clean up product name: remove common suffixes/prefixes that might be part of table structure
  productName = productName
    .replace(/^[|│]\s*/, '') // Remove leading pipe
    .replace(/\s*[|│]\s*$/, '') // Remove trailing pipe
    .replace(/^[\d\s]+\s*/, '') // Remove leading numbers/spaces
    .replace(/\s+/g, ' ')
    .trim();

  if (productName.length < 3) {
    return null;
  }

  // Extract numbers from the line
  // Look for patterns like: "3670 23130 20190" or "Мест: 3670 Брутто: 23130"
  const numbers: number[] = [];
  
  // Pattern 1: Look for labeled values
  const местMatch = line.match(/мест[:\s]+(\d+)/i);
  const бруттоMatch = line.match(/брутто[:\s]+(\d+)/i);
  const неттоMatch = line.match(/нетто[:\s]+(\d+)/i);
  
  if (местMatch) {
    numbers.push(parseInt(местMatch[1], 10));
  }
  if (бруттоMatch) {
    numbers.push(parseInt(бруттоMatch[1], 10));
  }
  if (неттоMatch) {
    numbers.push(parseInt(неттоMatch[1], 10));
  }
  
  // Pattern 2: Extract all numbers from line (if no labels found)
  if (numbers.length === 0) {
    const allNumbers = line.match(/\d+/g);
    if (allNumbers) {
      for (const numStr of allNumbers) {
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > 0) {
          numbers.push(num);
        }
      }
    }
  }

  // Map numbers to fields based on position and value
  // Typically: package_count < gross_weight < net_weight
  // But package_count is usually smaller, weights are larger
  let package_count: number | null = null;
  let gross_weight: number | null = null;
  let net_weight: number | null = null;

  if (numbers.length > 0) {
    // Sort numbers to help identify which is which
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    
    // If we have labeled values, use them
    if (местMatch) {
      package_count = parseInt(местMatch[1], 10);
    }
    if (бруттоMatch) {
      gross_weight = parseInt(бруттоMatch[1], 10);
    }
    if (неттоMatch) {
      net_weight = parseInt(неттоMatch[1], 10);
    }
    
    // If we don't have labeled values, try to infer from position/value
    if (!местMatch && !бруттоMatch && !неттоMatch) {
      // First number is often package_count (smaller)
      // Last two are often weights (larger)
      if (numbers.length >= 1) {
        // Smallest number is likely package_count
        package_count = sortedNumbers[0];
      }
      if (numbers.length >= 2) {
        // Second largest is likely gross_weight
        gross_weight = sortedNumbers[sortedNumbers.length - 1];
      }
      if (numbers.length >= 3) {
        // Largest is often net_weight (but could be gross)
        // Actually, gross is usually >= net, so we need to be careful
        // For now, assign in order: first=package, second=gross, third=net
        gross_weight = numbers[numbers.length - 2] || null;
        net_weight = numbers[numbers.length - 1] || null;
      }
    }
  }

  return {
    name: productName,
    package_count: package_count && !isNaN(package_count) ? package_count : null,
    gross_weight: gross_weight && !isNaN(gross_weight) ? gross_weight : null,
    net_weight: net_weight && !isNaN(net_weight) ? net_weight : null,
  };
}

/**
 * Normalize invoice extraction data to ensure correct format
 * 
 * @param data Extracted invoice data from AI
 * @param rawText Optional raw invoice text for fallback extraction
 */
function normalizeInvoiceExtraction(data: any, rawText?: string): InvoiceExtraction {
  // Handle legacy product_list format
  if (data.product_list && !data.products) {
    data.products = data.product_list.map((item: any) => ({
      name: item.name || '',
      package_count: typeof item.package === 'number' ? item.package : typeof item.quantity === 'number' ? item.quantity : null,
      gross_weight: typeof item.gross === 'number' ? item.gross : null,
      net_weight: typeof item.net === 'number' ? item.net : null,
    }));
  }

  // Ensure products array exists
  if (!data.products) {
    data.products = [];
  }

  // DETERMINISTIC FALLBACK: If products array is empty but raw text is available,
  // attempt to extract products from raw text
  if (
    Array.isArray(data.products) &&
    data.products.length === 0 &&
    rawText &&
    rawText.trim().length > 0
  ) {
    console.log('[Fallback] AI extraction returned empty products, attempting deterministic extraction from raw text');
    console.log(`[Fallback] Raw text length: ${rawText.length} chars, preview: ${rawText.substring(0, 200)}...`);
    
    const fallbackProducts = extractProductsFromText(rawText);
    
    console.log(`[Fallback] Extracted ${fallbackProducts.length} product(s) from raw text`);
    if (fallbackProducts.length > 0) {
      console.log(`[Fallback] Successfully extracted products:`, JSON.stringify(fallbackProducts, null, 2));
      data.products = fallbackProducts;
    } else {
      console.warn('[Fallback] Could not extract products from raw text. Attempting last resort extraction...');
      // Log a sample of the text to help debug
      const sampleLines = rawText.split('\n').slice(0, 30).join('\n');
      console.log(`[Fallback] First 30 lines of text:\n${sampleLines}`);
      
      // LAST RESORT: Try to find ANY Cyrillic text that might be a product name
      const cyrillicLines = rawText.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length >= 5 && /[А-ЯЁа-яё]{4,}/.test(trimmed) && /\d+/.test(trimmed);
      });
      
      if (cyrillicLines.length > 0) {
        console.log(`[Fallback] Found ${cyrillicLines.length} lines with Cyrillic text and numbers, attempting last resort extraction...`);
        const lastResortProducts: Array<{
          name: string;
          package_count: number | null;
          gross_weight: number | null;
          net_weight: number | null;
        }> = [];
        
        for (const line of cyrillicLines.slice(0, 10)) {
          const product = extractProductFromLine(line);
          if (product && product.name.length >= 3) {
            lastResortProducts.push(product);
          }
        }
        
        if (lastResortProducts.length > 0) {
          console.log(`[Fallback] Last resort extraction found ${lastResortProducts.length} products`);
          data.products = lastResortProducts;
        } else {
          console.error(`[Fallback] All extraction methods failed. No products found.`);
        }
      } else {
        console.error(`[Fallback] No lines with Cyrillic text and numbers found in invoice text.`);
      }
    }
  } else if (Array.isArray(data.products) && data.products.length === 0) {
    console.warn('[Normalize] Products array is empty and no raw text provided for fallback extraction');
  }

  return {
    invoice_number: data.invoice_number || null,
    invoice_date: data.invoice_date || null,
    seller_name: data.seller_name || data.seller || null,
    buyer_name: data.buyer_name || data.buyer || null,
    products: Array.isArray(data.products) ? data.products.map((p: any) => ({
      name: String(p.name || '').trim(),
      package_count: typeof p.package_count === 'number' ? p.package_count : null,
      gross_weight: typeof p.gross_weight === 'number' ? p.gross_weight : null,
      net_weight: typeof p.net_weight === 'number' ? p.net_weight : null,
    })).filter((p: any) => p.name.length > 0) : [], // Filter out products with empty names
  };
}

/**
 * Normalize ST-1 extraction data to ensure correct format
 */
function normalizeST1Extraction(data: any): ST1Extraction {
  if (data.product && (!data.products || data.products.length === 0)) {
    data.products = [{
      name: String(data.product || ''),
      package_count: null,
      gross_weight: typeof data.quantity_kg === 'number' ? data.quantity_kg : null,
      net_weight: null,
    }];
  }

  if (!data.products) {
    data.products = [];
  }

  return {
    st_number: data.st_number || null,
    exporter_name: data.exporter_name || data.exporter || null,
    importer_name: data.importer_name || data.importer || null,
    transport_method: data.transport_method || null,
    invoice_ref_number: data.invoice_ref_number || null,
    invoice_ref_date: data.invoice_ref_date || null,
    certification_date: data.certification_date || null,
    declaration_date: data.declaration_date || null,
    products: Array.isArray(data.products) ? data.products.map((p: any) => ({
      name: String(p.name || ''),
      package_count: typeof p.package_count === 'number' ? p.package_count : null,
      gross_weight: typeof p.gross_weight === 'number' ? p.gross_weight : null,
      net_weight: typeof p.net_weight === 'number' ? p.net_weight : null,
    })) : [],
  };
}
