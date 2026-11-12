import type TelegramBot from 'node-telegram-bot-api';

// Telegram botlari uchun "sukut bo'yicha yopiq" himoya.
//
// Bot username'i sir emas: uni topgan har qanday Telegram foydalanuvchisi botga
// yozishi mumkin. Moliya va lid botlari chat ID ni tekshirmagani uchun begona odam
// seyf balanslarini ko'rishi, xarajat yozishi yoki lidlar ro'yxatini olishi mumkin edi.
// Bu yerda update handlerlarga yetib bormasidan OLDIN ruxsat etilgan chatlar
// ro'yxatiga solishtiriladi — yangi handler qo'shilganda tekshiruvni unutib bo'lmaydi.

/** Vergul bilan ajratilgan qiymatlarni (env yoki bazadan) bitta chat ID to'plamiga yig'adi */
export function collectChatIds(values: ReadonlyArray<string | null | undefined>): Set<string> {
  const ids = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(',')) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

interface AllowlistOptions {
  ttlMs?: number;
  now?: () => number;
}

/**
 * Ruxsat etilgan chatlar ro'yxatini `load` orqali oladi va `ttlMs` davomida keshlaydi.
 * Ro'yxatni yuklab bo'lmasa (masalan baza ishlamayapti) — rad etadi.
 */
export function createChatAllowlist(
  load: () => Promise<ReadonlyArray<string | null | undefined>>,
  { ttlMs = 60_000, now = Date.now }: AllowlistOptions = {}
): (chatId: number | string) => Promise<boolean> {
  let cache: { ids: Set<string>; expiresAt: number } | null = null;

  return async (chatId) => {
    try {
      if (!cache || cache.expiresAt <= now()) {
        cache = { ids: collectChatIds(await load()), expiresAt: now() + ttlMs };
      }
      return cache.ids.has(String(chatId));
    } catch (error) {
      console.error('[TelegramBotGuard] Ruxsat ro\'yxatini yuklab bo\'lmadi:', error instanceof Error ? error.message : error);
      return false;
    }
  };
}

/** Update qaysi chatdan kelganini aniqlaydi; chat bo'lmasa (inline query va h.k.) null */
export function updateChatId(update: TelegramBot.Update): number | null {
  const message =
    update.message ??
    update.edited_message ??
    update.callback_query?.message ??
    update.channel_post ??
    update.edited_channel_post;
  return message?.chat.id ?? null;
}

interface UpdateDispatcher {
  processUpdate(update: TelegramBot.Update): unknown;
}

interface GuardOptions {
  /** Ruxsatsiz chatga ham javob beriladigan zararsiz buyruq (masalan `/myid`) */
  publicCommand?: RegExp;
}

/**
 * Botning `processUpdate` kirish nuqtasini o'raydi: ruxsat etilmagan chatdan kelgan
 * update hech bir handlerga (onText, message, callback_query) uzatilmaydi.
 */
export function guardBotUpdates(
  bot: UpdateDispatcher,
  isAllowedChat: (chatId: number) => Promise<boolean>,
  { publicCommand }: GuardOptions = {}
): void {
  const dispatch = bot.processUpdate.bind(bot);

  bot.processUpdate = async (update: TelegramBot.Update): Promise<void> => {
    const chatId = updateChatId(update);
    if (chatId === null) return;

    const isPublicCommand = !!publicCommand && publicCommand.test(update.message?.text?.trim() ?? '');
    if (!isPublicCommand && !(await isAllowedChat(chatId))) {
      console.warn(`[TelegramBotGuard] Ruxsatsiz chat rad etildi: ${chatId}`);
      return;
    }

    try {
      dispatch(update);
    } catch (error) {
      console.error('[TelegramBotGuard] Update ishlov berishda xato:', error instanceof Error ? error.message : error);
    }
  };
}
