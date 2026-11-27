import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Invoys PDF'ini serverda chizish. Chizuvchi — frontenddan yig'ilgan mustaqil dastur
// (frontend/dist-bot-pdf), shuning uchun hujjat dasturdagi "PDF yuklab olish" bilan bir xil.
// Alohida jarayonda ishlaydi: API so'rovlari to'xtab qolmaydi, shrift keshi har safar toza.

const DEFAULT_RENDERER = path.resolve(__dirname, '../../../frontend/dist-bot-pdf/invoice-pdf.mjs');
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ERROR_LENGTH = 500;

const runRenderer = (renderer: string, output: string, input: string, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    // Chizuvchiga maxfiy o'zgaruvchilar (token, DB manzili) berilmaydi
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'production', PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
    const child = spawn(process.execPath, [renderer, output], { stdio: ['pipe', 'ignore', 'pipe'], env });
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(0, MAX_ERROR_LENGTH);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error('Invoys PDF belgilangan vaqt ichida chizilmadi'));
      if (code !== 0) return reject(new Error(stderr.trim() || `Invoys PDF chizilmadi (kod ${code})`));
      resolve();
    });
    // Jarayon kirishni o'qimay tugasa EPIPE chiqadi — sabab 'close' da ma'lum bo'ladi
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });

const renderNow = async (renderer: string, source: unknown, timeoutMs: number): Promise<Buffer> => {
  try {
    await access(renderer);
  } catch {
    throw new Error(`Invoys chizish dasturi topilmadi: ${renderer}`);
  }
  const dir = await mkdtemp(path.join(tmpdir(), 'invoice-pdf-'));
  try {
    const output = path.join(dir, 'invoice.pdf');
    await runRenderer(renderer, output, JSON.stringify(source), timeoutMs);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

/** Navbat: serverda bir vaqtda faqat bitta chizish jarayoni */
let queue: Promise<unknown> = Promise.resolve();

export function renderInvoicePdf(source: unknown, options: { timeoutMs?: number } = {}): Promise<Buffer> {
  const renderer = process.env.INVOICE_PDF_RENDERER?.trim() || DEFAULT_RENDERER;
  const result = queue.then(() => renderNow(renderer, source, options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  queue = result.catch(() => undefined);
  return result;
}
