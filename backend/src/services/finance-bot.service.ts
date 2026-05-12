import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../prisma';
import { getLatestExchangeRate } from './exchange-rate';

let bot: TelegramBot | null = null;

const userStates: Record<number, any> = {};

const formatMoney = (amount: any) => {
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  return num.toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
};

export const getVirtualCardsBalance = async () => {
  const usdToUzsRate = Number(await getLatestExchangeRate('USD', 'UZS'));

  const virtualCardTransactions = await prisma.transaction.findMany({
    where: { virtualCardId: { not: null } }
  });

  const cardBalances: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const tx of virtualCardTransactions) {
    if (tx.virtualCardId && tx.virtualCardId >= 1 && tx.virtualCardId <= 4) {
      let txAmount = 0;
      if (tx.amount_uzs) {
        txAmount = Number(tx.amount_uzs);
      } else if (tx.convertedUzsAmount) {
        txAmount = Number(tx.convertedUzsAmount);
      } else {
        txAmount = tx.currency === 'USD' ? Number(tx.amount) * usdToUzsRate : Number(tx.amount);
      }

      if (tx.type === 'INCOME') {
        cardBalances[tx.virtualCardId] += txAmount;
      } else if (tx.type === 'EXPENSE') {
        cardBalances[tx.virtualCardId] -= txAmount;
      }
    }
  }

  return [
    { id: 1, name: 'Operatsion xarajatlar', perTask: 400000, total: cardBalances[1] },
    { id: 2, name: 'Qarzlar kartasi', perTask: 450000, total: cardBalances[2] },
    { id: 3, name: 'Korxona xarajatlari', perTask: 170000, total: cardBalances[3] },
    { id: 4, name: 'Maosh kartam', perTask: 100000, total: cardBalances[4] },
  ];
};

