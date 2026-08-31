# order-bot

Gmail'ga kelgan zakaz xatlaridan kerakli maydonlarni ajratib, Telegramga tayyor
ko'rinishda yuboradi. Ikki oqimni biladi: **X5/RVI** (jadval xat tanasida) va
**Магнит / GrandTrade** (har zakazning PDF blankasi ilovada).

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

Har bir xabar tagida **«✅ Bajarildi»** tugmasi turadi — pastdagi
[«Bajarildi» tugmasi](#bajarildi-tugmasi) bo'limiga qarang.

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
                        │                        │              ▲
                    seen.json          (jadval yo'q → jim)      │
                                                                │
                    tugma bosildi ──▶ updates (getUpdates) ─────┘
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
| Xatda na zakaz jadvali, na GT PDF bor | Jim, faqat log |
| Ilovada `GT-raqam.pdf` bor | Har GT uchun alohida xabar + fayllar |
| Jadval bor, o'qildi | To'liq xabar + «Bajarildi» tugmasi |
| Jadval bor, lekin qator o'qilmadi | ⚠️ ogohlantirish + xat mavzusi + «Bajarildi» tugmasi |

## «Bajarildi» tugmasi

Qaysi zakaz ishlangan-ishlanmaganini ko'rish uchun har bir xabar tagida tugma
turadi:

- **✅ Bajarildi** bosilsa — xabar matni butunlay ~~chizib~~ qo'yiladi va tugma
  **↩️ Bajarilmadi** ga almashadi.
- **↩️ Bajarilmadi** bosilsa — xabar asl holiga qaytadi.

Holat **xabarning o'zida** saqlanadi, alohida fayl yoki bazada emas. Shuning
uchun bot qayta ishga tushsa yoki server o'chib yonsa ham eski xabarlardagi
tugmalar ishlayveradi. Kim bosgani yozilmaydi.

> **Muhim: bir vaqtda faqat bitta nusxa.** Tugmalarni tinglash uchun bot
> `getUpdates` long-polling qiladi. Ikki nusxa (masalan serverdagi pm2 va lokal
> `npm run dev`) bir vaqtda ishlasa Telegram **409 Conflict** beradi va tugmalar
> ishlamay qoladi. Logda bu haqda aniq xabar chiqadi.

## Магнит / GrandTrade oqimi

X5 dan tashqari bot **Магнит / GrandTrade** zakazlarini ham yuboradi. Ular boshqacha
keladi: har zakazning o'z `GT-<raqam>.pdf` blankasi ilovada, xat tanasida esa kichik
jadval turadi:

| заказ | Место ТО | Товар для указания в заказе | Место прибытия |
|---|---|---|---|
| GT-773210 | Оренбург | Свежий столовый виноград... | РЦ ГТ ПроФреш Санкт-Петербург |
| GT-773211 | Оренбург | Свежий столовый виноград... | РЦ Киров 10000 кг |
| GT-773211 | Оренбург | Свежий столовый виноград... | РЦ Зеленодольск 10000 кг |

**Xat qanday tanilagi:** ilovalar orasida `GT-<raqam>.pdf` bo'lsa. Jo'natuvchiga
bog'liq emas.

**Har GT raqamga bitta xabar** yuboriladi. Bitta zakaz bir nechta РЦ ga ketsa
(yuqorida `GT-773211`), ular bitta xabarda raqamlangan ro'yxat bo'ladi:

```
🟠 Магнит — GT-773211

Место ТО: Оренбург
Товар: Свежий столовый виноград Дамский палец / Fresh table Grape
Место прибытия:
  1) РЦ Киров 10000 кг
  2) РЦ Зеленодольск 10000 кг

Хат: Fwd: Магнит, 35 нед -GT-773210 GT-773211- ...
Hujjatlar: GT-773211.pdf, Инструкция к 13гр CMR.xlsx, Адреса РЦ Магнит.xlsx
Yuborilmagan ilovalar: GT box UZ.xlsx, Pallet sticker SAMPLE.DOC
```

Matndan keyin fayllar **shu xabarga javob qilib** yuboriladi — har zakaz Telegramda
o'z ipiga yig'iladi va aralashib ketmaydi.

**Qaysi fayllar biriktiriladi:**

| Fayl | Aniqlash qoidasi (nomda, kichik harfda) |
|---|---|
| Zakaz blankasi | nomi butunlay `GT-<raqam>.pdf` — faqat shu zakazga |
| CMR yo'riqnomasi | `инструкц` + `cmr` |
| РЦ manzillari | `адрес` + `рц` |
| Invoys | `инвойс` yoki `invoice` |
| Qadoqlash varag'i | `упаковочн` yoki `packing` |

Umumiy hujjatlar **har bir GT xabarida takrorlanadi** — har xabar o'zicha to'liq
bo'lsin, boshqasiga qarash shart bo'lmasin. Agar hujjat nomida GT raqami bo'lsa
(`Инвойс GT-773211.pdf`), u umumiy emas — faqat o'sha zakazga biriktiriladi.

Ro'yxatga kirmagan ilovalar yuborilmaydi, lekin **nomlari xabarda ko'rsatiladi**.

**Yetishmayotgan ma'lumot jim o'tmaydi.** Zakazlar ro'yxati PDF'lar va jadval
qatorlarining birlashmasidan olinadi, shuning uchun:

| Holat | Natija |
|---|---|
| PDF bor, jadvalda qator yo'q | Xabar yuboriladi + `⚠️ xat jadvalida bu zakaz uchun qator yo'q` |
| Jadvalda bor, PDF yo'q | Xabar yuboriladi + `⚠️ GT-xxxxx.pdf ilovada yo'q` |

### Cheklov

Bot faqat **yangi zakaz xatiga** javob beradi (ichida `GT-<raqam>.pdf` bo'lgan).
Инвойс va Упаковочный лист ko'pincha keyinroq, xuddi shu mavzudagi javob xatlarida
keladi — bunday xatlarda bot jim turadi. Ular faqat zakaz xatining o'zida bo'lsa
biriktiriladi.

## Test

```bash
npm test
```

Testlar haqiqiy xat tuzilishidagi fixture'da ishlaydi (44 ustun, bo'sh kataklar
o'z o'rnida) va quyidagilarni qamrab oladi: maydonlarning to'g'ri ajratilishi,
`Склад` ↔ `Адрес склада` va `ETA` ↔ `ETA DC` chalkashmasligi, ko'p pozitsiya,
colspan, jadvalsiz xat, xabar formati va uzun xabarni bo'lish.

Telegram tomonini `test/telegram.test.ts` qamrab oladi: HTML ekranlash
(`&`, `«»`, `№`), tugma markupi va ikki yo'nalishli chizish/qaytarish.

Магнит oqimi `test/gt.test.ts` da: jadvalni topish, bir GT ning bir nechta РЦ sini
yig'ish, fayllarni to'g'ri zakazga taqsimlash (boshqa zakazning PDF i tushmasligi),
yetishmayotgan PDF/qator holatlari va xabar formati.

## Tuzilma

```
src/
  config.ts            .env o'qish + Zod validatsiya
  mail/watcher.ts      IMAP IDLE, qayta ulanish, zaxira tekshiruv
  parse/headers.ts     sarlavha → kanonik kalit
  parse/table.ts       HTML → OrderPosition[]  (X5)
  parse/gt-table.ts    HTML → GtTableRow[]     (Магнит)
  parse/gt-attachments.ts  ilovalarni turkumlash
  parse/gt-orders.ts   qator + ilova → GtOrder[]
  format/message.ts    OrderPosition[] → Telegram matni
  format/gt-message.ts GtOrder → Telegram matni
  flows/gt.ts          Магнит xatini qayta ishlash
  telegram/api.ts      Bot API chaqiruvi (qayta urinish, 429/409)
  telegram/markup.ts   matn ekranlash, chizish, tugma
  telegram/send.ts     xabar yuborish (tugma bilan)
  telegram/document.ts fayllarni albom bo'lib yuborish
  telegram/updates.ts  tugma bosilishini tinglash va holatni almashtirish
  state/seen.ts        Message-ID xotirasi
  scripts/             chat-id, check-mail, dump-fixture
```
