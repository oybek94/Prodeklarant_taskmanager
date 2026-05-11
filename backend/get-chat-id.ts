import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.FINANCE_BOT_TOKEN;

if (!token) {
  console.log('Missing TOKEN in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('Bot is listening for messages... Please type "hello" in your telegram group.');

bot.on('message', (msg) => {
  console.log('Received message from Chat ID:', msg.chat.id);
  console.log('Chat Title:', msg.chat.title);
  console.log('Message text:', msg.text);
  
  if (msg.text?.toLowerCase().includes('hello')) {
    bot.sendMessage(msg.chat.id, `Hello! This group's Chat ID is: ${msg.chat.id}`);
  }
});
