# order-bot

Gmail'ga kelgan X5/RVI zakaz xatlaridan kerakli maydonlarni ajratib, Telegramga
tayyor ko'rinishda yuboradi.

Xat kelishi bilan (IMAP IDLE, bir necha soniya ichida) shunday xabar keladi:

```
Поставщик: OOO "VOSTOCHNIY PRODUKT"
№ заказа: RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3
Товар: ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг
PLU: 3644102
Калибр: 14mm+
Цена: 1.41000 EUR
Склад: HUB Pulkovo
Адрес склада: Ленинградская обл., Ломоносовский р-он, ...
Дата выхода: 08.08.2026
Дата прихода: 16.08.2026
```

Bir xatda bir nechta tovar bo'lsa, umumiy sarlavha bir marta yoziladi va
pozitsiyalar `1.`, `2.` deb raqamlanadi.

**Zakaz jadvali yo'q xatlar haqida bot xabar bermaydi** — oddiy yozishmalar sizni
bezovta qilmaydi.

## O'rnatish

### 1. Qaysi pochta qutisi

Zakaz xatlari `docs@prodeklarant.uz` ga yuboriladi, lekin u **yo'naltiruvchi manzil** —
xatlar jismonan `oybek4536@gmail.com` qutisida yotadi. IMAP shu Gmail akkauntiga
ulanadi, alias'ga emas.

### 2. Gmail App Password

Bot pochtaga IMAP orqali ulanadi. Oddiy Gmail parolingiz ishlamaydi — App Password
kerak:

1. https://myaccount.google.com/apppasswords (to'g'ridan-to'g'ri havola)
2. Agar sahifa ochilmasa — **«Двухэтапная аутентификация»** yoqilmagan.
   Avval yoqing: https://myaccount.google.com/signinoptions/twosv
3. **«Название приложения»** → `order-bot` → **«Создать»**
4. Chiqqan 16 belgili parolni **bo'shliqlarsiz** nusxalang

Menyudan borish (rus interfeysi): `myaccount.google.com` → **«Безопасность»** →
**«Двухэтапная аутентификация»** → sahifa pastida **«Пароли приложений»**.

### 3. Telegram bot

