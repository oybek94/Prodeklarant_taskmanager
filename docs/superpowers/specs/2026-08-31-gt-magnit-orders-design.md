# Магнит / GrandTrade zakazlari — order-bot ikkinchi oqimi

**Sana:** 2026-08-31
**Holat:** tasdiqlangan, implementatsiyaga tayyor

## Muammo

order-bot hozir faqat X5/RVI oqimini biladi — zakaz jadvali xat **tanasida**
bo'lgan xatlarni. Магнит / GrandTrade zakazlari boshqacha keladi: har zakazning
o'z `GT-<raqam>.pdf` ilovasi bor, yo'l hujjatlari ham ilovada, xat tanasida esa
faqat qisqa jadval turadi. Bunday xatlarda bot **jim** turadi va zakazlar
qo'lda kuzatiladi.

## Kirish ma'lumoti (haqiqiy xatdan)

Mavzu: `Fwd: Магнит, 35 нед -GT-773210 GT-773211- VOSTOCHNIY PRODUKT LLC`
Jo'natuvchi: `vostochniy-produkt@mail.ru` (GrandTrade'dan qayta yo'naltirilgan)

Xat tanasidagi jadval (4 ustun, 3 qator):

| заказ | Место ТО | Товар для указания в заказе | Место прибытия |
|---|---|---|---|
| GT-773210 | Оренбург | Свежий столовый виноград Дамский палец / Fresh table Grape | РЦ ГТ ПроФреш Санкт-Петербург |
| GT-773211 | Оренбург | Свежий столовый виноград Дамский палец / Fresh table Grape | РЦ Киров 10000 кг |
| GT-773211 | Оренбург | Свежий столовый виноград Дамский палец / Fresh table Grape | РЦ Зеленодольск 10000 кг |

**Muhim:** bitta GT raqam bir nechta qatorda uchraydi — bir zakaz, bir nechta
yetkazish nuqtasi. PDF esa har GT ga bitta.

Ilovalar: `GT-773210.pdf`, `GT-773211.pdf`, `Адреса РЦ Магнит.xlsx`,
`Инструкция к 13гр CMR.xlsx`, `GT box UZ.xlsx`, `Pallet sticker SAMPLE.DOC`.

Kodlash tekshirildi: `simpleParser` matnni to'g'ri UTF-8 ga o'giradi, alohida
charset ishlari kerak emas.

## Qarorlar

Foydalanuvchi bilan kelishilgan:

1. **Trigger — faqat yangi zakaz xati.** Ilovalar orasida kamida bitta
   `GT-<raqam>.pdf` bo'lsa. Инвойс / Упаковочный лист keyingi javob xatlarida
   kelsa — ular qamrab olinmaydi (ataylab; keyingi ish).
2. **Bir GT = bir xabar.** Ko'p `Место прибытия` bitta xabarda raqamlangan
   ro'yxat bo'lib chiqadi, alohida xabar emas.
3. **Umumiy fayllar har GT xabarida takrorlanadi.** Har xabar o'zicha to'liq
   bo'lsin — boshqa xabarga qarash shart emas.

## Yechim

Alohida bot emas, **mavjud order-bot ichida ikkinchi oqim**. Sabab: alohida
jarayon ikkinchi IMAP ulanishi va ikkinchi Telegram tokenini talab qiladi —
bitta tokenni ikki jarayon `getUpdates` bilan tinglay olmaydi (409 Conflict).
Watcher, `seen.json` va «Bajarildi» tugmasi qayta ishlatiladi.

### Oqim

```
xat ──▶ X5 jadvali bormi? ──ha──▶ mavjud oqim (o'zgarmaydi)
          │yo'q
          ▼
    GT-<raqam>.pdf ilovasi bormi? ──yo'q──▶ jim, faqat log
          │ha
          ▼
    jadvalni o'qi ──▶ GT bo'yicha guruhla ──▶ har GT uchun:
          matn (+ «Bajarildi» tugmasi) ──▶ fayllar albomi (javob sifatida)
```

