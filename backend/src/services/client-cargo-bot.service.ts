import TelegramBot from 'node-telegram-bot-api';
import { linkGroupByCode, migrateBotGroupChatId } from './client-cargo-bot-link.service';
import {
  type ArchivePage,
  chunkForAlbums,
  formatArchiveLabel,
  getArchivePage,
  getClientIdByGroup,
  getOwnedArchiveTask,
  loadTaskFiles,
  truncateButtonText,
} from './client-cargo-archive.service';

// Mijozlar uchun yuk ma'lumotlari boti. Forma Telegram Mini App'da to'ldiriladi (frontend: pages/TgCargo.tsx,
// API: routes/tg-cargo.ts). Bu servis faqat guruhni mijozga ulaydi (/ulash) va /yangi da Mini App tugmasini yuboradi.

interface DocumentAlbumItem {
  type: 'document';
  media: Buffer;
  caption?: string;
  fileOptions: { filename: string; contentType: string };
}

const LINK_ATTEMPT_LIMIT = 10;
const LINK_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

const linkAttempts = new Map<number, { count: number; resetAt: number }>();

function isLinkRateLimited(chatId: number): boolean {
  const now = Date.now();
  const entry = linkAttempts.get(chatId);
  if (!entry || entry.resetAt <= now) {
    linkAttempts.set(chatId, { count: 1, resetAt: now + LINK_ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LINK_ATTEMPT_LIMIT;
}

/** Mini App to'g'ridan-to'g'ri havolasi: guruh chat ID si start_param sifatida ketadi (API uni imzo bilan tekshiradi) */
export function buildMiniAppLink(baseLink: string, chatId: number): string {
  return `${baseLink}?startapp=${chatId}`;
}

async function handleLink(instance: TelegramBot, chatId: number, code: string | undefined): Promise<void> {
  if (!code) {
    await instance.sendMessage(chatId, "Kodni ham yozing: /ulash KOD. Kodni Prodeklarant'dagi mijoz kartasidan oling.");
    return;
  }
  if (isLinkRateLimited(chatId)) {
    await instance.sendMessage(chatId, "Juda ko'p urinish. Bir soatdan keyin qayta urinib ko'ring.");
    return;
  }
  const result = await linkGroupByCode(code, String(chatId));
  if (result.ok) {
    await instance.sendMessage(chatId, `✅ Guruh «${result.clientName}» mijoziga ulandi.\nYuk ma'lumotini kiritish uchun /yangi deb yozing.`);
  } else if (result.reason === 'GROUP_TAKEN') {
    await instance.sendMessage(chatId, "Bu guruh allaqachon mijozga ulangan. Avval Prodeklarant'da uni uzing.");
  } else {
    await instance.sendMessage(chatId, "Kod noto'g'ri yoki muddati o'tgan. Prodeklarant'dan yangi kod oling.");
  }
}

function registerHandlers(instance: TelegramBot, miniAppLink: string | undefined): void {
  const reportError = (where: string, chatId: number, e: unknown) => {
    console.error(`[ClientCargoBot] ${where} xatosi:`, e instanceof Error ? e.message : e);
    instance.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.").catch(() => undefined);
  };
  const requireGroup = async (msg: TelegramBot.Message): Promise<boolean> => {
    if (msg.chat.type === 'private') {
      await instance.sendMessage(msg.chat.id, "Bu bot mijozning Telegram guruhida ishlaydi. Botni guruhga qo'shing va guruhda yozing.");
      return false;
    }
    return true;
  };

  instance.onText(/^\/(?:start|help)(?:@\w+)?\s*$/, async (msg) => {
    await instance.sendMessage(
      msg.chat.id,
      "Yuk ma'lumotlarini yig'uvchi bot.\n\n/yangi — yuk ma'lumotini kiritish formasini ochish\n/arxiv — yakunlangan yuklar hujjatlarini olish\n/ulash KOD — guruhni mijozga ulash (bir marta)"
    );
  });

  instance.onText(/^\/ulash(?:@\w+)?(?:\s+(\S+))?\s*$/, async (msg, match) => {
    try {
      if (!(await requireGroup(msg))) return;
      await handleLink(instance, msg.chat.id, match?.[1]);
    } catch (e) {
      reportError('/ulash', msg.chat.id, e);
    }
  });

  instance.onText(/^\/yangi(?:@\w+)?\s*$/, async (msg) => {
    try {
      if (!(await requireGroup(msg))) return;
      if (!miniAppLink) {
        await instance.sendMessage(msg.chat.id, "Forma hali sozlanmagan. Administratorga murojaat qiling.");
        return;
      }
      await instance.sendMessage(msg.chat.id, "📋 Yuk ma'lumotini kiritish uchun formani oching:", {
        reply_markup: { inline_keyboard: [[{ text: '📝 Formani ochish', url: buildMiniAppLink(miniAppLink, msg.chat.id) }]] },
      });
    } catch (e) {
      reportError('/yangi', msg.chat.id, e);
    }
  });

  const ARCHIVE_CB_PAGE = 'arx:p:';
  const ARCHIVE_CB_TASK = 'arx:t:';

  const buildArchiveView = (data: ArchivePage): { text: string; reply_markup: TelegramBot.InlineKeyboardMarkup } => {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = data.items.map((item) => [
      { text: truncateButtonText(formatArchiveLabel(item)), callback_data: `${ARCHIVE_CB_TASK}${item.taskId}` },
    ]);
    const nav: TelegramBot.InlineKeyboardButton[] = [];
    if (data.page > 0) nav.push({ text: '⬅️ Oldingi', callback_data: `${ARCHIVE_CB_PAGE}${data.page - 1}` });
    if (data.page < data.totalPages - 1) nav.push({ text: 'Keyingi ➡️', callback_data: `${ARCHIVE_CB_PAGE}${data.page + 1}` });
    if (nav.length > 0) keyboard.push(nav);
    return {
      text: `📁 Arxiv — yakunlangan yuklar (${data.page + 1}/${data.totalPages} sahifa, jami ${data.total} ta)\nHujjatlarini olish uchun yukni tanlang:`,
      reply_markup: { inline_keyboard: keyboard },
    };
  };

  instance.onText(/^\/arxiv(?:@\w+)?\s*$/, async (msg) => {
    try {
      if (!(await requireGroup(msg))) return;
      const clientId = await getClientIdByGroup(String(msg.chat.id));
      if (!clientId) {
        await instance.sendMessage(msg.chat.id, "Bu guruh hali mijozga ulanmagan. Avval /ulash KOD yozing.");
        return;
      }
      const data = await getArchivePage(clientId, 0);
      if (data.total === 0) {
        await instance.sendMessage(msg.chat.id, "Arxivda hali yakunlangan yuk yo'q.");
        return;
      }
      const view = buildArchiveView(data);
      await instance.sendMessage(msg.chat.id, view.text, { reply_markup: view.reply_markup });
    } catch (e) {
      reportError('/arxiv', msg.chat.id, e);
    }
  });

  // Bir yukning hujjatlarini bir vaqtda ikki marta yubormaslik uchun (tugma qayta-qayta bosilsa)
  const sendingTasks = new Set<string>();

  const sendTaskFiles = async (chatId: number, clientId: number, taskId: number): Promise<void> => {
    const key = `${chatId}:${taskId}`;
    if (sendingTasks.has(key)) return;
    sendingTasks.add(key);
    try {
      const task = await getOwnedArchiveTask(clientId, taskId);
      if (!task) {
        await instance.sendMessage(chatId, 'Yuk topilmadi.');
        return;
      }
      const { label, files, skipped, documentCount } = await loadTaskFiles(task);
      if (documentCount === 0) {
        await instance.sendMessage(chatId, `${label}\nBu yukda hujjat topilmadi.`);
        return;
      }
      if (files.length === 0) {
        await instance.sendMessage(chatId, `${label}\nHujjatlarni yuborib bo'lmadi. Administratorga murojaat qiling.`);
        return;
      }
      const albums = chunkForAlbums(files);
      for (let i = 0; i < albums.length; i++) {
        const album = albums[i];
        const caption = i === 0 ? label : undefined;
        if (album.length === 1) {
          await instance.sendDocument(chatId, album[0].buffer, { caption }, { filename: album[0].name, contentType: 'application/octet-stream' });
          continue;
        }
        const items: DocumentAlbumItem[] = album.map((file, index) => ({
          type: 'document',
          media: file.buffer,
          fileOptions: { filename: file.name, contentType: 'application/octet-stream' },
          ...(index === 0 && caption ? { caption } : {}),
        }));
        // @types/node-telegram-bot-api albomda faqat photo/video biladi; Telegram API va kutubxona ish vaqtida 'document' ni qo'llaydi
        await instance.sendMediaGroup(chatId, items as unknown as readonly TelegramBot.InputMedia[]);
      }
      if (skipped.length > 0) {
        await instance.sendMessage(chatId, `⚠️ Yuborib bo'lmadi (fayl topilmadi yoki 50 MB dan katta): ${skipped.join(', ')}`);
      }
    } finally {
      sendingTasks.delete(key);
    }
  };

  instance.on('callback_query', async (query) => {
    const data = query.data ?? '';
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    if (chatId === undefined || messageId === undefined || (!data.startsWith(ARCHIVE_CB_PAGE) && !data.startsWith(ARCHIVE_CB_TASK))) {
      return;
    }
    try {
      const clientId = await getClientIdByGroup(String(chatId));
      if (!clientId) {
        await instance.answerCallbackQuery(query.id, { text: 'Guruh mijozga ulanmagan.' });
        return;
      }
      if (data.startsWith(ARCHIVE_CB_PAGE)) {
        const page = await getArchivePage(clientId, Number(data.slice(ARCHIVE_CB_PAGE.length)));
        await instance.answerCallbackQuery(query.id);
        const view = buildArchiveView(page);
        // Sahifa o'zgarmagan bo'lsa Telegram "message is not modified" beradi — bu xato emas
        await instance.editMessageText(view.text, { chat_id: chatId, message_id: messageId, reply_markup: view.reply_markup }).catch((e: unknown) => {
          if (!(e instanceof Error && e.message.includes('message is not modified'))) throw e;
        });
        return;
      }
      const taskId = Number(data.slice(ARCHIVE_CB_TASK.length));
      if (!Number.isInteger(taskId)) {
        await instance.answerCallbackQuery(query.id);
        return;
      }
      await instance.answerCallbackQuery(query.id, { text: 'Hujjatlar yuborilmoqda…' });
      await sendTaskFiles(chatId, clientId, taskId);
    } catch (e) {
      console.error('[ClientCargoBot] arxiv callback xatosi:', e instanceof Error ? e.message : e);
      instance.answerCallbackQuery(query.id).catch(() => undefined);
      instance.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.").catch(() => undefined);
    }
  });

  // Oddiy guruh superguruhga o'tganda chat ID o'zgaradi — bog'lanishni yangilaymiz
  instance.on('message', async (msg) => {
    try {
      if (msg.migrate_to_chat_id) await migrateBotGroupChatId(String(msg.chat.id), String(msg.migrate_to_chat_id));
    } catch (e) {
      console.error('[ClientCargoBot] migrate xatosi:', e instanceof Error ? e.message : e);
    }
  });
}

export const initClientCargoBot = () => {
  // Bot faqat serverda ishlashi kerak: bitta tokenni bir nechta instansiya polling qilsa Telegram 409 beradi.
  if (process.env.CLIENT_BOT_ENABLED !== 'true') {
    console.warn("[ClientCargoBot] CLIENT_BOT_ENABLED=true emas — yuk ma'lumotlari boti bu instansiyada ishga tushirilmadi (faqat serverda yoqiladi).");
    return;
  }
  const token = process.env.CLIENT_BOT_TOKEN;
  if (!token) {
    console.warn("[ClientCargoBot] CLIENT_BOT_TOKEN aniqlanmagan — yuk ma'lumotlari boti ishga tushmadi.");
    return;
  }
  if (token === process.env.FINANCE_BOT_TOKEN || token === process.env.TELEGRAM_BOT_TOKEN) {
    console.error("[ClientCargoBot] CLIENT_BOT_TOKEN boshqa bot tokeni bilan bir xil — Telegram 409 bermasligi uchun ishga tushirilmadi. Alohida bot yarating.");
    return;
  }
  const miniAppLink = process.env.CLIENT_BOT_MINIAPP_LINK?.trim().replace(/\/+$/, '');
  if (!miniAppLink) {
    console.warn("[ClientCargoBot] CLIENT_BOT_MINIAPP_LINK aniqlanmagan (masalan https://t.me/pd_client_bot/cargo) — /yangi forma ochmaydi.");
  }

  const bot = new TelegramBot(token, { polling: true });
  bot.on('polling_error', (error) => {
    console.error('[ClientCargoBot] Polling error:', error.message);
  });
  registerHandlers(bot, miniAppLink);

  bot
    .setMyCommands([
      { command: 'yangi', description: "Yuk ma'lumotini kiritish formasini ochish" },
      { command: 'arxiv', description: "Yakunlangan yuklar hujjatlarini olish" },
      { command: 'ulash', description: 'Guruhni mijozga ulash (KOD bilan)' },
    ])
    .catch((e: unknown) => console.error('[ClientCargoBot] setMyCommands xatosi:', e instanceof Error ? e.message : e));

  console.log("[ClientCargoBot] Yuk ma'lumotlari boti ishga tushdi.");
};
