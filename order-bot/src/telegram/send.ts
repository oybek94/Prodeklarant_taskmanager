import { log } from '../logger.js';
import { callTelegram } from './api.js';
import { renderText, statusKeyboard } from './markup.js';

/**
 * Telegramga zakaz xabarini yuboradi.
 *
 * Matn HTML rejimida ketadi (bajarilgan xabar ustidan chizish uchun kerak),
 * shuning uchun `renderText` uni avval ekranlaydi. Har xabar tagida
 * «✅ Bajarildi» tugmasi turadi.
 *
 * Yuborilgan xabarning `message_id` sini qaytaradi — fayllarni shu xabarga
 * javob qilib biriktirish uchun kerak. Yuborilmasa `null`.
 */
export const sendMessage = async (
  token: string,
  chatId: string,
  text: string,
): Promise<number | null> => {
  const result = await callTelegram<{ message_id?: number }>(token, 'sendMessage', {
    chat_id: chatId,
    text: renderText(text, false),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: statusKeyboard(false),
  });

  if (result === null) {
    log.error('Telegramga xabar yuborilmadi.');
    return null;
  }
  return result.message_id ?? null;
};

/** Bir nechta xabarni ketma-ket yuboradi (tartib saqlanadi). */
export const sendMessages = async (
  token: string,
  chatId: string,
  texts: string[],
): Promise<boolean> => {
  let allSent = true;
  for (const text of texts) {
    const messageId = await sendMessage(token, chatId, text);
    if (messageId === null) allSent = false;
  }
  return allSent;
};
