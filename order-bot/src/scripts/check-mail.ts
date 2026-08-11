/**
 * Quruq sinov: oxirgi kunlardagi xatlarni ko'rib chiqadi va bot NIMA yuborishini
 * ekranga chiqaradi. Telegramga hech narsa yuborilmaydi.
 *
 *   npm run check-mail        (oxirgi 7 kun)
 *   npm run check-mail -- 30  (oxirgi 30 kun)
 */
import { loadImapConfig } from '../config.js';
import { fetchRecentMails } from '../mail/watcher.js';
import { extractOrderPositions } from '../parse/table.js';
import { formatOrderMessage } from '../format/message.js';

const main = async () => {
  const days = Number(process.argv[2]) || 7;
  const config = loadImapConfig();

  console.log(`Oxirgi ${days} kunlik xatlar o'qilmoqda...\n`);
  const mails = await fetchRecentMails(config, days);
  console.log(`Jami ${mails.length} ta xat topildi.\n`);

  let withTable = 0;
  let failed = 0;

  for (const mail of mails) {
    const result = extractOrderPositions(mail.html);

    if (result.status === 'no-table') continue;

    if (result.status === 'unparsable') {
      failed++;
      console.log('─'.repeat(70));
      console.log(`⚠️  JADVAL O'QILMADI: ${mail.subject}`);
      console.log(`   ${result.reason}\n`);
      continue;
    }

    withTable++;
    console.log('─'.repeat(70));
    console.log(`📧 ${mail.subject}`);
    console.log(`   ${mail.from} · ${mail.date.toLocaleString('ru-RU')}`);
    console.log(`   ${result.positions.length} pozitsiya\n`);
    for (const message of formatOrderMessage(result.positions)) {
      console.log(message);
      console.log('');
    }
  }

  console.log('═'.repeat(70));
  console.log(`Zakaz jadvali bor: ${withTable} ta`);
  console.log(`O'qilmagan jadval: ${failed} ta`);
  console.log(`Jadvalsiz (bot jim turadi): ${mails.length - withTable - failed} ta`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
