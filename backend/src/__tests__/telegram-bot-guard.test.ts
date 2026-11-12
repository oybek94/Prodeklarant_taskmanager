import { describe, it, expect, vi } from 'vitest';
import type TelegramBot from 'node-telegram-bot-api';
import {
  collectChatIds,
  createChatAllowlist,
  guardBotUpdates,
  updateChatId,
} from '../services/telegram-bot-guard';

const GROUP_ID = -1001234567890;
const STRANGER_ID = 555;

const messageUpdate = (chatId: number, text: string): TelegramBot.Update => ({
  update_id: 1,
  message: { message_id: 1, date: 0, chat: { id: chatId, type: 'private' }, text },
});

const callbackUpdate = (chatId: number, data: string): TelegramBot.Update => ({
  update_id: 2,
  callback_query: {
    id: 'cb1',
    from: { id: chatId, is_bot: false, first_name: 'X' },
    chat_instance: 'ci',
    data,
    message: { message_id: 3, date: 0, chat: { id: chatId, type: 'private' } },
  },
});

describe('collectChatIds', () => {
  it('vergul bilan ajratilgan, bo\'sh va null qiymatlarni tozalab to\'plamga yig\'adi', () => {
    expect(collectChatIds(['-100123', ' 55 , 66 ', null, undefined, ''])).toEqual(new Set(['-100123', '55', '66']));
  });
});

describe('createChatAllowlist', () => {
  it('faqat ro\'yxatdagi chatga ruxsat beradi', async () => {
    const isAllowed = createChatAllowlist(async () => [String(GROUP_ID), '77']);
    expect(await isAllowed(GROUP_ID)).toBe(true);
    expect(await isAllowed(77)).toBe(true);
    expect(await isAllowed(STRANGER_ID)).toBe(false);
  });

  it('ro\'yxat bo\'sh bo\'lsa hech kimga ruxsat bermaydi', async () => {
    const isAllowed = createChatAllowlist(async () => [undefined, '']);
    expect(await isAllowed(GROUP_ID)).toBe(false);
  });

  it('ro\'yxatni yuklab bo\'lmasa rad etadi (fail closed)', async () => {
    const isAllowed = createChatAllowlist(async () => {
      throw new Error('db down');
    });
    expect(await isAllowed(GROUP_ID)).toBe(false);
  });

  it('TTL ichida keshdan oladi, muddat o\'tgach qayta yuklaydi', async () => {
    let now = 1_000;
    const load = vi.fn(async () => ['77']);
    const isAllowed = createChatAllowlist(load, { ttlMs: 60_000, now: () => now });

    await isAllowed(77);
    await isAllowed(77);
    expect(load).toHaveBeenCalledTimes(1);

    now += 60_001;
    await isAllowed(77);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('updateChatId', () => {
  it('xabar, tahrirlangan xabar va tugma bosilishidan chat ID ni oladi', () => {
    expect(updateChatId(messageUpdate(5, 'salom'))).toBe(5);
    expect(updateChatId({ update_id: 1, edited_message: { message_id: 1, date: 0, chat: { id: 6, type: 'group' } } })).toBe(6);
    expect(updateChatId(callbackUpdate(7, 'x'))).toBe(7);
  });

  it('chat bo\'lmagan update uchun null qaytaradi', () => {
    expect(updateChatId({ update_id: 1 })).toBeNull();
  });
});

describe('guardBotUpdates', () => {
  const setup = (publicCommand?: RegExp) => {
    const dispatched: TelegramBot.Update[] = [];
    const bot = {
      processUpdate: (update: TelegramBot.Update): unknown => {
        dispatched.push(update);
        return undefined;
      },
    };
    guardBotUpdates(bot, async (chatId) => chatId === GROUP_ID, { publicCommand });
    return { bot, dispatched };
  };

  it('ruxsat etilgan chatdan kelgan buyruqni handlerlarga uzatadi', async () => {
    const { bot, dispatched } = setup();
    await bot.processUpdate(messageUpdate(GROUP_ID, '/balans'));
    expect(dispatched).toHaveLength(1);
  });

  it('begona chatdan kelgan buyruqni tashlab yuboradi', async () => {
    const { bot, dispatched } = setup();
    await bot.processUpdate(messageUpdate(STRANGER_ID, '/balans'));
    expect(dispatched).toHaveLength(0);
  });

  it('begona chatdan kelgan tugma bosilishini tashlab yuboradi', async () => {
    const { bot, dispatched } = setup();
    await bot.processUpdate(callbackUpdate(STRANGER_ID, 'chiqim_confirm'));
    expect(dispatched).toHaveLength(0);
  });

  it('chat aniqlanmagan update\'ni tashlab yuboradi', async () => {
    const { bot, dispatched } = setup();
    await bot.processUpdate({ update_id: 9 });
    expect(dispatched).toHaveLength(0);
  });

  it('ochiq buyruq (masalan /myid) begonaga ham ishlaydi, qolganlari yo\'q', async () => {
    const { bot, dispatched } = setup(/^\/myid(@\w+)?\s*$/);
    await bot.processUpdate(messageUpdate(STRANGER_ID, '/myid'));
    await bot.processUpdate(messageUpdate(STRANGER_ID, '/myid@pd_lead_bot'));
    await bot.processUpdate(messageUpdate(STRANGER_ID, '/bugun'));
    expect(dispatched).toHaveLength(2);
  });
});
