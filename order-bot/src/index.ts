import { loadConfig } from './config.js';
import { log } from './logger.js';
import { watchMailbox, type IncomingMail } from './mail/watcher.js';
import { extractOrderPositions } from './parse/table.js';
import { formatOrderMessage } from './format/message.js';
import { sendMessages } from './telegram/send.js';
import { SeenStore } from './state/seen.js';
import { pollUpdates } from './telegram/updates.js';

const main = async () => {
  const config = loadConfig();
  const seen = new SeenStore();
  seen.load();

  const handleMail = async (mail: IncomingMail): Promise<void> => {
    if (seen.has(mail.messageId)) {
      log.info(`O'tkazildi (allaqachon ko'rilgan): ${mail.subject}`);
      return;
    }

    const result = extractOrderPositions(mail.html);

    if (result.status === 'no-table') {
      // Zakaz jadvali yo'q — bot jim turadi.
      log.info(`Jadvalsiz xat, o'tkazildi: ${mail.subject}`);
      seen.add(mail.messageId);
      return;
    }

    seen.add(mail.messageId);

    if (result.status === 'unparsable') {
      log.warn(`Jadval o'qilmadi: ${mail.subject} — ${result.reason}`);
      await sendMessages(config.ORDER_BOT_TOKEN, config.ORDER_BOT_CHAT_ID, [
        [
          '⚠️ Zakaz jadvali topildi, lekin ma\'lumotni o\'qib bo\'lmadi.',
          '',
          `Xat: ${mail.subject}`,
          `Kimdan: ${mail.from}`,
          '',
          'Pochtani qo\'lda tekshiring.',
        ].join('\n'),
      ]);
      return;
    }

    const messages = formatOrderMessage(result.positions);
    log.info(`Zakaz topildi (${result.positions.length} pozitsiya): ${mail.subject}`);

    const sent = await sendMessages(config.ORDER_BOT_TOKEN, config.ORDER_BOT_CHAT_ID, messages);
    if (!sent) {
      // Yuborilmagan xabar loglarda qolsin — qo'lda tiklash mumkin bo'lishi uchun.
      log.error(`Telegramga yuborilmadi. Xabar matni:\n${messages.join('\n---\n')}`);
    }
  };

  log.info('order-bot ishga tushdi');

  // Tugma bosilishlari pochta kuzatuvi bilan yonma-yon tinglanadi.
  // pollUpdates hech qachon tugamaydi va xatolarni o'zi yutadi.
  void pollUpdates(config.ORDER_BOT_TOKEN);

  await watchMailbox(config, handleMail);
};

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
