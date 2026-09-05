import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../prisma';

let bot: TelegramBot | null = null;

const STAGE_LABELS: Record<string, string> = {
  COLD: 'Yangi',
  IN_PROGRESS: 'Aloqada',
  MEETING: 'Uchrashuv',
  FOLLOW_UP: "O'ylanyapti",
  CLOSED_WON: 'Mijoz (Yutildi)',
  CLOSED_LOST: "Rad etdi (Yo'qotildi)",
  WRONG_NUMBER: 'Raqam xato',
  UNREACHABLE: "O'chiq / Ko'tarmadi",
};

const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '-';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const formatDateTimeUz = (date: Date): string => {
  return date.toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '');
};

export const initLeadReminderBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[LeadReminderBot] TELEGRAM_BOT_TOKEN aniqlanmagan — Lid eslatuvchi Telegram bot ishga tushmadi.');
    return;
  }

  // Dual bot warning check: If finance bot uses same token with polling, avoid 409 conflict.
  if (process.env.FINANCE_BOT_ENABLED === 'true' && process.env.FINANCE_BOT_TOKEN === token) {
    console.warn('[LeadReminderBot] Token finance-bot bilan bir xil va polling yoqilgan. Conflict oldini olish uchun faqat message handler/sendMessage ishlatiladi.');
    bot = new TelegramBot(token, { polling: false });
    return;
  }

  try {
    bot = new TelegramBot(token, { polling: true });

    bot.on('polling_error', (error) => {
      console.error('[LeadReminderBot] Polling error:', error.message);
    });

    // /start & /help
    bot.onText(/\/(start|help)/, async (msg) => {
      const chatId = msg.chat.id;
      const text = 
        `<b>Assalomu alaykum! Lidlar eslatmasi botiga xush kelibsiz.</b>\n\n` +
        `Ushbu bot rejalashtirilgan keyingi qo'ng'iroqlar vaqti kelganida eslatib turadi.\n\n` +
        `<b>Mavjud buyruqlar:</b>\n` +
        `/bugun — Bugungi rejalashtirilgan qo'ng'iroqlar\n` +
        `/ertaga — Ertangi rejalashtirilgan qo'ng'iroqlar\n` +
        `/otib_ketgan — Vaqti o'tib ketgan qo'ng'iroqlar\n` +
        `/lidlar — Faol lidlar ro'yxati\n` +
        `/myid — Sizning Telegram Chat ID'ingiz\n\n` +
        `Sizning Chat ID: <code>${chatId}</code>`;
      
      bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });

    // /myid
    bot.onText(/\/myid/, (msg) => {
      bot!.sendMessage(msg.chat.id, `Sizning Telegram Chat ID: <code>${msg.chat.id}</code>`, { parse_mode: 'HTML' });
    });

    // /bugun
    bot.onText(/\/(bugun|bugungi_qongiroqlar)/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const leads = await prisma.lead.findMany({
          where: {
            nextCallAt: { gte: todayStart, lte: todayEnd },
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
          include: { assignedTo: true },
          orderBy: { nextCallAt: 'asc' },
        });

        if (leads.length === 0) {
          bot!.sendMessage(chatId, "✅ Bugun uchun rejalashtirilgan qo'ng'iroqlar yo'q.");
          return;
        }

        let text = `📞 <b>Bugungi qo'ng'iroqlar ro'yxati (${leads.length} ta):</b>\n\n`;
        leads.forEach((l, index) => {
          const time = l.nextCallAt ? formatDateTimeUz(l.nextCallAt) : '-';
          const seller = l.assignedTo?.name ? `(${l.assignedTo.name})` : '';
          text += `${index + 1}. 🏢 <b>${escapeHtml(l.companyName)}</b> ${seller}\n`;
          text += `   📞 Tel: ${escapeHtml(l.phone || '-')}\n`;
          text += `   ⏰ Vaqt: <b>${time}</b> | Bosqich: ${STAGE_LABELS[l.stage] || l.stage}\n\n`;
        });

        bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
      } catch (err: any) {
        console.error('[LeadReminderBot /bugun error]', err);
        bot!.sendMessage(chatId, 'Xatolik yuz berdi: ' + err.message);
      }
    });

    // /ertaga
    bot.onText(/\/ertaga/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const leads = await prisma.lead.findMany({
          where: {
            nextCallAt: { gte: tomorrowStart, lte: tomorrowEnd },
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
          include: { assignedTo: true },
          orderBy: { nextCallAt: 'asc' },
        });

        if (leads.length === 0) {
          bot!.sendMessage(chatId, "✅ Ertaga uchun rejalashtirilgan qo'ng'iroqlar yo'q.");
          return;
        }

        let text = `📅 <b>Ertangi qo'ng'iroqlar ro'yxati (${leads.length} ta):</b>\n\n`;
        leads.forEach((l, index) => {
          const time = l.nextCallAt ? formatDateTimeUz(l.nextCallAt) : '-';
          const seller = l.assignedTo?.name ? `(${l.assignedTo.name})` : '';
          text += `${index + 1}. 🏢 <b>${escapeHtml(l.companyName)}</b> ${seller}\n`;
          text += `   📞 Tel: ${escapeHtml(l.phone || '-')}\n`;
          text += `   ⏰ Vaqt: <b>${time}</b> | Bosqich: ${STAGE_LABELS[l.stage] || l.stage}\n\n`;
        });

        bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
      } catch (err: any) {
        console.error('[LeadReminderBot /ertaga error]', err);
        bot!.sendMessage(chatId, 'Xatolik yuz berdi: ' + err.message);
      }
    });

    // /otib_ketgan
    bot.onText(/\/otib_ketgan/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const now = new Date();
        const leads = await prisma.lead.findMany({
          where: {
            nextCallAt: { lt: now },
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
          include: { assignedTo: true },
          orderBy: { nextCallAt: 'asc' },
          take: 25,
        });

        if (leads.length === 0) {
          bot!.sendMessage(chatId, "🎉 Barcha qo'ng'iroqlar o'z vaqtida bajarilgan! Qolib ketganlar yo'q.");
          return;
        }

        let text = `⚠️ <b>Vaqti o'tib ketgan qo'ng'iroqlar (${leads.length} ta):</b>\n\n`;
        leads.forEach((l, index) => {
          const time = l.nextCallAt ? formatDateTimeUz(l.nextCallAt) : '-';
          const seller = l.assignedTo?.name ? `(${l.assignedTo.name})` : '';
          text += `${index + 1}. 🏢 <b>${escapeHtml(l.companyName)}</b> ${seller}\n`;
          text += `   📞 Tel: ${escapeHtml(l.phone || '-')}\n`;
          text += `   ⏰ Belgilangan vaqt: <b>${time}</b>\n\n`;
        });

        bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
      } catch (err: any) {
        console.error('[LeadReminderBot /otib_ketgan error]', err);
        bot!.sendMessage(chatId, 'Xatolik yuz berdi: ' + err.message);
      }
    });

    // Callback queries (Inline buttons)
    bot.on('callback_query', async (query) => {
      if (!query.data || !query.message) return;
      const chatId = query.message.chat.id;
      const data = query.data;

      try {
        if (data.startsWith('lead_done:')) {
          const leadId = Number(data.split(':')[1]);
          const lead = await prisma.lead.findUnique({ where: { id: leadId } });
          if (!lead) {
            await bot!.answerCallbackQuery(query.id, { text: 'Lid topilmadi!' });
            return;
          }

          // Log activity
          await prisma.leadActivity.create({
            data: {
              leadId,
              userId: lead.assignedToId || 1,
              type: 'call',
              note: "✅ Qo'ng'iroq qilindi (Telegram bot orqali tasdiqlandi)",
            },
          });

          const originalText = query.message.text || '';
          const updatedText = `${originalText}\n\n✅ <b>Qo'ng'iroq qilindi va tasdiqlandi!</b>`;

          await bot!.editMessageText(updatedText, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
          });

          await bot!.answerCallbackQuery(query.id, { text: "Qo'ng'iroq qilindi deb belgilandi!" });
        } else if (data.startsWith('lead_postpone_')) {
          const parts = data.split(':');
          const postponeType = parts[0].replace('lead_postpone_', ''); // 1h, 1d, 3d
          const leadId = Number(parts[1]);

          const lead = await prisma.lead.findUnique({ where: { id: leadId } });
          if (!lead) {
            await bot!.answerCallbackQuery(query.id, { text: 'Lid topilmadi!' });
            return;
          }

          const baseTime = (lead.nextCallAt && new Date(lead.nextCallAt) > new Date()) 
            ? new Date(lead.nextCallAt) 
            : new Date();

          let newNextCall = new Date(baseTime);
          let noteStr = '';

          if (postponeType === '1h') {
            newNextCall.setHours(newNextCall.getHours() + 1);
            noteStr = '1 soatga';
          } else if (postponeType === '1d') {
            newNextCall.setDate(newNextCall.getDate() + 1);
            noteStr = '1 kunga (ertaga)';
          } else if (postponeType === '3d') {
            newNextCall.setDate(newNextCall.getDate() + 3);
            noteStr = '3 kunga';
          }

          await prisma.lead.update({
            where: { id: leadId },
            data: {
              nextCallAt: newNextCall,
              reminderSent: false,
            },
          });

          await prisma.leadActivity.create({
            data: {
              leadId,
              userId: lead.assignedToId || 1,
              type: 'comment',
              note: `⏰ Keyingi qo'ng'iroq vaqti Telegram bot orqali ${noteStr} surildi: ${formatDateTimeUz(newNextCall)}`,
            },
          });

          const originalText = query.message.text || '';
          const updatedText = `${originalText}\n\n⏰ <b>Keyingi qo'ng'iroq vaqti ${noteStr} surildi:</b> ${formatDateTimeUz(newNextCall)}`;

          await bot!.editMessageText(updatedText, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
          });

          await bot!.answerCallbackQuery(query.id, { text: `Vaqt ${noteStr} surildi!` });
        }
      } catch (err: any) {
        console.error('[LeadReminderBot Callback Error]', err);
        await bot!.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi' });
      }
    });

    console.log('[LeadReminderBot] Telegram bot muvaffaqiyatli ishga tushdi.');
  } catch (err: any) {
    console.error('[LeadReminderBot] Botni ishga tushirishda xatolik:', err.message);
  }
};

