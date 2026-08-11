/**
 * Telegram chat ID ni aniqlaydi.
 *
 * Ishlatish:
 *   1. @BotFather'da bot yarating, tokenni .env dagi ORDER_BOT_TOKEN ga yozing
 *   2. Telegramda botni toping va unga /start yozing
 *   3. npm run chat-id
 */
import { requireEnv } from '../config.js';

type Chat = {
  id?: number;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
};

type Update = {
  message?: { chat?: Chat };
  channel_post?: { chat?: Chat };
};

const main = async () => {
  const token = requireEnv('ORDER_BOT_TOKEN');
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const body = (await response.json()) as { ok: boolean; result?: Update[]; description?: string };

  if (!body.ok) {
    console.error(`Telegram xatosi: ${body.description ?? 'noma\'lum'}`);
    process.exit(1);
  }

  const chats = new Map<number, string>();
  for (const update of body.result ?? []) {
    const chat = update.message?.chat ?? update.channel_post?.chat;
    if (!chat?.id) continue;
    const name = chat.title ?? chat.username ?? chat.first_name ?? chat.type ?? '';
    chats.set(chat.id, `${name} (${chat.type ?? '?'})`);
  }

  if (chats.size === 0) {
    console.log('Chat topilmadi.');
    console.log('Telegramda botga /start yozing va shu buyruqni qayta ishga tushiring.');
    return;
  }

  console.log('Topilgan chatlar:\n');
  for (const [id, name] of chats) {
    console.log(`  ORDER_BOT_CHAT_ID=${id}   ← ${name}`);
  }
  console.log('\nKerakli qatorni .env ga ko\'chiring.');
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
