import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendTelegramDocument } from '../services/telegram-bot-api';

const reply = (body: unknown) => ({ status: 200, json: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendTelegramDocument', () => {
  const document = { chatId: '-100123', file: Buffer.from('%PDF-1'), filename: '12 АВТО.pdf', caption: 'Инвойс' };

  it('hujjatni multipart qilib yuboradi', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ ok: true, result: { message_id: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendTelegramDocument('123:TEST', { ...document, replyToMessageId: 55 })).toMatchObject({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot123:TEST/sendDocument');
    const form = init.body as FormData;
    expect(form.get('chat_id')).toBe('-100123');
    expect(form.get('caption')).toBe('Инвойс');
    expect(JSON.parse(String(form.get('reply_parameters')))).toEqual({ message_id: 55, allow_sending_without_reply: true });
    const file = form.get('document') as File;
    expect(file.name).toBe('12 АВТО.pdf');
    expect(file.type).toBe('application/pdf');
    expect(await file.text()).toBe('%PDF-1');
  });

  it("javob berilmagan bo'lsa reply_parameters yuborilmaydi", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ ok: true, result: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await sendTelegramDocument('123:TEST', document);
    expect((fetchMock.mock.calls[0][1].body as FormData).has('reply_parameters')).toBe(false);
  });

  it('Telegram rad etsa va tarmoq xatosida token chiqmaydigan tavsif qaytadi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ ok: false, description: 'chat not found' })));
    expect(await sendTelegramDocument('123:TEST', document)).toEqual({ ok: false, description: 'chat not found' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed https://api.telegram.org/bot123:TEST')));
    const failed = await sendTelegramDocument('123:TEST', document);
    expect(failed).toEqual({ ok: false, description: 'TypeError' });
  });
});