export const sendLeadCallReminder = async (leadId: number): Promise<boolean> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;

  if (!token) {
    console.warn('[LeadReminderBot] TELEGRAM_BOT_TOKEN joylashtirilmagan.');
    return false;
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        activities: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead || !lead.nextCallAt) {
      return false;
    }

    const timeStr = formatDateTimeUz(new Date(lead.nextCallAt));
    const lastActivity = lead.activities[0]?.note ? escapeHtml(lead.activities[0].note) : '-';
    const stageName = STAGE_LABELS[lead.stage] || lead.stage;
    const sellerName = lead.assignedTo?.name ? escapeHtml(lead.assignedTo.name) : 'Tayinlanmagan';
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';

    const message = 
      `🔔 <b>QO'NG'IROQ VAQTI BO'LDI!</b>\n\n` +
      `🏢 <b>Kompaniya:</b> ${escapeHtml(lead.companyName)}\n` +
      `👤 <b>Muloqot uchun:</b> ${escapeHtml(lead.contactPerson || '-')}\n` +
      `📞 <b>Telefon:</b> <code>${escapeHtml(lead.phone || '-')}</code>\n` +
      `📌 <b>Bosqich:</b> ${stageName}\n` +
      `👨‍💼 <b>Mas'ul sotuvchi:</b> ${sellerName}\n` +
      `⏰ <b>Rejalashtirilgan vaqt:</b> ${timeStr}\n` +
      `📍 <b>Hudud:</b> ${escapeHtml(lead.region || '-')} ${escapeHtml(lead.district || '')}\n\n` +
      `💬 <b>So'nggi izoh:</b> <i>${lastActivity}</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Qo'ng'iroq qilindi", callback_data: `lead_done:${lead.id}` }
        ],
        [
          { text: '⏰ +1 soat', callback_data: `lead_postpone_1h:${lead.id}` },
          { text: '📅 Ertaga', callback_data: `lead_postpone_1d:${lead.id}` },
          { text: '📆 +3 kun', callback_data: `lead_postpone_3d:${lead.id}` }
        ],
        [
          { text: '🔗 CRM-da ochish', url: `${siteUrl}/leads/${lead.id}` }
        ]
      ]
    };

    const chatIds: string[] = [];
    if (groupChatId) chatIds.push(groupChatId);
    if (lead.assignedTo?.telegramChatId && !chatIds.includes(lead.assignedTo.telegramChatId)) {
      chatIds.push(lead.assignedTo.telegramChatId);
    }

    if (chatIds.length === 0) {
      console.warn('[LeadReminderBot] Hech qanday TELEGRAM_GROUP_CHAT_ID yoki telegramChatId topilmadi.');
    }

    const sendBot = bot || new TelegramBot(token);

    for (const chatId of chatIds) {
      try {
        await sendBot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
      } catch (err: any) {
        console.error(`[LeadReminderBot] Chat ID ${chatId} ga xabar yuborishda xatolik:`, err.message);
      }
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { reminderSent: true },
    });

    return true;
  } catch (err: any) {
    console.error(`[LeadReminderBot] sendLeadCallReminder xatoligi (Lead #${leadId}):`, err);
    return false;
  }
};
