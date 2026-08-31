import type { Config } from '../config.js';
import { log } from '../logger.js';
import type { IncomingMail } from '../mail/watcher.js';
import { buildGtOrders } from '../parse/gt-orders.js';
import { formatGtMessage } from '../format/gt-message.js';
import { sendMessage } from '../telegram/send.js';
import { sendFiles } from '../telegram/document.js';

/**
 * Магнит / GrandTrade zakaz xatini qayta ishlaydi.
 *
 * Har zakaz uchun alohida xabar yuboriladi («Bajarildi» tugmasi bilan), so'ng
 * o'sha zakazning fayllari shu xabarga javob qilib biriktiriladi. Shunday
 * qilib har zakaz Telegramda o'z ipiga yig'iladi va aralashib ketmaydi.
 */
export const handleGtMail = async (config: Config, mail: IncomingMail): Promise<void> => {
  const orders = buildGtOrders(mail);

  if (orders.length === 0) {
    log.warn(`GT PDF bor, lekin zakaz aniqlanmadi: ${mail.subject}`);
    return;
  }

  log.info(`Магнит zakazlari topildi (${orders.length} ta): ${mail.subject}`);

  for (const order of orders) {
    const text = formatGtMessage(order, mail.subject);
    const messageId = await sendMessage(config.ORDER_BOT_TOKEN, config.ORDER_BOT_CHAT_ID, text);

    if (messageId === null) {
      // Yuborilmagan xabar loglarda qolsin — qo'lda tiklash mumkin bo'lishi uchun.
      log.error(`${order.gtNumber} yuborilmadi. Xabar matni:\n${text}`);
      continue;
    }

    const sent = await sendFiles(
      config.ORDER_BOT_TOKEN,
      config.ORDER_BOT_CHAT_ID,
      order.files,
      messageId,
    );

    if (!sent) {
      log.error(
        `${order.gtNumber}: fayllar yuborilmadi — ${order.files
          .map((file) => file.filename)
          .join(', ')}`,
      );
    }
  }
};
