import {
  InvoiceExtraction,
  ST1Extraction,
  FitoExtraction,
  ComparisonResult,
  ComparisonError,
} from './prompt.builder';

/**
 * Response validator for AI document extraction
 * 
 * Ensures AI output is valid JSON and matches expected schemas
 * Handles common issues like markdown code blocks, malformed JSON, etc.
 */

/**
 * Remove markdown code blocks from AI response
 */
function removeMarkdownCodeBlocks(content: string): string {
  let cleaned = content.trim();
  
  // Remove ```json ... ```
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  }
  // Remove ``` ... ```
  else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  
  return cleaned.trim();
}

/**
 * Normalize field names to match expected schema
 */
function normalizeFieldNames(obj: any, expectedType: 'invoice' | 'st1' | 'fito'): any {
  const normalized: any = {};
  
  // Common field name variations
  const fieldMappings: Record<string, Record<string, string>> = {
    invoice: {
      'invoiceNumber': 'invoice_number',
      'invoiceDate': 'invoice_date',
      'invoice_date': 'invoice_date',
      'seller': 'seller_name',
      'sellerName': 'seller_name',
      'seller_name': 'seller_name',
      'buyer': 'buyer_name',
      'buyerName': 'buyer_name',
      'buyer_name': 'buyer_name',
      'product': 'product',
      'products': 'products',
      'productList': 'products',
      'product_list': 'products',
      'quantityKg': 'quantity_kg',
      'quantity_kg': 'quantity_kg',
      'price': 'price',
      'deliveryTerm': 'delivery_term',
      'delivery_term': 'delivery_term',
      'vehicleNumber': 'vehicle_number',
      'vehicle_number': 'vehicle_number',
    },
    st1: {
      'stNumber': 'st_number',
      'st_number': 'st_number',
      'stDate': 'st_date',
      'st_date': 'st_date',
      'exporter': 'exporter_name',
      'exporterName': 'exporter_name',
      'exporter_name': 'exporter_name',
      'importer': 'importer_name',
      'importerName': 'importer_name',
      'importer_name': 'importer_name',
      'transportMethod': 'transport_method',
      'transport_method': 'transport_method',
      'invoiceRefNumber': 'invoice_ref_number',
      'invoice_ref_number': 'invoice_ref_number',
      'invoiceRefDate': 'invoice_ref_date',
      'invoice_ref_date': 'invoice_ref_date',
      'certificationDate': 'certification_date',
      'certification_date': 'certification_date',
      'declarationDate': 'declaration_date',
      'declaration_date': 'declaration_date',
      'product': 'product',
      'products': 'products',
      'originCountry': 'origin_country',
      'origin_country': 'origin_country',
      'quantityKg': 'quantity_kg',
      'quantity_kg': 'quantity_kg',
    },
    fito: {
      'certificateNumber': 'certificate_number',
      'certificate_number': 'certificate_number',
      'issueDate': 'issue_date',
      'issue_date': 'issue_date',
      'exporter': 'exporter',
      'importer': 'importer',
      'product': 'product',
      'originCountry': 'origin_country',
      'origin_country': 'origin_country',
    },
  };
  
  const mappings = fieldMappings[expectedType] || {};
  
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = mappings[key] || key;
    normalized[normalizedKey] = value;
  }
  
  return normalized;
}

/**
 * Validate and normalize invoice extraction response
 */