### Zakazlar ro'yxati

`zakazlar = PDF'dagi GT raqamlar ∪ jadvaldagi GT raqamlar`

Faqat bittasiga tayanish xavfli: PDF bo'lmasa jadvaldagi zakaz jim yo'qoladi,
jadval bo'lmasa PDF'li zakaz yo'qoladi. Yetishmayotgan tomon xabarda ochiq
yoziladi (`⚠️ GT-773212.pdf ilovada yo'q`, `⚠️ jadvalda bu zakaz yo'q`).

### Fayllarni taqsimlash

Har zakaz xabariga quyidagilar biriktiriladi (mavjud bo'lganlari):

| Fayl | Aniqlash qoidasi (kichik harfda, substring) |
|---|---|
| Zakaz PDF | `gt-<raqam>.pdf` — aynan shu zakazniki |
| CMR yo'riqnomasi | `инструкц` + `cmr` |
| РЦ manzillari | `адрес` + `рц` |
| Инвойс | `инвойс` yoki `invoice` |
| Упаковочный лист | `упаковочн` yoki `packing` |

Ro'yxatga kirmagan ilovalar yuborilmaydi, lekin **nomlari xabarda ko'rsatiladi**
— hech narsa jim yo'qolmasligi uchun.

### Xabar ko'rinishi

```
🟠 Магнит — GT-773211

Место ТО: Оренбург
Товар: Свежий столовый виноград Дамский палец / Fresh table Grape
Место прибытия:
  1) РЦ Киров 10000 кг
  2) РЦ Зеленодольск 10000 кг

Хат: Fwd: Магнит, 35 нед -GT-773210 GT-773211- VOSTOCHNIY PRODUKT LLC
Hujjatlar: GT-773211.pdf, Инструкция к 13гр CMR.xlsx, Адреса РЦ Магнит.xlsx
Yuborilmagan ilovalar: GT box UZ.xlsx, Pallet sticker SAMPLE.DOC
```

Matn «✅ Bajarildi» tugmasi bilan yuboriladi (mavjud mexanizm o'zgarmaydi),
fayllar esa shu xabarga `reply_to_message_id` bilan albom sifatida ketadi.
Shunday qilib har zakaz Telegramda o'z ipiga yig'iladi.

## Tuzilma

| Fayl | Vazifa |
|---|---|
| `mail/watcher.ts` | `IncomingMail` ga `attachments` qo'shiladi (`source: true` allaqachon bor — qo'shimcha IMAP yuki yo'q) |
| `parse/gt-table.ts` | HTML jadval → `GtRow[]`, GT bo'yicha guruhlash |
| `parse/gt-attachments.ts` | ilovalarni turkumlash va zakazga taqsimlash |
| `format/gt-message.ts` | `GtOrder` → Telegram matni |
| `telegram/document.ts` | multipart `sendDocument` / `sendMediaGroup` |
| `index.ts` | marshrut: X5 → GT → jim |

## Testlar

Haqiqiy xat tuzilishidagi fixture (ikki GT, biri ikki РЦ) ustida:

- jadval sarlavha bo'yicha topiladi, pozitsiya bo'yicha emas
- `GT-773211` ning ikki qatori bitta zakazga, ikki `Место прибытия` bilan yig'iladi
- har zakazga o'z PDF'i biriktiriladi, umumiy fayllar ikkalasiga ham
- PDF bor lekin jadvalda yo'q → zakaz baribir yuboriladi + ogohlantirish
- jadvalda bor lekin PDF yo'q → zakaz baribir yuboriladi + ogohlantirish
- GT PDF'siz xat → GT oqimi ishga tushmaydi (X5 xulqi buzilmaydi)
- xabar matni formati

## Qamrovdan tashqarida

- Инвойс / Упаковочный лист keyingi javob xatlaridan yig'ish
- PDF ichini o'qish (OCR) — hozircha PDF shunchaki uzatiladi
- CRM (Task/Invoice) bilan bog'lash
