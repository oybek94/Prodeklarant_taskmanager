import { log } from '../logger.js';

const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type CallOptions = {
  /** Necha marta urinilsin (429 dan tashqari — u alohida kutadi). */
  retries?: number;
};

/**
 * Telegram Bot API metodini chaqiradi.
 *
 * Muvaffaqiyatda `result` maydonini, aks holda `null` qaytaradi.
 * 429 (juda tez) — Telegram aytgan vaqt kutiladi.
 * 409 (Conflict) — botning ikkinchi nusxasi ishlayapti; buni bilib qo'yish
 * muhim, shuning uchun alohida xabar chiqadi.
 */
export const callTelegram = async <T = unknown>(
  token: string,
  method: string,
  payload: Record<string, unknown>,
  options: CallOptions = {},
): Promise<T | null> => {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const url = `https://api.telegram.org/bot${token}/${method}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.text();

      if (response.ok) {
        const parsed: unknown = body ? JSON.parse(body) : null;
        return (parsed as { result?: T } | null)?.result ?? null;
      }

      if (response.status === 409) {
        log.error(
          `Telegram 409 Conflict (${method}): botning boshqa nusxasi ham getUpdates ` +
            'qilyapti. Bir vaqtda faqat BITTA order-bot ishlashi kerak ' +
            '(masalan serverdagi pm2 va lokal `npm run dev` birga emas).',
        );
        return null;
      }

      log.warn(`Telegram javobi ${response.status} (${method}, ${attempt}/${retries}): ${body}`);

      if (response.status === 429) {
        const retryAfter = Number(JSON.parse(body)?.parameters?.retry_after) || 5;
        await sleep(retryAfter * 1000);
        continue;
      }
    } catch (error) {
      log.warn(`Telegramga ulanib bo'lmadi (${method}, ${attempt}/${retries}):`, error);
    }

    if (attempt < retries) await sleep(RETRY_DELAY_MS * attempt);
  }

  return null;
};