export function validateInvoiceResponse(response: string): InvoiceExtraction {
  try {
    const cleaned = removeMarkdownCodeBlocks(response);
    const parsed = JSON.parse(cleaned);
    const normalized = normalizeFieldNames(parsed, 'invoice');
    
    // Handle both new format (products array) and legacy format (product_list)
    let products: Array<{
      name: string;
      package_count: number | null;
      gross_weight: number | null;
      net_weight: number | null;
    }> = [];

    if (Array.isArray(normalized.products)) {
      products = normalized.products.map((p: any) => ({
        name: String(p.name || ''),
        package_count: typeof p.package_count === 'number' ? p.package_count : null,
        gross_weight: typeof p.gross_weight === 'number' ? p.gross_weight : null,
        net_weight: typeof p.net_weight === 'number' ? p.net_weight : null,
      }));
    } else if (Array.isArray(normalized.product_list)) {
      // Legacy format: convert product_list to products
      products = normalized.product_list.map((p: any) => ({
        name: String(p.name || ''),
        package_count: typeof p.package === 'number' ? p.package : typeof p.quantity === 'number' ? p.quantity : null,
        gross_weight: typeof p.gross === 'number' ? p.gross : null,
        net_weight: typeof p.net === 'number' ? p.net : null,
      }));
    } else if (normalized.product) {
      // Single product format: convert to array
      products = [{
        name: String(normalized.product || ''),
        package_count: null,
        gross_weight: null,
        net_weight: null,
      }];
    }
    
    // Ensure all required fields exist (even if null)
    return {
      invoice_number: normalized.invoice_number ?? null,
      invoice_date: normalized.invoice_date ?? null,
      seller_name: normalized.seller_name ?? normalized.seller ?? null,
      buyer_name: normalized.buyer_name ?? normalized.buyer ?? null,
      products,
    };
  } catch (error) {
    throw new Error(
      `Invalid invoice response format: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate and normalize ST-1 extraction response
 */
export function validateST1Response(response: string): ST1Extraction {
  try {
    const cleaned = removeMarkdownCodeBlocks(response);
    const parsed = JSON.parse(cleaned);
    const normalized = normalizeFieldNames(parsed, 'st1');
    
    // Handle products array
    let products: Array<{
      name: string;
      package_count: number | null;
      gross_weight: number | null;
      net_weight: number | null;
    }> = [];

    if (Array.isArray(normalized.products)) {
      products = normalized.products.map((p: any) => ({
        name: String(p.name || ''),
        package_count: typeof p.package_count === 'number' ? p.package_count : null,
        gross_weight: typeof p.gross_weight === 'number' ? p.gross_weight : null,
        net_weight: typeof p.net_weight === 'number' ? p.net_weight : null,
      }));
    } else if (normalized.product) {
      // Single product format: convert to array
      products = [{
        name: String(normalized.product || ''),
        package_count: null,
        gross_weight: typeof normalized.quantity_kg === 'number' ? normalized.quantity_kg : null,
        net_weight: null,
      }];
    }
    
    return {
      st_number: normalized.st_number ?? null,
      exporter_name: normalized.exporter_name ?? normalized.exporter ?? null,
      importer_name: normalized.importer_name ?? normalized.importer ?? null,
      transport_method: normalized.transport_method ?? null,
      invoice_ref_number: normalized.invoice_ref_number ?? null,
      invoice_ref_date: normalized.invoice_ref_date ?? null,
      certification_date: normalized.certification_date ?? null,
      declaration_date: normalized.declaration_date ?? null,
      products,
    };
  } catch (error) {
    throw new Error(
      `Invalid ST-1 response format: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate and normalize Fito extraction response
 */
export function validateFitoResponse(response: string): FitoExtraction {
  try {
    const cleaned = removeMarkdownCodeBlocks(response);
    const parsed = JSON.parse(cleaned);
    const normalized = normalizeFieldNames(parsed, 'fito');
    
    return {
      certificate_number: normalized.certificate_number ?? null,
      issue_date: normalized.issue_date ?? null,
      exporter: normalized.exporter ?? null,
      importer: normalized.importer ?? null,
      product: normalized.product ?? null,
      origin_country: normalized.origin_country ?? null,
    };
  } catch (error) {
    throw new Error(
      `Invalid Fito response format: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate and normalize comparison response
 * 
 * Expected format:
 * {
 *   "status": "OK" | "ERROR",
 *   "errors": [
 *     {
 *       "field": string,
 *       "invoice": string,
 *       "st1": string,
 *       "description": string
 *     }
 *   ]
 * }
 */
export function validateComparisonResponse(response: string): ComparisonResult {
  try {
    const cleaned = removeMarkdownCodeBlocks(response);
    const parsed = JSON.parse(cleaned);
    
    // Handle new format: {status, errors}
    if (parsed.status && Array.isArray(parsed.errors)) {
      // Accept both "ERROR" and "XATO" (Uzbek) as error status
      const status = parsed.status === 'ERROR' || parsed.status === 'XATO' 
        ? (parsed.status === 'XATO' ? 'XATO' : 'ERROR')
        : 'OK';
      const errors: ComparisonError[] = parsed.errors.map((error: any) => ({
        field: String(error.field || 'unknown'),
        invoice: String(error.invoice || ''),
        st: String(error.st1 || error.st || ''),
        description: String(error.description || ''),
      }));
      
      return {
        status,
        errors: status === 'OK' ? [] : errors,
      };
    }
    
    // Handle legacy format: array of findings (for backward compatibility)
    // Convert old format to new format
    let findings: any[] = [];
    
    if (Array.isArray(parsed)) {
      findings = parsed;
    } else if (parsed.findings && Array.isArray(parsed.findings)) {
      findings = parsed.findings;
    } else if (parsed.results && Array.isArray(parsed.results)) {
      findings = parsed.results;
    } else if (parsed.errors && Array.isArray(parsed.errors)) {
      findings = parsed.errors;
    } else if (typeof parsed === 'object') {
      // Try to find array values
      const values = Object.values(parsed);
      const arrayValue = values.find((v) => Array.isArray(v));
      if (arrayValue) {
        findings = arrayValue as any[];
      }
    }
    
    // Convert legacy findings to new format
    // Only include critical errors (ignore warnings)
      const errors: ComparisonError[] = findings
      .filter((finding: any) => {
        // Only include if it's marked as critical or if severity is not specified (assume it's an error)
        return !finding.severity || finding.severity === 'critical';
      })
      .map((finding: any) => ({
        field: String(finding.field || 'unknown'),
        invoice: String(finding.invoice_value || finding.invoice || ''),
        st: String(finding.st_value || finding.st1 || finding.st || ''),
        description: String(finding.explanation || finding.description || 'Mismatch detected'),
      }));
    
    return {
      status: errors.length > 0 ? 'XATO' : 'OK',
      errors,
    };
  } catch (error) {
    throw new Error(
      `Invalid comparison response format: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generic validator that routes to appropriate validator based on type
 */
export function validateAndNormalize(
  response: string,
  expectedType: 'invoice' | 'st1' | 'fito' | 'comparison'
): InvoiceExtraction | ST1Extraction | FitoExtraction | ComparisonResult {
  switch (expectedType) {
    case 'invoice':
      return validateInvoiceResponse(response);
    case 'st1':
      return validateST1Response(response);
    case 'fito':
      return validateFitoResponse(response);
    case 'comparison':
      return validateComparisonResponse(response);
    default:
      throw new Error(`Unknown expected type: ${expectedType}`);
  }
}

