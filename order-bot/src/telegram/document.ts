import { log } from '../logger.js';

/** Telegram albomga ko'pi bilan 10 ta fayl sig'adi. */
const ALBUM_LIMIT = 10;
const RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type OutgoingFile = {
  filename: string;
  content: Buffer;
  contentType: string;
};

const post = async (token: string, method: string, form: FormData): Promise<boolean> => {
  const url = `https://api.telegram.org/bot${token}/${method}`;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(url, { method: 'POST', body: form });
      if (response.ok) return true;

      const body = await response.text();
      log.warn(`Telegram javobi ${response.status} (${method}, ${attempt}/${RETRIES}): ${body}`);

      if (response.status === 429) {
        const retryAfter = Number(JSON.parse(body)?.parameters?.retry_after) || 5;
        await sleep(retryAfter * 1000);
        continue;
      }
    } catch (error) {
      log.warn(`Fayl yuborishda ulanish xatosi (${method}, ${attempt}/${RETRIES}):`, error);
    }

    if (attempt < RETRIES) await sleep(RETRY_DELAY_MS * attempt);
  }

  return false;
};

/**
 * Buffer — Uint8Array, shuning uchun to'g'ridan-to'g'ri Blob'ga beriladi:
 * u byteOffset/byteLength ni o'zi hisobga oladi, ya'ni Node'ning umumiy
 * bufer pulidagi qo'shni baytlar faylga tushmaydi.
 */
const toBlob = (file: OutgoingFile): Blob =>
  new Blob([file.content], { type: file.contentType });

const sendSingle = async (
  token: string,
  chatId: string,
  file: OutgoingFile,
  replyToMessageId?: number,
): Promise<boolean> => {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('disable_notification', 'true');
  if (replyToMessageId !== undefined) {
    form.append('reply_parameters', JSON.stringify({ message_id: replyToMessageId }));
  }
  form.append('document', toBlob(file), file.filename);
  return post(token, 'sendDocument', form);
};

const sendAlbum = async (
  token: string,
  chatId: string,
  files: OutgoingFile[],
  replyToMessageId?: number,
): Promise<boolean> => {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('disable_notification', 'true');
  if (replyToMessageId !== undefined) {
    form.append('reply_parameters', JSON.stringify({ message_id: replyToMessageId }));
  }

  const media = files.map((file, index) => ({
    type: 'document',
    media: `attach://file${index}`,
  }));
  form.append('media', JSON.stringify(media));
  files.forEach((file, index) => form.append(`file${index}`, toBlob(file), file.filename));

  return post(token, 'sendMediaGroup', form);
};

/**
 * Fayllarni zakaz xabariga javob qilib yuboradi.
 *
 * 2-10 ta fayl bitta albom bo'lib ketadi (bitta bildirishnoma).
 * Bitta fayl albom bo'la olmaydi — u alohida yuboriladi.
 */
export const sendFiles = async (
  token: string,
  chatId: string,
  files: OutgoingFile[],
  replyToMessageId?: number,
): Promise<boolean> => {
  if (files.length === 0) return true;

  let allSent = true;
  for (let i = 0; i < files.length; i += ALBUM_LIMIT) {
    const chunk = files.slice(i, i + ALBUM_LIMIT);
    const sent =
      chunk.length === 1
        ? await sendSingle(token, chatId, chunk[0]!, replyToMessageId)
        : await sendAlbum(token, chatId, chunk, replyToMessageId);
    if (!sent) allSent = false;
  }

  return allSent;
};
