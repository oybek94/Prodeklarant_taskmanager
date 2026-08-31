import { log } from '../logger.js';
import { callTelegram } from './api.js';
import { doneFromCallback, renderText, statusKeyboard } from './markup.js';

/** Long-polling kutish vaqti (soniya). Telegram shu muddat ichida javob ushlab turadi. */
const LONG_POLL_SECONDS = 30;
/** getUpdates uzilib qolsa qancha kutib qayta urinish. */
const RETRY_DELAY_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type CallbackQuery = {
  id: string;
  data?: string;
  message?: {
    message_id: number;
    chat: { id: number };
    /**
     * Telegram matnni BELGILASHSIZ qaytaradi (`<s>` entity alohida keladi),
     * shuning uchun uni qayta-qayta ekranlash yoki tozalash shart emas.
     */
    text?: string;
  };
};

type Update = { update_id: number; callback_query?: CallbackQuery };

/**
 * Tugma bosilishini qayta ishlaydi: xabarni chizilgan/oddiy holatga o'tkazadi
 * va tugmani teskarisiga almashtiradi.
 *
 * Holat xabarning o'zida saqlanadi — hech qanday fayl yoki baza kerak emas,
 * shuning uchun bot qayta ishga tushgach ham eski xabarlar tugmasi ishlaydi.
 */
export const handleCallback = async (token: string, query: CallbackQuery): Promise<void> => {
  const done = doneFromCallback(query.data);
  const message = query.message;

  if (done === null || !message || typeof message.text !== 'string') {
    // Notanish tugma yoki matnsiz xabar — spinnerni to'xtatib, tegmaymiz.
    await callTelegram(token, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: "Bu xabar holatini o'zgartirib bo'lmadi.",
    });
    return;
  }

  const edited = await callTelegram(token, 'editMessageText', {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text: renderText(message.text, done),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: statusKeyboard(done),
  });

  // Spinner har holda to'xtashi kerak — tahrir muvaffaqiyatsiz bo'lsa ham
  // (masalan ikki kishi bir vaqtda bosgan bo'lsa, Telegram "not modified" deydi).
  await callTelegram(token, 'answerCallbackQuery', {
    callback_query_id: query.id,
    text:
      edited === null
        ? "Holat o'zgarmadi, qayta urinib ko'ring."
        : done
          ? 'Bajarildi'
          : 'Bajarilmadi holatiga qaytarildi',
  });

  if (edited !== null) {
    log.info(`Xabar #${message.message_id} → ${done ? 'bajarildi' : 'bajarilmadi'}`);
  }
};

/**
 * Tugma bosilishlarini cheksiz tinglaydi (long polling).
 *
 * Faqat `callback_query` so'raladi — botga yozilgan oddiy xabarlar kerak emas.
 * Bir vaqtda faqat BITTA nusxa ishlashi shart, aks holda Telegram 409 beradi.
 */
export const pollUpdates = async (token: string): Promise<never> => {
  let offset: number | undefined;
  log.info('Tugma bosilishlari tinglanmoqda');

  for (;;) {
    const updates = await callTelegram<Update[]>(
      token,
      'getUpdates',
      {
        ...(offset === undefined ? {} : { offset }),
        timeout: LONG_POLL_SECONDS,
        allowed_updates: ['callback_query'],
      },
      { retries: 1 },
    );

    if (updates === null) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    for (const update of updates) {
      // Offset oldin suriladi: bitta buzuq update cheksiz takrorlanmasin.
      offset = update.update_id + 1;
      if (!update.callback_query) continue;
      try {
        await handleCallback(token, update.callback_query);
      } catch (error) {
        log.warn('Tugma bosilishini qayta ishlashda xato:', error);
      }
    }
  }
};
