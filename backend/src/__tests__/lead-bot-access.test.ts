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

import { initLeadReminderBot } from '../services/lead-reminder-bot.service';

const GROUP_ID = -1002223334445;
const SELLER_CHAT_ID = 888;
const EXTRA_CHAT_ID = 1000;
const STRANGER_ID = 555;

const command = (chatId: number, text: string) => ({
  update_id: 1,
  message: { message_id: 1, date: 0, chat: { id: chatId, type: 'private' }, text },
});

let bot: FakeBotInstance;

beforeAll(() => {
  process.env.TELEGRAM_BOT_TOKEN = `test-${Math.random().toString(36).slice(2)}`;
  process.env.TELEGRAM_GROUP_CHAT_ID = String(GROUP_ID);
  process.env.LEAD_BOT_POLLING = 'true';
  process.env.LEAD_BOT_ALLOWED_CHAT_IDS = `999, ${EXTRA_CHAT_ID}`;
  process.env.FINANCE_BOT_ENABLED = 'false';
  state.userFindMany.mockResolvedValue([{ telegramChatId: String(SELLER_CHAT_ID) }]);

  initLeadReminderBot();
  bot = state.instances[0];
});

describe('lid eslatma boti — faqat ruxsat etilgan chatlar', () => {
  it('begona foydalanuvchining /bugun buyrug\'i handlerlarga yetmaydi (lidlar oshkor bo\'lmaydi)', async () => {
    await bot.processUpdate(command(STRANGER_ID, '/bugun'));
    expect(bot.dispatched).toHaveLength(0);
  });

  it('begona foydalanuvchi lid tugmasini bosa olmaydi', async () => {
    await bot.processUpdate({
      update_id: 2,
      callback_query: {
        id: 'cb',
        from: { id: STRANGER_ID, is_bot: false, first_name: 'X' },
        chat_instance: 'ci',
        data: 'lead_done:12',
        message: { message_id: 2, date: 0, chat: { id: STRANGER_ID, type: 'private' } },
      },
    });
    expect(bot.dispatched).toHaveLength(0);
  });

  it('/myid begonaga ham javob beradi (xodim o\'z chat ID sini bilib olishi uchun)', async () => {
    await bot.processUpdate(command(STRANGER_ID, '/myid'));
    expect(bot.dispatched).toHaveLength(1);
  });

  it('guruh va Telegram ID si kiritilgan faol xodim buyruqlari ishlaydi', async () => {
    await bot.processUpdate(command(GROUP_ID, '/bugun'));
    await bot.processUpdate(command(SELLER_CHAT_ID, '/bugun'));
    expect(bot.dispatched).toHaveLength(3);
    expect(state.userFindMany).toHaveBeenCalledWith({
      where: { active: true, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });
  });

  it("LEAD_BOT_ALLOWED_CHAT_IDS dagi qo'shimcha chat ishlaydi", async () => {
    await bot.processUpdate(command(EXTRA_CHAT_ID, '/bugun'));
    expect(bot.dispatched).toHaveLength(4);
  });
});
