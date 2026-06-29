/**
 * SMTP sozlamalarini ilovasiz tekshirish skripti.
 *
 *   npx tsx src/scripts/test-smtp.ts                 # faqat login tekshiradi (verify)
 *   npx tsx src/scripts/test-smtp.ts --send <email>  # test xat ham yuboradi
 *
 * .env dan o'qiydi: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
 * MAIL_FROM (yoki eski MAILRU_USER/MAILRU_PASSWORD). Parol hech qachon chiqmaydi.
 */
import 'dotenv/config';
import { verifySmtp, sendMail } from '../services/mail.service';

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const host = process.env.SMTP_HOST || 'smtp.mail.ru';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || process.env.MAILRU_USER;
  const from = process.env.MAIL_FROM || user;

  console.log('SMTP config:');
  console.log(`  host: ${host}`);
  console.log(`  port: ${port}`);
  console.log(`  user: ${user ?? '(o\'rnatilmagan)'}`);
  console.log(`  from: ${from ?? '(o\'rnatilmagan)'}`);
  console.log(`  pass: ${process.env.SMTP_PASS || process.env.MAILRU_PASSWORD ? '***set***' : '(o\'rnatilmagan)'}`);

  console.log('\n1) Login tekshirilyapti (verify)...');
  await verifySmtp();
  console.log('   ✅ verify OK — login muvaffaqiyatli.');

  const sendTo = getArg('--send');
  if (sendTo) {
    console.log(`\n2) Test xat yuborilyapti -> ${sendTo} ...`);
    await sendMail({
      to: [sendTo],
      subject: 'Prodeklarant SMTP test',
      text: `Bu Prodeklarant SMTP test xati.\nFrom: ${from}\nVaqt: ${new Date().toISOString()}`,
    });
    console.log('   ✅ Xat yuborildi. Inbox/spam ni tekshiring.');
  } else {
    console.log('\n(Test xat yuborish uchun: --send <email>)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ SMTP test xatosi:', err?.message || err);
    process.exit(1);
  });
