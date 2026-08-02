#!/usr/bin/env node

import newman from 'newman';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// O'qish: TOKEN, CLIENT_ID, BASE_URL (ixtiyoriy) muhit o'zgaruvchilardan
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const baseUrl = process.env.BASE_URL || 'http://localhost:3001/api';

// Tekshirish: TOKEN va CLIENT_ID kerak
if (!token || !clientId) {
  console.error('❌ Xato: TOKEN va CLIENT_ID talab qilinadi.');
  console.error('');
  console.error('Ishlatish:');
  console.error('  TOKEN=<accessToken> CLIENT_ID=<mijozId> npm run test:integration:agreements');
  console.error('');
  console.error('Token qanday olish:');
  console.error('  1. Prodeklarant tizimiga login qiling');
  console.error('  2. Brauzer konsolidan talab qo\'ling:');
  console.error('     const token = localStorage.getItem("accessToken"); console.log(token)');
  console.error('  3. Natijani TOKEN sifatida o\'rnating');
  console.error('');
  console.error('CLIENT_ID (mavjud mijoz ID):');
  console.error('  Bazada mavjud boʻlgan "Client" jadvalidagi id qiymatini ishlating');
  console.error('');
  process.exit(1);
}

// Newman bilan testni ishga tushirish
// Eslatma: agreementId va agreementNumber ni o'z ichiga olmang!
// Ular koleksiya testlari tomonidan pm.collectionVariables.set() orqali o'rnatiladi.
// Agar ularni muhit o'zgaruvchilari sifatida e'lon qilsak, Newman'da muhit qiymatlari
// koleksiya qiymatlarini ko'lib chiqadi va bo'sh qiymatlar testni buzadi.
newman.run({
  collection: path.join(__dirname, 'service-agreements-postman-collection.json'),
  environment: {
    values: [
      { key: 'baseUrl', value: baseUrl, type: 'string' },
      { key: 'token', value: token, type: 'string' },
      { key: 'clientId', value: clientId, type: 'string' }
    ]
  },
  delayRequest: 50,
  reporters: ['cli']
}, function(err, summary) {
  if (err) {
    console.error('Newman xatosi:', err.message);
    process.exit(1);
  }

  // Newman-ning chiqish kodini tarqatish (CI uchun muhim)
  process.exit(summary.run.failures.length > 0 ? 1 : 0);
});
