/**
 * eval-extraction.ts — OCR + extraction sifatini golden to'plamda o'lchash.
 *
 * MAQSAD: prompt/model/pipeline o'zgarishidan OLDIN va KEYIN ishga tushirib,
 * maydon-darajasidagi aniqlikni solishtirish. CI'da ishlamaydi (OpenAI'ga
 * haqiqiy so'rovlar yuboradi, pul ketadi) — qo'lda ishga tushiriladi.
 *
 * FOYDALANISH:
 *   npm run eval:extraction -- <golden-papka>
 *
 * Golden papka tuzilishi: har bir hujjat uchun ikkita fayl —
 *   <nom>.pdf (yoki .jpg)        — anonimlashtirilgan real hujjat
 *   <nom>.expected.json          — kutilgan natija:
 *     { "documentType": "ST" | "INVOICE" | "CMR" | "TIR" | "FITO",
 *       "extraction": { ...kutilgan maydonlar... } }
 *
 * Talab: OPENAI_API_KEY .env da bo'lishi kerak.
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import { DocumentService } from '../services/document.service';
import { analyzeDocument } from '../ai/document.analyzer';
import { ExtractableDocType } from '../ai/extraction.schemas';
import { parseDateISO } from '../ai/normalizers';
import { weightsMatch, moneyMatch, invoiceNumbersMatch, productNamesMatch } from '../ai/matchers';

interface ExpectedFile {
  documentType: ExtractableDocType;
  extraction: Record<string, unknown>;
}

interface FieldResult {
  field: string;
  expected: unknown;
  actual: unknown;
  match: boolean;
}

/** Maydon qiymatlarini turiga qarab yumshoq solishtirish */
function fieldMatches(field: string, expected: unknown, actual: unknown): boolean {
  if (expected === null || expected === undefined) {
    return actual === null || actual === undefined;
  }
  if (typeof expected === 'number') {
    if (typeof actual !== 'number') return false;
    if (/amount|price/.test(field)) return moneyMatch(expected, actual);
    if (/weight/.test(field)) return weightsMatch(expected, actual);
    return Math.abs(expected - actual) < 0.001;
  }
  if (typeof expected === 'string') {
    if (typeof actual !== 'string') return false;
    if (/date/.test(field)) {
      const pe = parseDateISO(expected);
      const pa = parseDateISO(actual);
      return pe !== null && pe === pa;
    }
    if (/number/.test(field)) return invoiceNumbersMatch(expected, actual);
    if (/name|exporter|importer|seller|buyer|sender|consignee|description|product/.test(field)) {
      return productNamesMatch(expected, actual);
    }
    return expected.trim().toLowerCase() === actual.trim().toLowerCase();
  }
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function compareExtraction(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): FieldResult[] {
  const results: FieldResult[] = [];
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (field === 'products') {
      const expProducts = Array.isArray(expectedValue) ? expectedValue : [];
      const actProducts = Array.isArray(actual.products) ? actual.products : [];
      results.push({
        field: 'products.length',
        expected: expProducts.length,
        actual: actProducts.length,
        match: expProducts.length === actProducts.length,
      });
      expProducts.forEach((expProduct: Record<string, unknown>, i: number) => {
        const actProduct = (actProducts[i] ?? {}) as Record<string, unknown>;
        for (const [pField, pExpected] of Object.entries(expProduct)) {
          results.push({
            field: `products[${i}].${pField}`,
            expected: pExpected,
            actual: actProduct[pField] ?? null,
            match: fieldMatches(pField, pExpected, actProduct[pField] ?? null),
          });
        }
      });
      continue;
    }
    results.push({
      field,
      expected: expectedValue,
      actual: actual[field] ?? null,
      match: fieldMatches(field, expectedValue, actual[field] ?? null),
    });
  }
  return results;
}

async function main(): Promise<void> {
  const goldenDir = process.argv[2];
  if (!goldenDir) {
    console.error('Foydalanish: npm run eval:extraction -- <golden-papka>');
    process.exit(1);
  }

  const files = await fs.readdir(goldenDir);
  const expectedFiles = files.filter((f) => f.endsWith('.expected.json'));
  if (expectedFiles.length === 0) {
    console.error(`${goldenDir} ichida *.expected.json topilmadi`);
    process.exit(1);
  }

  // DocumentService'ning faqat OCR metodlari ishlatiladi — DB kerak emas
  const documentService = new DocumentService(null as unknown as PrismaClient);

  let totalFields = 0;
  let matchedFields = 0;
  const perFieldStats = new Map<string, { total: number; matched: number }>();

  for (const expectedFile of expectedFiles) {
    const base = expectedFile.replace(/\.expected\.json$/, '');
    const docFile = files.find(
      (f) => f !== expectedFile && f.startsWith(base + '.') && /\.(pdf|jpe?g)$/i.test(f)
    );
    if (!docFile) {
      console.warn(`⚠️  ${base}: mos PDF/JPG topilmadi, o'tkazib yuborildi`);
      continue;
    }

    const expected: ExpectedFile = JSON.parse(
      await fs.readFile(path.join(goldenDir, expectedFile), 'utf-8')
    );
    const docPath = path.join(goldenDir, docFile);

    console.log(`\n=== ${docFile} (${expected.documentType}) ===`);

    const isPdf = /\.pdf$/i.test(docFile);
    const text = isPdf
      ? (await documentService.extractTextFromPdfViaVision(docPath)).text
      : await documentService.extractTextFromImage(docPath);

    const actual = (await analyzeDocument(text, expected.documentType)) as unknown as Record<
      string,
      unknown
    >;

    const results = compareExtraction(expected.extraction, actual);
    for (const r of results) {
      totalFields++;
      if (r.match) matchedFields++;
      // Maydon nomini indekssiz jamlaymiz (products[0].name → products.name)
      const key = r.field.replace(/\[\d+\]/, '');
      const stat = perFieldStats.get(key) ?? { total: 0, matched: 0 };
      stat.total++;
      if (r.match) stat.matched++;
      perFieldStats.set(key, stat);

      const mark = r.match ? '✓' : '✗';
      const detail = r.match
        ? ''
        : `  kutilgan: ${JSON.stringify(r.expected)}  |  olingan: ${JSON.stringify(r.actual)}`;
      console.log(` ${mark} ${r.field}${detail}`);
    }
  }

  console.log('\n========== MAYDON BO\'YICHA ANIQLIK ==========');
  const sorted = [...perFieldStats.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [field, stat] of sorted) {
    const pct = ((stat.matched / stat.total) * 100).toFixed(0);
    console.log(` ${field.padEnd(35)} ${stat.matched}/${stat.total} (${pct}%)`);
  }
  const totalPct = totalFields > 0 ? ((matchedFields / totalFields) * 100).toFixed(1) : '0';
  console.log(`\nJAMI: ${matchedFields}/${totalFields} maydon mos (${totalPct}%)`);
}

main().catch((error) => {
  console.error('Eval xatosi:', error);
  process.exit(1);
});
