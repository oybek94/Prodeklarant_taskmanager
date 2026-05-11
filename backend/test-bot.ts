import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.FINANCE_BOT_TOKEN;
const chatId = process.env.FINANCE_GROUP_CHAT_ID;

if (!token || !chatId) {
  console.log('Missing TOKEN or CHAT_ID in .env');
  process.exit(1);
}

const bot = new TelegramBot(token);
bot.sendMessage(chatId, 'Test message from Finance Bot')
  .then(() => {
    console.log('Message sent successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to send message:', err.message);
    if (err.response && err.response.body) {
      console.error(err.response.body);
    }
    process.exit(1);
  });
