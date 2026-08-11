# Zakaz xatlaridan Telegram xabari — dizayn

Sana: 2026-08-11

## Muammo

`docs@prodeklarant.uz` pochtasiga X5 (RVI) tizimidan zakaz xatlari keladi. Har bir xatda
43 ustunli ikki tilli jadval bor, undan amalda faqat 10 ta maydon kerak. Hozir bu
ma'lumot qo'lda ko'chirib olinadi — sekin va xatoga moyil.

Kerak: xat kelishi bilan kerakli maydonlarni ajratib, Telegramga tayyor ko'rinishda
yuboradigan bot.

## Nega HTML parse qilinadi, matn emas

Xatning `text/plain` versiyasida jadval ustunlari bitta vertikal ro'yxatga aylanadi va
**bo'sh kataklar butunlay yo'qoladi**. Haqiqiy misolda `Product (in English)` va
`Номер алкогольной спецификации` bo'sh — natijada `Ladies' finger` (aslida *Сорт*)
pozitsiya bo'yicha noto'g'ri maydonga tushadi.

Shu sababli parser faqat `text/html` qismi bilan ishlaydi va ustunlarni **sarlavha
matni bo'yicha** aniqlaydi, indeks bo'yicha emas.

## Arxitektura

Mustaqil mini-servis, asosiy Prodeklarant backendidan ajratilgan (qulashi backendga
ta'sir qilmasligi uchun).

```
Gmail ──IMAP IDLE──▶ watcher ──▶ parser (cheerio) ──▶ formatter ──▶ Telegram
                        │                                  │
                     seen.json                        (jadval yo'q → jim)
```

```
order-bot/
  src/config.ts            .env o'qish + Zod validatsiya
  src/logger.ts            oddiy vaqt belgili log
  src/mail/watcher.ts      ImapFlow: IDLE, qayta ulanish, zaxira tekshiruv
  src/parse/headers.ts     sarlavha → kanonik kalit moslashtirish
  src/parse/table.ts       HTML → OrderPosition[]
  src/format/message.ts    OrderPosition[] → Telegram matni
  src/telegram/send.ts     sendMessage (fetch)
  src/state/seen.ts        qayta ishlangan Message-ID (JSON fayl)
  src/index.ts             bog'lash
  src/scripts/chat-id.ts   getUpdates orqali chat ID olish
  src/scripts/dump-fixture.ts  oxirgi zakaz xatining HTML'ini faylga saqlash
  test/
```

## Ma'lumot modeli

```ts
type OrderPosition = {
  supplier: string | null;      // Supplier / Поставщик
  orderNumber: string | null;   // Order # / № заказа
  productRu: string | null;     // Product (in Russian) / Товар (на русском)
  plu: string | null;           // PLU
  size: string | null;          // Size / Калибр
  price: string | null;         // Price / цена за ед.
  currency: string | null;      // Currency / Валюта
  warehouse: string | null;     // Warehouse / Склад
  warehouseAddress: string | null; // Warehouse address / Адрес склада
  etd: string | null;           // ETD (планируемая дата выхода)
  eta: string | null;           // ETA (планируемая дата прихода)
};
```

## Jadvalni aniqlash

1. Xatdagi har bir `<table>` ko'rib chiqiladi.
2. Har `<tr>` ning kataklari normalize qilinadi: `&nbsp;` → bo'shliq, `\s+` → bitta
   bo'shliq, trim, lowercase.
3. Sarlavha qatori — `order #`/`№ заказа`, `plu`, `supplier`/`поставщик` uchtasi ham
   uchraydigan qator. Uchalasi topilmasa, bu jadval zakaz jadvali emas.
4. Sarlavhalardan keyingi qatorlar — pozitsiyalar. Butunlay bo'sh qatorlar tashlanadi.
5. `colspan`/`rowspan` hisobga olinadi (katak indeksi kengaytiriladi).

Jo'natuvchi manzili bo'yicha filtr yo'q — `vostochniy-produkt@mail.ru`,
`agroexp@inbox.ru` va boshqa qayta yo'naltiruvchilar bir xil ishlaydi.

## Sarlavha moslashtirishdagi ikki tuzoq

Sarlavhalar ikki tilli va qator uzilishli (`Class/\nКласс`), shuning uchun substring
qidiruvi ishlatiladi. Ikki juftlik bir-birini yutadi va **tartib muhim**:

| Tuzoq | Yechim |
|---|---|
| `Склад` matni `Адрес склада` ichida ham bor | Avval `warehouse address`/`адрес склада` tekshiriladi, ustun band qilinadi; qolganidan `warehouse`/`склад` qidiriladi |
| `ETA` matni `ETA DC / РЦ` ichida ham bor | Avval `eta dc`/`рц` istisno qilinadi, keyin `eta` qidiriladi |

Xuddi shunday `Product (in Russian)` va `Product (in English)` — `russian`/`русском`
kaliti bo'yicha ajratiladi.

## Xabar formati

Bitta pozitsiya:

```
Поставщик: OOO "VOSTOCHNIY PRODUKT"
№ заказа: RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3
Товар: ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг
PLU: 3644102
Калибр: 14mm+
Цена: 1.41000 EUR
Склад: HUB Pulkovo
Адрес склада: Ленинградская обл., ...
Дата выхода: 08.08.2026
Дата прихода: 16.08.2026
```

Ikki va undan ko'p pozitsiya — umumiy sarlavha bir marta, keyin raqamlangan bloklar:

```
Поставщик: ...
№ заказа: ...

1.
Товар: ...
PLU: ...
...

2.
Товар: ...
```

Qoidalar:

- `Цена` va `Валюта` bitta qatorda birlashtiriladi: `1.41000 EUR`.
- Bo'sh maydon `—` bilan ko'rsatiladi.
- `Поставщик` yoki `№ заказа` pozitsiyalar bo'yicha har xil bo'lsa, ular umumiy
  sarlavhadan chiqarilib har blok ichiga ko'chiriladi.
- Telegram xabar chegarasi 4096 belgi — undan oshsa bloklar bo'yicha bo'lib yuboriladi.

## Xato holatlari

| Holat | Bot nima qiladi |
|---|---|
| Xatda zakaz jadvali yo'q | **Jim**, faqat log |
| Jadval bor, o'qildi | To'liq xabar |
| Jadval bor, lekin qator ajratib bo'lmadi | Qisqa ogohlantirish + xat mavzusi |
| IMAP uzildi | Eksponensial backoff bilan qayta ulanish, log |
| Telegram xatosi | 3 marta qayta urinish, keyin log |

Sabab: jadvalsiz xatlar (oddiy yozishmalar, javoblar) ko'p — ular haqida xabar berish
botni foydasiz shovqinga aylantiradi. Ammo jadval bor-u parse buzilgan holat haqiqiy
nosozlik: jim o'tkazib yuborilsa zakaz butunlay yo'qoladi.

## Qamrov chegarasi (jonli pochtada tekshirilgan)

Parser haqiqiy xat HTML'ida sinaldi va X5/RVI (`idm_rvi@x5.ru`) formatidagi
zakazlarni to'liq o'qidi — barcha 10 maydon to'g'ri.

Biroq pochtada **ikkinchi xil zakaz oqimi** ham bor: Магнит / GrandTrade
(`Магнит, 32нед- GT-769931 - новый заказ-...`). Bu xatlarning tanasida zakaz
jadvali yo'q — ma'lumot PDF va Excel ilovalarida keladi. Bot ularda jim turadi.
Ilovalarni o'qish bu spec qamrovidan tashqarida; kerak bo'lsa alohida ish
sifatida qo'shiladi.

## Dublikatni oldini olish

Har bir qayta ishlangan xatning `Message-ID` si `seen.json` ga yoziladi (oxirgi 500 ta
saqlanadi). Qayta ulanish yoki qayta ishga tushishda ayni xat ikkinchi marta
yuborilmaydi.

Ishga tushganda faqat **o'qilmagan va yangi** xatlar ko'riladi; eski pochta qayta
ishlanmaydi (`INITIAL_LOOKBACK_DAYS`, standart 0).

## Real vaqt

`ImapFlow` IDLE rejimida ulanib turadi — xat kelishi bilan bir necha soniyada xabar
yetadi. Qo'shimcha himoya: har 5 daqiqada zaxira `search` tekshiruvi (IDLE jim qolgan
holatlar uchun). Ulanish uzilsa eksponensial backoff bilan (1s → 60s) qayta ulanadi.