export const initFinanceBot = () => {
  const token = process.env.FINANCE_BOT_TOKEN;
  if (!token) return;

  bot = new TelegramBot(token, { polling: true });

  bot.on('polling_error', (error) => {
    console.error('[FinanceBot] Polling error:', error.message);
  });

  bot.onText(/\/(start|help)/, (msg) => {
    const chatId = msg.chat.id;
    const text = `Assalomu alaykum!\n\nBuyruqlar:\n/balans - Seyflardagi hozirgi qoldiqni ko'rish\n/chiqim - Seyfdan pul yechish (sarflash)`;
    bot!.sendMessage(chatId, text);
  });

  bot.onText(/\/balans/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cards = await getVirtualCardsBalance();
      let text = `💼 **Joriy seyflar balansi:**\n\n`;
      cards.forEach(c => {
        text += `🔹 **${c.name}**: ${formatMoney(c.total)} so'm\n`;
      });
      bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      bot!.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
  });

  bot.onText(/\/chiqim/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cards = await getVirtualCardsBalance();
      const keyboard = cards.map(c => ([{ text: `${c.name} (${formatMoney(c.total)} so'm)`, callback_data: `chiqim_card:${c.id}` }]));
      
      const sentMsg = await bot!.sendMessage(chatId, 'Qaysi seyfdan pul sarflamoqchisiz? Tanlang:', {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      userStates[chatId] = { step: 'WAITING_CARD', messageId: sentMsg.message_id };
    } catch (e) {
      bot!.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const state = userStates[chatId];
    if (!state) return;

    if (state.step === 'WAITING_AMOUNT') {
      const amount = Number(msg.text.replace(/[^0-9]/g, ''));
      if (!amount || isNaN(amount)) {
        bot!.sendMessage(chatId, 'Iltimos, to\'g\'ri summa kiriting (masalan: 500000):');
        return;
      }
      state.amount = amount;
      state.step = 'WAITING_COMMENT';
      bot!.sendMessage(chatId, `💸 Summa: **${formatMoney(amount)} so'm**\n\nBu pul nima maqsadda sarflandi? Izoh yozing:`, { parse_mode: 'Markdown' });
    } else if (state.step === 'WAITING_COMMENT') {
      state.comment = msg.text;
      const cards = await getVirtualCardsBalance();
      const card = cards.find(c => c.id === state.cardId);
      const confirmText = `❓ **Tasdiqlaysizmi?**\n\nSeyf: ${card?.name}\nSumma: ${formatMoney(state.amount)} so'm\nIzoh: ${state.comment}`;
      bot!.sendMessage(chatId, confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Tasdiqlash', callback_data: 'chiqim_confirm' },
              { text: '❌ Bekor qilish', callback_data: 'chiqim_cancel' }
            ]
          ]
        }
      });
      state.step = 'WAITING_CONFIRMATION';
    } else if (state.step.startsWith('PARTIAL_')) {
      const amount = Number(msg.text.replace(/[^0-9]/g, ''));
      if (isNaN(amount)) {
        bot!.sendMessage(chatId, 'Iltimos, to\'g\'ri summa kiriting (masalan: 400000 yoki 0):');
        return;
      }
      
      if (state.step === 'PARTIAL_1') {
        state.partialData[1] = amount;
        state.step = 'PARTIAL_2';
        bot!.sendMessage(chatId, `🔹 2. **Qarzlar kartasi** uchun qancha qo'ydingiz? (Standart: 450 000)`, { parse_mode: 'Markdown' });
      } else if (state.step === 'PARTIAL_2') {
        state.partialData[2] = amount;
        state.step = 'PARTIAL_3';
        bot!.sendMessage(chatId, `🔹 3. **Korxona xarajatlari** uchun qancha qo'ydingiz? (Standart: 170 000)`, { parse_mode: 'Markdown' });
      } else if (state.step === 'PARTIAL_3') {
        state.partialData[3] = amount;
        state.step = 'PARTIAL_4';
        bot!.sendMessage(chatId, `🔹 4. **Maosh kartam** uchun qancha qo'ydingiz? (Standart: 100 000)`, { parse_mode: 'Markdown' });
      } else if (state.step === 'PARTIAL_4') {
        state.partialData[4] = amount;
        
        let confirmText = `❓ **Qisman taqsimotni tasdiqlaysizmi?**\n\n`;
        confirmText += `- Operatsion: ${formatMoney(state.partialData[1])} so'm\n`;
        confirmText += `- Qarzlar: ${formatMoney(state.partialData[2])} so'm\n`;
        confirmText += `- Korxona: ${formatMoney(state.partialData[3])} so'm\n`;
        confirmText += `- Maosh: ${formatMoney(state.partialData[4])} so'm\n`;
        
        bot!.sendMessage(chatId, confirmText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Tasdiqlash', callback_data: 'partial_confirm' },
                { text: '❌ Bekor qilish', callback_data: 'partial_cancel' }
              ]
            ]
          }
        });
        state.step = 'PARTIAL_CONFIRM';
      }
    }
  });

  bot.on('callback_query', async (query) => {
    if (!query.data || !query.message) return;
    const chatId = query.message.chat.id;

    if (query.data.startsWith('dist_money:')) {
      const taskId = query.data.split(':')[1];
      const originalText = query.message.text || '';
      
      try {
        const cards = await getVirtualCardsBalance();
        // Create 4 INCOME transactions automatically
        for (const c of cards) {
          await prisma.transaction.create({
            data: {
              type: 'INCOME',
              amount: c.perTask,
              currency: 'UZS',
              date: new Date(),
              comment: `Ish #${taskId} to'liq taqsimlandi`,
              virtualCardId: c.id,
              expenseCategory: c.name
            }
          });
        }

        const newCards = await getVirtualCardsBalance();
        let balanceText = `\n\n💼 **Seyflardagi joriy qoldiq (To'liq taqsimlandi):**\n`;
        newCards.forEach(c => {
          balanceText += `🔹 ${c.name}: ${formatMoney(c.total)} so'm\n`;
        });

        const newText = `${originalText}\n\n✅ **Holat:** To'liq taqsimlandi!${balanceText}`;
        
        await bot!.editMessageText(newText, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        });
        await bot!.answerCallbackQuery(query.id, { text: 'Tasdiqlandi!' });
      } catch (error) {
        console.error('Error in dist_money:', error);
      }
    } 
    else if (query.data.startsWith('dist_partial:')) {
      const taskId = query.data.split(':')[1];
      userStates[chatId] = {
        step: 'PARTIAL_1',
        taskId,
        partialData: {},
        originalMsgId: query.message.message_id,
        originalText: query.message.text || ''
      };

      bot!.sendMessage(chatId, `🔹 1. **Operatsion xarajatlar** uchun qancha qo'ydingiz? (Standart: 400 000)\n\nFaqat raqam kiriting:`, { parse_mode: 'Markdown' });
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'partial_confirm') {
      const state = userStates[chatId];
      if (state && state.step === 'PARTIAL_CONFIRM') {
        try {
          const cards = await getVirtualCardsBalance();
          for (const c of cards) {
            const amt = state.partialData[c.id];
            if (amt > 0) {
              await prisma.transaction.create({
                data: {
                  type: 'INCOME',
                  amount: amt,
                  currency: 'UZS',
                  date: new Date(),
                  comment: `Ish #${state.taskId} qisman taqsimlandi`,
                  virtualCardId: c.id,
                  expenseCategory: c.name
                }
              });
            }
          }

          const newCards = await getVirtualCardsBalance();
          let balanceText = `\n\n💼 **Seyflardagi joriy qoldiq (Qisman taqsimlandi):**\n`;
          newCards.forEach(c => {
            balanceText += `🔹 ${c.name}: ${formatMoney(c.total)} so'm\n`;
          });

          const newText = `${state.originalText}\n\n✅ **Holat:** Qisman taqsimlandi!${balanceText}`;
          
          await bot!.editMessageText(newText, {
            chat_id: chatId,
            message_id: state.originalMsgId,
            parse_mode: 'Markdown'
          });

          await bot!.editMessageText('✅ Qisman taqsimot saqlandi.', {
            chat_id: chatId,
            message_id: query.message.message_id
          });
          
          delete userStates[chatId];
        } catch (e) {
          console.error(e);
        }
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'partial_cancel') {
      const state = userStates[chatId];
      if (state) {
        delete userStates[chatId];
        await bot!.editMessageText('❌ Qisman taqsimlash bekor qilindi.', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
    // ... chiqim logic
    else if (query.data.startsWith('chiqim_card:')) {
      const cardId = Number(query.data.split(':')[1]);
      const state = userStates[chatId];
      if (state && state.step === 'WAITING_CARD') {
        state.cardId = cardId;
        state.step = 'WAITING_AMOUNT';
        await bot!.editMessageText('Yaxshi. Qancha summa sarflandi? Raqamda yozing (masalan: 150000):', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'chiqim_confirm') {
      const state = userStates[chatId];
      if (state && state.step === 'WAITING_CONFIRMATION') {
        try {
          const cards = await getVirtualCardsBalance();
          const card = cards.find(c => c.id === state.cardId);

          await prisma.transaction.create({
            data: {
              type: 'EXPENSE',
              amount: state.amount!,
              currency: 'UZS',
              date: new Date(),
              comment: state.comment,
              virtualCardId: state.cardId,
              expenseCategory: card?.name
            }
          });

          await bot!.editMessageText(`✅ **Muvaffaqiyatli saqlandi!**\n\nSeyf: ${card?.name}\nSumma: ${formatMoney(state.amount)} so'm\nIzoh: ${state.comment}`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
          });
          
          delete userStates[chatId];
        } catch (e) {
          console.error(e);
        }
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'chiqim_cancel') {
      const state = userStates[chatId];
      if (state) {
        delete userStates[chatId];
        await bot!.editMessageText('❌ Amaliyot bekor qilindi.', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
  });

  console.log('Finance Telegram Bot started.');
};

export const notifyTaskCompleted = async (taskId: number) => {
  if (!bot) return;

  const chatId = process.env.FINANCE_GROUP_CHAT_ID;
  if (!chatId) return;

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: true,
      }
    });

    if (!task) return;

    const message = `✅ *Yangi yakunlangan ish!*\n\n*Mijoz:* ${task.client.name}\n*Vazifa:* ${task.title}\n*Summa:* 1 120 000 sum\n\n*Taqsimot:*\n- Operatsion xarajatlar: 400 000 so'm\n- Qarzlar kartasi: 450 000 so'm\n- Korxona xarajatlari: 170 000 so'm\n- Maosh: 100 000 so'm`;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💰 To\'liq taqsimladim', callback_data: `dist_money:${taskId}` },
            { text: '〽️ Qisman taqsimlandi', callback_data: `dist_partial:${taskId}` }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error sending task notification:', error);
  }
};
