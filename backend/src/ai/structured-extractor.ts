/**
 * OpenAI structured outputs (strict JSON Schema) uchun umumiy chaqiruv sikli.
 *
 * Hujjat turiga bog'liq emas: model chaqiriladi, javob JSON sifatida
 * o'qiladi va Zod bilan tekshiriladi. Birinchi javob schema'dan o'tmasa,
 * xatolar ro'yxati bilan BITTA repair-so'rov yuboriladi; ikkinchisi ham
 * o'tmasa typed ExtractionError tashlanadi — caller buni yutmasligi kerak.
 */

import { z } from 'zod';
import OpenAIClient from './openai.client';
import { ExtractionError, JsonSchemaResponseFormat } from './extraction.schemas';

export const DEFAULT_EXTRACTION_TIMEOUT = 30000; // 30 sekund
const DEFAULT_MODEL = 'gpt-4o-mini';

/** Extraction uchun ishlatiladigan model (env orqali almashtiriladi) */
export function extractionModel(): string {
  return process.env.OPENAI_EXTRACTION_MODEL ?? DEFAULT_MODEL;
}

export interface StructuredExtractionOptions<T> {
  /** Log va xato matnlarida ko'rinadigan nom, masalan 'INVOICE' yoki 'CARGO_TEXT' */
  label: string;
  systemPrompt: string;
  userPrompt: string;
  zodSchema: z.ZodType<T>;
  responseFormat: JsonSchemaResponseFormat;
  timeout?: number;
}

export interface StructuredExtractionResult<T> {
  data: T;
  /** true — birinchi javob schema'dan o'tmadi va repair-so'rov kerak bo'ldi */
  repairUsed: boolean;
}

export async function runStructuredExtraction<T>({
  label,
  systemPrompt,
  userPrompt,
  zodSchema,
  responseFormat,
  timeout = DEFAULT_EXTRACTION_TIMEOUT,
}: StructuredExtractionOptions<T>): Promise<StructuredExtractionResult<T>> {
  const startTime = Date.now();
  const openai = OpenAIClient.getClient();

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const callModel = async (): Promise<string> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ExtractionError(`AI analysis timeout after ${timeout}ms`, 'API_ERROR'));
      }, timeout);
    });

    const apiCall = openai.chat.completions.create({
      model: extractionModel(),
      messages,
      temperature: 0,
      response_format: responseFormat,
    });

    const response = await Promise.race([apiCall, timeoutPromise]);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new ExtractionError('AI response is empty', 'EMPTY_RESPONSE');
    }
    return content;
  };

  const tryParse = (content: string): { ok: true; data: T } | { ok: false; error: string } => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
    }
    const result = zodSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, data: result.data };
  };

  try {
    let repairUsed = false;
    let content = await callModel();
    let parsed = tryParse(content);

    if (!parsed.ok) {
      // Repair-retry: noto'g'ri javob + validatsiya xatolari bilan qayta so'raymiz
      console.warn(`[AI] ${label} extraction failed validation, retrying with repair`);
      repairUsed = true;
      messages.push({ role: 'assistant', content });
      messages.push({
        role: 'user',
        content: `Your previous output failed validation with these errors:\n${parsed.error}\n\nReturn ONLY the corrected JSON matching the required schema.`,
      });
      content = await callModel();
      parsed = tryParse(content);
      if (!parsed.ok) {
        throw new ExtractionError(
          `Extraction failed schema validation after repair retry: ${parsed.error}`,
          'SCHEMA_MISMATCH'
        );
      }
    }

    return { data: parsed.data, repairUsed };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AI] ${label} analysis failed after ${duration}ms:`, error);
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      `AI document analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      'API_ERROR'
    );
  }
}
