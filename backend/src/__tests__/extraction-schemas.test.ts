import { describe, it, expect } from 'vitest';
import { EXTRACTION_SCHEMAS, ExtractableDocType } from '../ai/extraction.schemas';

/**
 * OpenAI structured outputs (strict mode) talablari:
 *  - har bir object'da additionalProperties: false
 *  - barcha propertylar required ro'yxatida
 *  - root'da $schema kaliti bo'lmasligi kerak
 * Bu test schema generatsiyasi regressiyasini ushlaydi (masalan Zod upgrade'da).
 */

function walkObjects(node: unknown, visit: (obj: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walkObjects(item, visit);
    return;
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (record.type === 'object') visit(record);
    for (const value of Object.values(record)) walkObjects(value, visit);
  }
}

describe('EXTRACTION_SCHEMAS — OpenAI strict mode muvofiqligi', () => {
  const types = Object.keys(EXTRACTION_SCHEMAS) as ExtractableDocType[];

  it.each(types)('%s: root $schema yo‘q, name/strict to‘g‘ri', (docType) => {
    const rf = EXTRACTION_SCHEMAS[docType].responseFormat;
    expect(rf.type).toBe('json_schema');
    expect(rf.json_schema.strict).toBe(true);
    expect(rf.json_schema.name.length).toBeGreaterThan(0);
    expect(rf.json_schema.schema.$schema).toBeUndefined();
  });

  it.each(types)('%s: barcha objectlar additionalProperties:false + to‘liq required', (docType) => {
    const schema = EXTRACTION_SCHEMAS[docType].responseFormat.json_schema.schema;
    let objectCount = 0;
    walkObjects(schema, (obj) => {
      objectCount++;
      expect(obj.additionalProperties).toBe(false);
      const properties = obj.properties as Record<string, unknown>;
      const required = obj.required as string[];
      expect(new Set(required)).toEqual(new Set(Object.keys(properties)));
    });
    expect(objectCount).toBeGreaterThan(0);
  });

  it.each(types)('%s: zod schema o‘z misolini qabul qiladi', (docType) => {
    // Har bir maydon null bo'lgan minimal obyekt schema'dan o'tishi kerak
    const schema = EXTRACTION_SCHEMAS[docType].responseFormat.json_schema.schema;
    const properties = schema.properties as Record<string, { anyOf?: unknown; type?: string }>;
    const minimal: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(properties)) {
      minimal[key] = prop.type === 'array' ? [] : null;
    }
    const result = EXTRACTION_SCHEMAS[docType].zodSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
