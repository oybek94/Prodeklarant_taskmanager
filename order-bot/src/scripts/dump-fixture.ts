/**
 * Haqiqiy pochtadan zakaz jadvali bor oxirgi xatning HTML'ini faylga saqlaydi.
 * Parserni jonli ma'lumotda tekshirish uchun.
 *
 *   npm run dump-fixture        (oxirgi 30 kun ichidan qidiradi)
 *   npm run dump-fixture -- 90
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadImapConfig } from '../config.js';
import { fetchRecentMails } from '../mail/watcher.js';
import { extractOrderPositions } from '../parse/table.js';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../test/fixtures');

const main = async () => {
  const days = Number(process.argv[2]) || 30;
  const config = loadImapConfig();

  console.log(`Oxirgi ${days} kunlik xatlar o'qilmoqda...`);
  const mails = await fetchRecentMails(config, days);

  const withTable = mails.filter((mail) => extractOrderPositions(mail.html).status !== 'no-table');

  if (withTable.length === 0) {
    console.log('Zakaz jadvali bor xat topilmadi.');
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const latest = withTable[withTable.length - 1]!;
  const file = resolve(OUT_DIR, 'real-order.html');
  writeFileSync(file, latest.html, 'utf8');

  console.log(`\nSaqlandi: ${file}`);
  console.log(`Xat: ${latest.subject}`);
  console.log(`Jami jadvalli xatlar: ${withTable.length} ta`);
  console.log('\nEslatma: bu fayl .gitignore da — ichida tijorat ma\'lumoti bo\'lishi mumkin.');
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
