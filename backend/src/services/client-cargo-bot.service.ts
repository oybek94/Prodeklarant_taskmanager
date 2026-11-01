import TelegramBot from 'node-telegram-bot-api';
import { linkGroupByCode, migrateBotGroupChatId } from './client-cargo-bot-link.service';

// Mijozlar uchun yuk ma'lumotlari boti. Forma Telegram Mini App'da to'ldiriladi (frontend: pages/TgCargo.tsx,
// API: routes/tg-cargo.ts). Bu servis faqat guruhni mijozga ulaydi (/ulash) va /yangi da Mini App tugmasini yuboradi.

const LINK_ATTEMPT_LIMIT = 10;
const LINK_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

const linkAttempts = new Map<number, { count: number; resetAt: number }>();

function isLinkRateLimited(chatId: number): boolean {
  const now = Date.now();
  const entry = linkAttempts.get(chatId);
  if (!entry || entry.resetAt <= now) {
    linkAttempts.set(chatId, { count: 1, resetAt: now + LINK_ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LINK_ATTEMPT_LIMIT;
}

/** Mini App to'g'ridan-to'g'ri havolasi: guruh chat ID si start_param sifatida ketadi (API uni imzo bilan tekshiradi) */
export function buildMiniAppLink(baseLink: string, chatId: number): string {
  return `${baseLink}?startapp=${chatId}`;
}

async function handleLink(instance: TelegramBot, chatId: number, code: string | undefined): Promise<void> {
  if (!code) {
    await instance.sendMessage(chatId, "Kodni ham yozing: /ulash KOD. Kodni Prodeklarant'dagi mijoz kartasidan oling.");
    return;
  }
  if (isLinkRateLimited(chatId)) {
    await instance.sendMessage(chatId, "Juda ko'p urinish. Bir soatdan keyin qayta urinib ko'ring.");
    return;
  }
  const result = await linkGroupByCode(code, String(chatId));
  if (result.ok) {
    await instance.sendMessage(chatId, `✅ Guruh «${result.clientName}» mijoziga ulandi.\nYuk ma'lumotini kiritish uchun /yangi deb yozing.`);
  } else if (result.reason === 'GROUP_TAKEN') {
    await instance.sendMessage(chatId, "Bu guruh allaqachon mijozga ulangan. Avval Prodeklarant'da uni uzing.");
  } else {
    await instance.sendMessage(chatId, "Kod noto'g'ri yoki muddati o'tgan. Prodeklarant'dan yangi kod oling.");
  }
}

function registerHandlers(instance: TelegramBot, miniAppLink: string | undefined): void {
  const reportError = (where: string, chatId: number, e: unknown) => {
    console.error(`[ClientCargoBot] ${where} xatosi:`, e instanceof Error ? e.message : e);
    instance.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.").catch(() => undefined);
  };
  const requireGroup = async (msg: TelegramBot.Message): Promise<boolean> => {
    if (msg.chat.type === 'private') {
      await instance.sendMessage(msg.chat.id, "Bu bot mijozning Telegram guruhida ishlaydi. Botni guruhga qo'shing va guruhda yozing.");
      return false;
    }
    return true;
  };

  instance.onText(/^\/(?:start|help)(?:@\w+)?\s*$/, async (msg) => {
    await instance.sendMessage(
      msg.chat.id,
      "Yuk ma'lumotlarini yig'uvchi bot.\n\n/yangi — yuk ma'lumotini kiritish formasini ochish\n/ulash KOD — guruhni mijozga ulash (bir marta)"
    );
  });

  instance.onText(/^\/ulash(?:@\w+)?(?:\s+(\S+))?\s*$/, async (msg, match) => {
    try {
      if (!(await requireGroup(msg))) return;
      await handleLink(instance, msg.chat.id, match?.[1]);
    } catch (e) {
      reportError('/ulash', msg.chat.id, e);
    }
  });

  instance.onText(/^\/yangi(?:@\w+)?\s*$/, async (msg) => {
    try {
      if (!(await requireGroup(msg))) return;
      if (!miniAppLink) {
        await instance.sendMessage(msg.chat.id, "Forma hali sozlanmagan. Administratorga murojaat qiling.");
        return;
      }
      await instance.sendMessage(msg.chat.id, "📋 Yuk ma'lumotini kiritish uchun formani oching:", {
        reply_markup: { inline_keyboard: [[{ text: '📝 Formani ochish', url: buildMiniAppLink(miniAppLink, msg.chat.id) }]] },
      });
    } catch (e) {
      reportError('/yangi', msg.chat.id, e);
    }
  });

  // Oddiy guruh superguruhga o'tganda chat ID o'zgaradi — bog'lanishni yangilaymiz
  instance.on('message', async (msg) => {
    try {
      if (msg.migrate_to_chat_id) await migrateBotGroupChatId(String(msg.chat.id), String(msg.migrate_to_chat_id));
    } catch (e) {
      console.error('[ClientCargoBot] migrate xatosi:', e instanceof Error ? e.message : e);
    }
  });
}

export const initClientCargoBot = () => {
  // Bot faqat serverda ishlashi kerak: bitta tokenni bir nechta instansiya polling qilsa Telegram 409 beradi.
  if (process.env.CLIENT_BOT_ENABLED !== 'true') {
    console.warn("[ClientCargoBot] CLIENT_BOT_ENABLED=true emas — yuk ma'lumotlari boti bu instansiyada ishga tushirilmadi (faqat serverda yoqiladi).");
    return;
  }
  const token = process.env.CLIENT_BOT_TOKEN;
  if (!token) {
    console.warn("[ClientCargoBot] CLIENT_BOT_TOKEN aniqlanmagan — yuk ma'lumotlari boti ishga tushmadi.");
    return;
  }
  if (token === process.env.FINANCE_BOT_TOKEN || token === process.env.TELEGRAM_BOT_TOKEN) {
    console.error("[ClientCargoBot] CLIENT_BOT_TOKEN boshqa bot tokeni bilan bir xil — Telegram 409 bermasligi uchun ishga tushirilmadi. Alohida bot yarating.");
    return;
  }
  const miniAppLink = process.env.CLIENT_BOT_MINIAPP_LINK?.trim().replace(/\/+$/, '');
  if (!miniAppLink) {
    console.warn("[ClientCargoBot] CLIENT_BOT_MINIAPP_LINK aniqlanmagan (masalan https://t.me/pd_client_bot/cargo) — /yangi forma ochmaydi.");
  }

  const bot = new TelegramBot(token, { polling: true });
  bot.on('polling_error', (error) => {
    console.error('[ClientCargoBot] Polling error:', error.message);
  });
  registerHandlers(bot, miniAppLink);

  bot
    .setMyCommands([
      { command: 'yangi', description: "Yuk ma'lumotini kiritish formasini ochish" },
      { command: 'ulash', description: 'Guruhni mijozga ulash (KOD bilan)' },
    ])
    .catch((e: unknown) => console.error('[ClientCargoBot] setMyCommands xatosi:', e instanceof Error ? e.message : e));

  console.log("[ClientCargoBot] Yuk ma'lumotlari boti ishga tushdi.");
};
