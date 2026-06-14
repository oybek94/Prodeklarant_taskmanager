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
      } else if (tx.type === 'EXPENSE' || tx.type === 'SALARY') {
        cardBalances[tx.virtualCardId] -= txAmount;
      }
    }
  }

  // Ochiq (qaytarilmagan) qarzlar seyf balansini kamaytiradi.
  // Vaqtinchalik qarz xarajat emas — shu sababli alohida hisoblanadi.
  const openLoans = await prisma.cardLoan.findMany();
  for (const loan of openLoans) {
    const remaining = Number(loan.amount) - Number(loan.repaidAmount);
    if (remaining > 0 && loan.virtualCardId >= 1 && loan.virtualCardId <= 4) {
      cardBalances[loan.virtualCardId] -= remaining;
    }
  }

  return [
    { id: 1, name: 'Operatsion xarajatlar', perTask: 400000, total: cardBalances[1] },
    { id: 2, name: 'Qarzlar kartasi', perTask: 450000, total: cardBalances[2] },
    { id: 3, name: 'Korxona xarajatlari', perTask: 170000, total: cardBalances[3] },
    { id: 4, name: 'Maosh kartam', perTask: 100000, total: cardBalances[4] },
  ];
};

// Karta bo'yicha ochiq qarzlar qoldig'i (remaining > 0 bo'lganlar).
const getOpenLoansByCard = async () => {
  const loans = await prisma.cardLoan.findMany({ orderBy: { date: 'asc' } });
  const byCard: Record<number, { remaining: number; loans: typeof loans }> = {};
  for (const loan of loans) {
    const remaining = Number(loan.amount) - Number(loan.repaidAmount);
    if (remaining <= 0) continue;
    if (!byCard[loan.virtualCardId]) {
      byCard[loan.virtualCardId] = { remaining: 0, loans: [] };
    }
    byCard[loan.virtualCardId].remaining += remaining;
    byCard[loan.virtualCardId].loans.push(loan);
  }
  return byCard;
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
    const text = `Assalomu alaykum!\n\nBuyruqlar:\n/balans - Seyflardagi hozirgi qoldiqni ko'rish\n/chiqim - Seyfdan pul yechish (sarflash)\n/qarz - Seyfdan qarz olish\n/qarzlar - Qarzlar ro'yxatini ko'rish\n/qaytarish - Qarzni qaytarish`;
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

  // /qarz — seyfdan qarz olish
  bot.onText(/\/qarz$/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cards = await getVirtualCardsBalance();
      const keyboard = cards.map(c => ([{ text: `${c.name} (${formatMoney(c.total)} so'm)`, callback_data: `qarz_card:${c.id}` }]));
      const sentMsg = await bot!.sendMessage(chatId, 'Qaysi seyfdan qarz olmoqchisiz? Tanlang:', {
        reply_markup: { inline_keyboard: keyboard }
      });
      userStates[chatId] = { step: 'QARZ_WAITING_CARD', messageId: sentMsg.message_id };
    } catch (e) {
      bot!.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
  });

  // /qarzlar — qarzlar ro'yxati
  bot.onText(/\/qarzlar/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cards = await getVirtualCardsBalance();
      const byCard = await getOpenLoansByCard();
      const cardIds = Object.keys(byCard).map(Number);
      if (cardIds.length === 0) {
        bot!.sendMessage(chatId, '✅ Hozircha qarzingiz yo\'q.');
        return;
      }
      let text = `📋 **Qarzlar ro'yxati:**\n`;
      let grandTotal = 0;
      for (const cardId of cardIds) {
        const card = cards.find(c => c.id === cardId);
        const info = byCard[cardId];
        grandTotal += info.remaining;
        text += `\n💳 **${card?.name || `Karta #${cardId}`}** — jami: ${formatMoney(info.remaining)} so'm\n`;
        for (const loan of info.loans) {
          const remaining = Number(loan.amount) - Number(loan.repaidAmount);
          const dateStr = new Date(loan.date).toLocaleDateString('ru-RU');
          const note = loan.comment ? ` — ${loan.comment}` : '';
          text += `   • ${formatMoney(remaining)} so'm (${dateStr})${note}\n`;
        }
      }
      text += `\n📊 **Umumiy qarz: ${formatMoney(grandTotal)} so'm**`;
      bot!.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      bot!.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
  });

  // /qaytarish — qarzni qaytarish
  bot.onText(/\/qaytarish/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cards = await getVirtualCardsBalance();
      const byCard = await getOpenLoansByCard();
      const cardIds = Object.keys(byCard).map(Number);
      if (cardIds.length === 0) {
        bot!.sendMessage(chatId, '✅ Qaytariladigan qarzingiz yo\'q.');
        return;
      }
      const keyboard = cardIds.map(cardId => {
        const card = cards.find(c => c.id === cardId);
        return [{ text: `${card?.name || `Karta #${cardId}`} (${formatMoney(byCard[cardId].remaining)} so'm)`, callback_data: `qaytarish_card:${cardId}` }];
      });
      const sentMsg = await bot!.sendMessage(chatId, 'Qaysi karta qarzini qaytarmoqchisiz? Tanlang:', {
        reply_markup: { inline_keyboard: keyboard }
      });
      userStates[chatId] = { step: 'QAYTARISH_WAITING_CARD', messageId: sentMsg.message_id };
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
      
      if (state.isSalary) {
        state.comment = `${state.workerName || 'Ishchi'} oyligi`;
        const cards = await getVirtualCardsBalance();
        const card = cards.find(c => c.id === state.cardId);
        const confirmText = `❓ **Tasdiqlaysizmi?**\n\nSeyf: ${card?.name}\nIshchi: ${state.workerName}\nSumma: ${formatMoney(state.amount)} so'm\nIzoh: ${state.comment}`;
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
      } else {
        state.step = 'WAITING_COMMENT';
        bot!.sendMessage(chatId, `💸 Summa: **${formatMoney(amount)} so'm**\n\nBu pul nima maqsadda sarflandi? Izoh yozing:`, { parse_mode: 'Markdown' });
      }
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
    } else if (state.step === 'QARZ_WAITING_AMOUNT') {
      const amount = Number(msg.text.replace(/[^0-9]/g, ''));
      if (!amount || isNaN(amount)) {
        bot!.sendMessage(chatId, 'Iltimos, to\'g\'ri summa kiriting (masalan: 200000):');
        return;
      }
      state.amount = amount;
      state.step = 'QARZ_WAITING_COMMENT';
      bot!.sendMessage(chatId, `💸 Summa: **${formatMoney(amount)} so'm**\n\nQarz uchun izoh yozing (yoki "yo'q" deb yozing):`, { parse_mode: 'Markdown' });
    } else if (state.step === 'QARZ_WAITING_COMMENT') {
      const raw = msg.text.trim();
      state.comment = /^yo'?q$/i.test(raw) ? null : raw;
      const cards = await getVirtualCardsBalance();
      const card = cards.find(c => c.id === state.cardId);
      let confirmText = `❓ **Qarzni tasdiqlaysizmi?**\n\nSeyf: ${card?.name}\nSumma: ${formatMoney(state.amount)} so'm\nIzoh: ${state.comment || '-'}`;
      if (card && state.amount > Number(card.total)) {
        confirmText += `\n\n⚠️ Diqqat: summa seyf qoldig'idan (${formatMoney(card.total)} so'm) ko'p.`;
      }
      bot!.sendMessage(chatId, confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Tasdiqlash', callback_data: 'qarz_confirm' },
              { text: '❌ Bekor qilish', callback_data: 'qarz_cancel' }
            ]
          ]
        }
      });
      state.step = 'QARZ_WAITING_CONFIRMATION';
    } else if (state.step === 'QAYTARISH_WAITING_AMOUNT') {
      const amount = Number(msg.text.replace(/[^0-9]/g, ''));
      if (!amount || isNaN(amount)) {
        bot!.sendMessage(chatId, 'Iltimos, to\'g\'ri summa kiriting (masalan: 50000):');
        return;
      }
      if (amount > state.remaining) {
        bot!.sendMessage(chatId, `Summa qarz qoldig'idan (${formatMoney(state.remaining)} so'm) ko'p bo'lmasligi kerak. Qaytadan kiriting:`);
        return;
      }
      state.amount = amount;
      const cards = await getVirtualCardsBalance();
      const card = cards.find(c => c.id === state.cardId);
      const left = state.remaining - amount;
      const confirmText = `❓ **Qaytarishni tasdiqlaysizmi?**\n\nSeyf: ${card?.name}\nQaytarish: ${formatMoney(amount)} so'm\nQolgan qarz: ${formatMoney(left)} so'm`;
      bot!.sendMessage(chatId, confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Tasdiqlash', callback_data: 'qaytarish_confirm' },
              { text: '❌ Bekor qilish', callback_data: 'qaytarish_cancel' }
            ]
          ]
        }
      });
      state.step = 'QAYTARISH_WAITING_CONFIRMATION';
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
        
        if (cardId === 1) {
          state.step = 'WAITING_IS_SALARY';
          await bot!.editMessageText('Bu chiqim ishchi oyligimi?', {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Ha', callback_data: 'is_salary_yes' },
                  { text: 'Yo\'q', callback_data: 'is_salary_no' }
                ]
              ]
            }
          });
        } else {
          state.step = 'WAITING_AMOUNT';
          await bot!.editMessageText('Yaxshi. Qancha summa sarflandi? Raqamda yozing (masalan: 150000):', {
            chat_id: chatId,
            message_id: query.message.message_id
          });
        }
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'is_salary_yes') {
      const state = userStates[chatId];
      if (state && state.step === 'WAITING_IS_SALARY') {
        state.isSalary = true;
        state.step = 'WAITING_WORKER';
        try {
          const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } });
          const keyboard: any[] = [];
          for (let i = 0; i < users.length; i += 2) {
            const row: any[] = [];
            row.push({ text: users[i].name, callback_data: `salary_worker:${users[i].id}` });
            if (i + 1 < users.length) {
              row.push({ text: users[i + 1].name, callback_data: `salary_worker:${users[i + 1].id}` });
            }
            keyboard.push(row);
          }
          await bot!.editMessageText('Qaysi ishchining oyligi berilyapti? Tanlang:', {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'is_salary_no') {
      const state = userStates[chatId];
      if (state && state.step === 'WAITING_IS_SALARY') {
        state.isSalary = false;
        state.step = 'WAITING_AMOUNT';
        await bot!.editMessageText('Yaxshi. Qancha summa sarflandi? Raqamda yozing (masalan: 150000):', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data.startsWith('salary_worker:')) {
      const workerId = Number(query.data.split(':')[1]);
      const state = userStates[chatId];
      if (state && state.step === 'WAITING_WORKER') {
        state.workerId = workerId;
        state.step = 'WAITING_AMOUNT';
        try {
          const worker = await prisma.user.findUnique({ where: { id: workerId } });
          state.workerName = worker?.name || 'Ishchi';
          await bot!.editMessageText(`${state.workerName} uchun qancha oylik summa berildi? Raqamda yozing (masalan: 1500000):`, {
            chat_id: chatId,
            message_id: query.message.message_id
          });
        } catch (e) {
          console.error(e);
        }
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'chiqim_confirm') {
      const state = userStates[chatId];
      if (state && state.step === 'WAITING_CONFIRMATION') {
        try {
          const cards = await getVirtualCardsBalance();
          const card = cards.find(c => c.id === state.cardId);

          const txData: any = {
            type: state.isSalary ? 'SALARY' : 'EXPENSE',
            amount: state.amount!,
            currency: 'UZS',
            amount_original: state.amount!,
            currency_universal: 'UZS',
            exchange_rate: 1,
            amount_uzs: state.amount!,
            exchange_source: 'CBU',
            date: new Date(),
            comment: state.comment,
            virtualCardId: state.cardId,
            expenseCategory: state.isSalary ? 'SALARY' : card?.name
          };

          if (state.isSalary && state.workerId) {
            txData.workerId = state.workerId;
          }

          await prisma.transaction.create({
            data: txData
          });
          
          if (state.isSalary && state.workerId) {
            try {
              const { Decimal } = await import('@prisma/client/runtime/library');
              const { createWorkerPayment } = await import('./worker-payment');
              await createWorkerPayment(
                state.workerId,
                'UZS',
                new Decimal(state.amount!),
                { paymentDate: new Date(), comment: state.comment }
              );
            } catch (err) {
              console.error('Failed to create WorkerPayment from bot:', err);
            }
          }

          await bot!.editMessageText(`✅ **Muvaffaqiyatli saqlandi!**\n\nSeyf: ${card?.name}\n${state.isSalary ? `Ishchi: ${state.workerName}\n` : ''}Summa: ${formatMoney(state.amount)} so'm\nIzoh: ${state.comment}`, {
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
    // ... qarz logic
    else if (query.data.startsWith('qarz_card:')) {
      const cardId = Number(query.data.split(':')[1]);
      const state = userStates[chatId];
      if (state && state.step === 'QARZ_WAITING_CARD') {
        state.cardId = cardId;
        state.step = 'QARZ_WAITING_AMOUNT';
        await bot!.editMessageText('Qancha qarz olmoqchisiz? Raqamda yozing (masalan: 200000):', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'qarz_confirm') {
      const state = userStates[chatId];
      if (state && state.step === 'QARZ_WAITING_CONFIRMATION') {
        try {
          await prisma.cardLoan.create({
            data: {
              virtualCardId: state.cardId,
              amount: state.amount!,
              comment: state.comment || null,
              date: new Date()
            }
          });

          const cards = await getVirtualCardsBalance();
          const card = cards.find(c => c.id === state.cardId);
          await bot!.editMessageText(`✅ **Qarz olindi!**\n\nSeyf: ${card?.name}\nSumma: ${formatMoney(state.amount)} so'm\nIzoh: ${state.comment || '-'}\n\n💼 ${card?.name} qoldig'i: ${formatMoney(card?.total)} so'm`, {
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
    else if (query.data === 'qarz_cancel') {
      const state = userStates[chatId];
      if (state) {
        delete userStates[chatId];
        await bot!.editMessageText('❌ Qarz olish bekor qilindi.', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
    // ... qaytarish logic
    else if (query.data.startsWith('qaytarish_card:')) {
      const cardId = Number(query.data.split(':')[1]);
      const state = userStates[chatId];
      if (state && state.step === 'QAYTARISH_WAITING_CARD') {
        const byCard = await getOpenLoansByCard();
        const info = byCard[cardId];
        if (!info || info.remaining <= 0) {
          delete userStates[chatId];
          await bot!.editMessageText('Bu kartada qarz qolmagan.', {
            chat_id: chatId,
            message_id: query.message.message_id
          });
          await bot!.answerCallbackQuery(query.id);
          return;
        }
        state.cardId = cardId;
        state.remaining = info.remaining;
        state.step = 'QAYTARISH_WAITING_AMOUNT';
        await bot!.editMessageText(`Bu karta qarzi: ${formatMoney(info.remaining)} so'm.\nQancha qaytarmoqchisiz? Raqamda yozing (masalan: ${formatMoney(info.remaining)}):`, {
          chat_id: chatId,
          message_id: query.message.message_id
        });
      }
      await bot!.answerCallbackQuery(query.id);
    }
    else if (query.data === 'qaytarish_confirm') {
      const state = userStates[chatId];
      if (state && state.step === 'QAYTARISH_WAITING_CONFIRMATION') {
        try {
          // Shu kartaning ochiq qarzlarini FIFO (eng eskidan) bo'yicha qaytarish.
          const loans = await prisma.cardLoan.findMany({
            where: { virtualCardId: state.cardId },
            orderBy: { date: 'asc' }
          });
          let left = state.amount!;
          for (const loan of loans) {
            if (left <= 0) break;
            const remaining = Number(loan.amount) - Number(loan.repaidAmount);
            if (remaining <= 0) continue;
            const pay = Math.min(left, remaining);
            await prisma.cardLoan.update({
              where: { id: loan.id },
              data: { repaidAmount: Number(loan.repaidAmount) + pay }
            });
            left -= pay;
          }

          const byCard = await getOpenLoansByCard();
          const cards = await getVirtualCardsBalance();
          const card = cards.find(c => c.id === state.cardId);
          const leftDebt = byCard[state.cardId]?.remaining || 0;
          const debtLine = leftDebt > 0
            ? `Qolgan qarz: ${formatMoney(leftDebt)} so'm`
            : `✅ Bu karta qarzi to'liq yopildi.`;
          await bot!.editMessageText(`✅ **Qarz qaytarildi!**\n\nSeyf: ${card?.name}\nQaytarildi: ${formatMoney(state.amount)} so'm\n${debtLine}\n\n💼 ${card?.name} qoldig'i: ${formatMoney(card?.total)} so'm`, {
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
    else if (query.data === 'qaytarish_cancel') {
      const state = userStates[chatId];
      if (state) {
        delete userStates[chatId];
        await bot!.editMessageText('❌ Qaytarish bekor qilindi.', {
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
