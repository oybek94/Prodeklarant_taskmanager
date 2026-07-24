// extraction.schemas.ts
// Hujjat extraction natijalari uchun Zod schemalar — bitta haqiqat manbai.
// Bu schemalardan:
//   1) TypeScript turlari (z.infer) — prompt.builder.ts orqali re-export,
//   2) OpenAI structured outputs uchun strict JSON Schema (z.toJSONSchema)
// hosil qilinadi. OpenAI strict mode talabi: barcha maydonlar required,
// optionallik faqat `| null` orqali ifodalanadi.

import { z } from 'zod';

/* ===================== ZOD SCHEMAS ===================== */

export const productExtractionSchema = z.strictObject({
  name: z.string(),
  package_count: z.number().nullable(),
  gross_weight: z.number().nullable(),
  net_weight: z.number().nullable(),
});

export const invoiceProductExtractionSchema = productExtractionSchema.extend({
  unit_price: z.number().nullable(),
  amount: z.number().nullable(),
});

export const invoiceExtractionSchema = z.strictObject({
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(), // YYYY-MM-DD
  seller_name: z.string().nullable(),
  buyer_name: z.string().nullable(),
  total_amount: z.number().nullable(),
  currency: z.string().nullable(),
  products: z.array(invoiceProductExtractionSchema),
});

export const st1ExtractionSchema = z.strictObject({
  st_number: z.string().nullable(), // sertifikat raqami (UZRU…)
  exporter_name: z.string().nullable(),
  importer_name: z.string().nullable(),
  transport_method: z.string().nullable(),
  invoice_ref_number: z.string().nullable(), // faqat aniq yozilgan bo'lsa (grafa 10)
  invoice_ref_date: z.string().nullable(), // faqat aniq yozilgan bo'lsa (grafa 10)
  certification_date: z.string().nullable(), // grafa 11
  declaration_date: z.string().nullable(), // grafa 12
  products: z.array(productExtractionSchema),
});

export const fitoProductExtractionSchema = z.strictObject({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  net_weight: z.number().nullable(), // kg
});

export const fitoExtractionSchema = z.strictObject({
  certificate_number: z.string().nullable(),
  issue_date: z.string().nullable(), // YYYY-MM-DD
  exporter: z.string().nullable(),
  importer: z.string().nullable(),
  product: z.string().nullable(),
  origin_country: z.string().nullable(),
  products: z.array(fitoProductExtractionSchema),
  total_net_weight: z.number().nullable(), // deklaratsiya qilingan miqdor (kg)
  total_package_count: z.number().nullable(),
});

export const cmrExtractionSchema = z.strictObject({
  sender_name: z.string().nullable(), // grafa 1
  consignee_name: z.string().nullable(), // grafa 2
  delivery_place: z.string().nullable(), // grafa 3
  loading_place: z.string().nullable(), // grafa 4
  attached_documents: z.string().nullable(), // grafa 5
  invoice_ref_number: z.string().nullable(), // grafa 5 dan invoys raqami
  total_package_count: z.number().nullable(), // grafa 7
  goods_description: z.string().nullable(), // grafa 9
  total_gross_weight: z.number().nullable(), // grafa 11 (kg)
  vehicle_number: z.string().nullable(), // grafa 16/25
  products: z.array(productExtractionSchema),
});

export const tirExtractionSchema = z.strictObject({
  tir_carnet_number: z.string().nullable(),
  holder_name: z.string().nullable(),
  departure_customs: z.string().nullable(),
  destination_customs: z.string().nullable(),
  consignee_name: z.string().nullable(),
  invoice_ref_number: z.string().nullable(),
  total_package_count: z.number().nullable(), // grafa 9/10
  goods_description: z.string().nullable(), // grafa 10
  total_gross_weight: z.number().nullable(), // grafa 11 (kg)
  products: z.array(productExtractionSchema),
});

/* ===================== INFERRED TYPES ===================== */

export type ProductExtraction = z.infer<typeof productExtractionSchema>;
export type InvoiceProductExtraction = z.infer<typeof invoiceProductExtractionSchema>;
export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
export type ST1Extraction = z.infer<typeof st1ExtractionSchema>;
export type FitoProductExtraction = z.infer<typeof fitoProductExtractionSchema>;
export type FitoExtraction = z.infer<typeof fitoExtractionSchema>;
export type CmrExtraction = z.infer<typeof cmrExtractionSchema>;
export type TirExtraction = z.infer<typeof tirExtractionSchema>;

export type AnyExtraction =
  | InvoiceExtraction
  | ST1Extraction
  | FitoExtraction
  | CmrExtraction
  | TirExtraction;

export type ExtractableDocType = 'INVOICE' | 'ST' | 'FITO' | 'CMR' | 'TIR';

/* ===================== OPENAI RESPONSE FORMAT ===================== */

export interface JsonSchemaResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

export function buildResponseFormat(
  name: string,
  schema: z.ZodType
): JsonSchemaResponseFormat {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return {
    type: 'json_schema',
    json_schema: { name, strict: true, schema: jsonSchema },
  };
}

export const EXTRACTION_SCHEMAS: Record<
  ExtractableDocType,
  { zodSchema: z.ZodType<AnyExtraction>; responseFormat: JsonSchemaResponseFormat }
> = {
  INVOICE: {
    zodSchema: invoiceExtractionSchema,
    responseFormat: buildResponseFormat('invoice_extraction', invoiceExtractionSchema),
  },
  ST: {
    zodSchema: st1ExtractionSchema,
    responseFormat: buildResponseFormat('st1_extraction', st1ExtractionSchema),
  },
  FITO: {
    zodSchema: fitoExtractionSchema,
    responseFormat: buildResponseFormat('fito_extraction', fitoExtractionSchema),
  },
  CMR: {
    zodSchema: cmrExtractionSchema,
    responseFormat: buildResponseFormat('cmr_extraction', cmrExtractionSchema),
  },
  TIR: {
    zodSchema: tirExtractionSchema,
    responseFormat: buildResponseFormat('tir_extraction', tirExtractionSchema),
  },
};

/* ===================== ERRORS ===================== */

/**
 * Extraction (Stage 1) muvaffaqiyatsizligini bildiruvchi typed xato.
 * Caller buni ushlab AiCheck'ga NEEDS_REVIEW sifatida yozishi kerak —
 * hech qachon jimgina yutilmasin.
 */
export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly reason: 'EMPTY_RESPONSE' | 'INVALID_JSON' | 'SCHEMA_MISMATCH' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}
