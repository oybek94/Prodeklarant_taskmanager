import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { linkGroupByCode, migrateBotGroupChatId } from './client-cargo-bot-link.service';
import { actorFromTelegramUser, buildNewCargoReply, parseDraftCallback, type DraftCallbackAction } from './client-cargo-draft-bot';
import { buildDraftKeyboard } from './client-cargo-draft-message';
import { cancelDraft, completeDraft, getDraft, listOpenDrafts } from './client-cargo-draft.service';
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
import {
  createAttemptLimiter,
  formatTaskPickLabel,
  isDriverCodeShape,
  parseCargoTrackingCallback,
  parseStartPayload,
  type CargoTrackingCallback,
} from './cargo-tracking';
import {
  announceDriverConnected,
  answerDriverFinish,
  bindDriverByCode,
  buildWhereReply,
  getDriverArchiveItem,
  getDriverCardText,
  getDriverTracking,
  issueDriverCode,
  listActiveFuras,
  listClientRecentTasks,
  matchDraftToRecentTask,
  recordDriverLocation,
  runHourlyTrackingJob,
} from './cargo-tracking.service';

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

// Haydovchi kodini topish: Telegram hisobi bo'yicha soatiga 5 ta noto'g'ri urinish
const driverCodeLimiter = createAttemptLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

const DRIVER_HELP =
  "Bu bot haydovchilar uchun.\n\nYuk kodini yozing (6 ta harf/raqam, masalan K7M2QX). Kodni deklarant yoki mijoz beradi.\n\n/yuk — yuk ma'lumoti (bojxona, manzil)\n/hujjat — yuk hujjatlarini yuklab olish";

const DRIVER_INSTRUCTIONS =
  "📍 Joylashuvingizni ulashing: 📎 (qisqich) → Joylashuv → «Jonli joylashuvni ulashish» → «Doimiy». Pastdagi tugma bilan bir martalik joyingizni ham yuborishingiz mumkin.\n\nℹ️ Joylashuvingiz faqat shu yukning mijoz guruhida va Prodeklarant xodimlarida ko'rinadi. Bot kamida soatiga bir marta joylashuv so'raydi. Ulanganingizdan 7 kun o'tgach bot yukni yakunlaganingizni so'raydi: «Ha» desangiz kuzatuv to'xtaydi. Aks holda kuzatuv 14 kundan keyin o'zi to'xtaydi.";

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

