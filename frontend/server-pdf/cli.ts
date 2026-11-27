// Serverda invoys PDF'ini chizadigan dastur. Backend uni alohida jarayon sifatida ishga tushiradi:
//   node invoice-pdf.mjs <chiqish.pdf>   (stdin: { invoice, contract, task } JSON)
// Chizish kodi dasturdagi "PDF yuklab olish" bilan aynan bir xil.
// Xato bo'lsa sababi stderr ga yoziladi va jarayon 1 kodi bilan tugaydi.

import { writeFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';
import { buildInvoicePdfProps, parseInvoicePdfSource } from '../src/server-pdf/buildInvoicePdfProps';
import { renderFittedInvoicePdf } from '../src/components/invoice/pdf/pdfFit';
import {
  describeDroppedText,
  describeMissingGlyphs,
  PdfDroppedTextError,
  PdfMissingGlyphError,
} from '../src/components/invoice/pdf/pdfGlyphCheck';

const describe = (error: unknown): string => {
  if (error instanceof PdfMissingGlyphError) return describeMissingGlyphs(error.missing);
  if (error instanceof PdfDroppedTextError) return describeDroppedText(error.lines);
  return error instanceof Error ? error.message : "noma'lum xato";
};

const main = async (): Promise<void> => {
  const output = process.argv[2];
  if (!output) throw new Error('Chiqish fayli berilmagan');
  const source = parseInvoicePdfSource(JSON.parse(await text(process.stdin)));
  const blob = await renderFittedInvoicePdf(buildInvoicePdfProps(source));
  await writeFile(output, new Uint8Array(await blob.arrayBuffer()));
};

main().catch((error: unknown) => {
  process.stderr.write(describe(error));
  process.exitCode = 1;
});
