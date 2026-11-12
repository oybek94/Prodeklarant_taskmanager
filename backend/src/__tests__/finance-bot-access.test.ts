import { describe, it, expect, vi, beforeAll } from 'vitest';

interface FakeBotInstance {
  dispatched: unknown[];
  processUpdate(update: unknown): unknown;
}

const state = vi.hoisted(() => ({
  instances: [] as FakeBotInstance[],
  userFindMany: vi.fn(),
}));

// Telegram kutubxonasi o'rniga: handlerlarga yetib kelgan update'larni yozib oladi
vi.mock('node-telegram-bot-api', () => {
  class FakeBot implements FakeBotInstance {
    dispatched: unknown[] = [];
    constructor() {
      state.instances.push(this);
    }
    on() {}
    onText() {}
    sendMessage() {
      return Promise.resolve();
    }
    processUpdate(update: unknown) {
      this.dispatched.push(update);
    }
  }
  return { default: FakeBot };
});

vi.mock('../prisma', () => ({
  prisma: { user: { findMany: state.userFindMany } },
}));

import { initFinanceBot } from '../services/finance-bot.service';

const GROUP_ID = -1001112223334;
const ADMIN_CHAT_ID = 777;
const EXTRA_CHAT_ID = 1000;
const STRANGER_ID = 555;

const command = (chatId: number, text: string) => ({
  update_id: 1,
  message: { message_id: 1, date: 0, chat: { id: chatId, type: 'private' }, text },
});

let bot: FakeBotInstance;

beforeAll(() => {
  process.env.FINANCE_BOT_ENABLED = 'true';
  process.env.FINANCE_BOT_TOKEN = `test-${Math.random().toString(36).slice(2)}`;
  process.env.FINANCE_GROUP_CHAT_ID = String(GROUP_ID);
  process.env.FINANCE_BOT_ALLOWED_CHAT_IDS = `999, ${EXTRA_CHAT_ID}`;
  state.userFindMany.mockResolvedValue([{ telegramChatId: String(ADMIN_CHAT_ID) }]);

  initFinanceBot();
  bot = state.instances[0];
});

describe('moliya boti — faqat ruxsat etilgan chatlar', () => {
  it('begona Telegram foydalanuvchisining /balans buyrug\'i handlerlarga yetmaydi', async () => {
    await bot.processUpdate(command(STRANGER_ID, '/balans'));
    expect(bot.dispatched).toHaveLength(0);
  });

  it('begona foydalanuvchining tugma bosishi ham yetmaydi', async () => {
    await bot.processUpdate({
      update_id: 2,
      callback_query: {
        id: 'cb',
        from: { id: STRANGER_ID, is_bot: false, first_name: 'X' },
        chat_instance: 'ci',
        data: 'chiqim_confirm',
        message: { message_id: 2, date: 0, chat: { id: STRANGER_ID, type: 'private' } },
      },
    });
    expect(bot.dispatched).toHaveLength(0);
  });

  it('moliya guruhidan kelgan buyruq ishlaydi', async () => {
    await bot.processUpdate(command(GROUP_ID, '/balans'));
    expect(bot.dispatched).toHaveLength(1);
  });

  it('Telegram ID si tizimga kiritilgan adminning shaxsiy chati ishlaydi', async () => {
    await bot.processUpdate(command(ADMIN_CHAT_ID, '/balans'));
    expect(bot.dispatched).toHaveLength(2);
    expect(state.userFindMany).toHaveBeenCalledWith({
      where: { role: 'ADMIN', active: true, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });
  });

  it("FINANCE_BOT_ALLOWED_CHAT_IDS dagi qo'shimcha chat ishlaydi", async () => {
    await bot.processUpdate(command(EXTRA_CHAT_ID, '/balans'));
    expect(bot.dispatched).toHaveLength(3);
  });
});
