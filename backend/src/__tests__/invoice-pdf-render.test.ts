// Chizish dasturi alohida jarayon: bu yerda uning o'rniga kichik soxta dastur ishga tushiriladi
// (haqiqiy jarayon, stdin va chiqish fayli bilan).
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderInvoicePdf } from '../services/invoice-pdf-render';

let dir = '';
const script = async (name: string, body: string): Promise<string> => {
  const file = path.join(dir, name);
  await writeFile(file, body);
  return file;
};

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pdf-render-test-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});
afterEach(() => {
  delete process.env.INVOICE_PDF_RENDERER;
});

describe('renderInvoicePdf', () => {
  it("manbani stdin orqali beradi va yozilgan faylni qaytaradi", async () => {
    process.env.INVOICE_PDF_RENDERER = await script(
      'echo.mjs',
      `import { writeFileSync } from 'node:fs';
       let input = '';
       process.stdin.on('data', (chunk) => (input += chunk));
       process.stdin.on('end', () => writeFileSync(process.argv[2], '%PDF-' + JSON.parse(input).invoice.invoiceNumber));`
    );
    const pdf = await renderInvoicePdf({ invoice: { invoiceNumber: 'Инвойс-12' } });
    expect(pdf.toString('utf8')).toBe('%PDF-Инвойс-12');
  });

  it("dastur xato bilan tugasa stderr dagi sabab xatoda keladi", async () => {
    process.env.INVOICE_PDF_RENDERER = await script('fail.mjs', `process.stderr.write("Shriftda yo'q belgi"); process.exitCode = 1;`);
    await expect(renderInvoicePdf({})).rejects.toThrow("Shriftda yo'q belgi");
  });

  it("dastur fayli yo'q bo'lsa tushunarli xato", async () => {
    process.env.INVOICE_PDF_RENDERER = path.join(dir, 'yoq.mjs');
    await expect(renderInvoicePdf({})).rejects.toThrow(/topilmadi/);
  });

  it("osilib qolgan dastur vaqt tugagach to'xtatiladi", async () => {
    process.env.INVOICE_PDF_RENDERER = await script('hang.mjs', 'setInterval(() => {}, 1000);');
    await expect(renderInvoicePdf({}, { timeoutMs: 500 })).rejects.toThrow(/vaqt/);
  });

  it("oldingi xato keyingi chizishga ta'sir qilmaydi (navbat tiqilmaydi)", async () => {
    process.env.INVOICE_PDF_RENDERER = await script('fail2.mjs', 'process.exitCode = 1;');
    const failing = renderInvoicePdf({});
    process.env.INVOICE_PDF_RENDERER = await script('ok.mjs', `import { writeFileSync } from 'node:fs'; writeFileSync(process.argv[2], '%PDF-ok'); process.exit(0);`);
    await expect(failing).rejects.toThrow();
    await expect(renderInvoicePdf({})).resolves.toEqual(Buffer.from('%PDF-ok'));
  });
});
