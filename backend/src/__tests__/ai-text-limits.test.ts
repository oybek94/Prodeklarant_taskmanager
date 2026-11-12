import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// config.ts JWT secret'larsiz process.exit qiladi — importlardan oldin o'rnatamiz.
const mocks = vi.hoisted(() => {
  const randomKey = () => Array.from({ length: 48 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  process.env.JWT_SECRET = randomKey();
  process.env.JWT_REFRESH_SECRET = randomKey();
  return { analyze: vi.fn(), compare: vi.fn() };
});

// OpenAI'ga ketadigan chaqiruvlar — testda haqiqiy so'rov yuborilmaydi
vi.mock('../services/invoice.service', () => ({ InvoiceService: class { analyze = mocks.analyze; } }));
vi.mock('../services/st1.service', () => ({ ST1Service: class { analyze = mocks.analyze; } }));
vi.mock('../services/fito.service', () => ({ FitoService: class { analyze = mocks.analyze; } }));
vi.mock('../services/cargo-text.service', () => ({ CargoTextService: class { parse = mocks.analyze; } }));
vi.mock('../ai/document.analyzer', () => ({ compareInvoiceST1: mocks.compare }));
vi.mock('../services/data-assistant.service', async () => {
  const { z } = await import('zod');
  return { DataAssistantService: class {}, dataAssistantRequestSchema: z.object({}) };
});

import aiRouter from '../routes/ai';
import { MAX_AI_TEXT_LENGTH } from '../routes/ai';
import { signAccessToken } from '../utils/jwt';

const token = signAccessToken({ sub: 7, role: 'DEKLARANT', branchId: 1, name: 'Xodim' });

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/api/ai', aiRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  mocks.analyze.mockReset();
  mocks.analyze.mockResolvedValue({});
  mocks.compare.mockReset();
  mocks.compare.mockResolvedValue({});
});

const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}/api/ai${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

const tooLong = 'x'.repeat(MAX_AI_TEXT_LENGTH + 1);

describe('AI endpointlari — matn uzunligi chegarasi (OpenAI xarajati)', () => {
  it('chegara aniqlangan va odatdagi hujjat matnidan ancha katta', () => {
    expect(MAX_AI_TEXT_LENGTH).toBeGreaterThanOrEqual(50_000);
    expect(tooLong.length).toBe(MAX_AI_TEXT_LENGTH + 1);
  });

  it.each(['/analyze/invoice', '/analyze/st1', '/analyze/fito'])('%s juda uzun matnni OpenAI\'ga yubormaydi', async (path) => {
    expect((await post(path, { text: tooLong })).status).toBe(400);
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it('/compare/invoice-st1 juda uzun matnni rad etadi', async () => {
    expect((await post('/compare/invoice-st1', { invoiceText: tooLong, st1Text: 'qisqa' })).status).toBe(400);
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it('odatdagi hujjat matni qabul qilinadi', async () => {
    expect((await post('/analyze/invoice', { text: 'Invoice No 12 ...' })).status).toBe(200);
    expect(mocks.analyze).toHaveBeenCalledTimes(1);
  });
});
