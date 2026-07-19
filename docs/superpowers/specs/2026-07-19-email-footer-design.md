# Email footer template — dizayn

Sana: 2026-07-19

## Muammo

Vazifadan yuboriladigan xatlar (`send-task-email.ts`) faqat plain text ketadi va hech qanday imzosi yo'q. Chet ellik hamkorlarga bojxona hujjatlari shu pochtadan boradi, shuning uchun har bir xat oxirida korxona nomi, kontaktlar va logo turgan professional footer bo'lishi kerak.

Namuna sifatida mail.ru dagi eski imzo olindi:

```
Ваш надежный представитель на таможне.
Тел.: +998 91-118-70-07
Whatsapp | Telegram | www.prodeklarant.uz
```

## Qarorlar

| Savol | Qaror | Sabab |
|---|---|---|
| Matn formati | HTML + plain-text nusxasi (multipart) | Xatlar qisqa ("ilova qilingan hujjatlarni ko'ring"), avtomatik formatlash xavfsiz. Plain-text nusxasi spam filtrlar uchun. |
| Logo yetkazish | CID inline attachment | Gmail/Outlook tashqi rasmlarni sukut bo'yicha bloklaydi — hosted URL'da hamkor birinchi xatda logoni ko'rmaydi. |
| Logo formati | PNG | Email mijozlari SVG'ni ko'rsatmaydi. |
| Footer qayerda | `sendMail()` ichida avtomatik | Talab "har bir xat bilan". Chaqiruvchi unutib qoldira olmaydi. |
| Til | Ruscha (namunadagidek) | Hamkorlar bilan yozishma tili. |

## Arxitektura

Yangi modul `backend/src/services/mail-footer.ts`, yagona eksport:

```ts
composeEmail(bodyText: string): {
  html: string;
  text: string;
  attachments: { filename: string; content: Buffer; cid: string }[];
}
```

- **Kirish:** foydalanuvchi yozgan oddiy matn.
- **Chiqish:** footer qo'shilgan HTML, uning plain-text nusxasi, va logo attachment'i (agar logo o'qilgan bo'lsa).

`mail.service.ts` dagi `sendMail()` uni chaqiradi va natijani nodemailer'ga uzatadi. Footer HTML'i, ranglar va kontaktlar butunlay shu modul ichida qamalgan — `mail.service.ts` footer haqida hech narsa bilmaydi, u faqat SMTP transport bilan shug'ullanadi.

Kontakt ma'lumotlari modul ichida konstanta sifatida turadi (maxfiy emas, kamdan-kam o'zgaradi, env o'zgaruvchilariga bo'lish ortiqcha murakkablik).

### Logo asset

`frontend/public/logo.png` (31KB) bir marta ~40px balandlikka kichraytirilib `backend/src/assets/email-logo.png` sifatida saqlanadi (~4-6KB). Runtime'da rasm kutubxonasi kerak emas — fayl shundoq o'qiladi.

Build vaqtida `dist/assets` ga ko'chiriladi. `src/scripts/copy-fonts.js` da tayyor namuna bor; xuddi shu usulda `copy-assets` qadami `build` skriptiga qo'shiladi.

### Ko'rinish

```
[foydalanuvchi matni]
─────────────────────────────
[logo]  PRODEKLARANT
        Ваш надежный представитель на таможне.
        Тел.: +998 91-118-70-07
        Whatsapp | Telegram | www.prodeklarant.uz
```

Maket `<table>` asosida, inline CSS bilan — Outlook flexbox va `<div>` maketlarini buzadi.

Linklar:
- Whatsapp → `https://wa.me/998911187007`
- Telegram → `https://t.me/oybek94`
- Sayt → `https://prodeklarant.uz`

## Xatolarga chidamlilik

Logo fayli topilmasa (masalan serverda `dist/assets` ko'chirilmay qolsa) xat **baribir yuboriladi**, faqat logosiz — `attachments` bo'sh qaytadi va HTML'da logo ustuni tushib qoladi. Hujjat yuborish logo tufayli to'xtamaydi.

## Test

`composeEmail()` sof funksiya, vitest bilan qoplanadi:

- HTML ichida korxona nomi, telefon va uchala link bor
- Matndagi `<`, `&` belgilari HTML'ga qochiriladi (buzilgan maket oldini olish)
- Qator uzilishlari `<br>` ga aylanadi
- Logo o'qilmagan holatda ham HTML qaytadi va `attachments` bo'sh bo'ladi
- Plain-text chiqishida HTML teglari yo'q, kontaktlar bor

## Qamrovdan tashqarida

- Footer matnini admin panelidan tahrirlash
- Har bir xodim uchun shaxsiy imzo
- Maxfiylik izohi (confidentiality notice) — foydalanuvchi so'ramadi
- Inglizcha versiya