1. Telegramda [@BotFather](https://t.me/BotFather) ga yozing → `/newbot`
2. Nom va username bering, tokenni nusxalang
3. Yaratilgan botni toping va unga **/start** yozing (bu shart — aks holda bot
   sizga yoza olmaydi)

### 4. Sozlash

```bash
cd order-bot
npm install
cp .env.example .env
```

`.env` ni to'ldiring:

```
IMAP_USER=oybek4536@gmail.com
IMAP_PASSWORD=<App Password, bo'shliqlarsiz>
ORDER_BOT_TOKEN=<BotFather tokeni>
```

Chat ID ni aniqlang va `.env` ga qo'shing:

```bash
npm run chat-id
```

### 5. Sinov

Telegramga hech narsa yubormasdan, oxirgi 30 kunlik pochtada bot nima
yuborishini ko'rish:

```bash
npm run check-mail -- 30
```

Chiqishda har bir zakaz xati va tayyor xabar matni ko'rinadi. Agar biror
xatda "JADVAL O'QILMADI" chiqsa — o'sha xatni saqlab tekshirish kerak:

```bash
npm run dump-fixture -- 30
```

### 6. Ishga tushirish

```bash
npm run dev            # lokal sinov
npm run build && npm start
```

Serverda (pm2):

```bash
npm run build
pm2 start dist/index.js --name order-bot
pm2 save
```

## Sozlamalar

| O'zgaruvchi | Standart | Ma'nosi |
|---|---|---|
| `IMAP_HOST` | `imap.gmail.com` | IMAP server |
| `IMAP_PORT` | `993` | IMAP port (TLS) |
| `IMAP_USER` | — | Pochta manzili |
| `IMAP_PASSWORD` | — | Gmail App Password |
| `IMAP_MAILBOX` | `INBOX` | Kuzatiladigan papka |
| `ORDER_BOT_TOKEN` | — | Telegram bot tokeni |
| `ORDER_BOT_CHAT_ID` | — | Xabar yuboriladigan chat |
| `POLL_FALLBACK_MINUTES` | `5` | IDLE jim qolsa zaxira tekshiruv oralig'i |
| `INITIAL_LOOKBACK_DAYS` | `0` | Ishga tushganda necha kunlik eski xatni ham ko'rsin |

## Qanday ishlaydi

```
Gmail ──IMAP IDLE──▶ watcher ──▶ parser ──▶ formatter ──▶ Telegram
                        │                        │
                    seen.json          (jadval yo'q → jim)
```

- **Jadval aniqlash.** Xatning HTML qismidagi har bir `<table>` ko'riladi;
  `Order #`, `PLU`, `Supplier` sarlavhalari bor jadval zakaz jadvali deb taniladi.
  Jo'natuvchi manziliga bog'liq emas.
- **Ustunlar sarlavha bo'yicha topiladi**, pozitsiya bo'yicha emas. Xatning matnli
  (`text/plain`) versiyasida bo'sh kataklar yo'qoladi va qiymatlar noto'g'ri
  maydonga suriladi — shuning uchun faqat HTML ishlatiladi.
- **Dublikat.** Har bir qayta ishlangan xatning `Message-ID` si `seen.json` ga
  yoziladi (oxirgi 500 ta). Qayta ishga tushirishda bir xat ikki marta kelmaydi.
- **Uzilish.** IMAP uzilsa eksponensial backoff bilan (1s → 60s) qayta ulanadi.

## Bot qachon xabar beradi

| Holat | Natija |
|---|---|
| Xatda zakaz jadvali yo'q | Jim, faqat log |
| Jadval bor, o'qildi | To'liq xabar |
| Jadval bor, lekin qator o'qilmadi | ⚠️ ogohlantirish + xat mavzusi |

## Cheklov: ilovadagi zakazlar

Bot **xat tanasidagi** jadval bilan ishlaydi. Bu X5/RVI (`idm_rvi@x5.ru`) formatidagi
zakazlarni qamrab oladi — tekshirilgan va ishlaydi.

Ammo hamma zakaz shu ko'rinishda kelmaydi. Masalan **Магнит / GrandTrade** zakazlari
(mavzu: `Магнит, 32нед- GT-769931 - новый заказ-...`) xat tanasida jadval
saqlamaydi — ma'lumot `GT-769931.pdf` va `GT box UZ.xlsx` ilovalarida bo'ladi.
Bunday xatlarda bot **jim turadi**.

Agar bu zakazlar ham kerak bo'lsa, ilovalarni (PDF/Excel) o'qish alohida ish sifatida
qo'shilishi kerak.

## Test

```bash
npm test
```

Testlar haqiqiy xat tuzilishidagi fixture'da ishlaydi (44 ustun, bo'sh kataklar
o'z o'rnida) va quyidagilarni qamrab oladi: maydonlarning to'g'ri ajratilishi,
`Склад` ↔ `Адрес склада` va `ETA` ↔ `ETA DC` chalkashmasligi, ko'p pozitsiya,
colspan, jadvalsiz xat, xabar formati va uzun xabarni bo'lish.

## Tuzilma

```
src/
  config.ts            .env o'qish + Zod validatsiya
  mail/watcher.ts      IMAP IDLE, qayta ulanish, zaxira tekshiruv
  parse/headers.ts     sarlavha → kanonik kalit
  parse/table.ts       HTML → OrderPosition[]
  format/message.ts    OrderPosition[] → Telegram matni
  telegram/send.ts     sendMessage (qayta urinish bilan)
  state/seen.ts        Message-ID xotirasi
  scripts/             chat-id, check-mail, dump-fixture
```