function registerHandlers(instance: TelegramBot, miniAppLink: string | undefined, botToken: string): void {
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
    if (msg.chat.type === 'private') {
      await instance.sendMessage(msg.chat.id, DRIVER_HELP);
      return;
    }
    await instance.sendMessage(
      msg.chat.id,
      "Yuk ma'lumotlarini yig'uvchi bot.\n\n/yangi — yuk ma'lumotini kiritish formasini ochish\n/arxiv — yakunlangan yuklar hujjatlarini olish\n/kod — haydovchi uchun kod olish\n/fura — fura qayerdaligini bilish\n/ulash KOD — guruhni mijozga ulash (bir marta)"
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
      const chatId = String(msg.chat.id);
      // Guruh hali ulanmagan bo'lsa ro'yxat bo'sh: avvalgidek bitta "Formani ochish" tugmasi (forma o'zi xato ko'rsatadi)
      const clientId = await getClientIdByGroup(chatId);
      const drafts = clientId ? await listOpenDrafts({ clientId, chatId }) : [];
      const reply = buildNewCargoReply({ chatId, miniAppLink, drafts });
      await instance.sendMessage(msg.chat.id, reply.text, { reply_markup: { inline_keyboard: reply.keyboard } });
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

  /** Fayllarni 10 tadan albomlarda (bittasi bo'lsa oddiy hujjat sifatida) yuboradi; yuborilmaganlarni ogohlantiradi */
  const deliverFiles = async (chatId: number, label: string, files: { name: string; buffer: Buffer }[], skipped: string[]): Promise<void> => {
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
  };

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
      await deliverFiles(chatId, label, files, skipped);
    } finally {
      sendingTasks.delete(key);
    }
  };

  // ---------- Haydovchi boti va fura joylashuvi ----------

  let cachedUsername: string | null = null;
  const botUsername = async (): Promise<string> => {
    if (!cachedUsername) cachedUsername = (await instance.getMe()).username ?? 'pd_client_bot';
    return cachedUsername;
  };

  const driverKeyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [[{ text: '📄 Hujjatlar', callback_data: 'drv:docs' }, { text: "ℹ️ Yuk ma'lumoti", callback_data: 'drv:info' }]],
  };

  const sendDriverCard = async (chatId: number, taskId: number, title: string): Promise<void> => {
    await instance.sendMessage(chatId, `${title}\n\n${await getDriverCardText(taskId)}`, { reply_markup: driverKeyboard });
  };

  const handleDriverCode = async (msg: TelegramBot.Message, rawCode: string): Promise<void> => {
    if (!msg.from) return;
    const key = String(msg.from.id);
    if (driverCodeLimiter.isBlocked(key)) {
      await instance.sendMessage(msg.chat.id, "Juda ko'p noto'g'ri urinish. Bir soatdan keyin qayta urinib ko'ring yoki deklarantga murojaat qiling.");
      return;
    }
    const result = await bindDriverByCode({ code: rawCode, telegramUserId: msg.from.id, chatId: msg.chat.id });
    if (!result.ok) {
      driverCodeLimiter.recordFailure(key);
      await instance.sendMessage(
        msg.chat.id,
        result.reason === 'TAKEN' ? 'Bu kod boshqa haydovchiga ulangan. Deklarantga murojaat qiling.' : "Kod noto'g'ri yoki muddati o'tgan. Kodni deklarant yoki mijozdan qayta oling."
      );
      return;
    }
    driverCodeLimiter.reset(key);
    await sendDriverCard(msg.chat.id, result.taskId, '✅ Kod qabul qilindi.');
    await instance.sendMessage(msg.chat.id, DRIVER_INSTRUCTIONS, {
      reply_markup: { keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
  };

  const handleDriverLocation = async (msg: TelegramBot.Message, edited: boolean): Promise<void> => {
    if (msg.chat.type !== 'private' || !msg.from || !msg.location) return;
    try {
      const result = await recordDriverLocation({
        telegramUserId: msg.from.id,
        lat: msg.location.latitude,
        lng: msg.location.longitude,
        messageDate: msg.date,
        chatId: msg.chat.id,
        // @types/node-telegram-bot-api Location'da live_period yo'q, Telegram API'da bor
        livePeriod: (msg.location as TelegramBot.Location & { live_period?: number }).live_period,
      });
      // Birinchi joylashuv: mijoz guruhiga "haydovchi ulandi" (kutib o'tirmaymiz, xato haydovchiga ta'sir qilmaydi)
      if (result.ok && result.firstFix) void announceDriverConnected(botToken, result.trackingId);
      // Jonli joylashuv yangilanishlari (edited_message) har bir necha soniyada keladi — javob yozilmaydi
      if (edited) return;
      await instance.sendMessage(
        msg.chat.id,
        result.ok ? '✅ Joylashuv qabul qilindi. Rahmat!' : 'Avval yuk kodini kiriting (6 ta harf/raqam).',
        { reply_markup: { remove_keyboard: true } }
      );
    } catch (e) {
      console.error('[ClientCargoBot] joylashuv xatosi:', e instanceof Error ? e.message : e);
    }
  };

  const sendDriverDocuments = async (chatId: number, telegramUserId: number): Promise<void> => {
    const tracking = await getDriverTracking(telegramUserId);
    if (!tracking) {
      await instance.sendMessage(chatId, 'Avval yuk kodini kiriting (6 ta harf/raqam).');
      return;
    }
    const key = `drv:${chatId}:${tracking.taskId}`;
    if (sendingTasks.has(key)) return;
    sendingTasks.add(key);
    try {
      const loaded = await loadTaskFiles(await getDriverArchiveItem(tracking.taskId), { preferTaskDocuments: true });
      if (loaded.documentCount === 0) {
        await instance.sendMessage(chatId, `${loaded.label}\nBu yukda hujjat hali yuklanmagan. Deklarantga murojaat qiling.`);
        return;
      }
      if (loaded.files.length === 0) {
        await instance.sendMessage(chatId, `${loaded.label}\nHujjatlarni yuborib bo'lmadi. Deklarantga murojaat qiling.`);
        return;
      }
      await deliverFiles(chatId, loaded.label, loaded.files, loaded.skipped);
    } finally {
      sendingTasks.delete(key);
    }
  };

  const sendDriverInfo = async (chatId: number, telegramUserId: number): Promise<void> => {
    const tracking = await getDriverTracking(telegramUserId);
    if (!tracking) {
      await instance.sendMessage(chatId, 'Avval yuk kodini kiriting (6 ta harf/raqam).');
      return;
    }
    await sendDriverCard(chatId, tracking.taskId, "Yuk ma'lumoti");
  };

  const runPrivate = (name: string, handler: (msg: TelegramBot.Message, from: TelegramBot.User) => Promise<void>) => async (msg: TelegramBot.Message) => {
    if (msg.chat.type !== 'private' || !msg.from) return;
    try {
      await handler(msg, msg.from);
    } catch (e) {
      reportError(name, msg.chat.id, e);
    }
  };

  instance.onText(
    /^\/start(?:@\w+)?\s+(\S+)\s*$/,
    runPrivate('/start', async (msg) => {
      const code = parseStartPayload(msg.text ?? '');
      if (code) await handleDriverCode(msg, code);
      else await instance.sendMessage(msg.chat.id, DRIVER_HELP);
    })
  );
  instance.onText(/^\/yuk(?:@\w+)?\s*$/, runPrivate('/yuk', (msg, from) => sendDriverInfo(msg.chat.id, from.id)));
  instance.onText(/^\/hujjat(?:@\w+)?\s*$/, runPrivate('/hujjat', (msg, from) => sendDriverDocuments(msg.chat.id, from.id)));

  instance.on('location', (msg) => void handleDriverLocation(msg, false));
  instance.on('edited_message', (msg) => void handleDriverLocation(msg, true));

  // Guruh: mijoz uchun yuklar ro'yxati va "fura qayerda?"
  const requireLinkedGroup = async (msg: TelegramBot.Message): Promise<number | null> => {
    if (!(await requireGroup(msg))) return null;
    const clientId = await getClientIdByGroup(String(msg.chat.id));
    if (!clientId) await instance.sendMessage(msg.chat.id, 'Эта группа ещё не привязана к клиенту. Сначала отправьте /ulash КОД.');
    return clientId;
  };

  const sendCodeToGroup = async (chatId: number, clientId: number, taskId: number): Promise<void> => {
    const result = await issueDriverCode({ taskId, clientId, createdVia: 'CLIENT_GROUP', regenerate: false });
    if (!result.ok) {
      await instance.sendMessage(chatId, result.reason === 'TASK_TOO_OLD' ? 'Этот груз создан более 72 часов назад. Получите код у декларанта.' : 'Груз не найден.');
      return;
    }
    const username = await botUsername();
    await instance.sendMessage(
      chatId,
      `🔑 Код водителя: ${result.code}\n\nВодителю нужно открыть бота @${username} и отправить этот код, либо открыть ссылку:\nhttps://t.me/${username}?start=${result.code}${result.reused ? '\n\n(Код для этого груза уже был выдан.)' : ''}`
    );
  };

  const sendTaskPicker = async (chatId: number, clientId: number): Promise<void> => {
    const tasks = await listClientRecentTasks(clientId);
    if (tasks.length === 0) {
      await instance.sendMessage(chatId, 'За последние 72 часа грузов не создано. Для более старого груза получите код у декларанта.');
      return;
    }
    const keyboard = tasks.map((task) => [
      { text: truncateButtonText(`${task.hasCode ? '✅ ' : '🔑 '}${formatTaskPickLabel(task)}`), callback_data: `trk:k:${task.taskId}` },
    ]);
    await instance.sendMessage(chatId, 'Грузы, созданные за последние 72 часа. Для какого груза нужен код водителя? (✅ — код уже выдан)', { reply_markup: { inline_keyboard: keyboard } });
  };

  const sendWhere = async (chatId: number, clientId: number, trackingId: number): Promise<void> => {
    const reply = await buildWhereReply({ clientId, trackingId, botToken });
    if (!reply.ok) {
      await instance.sendMessage(chatId, 'Фура не найдена или отслеживание завершено.');
      return;
    }
    await instance.sendMessage(chatId, reply.text);
    if (reply.location) await instance.sendLocation(chatId, reply.location.lat, reply.location.lng);
  };

  const sendFuraList = async (chatId: number, clientId: number): Promise<void> => {
    const furas = await listActiveFuras(clientId);
    if (furas.length === 0) {
      await instance.sendMessage(chatId, 'Сейчас нет фур на отслеживании. Получить код водителя: /kod');
      return;
    }
    if (furas.length === 1) {
      await sendWhere(chatId, clientId, furas[0].trackingId);
      return;
    }
    const keyboard = furas.map((fura) => [
      { text: truncateButtonText(`🚚 ${formatArchiveLabel({ invoiceNumber: fura.invoiceNumber, vehicleNumber: fura.vehicleNumber })}`), callback_data: `trk:w:${fura.trackingId}` },
    ]);
    await instance.sendMessage(chatId, 'Какая фура?', { reply_markup: { inline_keyboard: keyboard } });
  };

  instance.onText(/^\/kod(?:@\w+)?\s*$/, async (msg) => {
    try {
      const clientId = await requireLinkedGroup(msg);
      if (clientId) await sendTaskPicker(msg.chat.id, clientId);
    } catch (e) {
      reportError('/kod', msg.chat.id, e);
    }
  });

  instance.onText(/^\/fura(?:@\w+)?\s*$/, async (msg) => {
    try {
      const clientId = await requireLinkedGroup(msg);
      if (clientId) await sendFuraList(msg.chat.id, clientId);
    } catch (e) {
      reportError('/fura', msg.chat.id, e);
    }
  });

  const handleTrackingCallback = async (query: TelegramBot.CallbackQuery, action: CargoTrackingCallback): Promise<void> => {
    const chat = query.message?.chat;
    if (!chat) {
      await instance.answerCallbackQuery(query.id);
      return;
    }
    if (action.kind === 'driver-finish') {
      // Faqat shu kuzatuvga ulangan haydovchi, shaxsiy chatda javob bera oladi (answerDriverFinish tekshiradi)
      const result = chat.type === 'private' ? await answerDriverFinish({ trackingId: action.trackingId, telegramUserId: query.from.id, finished: action.finished }) : { ok: false as const };
      if (!result.ok) {
        await instance.answerCallbackQuery(query.id, { text: 'Kuzatuv topilmadi yoki allaqachon tugagan.', show_alert: true });
        return;
      }
      await instance.answerCallbackQuery(query.id);
      const messageId = query.message?.message_id;
      if (messageId !== undefined) {
        await instance.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chat.id, message_id: messageId }).catch(() => undefined);
      }
      await instance.sendMessage(
        chat.id,
        result.finished
          ? "Rahmat! Yuk yakunlandi, joylashuvni kuzatish to'xtatildi. Jonli joylashuvni Telegram'da ham o'chirib qo'ying."
          : "Tushunarli, kuzatuv davom etadi. Yo'lingiz bexatar bo'lsin!",
        { reply_markup: { remove_keyboard: true } }
      );
      return;
    }
    if (action.kind === 'driver-info' || action.kind === 'driver-docs') {
      await instance.answerCallbackQuery(query.id, action.kind === 'driver-docs' ? { text: 'Hujjatlar yuborilmoqda…' } : undefined);
      if (chat.type !== 'private') return;
      if (action.kind === 'driver-docs') await sendDriverDocuments(chat.id, query.from.id);
      else await sendDriverInfo(chat.id, query.from.id);
      return;
    }
    const clientId = await getClientIdByGroup(String(chat.id));
    if (!clientId) {
      await instance.answerCallbackQuery(query.id, { text: 'Группа не привязана к клиенту.' });
      return;
    }
    await instance.answerCallbackQuery(query.id);
    if (action.kind === 'where') await sendWhere(chat.id, clientId, action.trackingId);
    else if (action.kind === 'where-all') await sendFuraList(chat.id, clientId);
    else if (action.kind === 'issue-code') await sendCodeToGroup(chat.id, clientId, action.taskId);
    else {
      const draft = await getDraft({ clientId, chatId: String(chat.id) }, action.draftId);
      const taskId = draft ? await matchDraftToRecentTask(clientId, draft.data.header) : null;
      if (taskId) await sendCodeToGroup(chat.id, clientId, taskId);
      else await sendTaskPicker(chat.id, clientId);
    }
  };

  /** Jonli xabardagi Yakunlash / Bekor qilish tugmalari. Egalik (guruh+mijoz) servisda tekshiriladi. */
  const handleDraftCallback = async (query: TelegramBot.CallbackQuery, chatId: number, messageId: number, action: DraftCallbackAction, draftId: number): Promise<void> => {
    const clientId = await getClientIdByGroup(String(chatId));
    if (!clientId) {
      await instance.answerCallbackQuery(query.id, { text: 'Guruh mijozga ulanmagan.' });
      return;
    }
    const scope = { botToken, clientId, chatId: String(chatId) };
    const actor = actorFromTelegramUser(query.from);
    const reject = (text: string) => instance.answerCallbackQuery(query.id, { text: text.slice(0, 200), show_alert: true });

    if (action === 'done' || action === 'cancel-yes') {
      const result = action === 'done' ? await completeDraft(scope, draftId, actor) : await cancelDraft(scope, draftId, actor);
      if (!result.ok) {
        await reject(result.error);
        return;
      }
      await instance.answerCallbackQuery(query.id, { text: action === 'done' ? '✅ Yakunlandi' : '❌ Bekor qilindi' });
      return;
    }

    // cancel / cancel-no: faqat tugmalar almashadi (tasdiq so'rash yoki oddiy holatga qaytish)
    const draft = await getDraft({ clientId, chatId: String(chatId) }, draftId);
    if (!draft || draft.status !== 'OPEN') {
      await reject('Ariza topilmadi yoki yopilgan.');
      return;
    }
    const keyboard = buildDraftKeyboard({
      draftId,
      chatId: String(chatId),
      status: draft.status,
      complete: draft.complete,
      miniAppLink: miniAppLink ?? null,
      confirmCancel: action === 'cancel',
    });
    await instance.answerCallbackQuery(query.id);
    await instance.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: chatId, message_id: messageId }).catch((e: unknown) => {
      if (!(e instanceof Error && e.message.includes('message is not modified'))) throw e;
    });
  };

  instance.on('callback_query', async (query) => {
    const data = query.data ?? '';
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const trackingCallback = parseCargoTrackingCallback(data);
    if (trackingCallback) {
      try {
        await handleTrackingCallback(query, trackingCallback);
      } catch (e) {
        console.error('[ClientCargoBot] kuzatuv callback xatosi:', e instanceof Error ? e.message : e);
        instance.answerCallbackQuery(query.id).catch(() => undefined);
        if (chatId !== undefined) instance.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.").catch(() => undefined);
      }
      return;
    }
    const draftCallback = parseDraftCallback(data);
    if (draftCallback && chatId !== undefined && messageId !== undefined) {
      try {
        await handleDraftCallback(query, chatId, messageId, draftCallback.action, draftCallback.draftId);
      } catch (e) {
        console.error('[ClientCargoBot] ariza callback xatosi:', e instanceof Error ? e.message : e);
        instance.answerCallbackQuery(query.id).catch(() => undefined);
        instance.sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.").catch(() => undefined);
      }
      return;
    }
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
      // Shaxsiy chatdagi oddiy matn: haydovchi kodi yoki yo'riqnoma (buyruqlar onText'da)
      if (msg.chat.type === 'private' && msg.from && msg.text && !msg.text.startsWith('/')) {
        if (isDriverCodeShape(msg.text)) await handleDriverCode(msg, msg.text);
        else await instance.sendMessage(msg.chat.id, DRIVER_HELP);
      }
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

  // allowed_updates aniq beriladi: jonli joylashuv yangilanishlari edited_message bilan keladi (Telegram eski qiymatni eslab qolishi mumkin)
  const bot = new TelegramBot(token, { polling: { params: { allowed_updates: ['message', 'edited_message', 'callback_query'] } } });
  bot.on('polling_error', (error) => {
    console.error('[ClientCargoBot] Polling error:', error.message);
  });
  registerHandlers(bot, miniAppLink, token);

  const commandsError = (e: unknown) => console.error('[ClientCargoBot] setMyCommands xatosi:', e instanceof Error ? e.message : e);
  bot
    .setMyCommands([
      { command: 'yangi', description: "Yuk ma'lumotini kiritish formasini ochish" },
      { command: 'arxiv', description: "Yakunlangan yuklar hujjatlarini olish" },
      { command: 'kod', description: 'Haydovchi uchun kod olish' },
      { command: 'fura', description: 'Fura qayerdaligini bilish' },
      { command: 'ulash', description: 'Guruhni mijozga ulash (KOD bilan)' },
    ])
    .catch(commandsError);
  // Haydovchilar shaxsiy chatda faqat o'z buyruqlarini ko'radi
  bot
    .setMyCommands(
      [
        { command: 'yuk', description: "Yuk ma'lumoti (bojxona, manzil)" },
        { command: 'hujjat', description: 'Yuk hujjatlarini yuklab olish' },
      ],
      { scope: { type: 'all_private_chats' } }
    )
    .catch(commandsError);

  // Soatlik ish: faqat bot yoqilgan instansiyada (aks holda lokal server haydovchilarga ikki marta yozardi)
  cron.schedule('0 * * * *', () => {
    runHourlyTrackingJob(token).catch((e: unknown) => console.error('[CargoTracking] Soatlik ish xatosi:', e instanceof Error ? e.message : e));
  });

  console.log("[ClientCargoBot] Yuk ma'lumotlari boti ishga tushdi.");
};
