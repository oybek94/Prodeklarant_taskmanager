import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';

const m = vi.hoisted(() => ({
  invoiceFindFirst: vi.fn(),
  contractFindUnique: vi.fn(),
  taskFindUnique: vi.fn(),
  render: vi.fn(),
  sendDocument: vi.fn(),
  callTelegram: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    invoice: { findFirst: m.invoiceFindFirst },
    contract: { findUnique: m.contractFindUnique },
    task: { findUnique: m.taskFindUnique },
  },
}));
vi.mock('../services/invoice-pdf-render', () => ({ renderInvoicePdf: m.render }));
vi.mock('../services/telegram-bot-api', () => ({ sendTelegramDocument: m.sendDocument, callTelegram: m.callTelegram }));

import { cargoInvoiceFileName, sendCargoInvoicePdf } from '../services/client-cargo-invoice-pdf.service';

const LOGO_DIR = path.resolve(__dirname, '../../uploads/images');
const LOGO_NAME = 'test-cargo-pdf-logo.png';

const invoiceRow = (over: Record<string, unknown> = {}) => ({
  id: 1,
  taskId: 900,
  clientId: 2,
  contractId: 5,
  invoiceNumber: '12/26',
  date: new Date('2026-11-27T00:00:00.000Z'),
  additionalInfo: { vehicleNumber: '40232BAA / 401234AA' },
  items: [{ id: 1, name: 'Яблоки', unitPrice: new Prisma.Decimal('1.50') }],
  ...over,
});
const contractRow = (over: Record<string, unknown> = {}) => ({
  id: 5,
  contractNumber: '77',
  companyLogoUrl: null,
  sealUrl: '/uploads/images/seal.png',
  sellerSealUrl: '/uploads/images/seal.png',
  sellerSignatureUrl: '/uploads/images/sign.png',
  ...over,
});

const params = { botToken: '123:TEST', clientId: 2, chatId: '-100123', taskId: 900 };
const renderedSource = () => m.render.mock.calls[0][0];

beforeAll(async () => {
  await mkdir(LOGO_DIR, { recursive: true });
  await writeFile(path.join(LOGO_DIR, LOGO_NAME), Buffer.from([1, 2, 3]));
});
afterAll(async () => {
  await rm(path.join(LOGO_DIR, LOGO_NAME), { force: true });
});

beforeEach(() => {
  Object.values(m).forEach((fn) => fn.mockReset());
  m.invoiceFindFirst.mockResolvedValue(invoiceRow());
  m.contractFindUnique.mockResolvedValue(contractRow());
  m.taskFindUnique.mockResolvedValue({ id: 900, title: '12/26 АВТО 40232BAA', client: { id: 2, name: 'Клиент' }, branch: null });
  m.render.mockResolvedValue(Buffer.from('%PDF-1'));
  m.sendDocument.mockResolvedValue({ ok: true, result: {} });
  m.callTelegram.mockResolvedValue({ ok: true, result: {} });
});

describe('cargoInvoiceFileName', () => {
  it("raqam va birinchi davlat raqami; fayl nomida taqiqlangan belgi bo'lmaydi", () => {
    expect(cargoInvoiceFileName('12/26', '40232BAA / 401234AA')).toBe('12_26 АВТО 40232BAA.pdf');
    expect(cargoInvoiceFileName('7', undefined)).toBe('7.pdf');
  });
});

describe('sendCargoInvoicePdf', () => {
  it("invoys PDF'ini guruhga hujjat qilib yuboradi", async () => {
    expect(await sendCargoInvoicePdf({ ...params, replyToMessageId: 55 })).toEqual({ ok: true });
    expect(m.invoiceFindFirst.mock.calls[0][0].where).toEqual({ taskId: 900, clientId: 2 });
    const [token, document] = m.sendDocument.mock.calls[0];
    expect(token).toBe('123:TEST');
    expect(document).toMatchObject({ chatId: '-100123', filename: '12_26 АВТО 40232BAA.pdf', replyToMessageId: 55 });
    expect(document.file.toString()).toBe('%PDF-1');
    expect(document.caption).toContain('12/26');
  });

  it("chizishga JSON ko'rinishida beradi va pechat/imzo manzillarini bermaydi", async () => {
    await sendCargoInvoicePdf(params);
    const source = renderedSource();
    expect(source.invoice.date).toBe('2026-11-27T00:00:00.000Z');
    expect(source.invoice.items[0].unitPrice).toBe('1.5');
    expect(source.contract.contractNumber).toBe('77');
    expect(JSON.stringify(source)).not.toMatch(/seal|sign/i);
    expect(source.task.client.name).toBe('Клиент');
  });

  it("logotip fayli data: URI qilib beriladi", async () => {
    m.contractFindUnique.mockResolvedValue(contractRow({ companyLogoUrl: `/uploads/images/${LOGO_NAME}` }));
    await sendCargoInvoicePdf(params);
    expect(renderedSource().contract.companyLogoUrl).toBe('data:image/png;base64,AQID');
  });

  it("uploads papkasidan tashqaridagi yoki yo'q logotip tashlab ketiladi", async () => {
    for (const url of ['/uploads/../package.json', '/uploads/images/yoq.png', 'https://example.com/a.png']) {
      m.render.mockClear();
      m.contractFindUnique.mockResolvedValue(contractRow({ companyLogoUrl: url }));
      await sendCargoInvoicePdf(params);
      expect(renderedSource().contract.companyLogoUrl).toBeNull();
    }
  });

  it("boshqa mijozning yoki yo'q invoys: hech narsa yuborilmaydi", async () => {
    m.invoiceFindFirst.mockResolvedValue(null);
    const result = await sendCargoInvoicePdf(params);
    expect(result).toMatchObject({ ok: false });
    expect(m.render).not.toHaveBeenCalled();
    expect(m.sendDocument).not.toHaveBeenCalled();
  });

  it("chizish yiqilsa xato natija qaytadi, istisno otilmaydi", async () => {
    m.render.mockRejectedValue(new Error('shrift'));
    expect(await sendCargoInvoicePdf(params)).toMatchObject({ ok: false });
    expect(m.sendDocument).not.toHaveBeenCalled();
    expect(m.callTelegram).not.toHaveBeenCalled();
  });

  it("notifyOnFailure: guruhga qayta urinish haqida xabar yoziladi", async () => {
    m.sendDocument.mockResolvedValue({ ok: false, description: 'Bad Request' });
    await sendCargoInvoicePdf({ ...params, notifyOnFailure: true });
    expect(m.callTelegram).toHaveBeenCalledWith('123:TEST', 'sendMessage', expect.objectContaining({ chat_id: '-100123' }));
  });

  it("bir vaqtdagi ikki so'rov bitta hujjat yuboradi, tugagach yana yuborish mumkin", async () => {
    await Promise.all([sendCargoInvoicePdf(params), sendCargoInvoicePdf(params)]);
    expect(m.sendDocument).toHaveBeenCalledTimes(1);
    await sendCargoInvoicePdf(params);
    expect(m.sendDocument).toHaveBeenCalledTimes(2);
  });
});
