// Telegram Bot API ga to'g'ridan-to'g'ri HTTP chaqiruv (polling'ga bog'liq emas).
// Mini App endpointlari yuk botining polling gate'idan (CLIENT_BOT_ENABLED) mustaqil ishlashi uchun kerak.

const TELEGRAM_TIMEOUT_MS = 10_000;

export type TelegramResult<T> = { ok: true; result: T } | { ok: false; description: string };

/** Fayl yuklash JSON chaqiruvlaridan sekinroq */
const TELEGRAM_UPLOAD_TIMEOUT_MS = 30_000;

export function callTelegram<T>(token: string, method: string, body: Record<string, unknown>): Promise<TelegramResult<T>> {
  return request<T>(token, method, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, TELEGRAM_TIMEOUT_MS);
}

export interface TelegramDocument {
  chatId: string;
  file: Buffer;
  filename: string;
  caption: string;
  replyToMessageId?: number;
}

export function sendTelegramDocument(token: string, document: TelegramDocument): Promise<TelegramResult<{ message_id: number }>> {
  const form = new FormData();
  form.set('chat_id', document.chatId);
  form.set('caption', document.caption);
  if (document.replyToMessageId !== undefined) {
    // Javob berilayotgan xabar o'chirilgan bo'lsa ham hujjat yuborilsin
    form.set('reply_parameters', JSON.stringify({ message_id: document.replyToMessageId, allow_sending_without_reply: true }));
  }
  form.set('document', new Blob([new Uint8Array(document.file)], { type: 'application/pdf' }), document.filename);
  return request(token, 'sendDocument', { body: form }, TELEGRAM_UPLOAD_TIMEOUT_MS);
}

async function request<T>(token: string, method: string, init: RequestInit, timeoutMs: number): Promise<TelegramResult<T>> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      ...init,
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (json.ok && json.result !== undefined) return { ok: true, result: json.result };
    return { ok: false, description: json.description ?? `HTTP ${response.status}` };
  } catch (e) {
    // Xabarda token bo'lishi mumkin bo'lgan URL'ni log qilmaymiz — faqat sabab
    return { ok: false, description: e instanceof Error ? e.name : 'network error' };
  }
}
