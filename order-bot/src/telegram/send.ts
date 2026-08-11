import { log } from '../logger.js';

const RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Telegramga matn yuboradi. parse_mode ishlatilmaydi: qiymatlarda «», ", &
 * kabi belgilar bor va ular HTML/Markdown rejimida xabarni buzadi.
 */
export const sendMessage = async (
  token: string,
  chatId: string,
  text: string,
): Promise<boolean> => {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      });

      if (response.ok) return true;

      const body = await response.text();
      log.warn(`Telegram javobi ${response.status} (urinish ${attempt}/${RETRIES}): ${body}`);

      // 429 — juda tez yuborilgan; Telegram kutish vaqtini o'zi aytadi.
      if (response.status === 429) {
        const retryAfter = Number(JSON.parse(body)?.parameters?.retry_after) || 5;
        await sleep(retryAfter * 1000);
        continue;
      }
    } catch (error) {
      log.warn(`Telegramga ulanib bo'lmadi (urinish ${attempt}/${RETRIES}):`, error);
    }

    if (attempt < RETRIES) await sleep(RETRY_DELAY_MS * attempt);
  }

  log.error('Telegramga xabar yuborilmadi.');
  return false;
};

/** Bir nechta xabarni ketma-ket yuboradi (tartib saqlanadi). */
export const sendMessages = async (
  token: string,
  chatId: string,
  texts: string[],
): Promise<boolean> => {
  let allSent = true;
  for (const text of texts) {
    const sent = await sendMessage(token, chatId, text);
    if (!sent) allSent = false;
  }
  return allSent;
};
