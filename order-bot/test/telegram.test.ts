import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DONE_CALLBACK,
  UNDONE_CALLBACK,
  escapeHtml,
  renderText,
  statusKeyboard,
} from '../src/telegram/markup.js';
import { handleCallback, type CallbackQuery } from '../src/telegram/updates.js';
import { sendMessage } from '../src/telegram/send.js';

type Call = { method: string; payload: Record<string, unknown> };

/** Telegram API chaqiruvlarini yozib boradi va har biriga `ok` javob qaytaradi. */
const mockTelegram = (): Call[] => {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
    calls.push({
      method: String(url).split('/').pop()!,
      payload: JSON.parse(init.body),
    });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: { message_id: 1 } }),
    };
  });
  return calls;
};

const CHAT = { id: -100123 };
const query = (data: string, text: string): CallbackQuery => ({
  id: 'cb-1',
  data,
  message: { message_id: 42, chat: CHAT, text },
});

const ORDER_TEXT = ['Поставщик: OOO "VOSTOCHNIY PRODUKT"', 'PLU: 3644102'].join('\n');

let calls: Call[];
beforeEach(() => {
  calls = mockTelegram();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('escapeHtml', () => {
  it('HTML uchun xavfli belgilarni ekranlaydi', () => {
    expect(escapeHtml('R&D <b> 5 > 3')).toBe('R&amp;D &lt;b&gt; 5 &gt; 3');
  });

  it("zakazdagi odatiy belgilarga tegmaydi", () => {
    const text = 'Поставщик: OOO "VOSTOCHNIY PRODUKT" — «Горелово», № 5, 14mm+';
    expect(escapeHtml(text)).toBe(text);
  });
});

describe('renderText', () => {
  it('bajarilmagan matnni chizmaydi', () => {
    expect(renderText('Товар: Виноград', false)).toBe('Товар: Виноград');
  });

  it('bajarilgan matnni butunlay chizadi', () => {
    expect(renderText('Товар: Виноград\nPLU: 1', true)).toBe(
      '<s>Товар: Виноград\nPLU: 1</s>',
    );
  });

  it('chizishdan oldin ekranlaydi — teg buzilmaydi', () => {
    expect(renderText('R&D', true)).toBe('<s>R&amp;D</s>');
  });
});

describe('statusKeyboard', () => {
  it('bajarilmagan xabarga «Bajarildi» tugmasini qo\'yadi', () => {
    expect(statusKeyboard(false).inline_keyboard[0]![0]).toEqual({
      text: '✅ Bajarildi',
      callback_data: DONE_CALLBACK,
    });
  });

  it('bajarilgan xabarga qaytarish tugmasini qo\'yadi', () => {
    expect(statusKeyboard(true).inline_keyboard[0]![0]).toEqual({
      text: '↩️ Bajarilmadi',
      callback_data: UNDONE_CALLBACK,
    });
  });
});

describe('sendMessage', () => {
  it('HTML rejimida va tugma bilan yuboradi', async () => {
    const sent = await sendMessage('T', '-100123', ORDER_TEXT);

    expect(sent).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe('sendMessage');
    expect(calls[0]!.payload).toMatchObject({
      chat_id: '-100123',
      text: ORDER_TEXT,
      parse_mode: 'HTML',
      reply_markup: statusKeyboard(false),
    });
  });
});

describe('handleCallback', () => {
  it('«Bajarildi» bosilganda matnni chizadi va qaytarish tugmasini qo\'yadi', async () => {
    await handleCallback('T', query(DONE_CALLBACK, ORDER_TEXT));

    const edit = calls.find((call) => call.method === 'editMessageText')!;
    expect(edit.payload).toMatchObject({
      chat_id: CHAT.id,
      message_id: 42,
      text: `<s>${ORDER_TEXT}</s>`,
      parse_mode: 'HTML',
      reply_markup: statusKeyboard(true),
    });
  });

  it('«Bajarilmadi» bosilganda matnni asl holiga qaytaradi', async () => {
    await handleCallback('T', query(UNDONE_CALLBACK, ORDER_TEXT));

    const edit = calls.find((call) => call.method === 'editMessageText')!;
    expect(edit.payload).toMatchObject({
      text: ORDER_TEXT,
      reply_markup: statusKeyboard(false),
    });
  });

  it('spinnerni har doim to\'xtatadi', async () => {
    await handleCallback('T', query(DONE_CALLBACK, ORDER_TEXT));

    const answer = calls.find((call) => call.method === 'answerCallbackQuery')!;
    expect(answer.payload).toMatchObject({ callback_query_id: 'cb-1' });
  });

  it('notanish tugmada xabarga tegmaydi', async () => {
    await handleCallback('T', query('boshqa', ORDER_TEXT));

    expect(calls.map((call) => call.method)).toEqual(['answerCallbackQuery']);
  });

  it('matnsiz xabarda xabarga tegmaydi', async () => {
    await handleCallback('T', { id: 'cb-2', data: DONE_CALLBACK, message: undefined });

    expect(calls.map((call) => call.method)).toEqual(['answerCallbackQuery']);
  });
});