## Sozlash

Muhim: `docs@prodeklarant.uz` — yo'naltiruvchi manzil, xatlar jismonan
`oybek4536@gmail.com` qutisida yotadi. IMAP shu Gmail akkauntiga ulanadi.

```
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=oybek4536@gmail.com
IMAP_PASSWORD=...            # Gmail App Password (2FA yoqilgan bo'lishi shart)
ORDER_BOT_TOKEN=...          # @BotFather
ORDER_BOT_CHAT_ID=...        # npm run chat-id
IMAP_MAILBOX=INBOX
POLL_FALLBACK_MINUTES=5
INITIAL_LOOKBACK_DAYS=0
```

`npm run chat-id` — botga `/start` yozgandan keyin chat ID ni chiqaradi.

## Test

Vitest. Fixture — haqiqiy xat tuzilishi (43 sarlavha, bo'sh kataklar aynan o'z o'rnida):

- bitta pozitsiya to'g'ri ajratiladi (kutilgan qiymatlar yuqoridagi misolday)
- ikki pozitsiya raqamlanadi
- bo'sh kataklar `—` bo'ladi va qo'shni maydonlarni surib yubormaydi
- `Склад` va `Адрес склада` chalkashmaydi
- `ETA` va `ETA DC` chalkashmaydi
- jadvalsiz xat `null` qaytaradi (xabar yuborilmaydi)

`src/scripts/dump-fixture.ts` haqiqiy pochtadan oxirgi zakaz xatining HTML'ini
`test/fixtures/` ga saqlaydi — parserni jonli ma'lumotda tekshirish uchun.

## Ishga tushirish

```bash
cd order-bot
npm install
cp .env.example .env      # to'ldirish
npm run chat-id           # chat ID olish
npm run dev               # lokal sinov
npm run build && npm start
```

Serverda pm2: `pm2 start dist/index.js --name order-bot`.
