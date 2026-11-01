// Telegram Bot API ga to'g'ridan-to'g'ri HTTP chaqiruv (polling'ga bog'liq emas).
// Mini App endpointlari yuk botining polling gate'idan (CLIENT_BOT_ENABLED) mustaqil ishlashi uchun kerak.

const TELEGRAM_TIMEOUT_MS = 10_000;

export type TelegramResult<T> = { ok: true; result: T } | { ok: false; description: string };

export async function callTelegram<T>(token: string, method: string, body: Record<string, unknown>): Promise<TelegramResult<T>> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    const json = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (json.ok && json.result !== undefined) return { ok: true, result: json.result };
    return { ok: false, description: json.description ?? `HTTP ${response.status}` };
  } catch (e) {
    // Xabarda token bo'lishi mumkin bo'lgan URL'ni log qilmaymiz — faqat sabab
    return { ok: false, description: e instanceof Error ? e.name : 'network error' };
  }
}
