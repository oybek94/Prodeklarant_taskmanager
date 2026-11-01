# Yuk ma'lumotlari: bir nechta xodim bilan hamkorlikda to'ldirish (qoralama)

Sana: 2026-11-01. Holat: tasdiqlanishi kutilmoqda.

## Maqsad va sabab

Mijozning Telegram guruhida bir nechta xodim bor. Biri yuk ma'lumotlarining bir qismini (masalan invoys, avto raqami), boshqasi qolganini (masalan jo'natish joyi, narx) kiritadi. Hozir forma xabarni guruhga **bir marta** yuboradi va hech narsa saqlanmaydi (`submitCargo`), shuning uchun ikkinchi odam birinchisi kiritganini ko'rolmaydi va davom ettirolmaydi. Natijada ma'lumot parchalanib, bir nechta to'liqsiz xabar bo'lib guruhda qoladi.

Maqsad: bitta yuk uchun bitta "ariza" (qoralama) bo'lsin; istalgan guruh a'zosi uni to'ldirishni davom ettira olsin; har maydonni kim kiritgani ko'rinsin; majburiy maydonlar to'lgach ariza "to'liq" deb yakunlansin.

## Maqsadlar

- Qoralama bazada saqlanadi. Mini App uni mavjud qiymatlar bilan ochadi.
- Har maydonning muallifi (Telegram ismi) va vaqti saqlanadi va guruh xabarida ko'rinadi.
- Guruhda yuk uchun **bitta jonli xabar** turadi, har saqlashda o'sha xabar tahrirlanadi.
- Ikki kishi bir vaqtda ishlasa, biri ikkinchisining kiritganini bosib ketmaydi (faqat o'zgartirilgan maydonlar saqlanadi).
- Majburiy maydonlar to'lganda ariza yakunlanadi; yakunlangan ariza qotadi.
- Guruhda bir paytda bir nechta ochiq ariza bo'lishi mumkin (bir nechta yuk).

## Maqsad emas

- Prodeklarant CRM ichida arizalarni ko'rsatish yoki ularni vazifa/invoysga aylantirish (keyingi bosqich; ma'lumot bazada turadi).
- Mini App ochiq turgan paytda boshqa odam o'zgartirganini jonli (real-time) ko'rsatish. Yangilanish saqlashda va qayta ochishda bo'ladi.
- Ruxsatlar bo'yicha rollar: hozirgidek istalgan guruh a'zosi hamma amalni bajara oladi.

## Muvaffaqiyatsizlik hisoblanadigan holatlar

- Bir odam saqlaganda boshqasining kiritgani yo'qolishi.
- Guruhda bir yuk uchun bir nechta takroriy xabar chiqishi.
- Boshqa mijoz guruhining arizasiga kirish yoki o'zgartirish imkoni (id ni taxmin qilib).
- Majburiy maydonlar to'lmagan arizaning "to'liq" bo'lib qolishi.

## Majburiy maydonlar (foydalanuvchi belgilagan)

Sarlavha: `deliveryTerms` (Условия поставки), `customsPlace` (Место там. очистки), `shipmentPlace` (Место отгрузки груза).
Tovar (har bir bo'sh bo'lmagan tovar bloki uchun): `product` (Наименование), `boxCount` (Количество ящиков), `netto` (Нетто), `brutto` (Брутто).
Kamida bitta bo'sh bo'lmagan tovar bloki bo'lishi shart. Butunlay bo'sh bloklar e'tiborga olinmaydi.
Qolgan maydonlar (kontrakt, invoys, avto raqami, narx va h.k.) ixtiyoriy.

Bu qoida bitta sof funksiyada (`getMissingRequired(draft)`) turadi: Mini App, guruh xabari va "Yakunlash" tekshiruvi shuni ishlatadi.

## Qanday ishlaydi

**Qoralama yaratilishi.** `/yangi` bo'sh qoralama yaratmaydi. Mini App `startapp=<chatId>_new` bilan ochiladi, bo'sh forma ko'rsatadi. Birinchi "Saqlash" da (kamida bitta maydon bo'lsa) qoralama bazaga yoziladi va bot guruhga jonli xabarni yuboradi.

**Ochiq arizalar mavjud bo'lsa** `/yangi` ro'yxat chiqaradi: oxirgi 5 tagacha ochiq ariza (yangilangan vaqti bo'yicha), har biri "Инвойс № / Авто — to'ldirilgan N/M" ko'rinishida tugma, pastda "➕ Yangi yuk". Ochiq ariza bo'lmasa to'g'ridan "Formani ochish" tugmasi chiqadi (hozirgidek).

**Jonli xabar** (bitta, tahrirlanadi). Mavjud `formatCargoMessage` formati saqlanadi, lekin har to'ldirilgan qator oxiriga muallif qo'shiladi: `Номер автотранспорта: 01A123BC — 👤 Aziz`. Majburiy, lekin bo'sh maydonlar `⏳ не заполнено` bilan ro'yxat qilinadi. Pastda tugmalar:
- `✏️ To'ldirish` — Mini App'ni shu ariza bilan ochadi (`startapp=<chatId>_<draftId>`).
- `✅ Yakunlash` — faqat majburiy maydonlar to'liq bo'lganda ko'rinadi.
- `🗑 Bekor qilish` — ikki bosqichli tasdiq bilan.

**Mini App.** Ariza mavjud qiymatlar va mualliflar bilan ochiladi. Faqat foydalanuvchi o'zgartirgan maydonlar yuboriladi (`PATCH`). Server ularni birlashtiradi, har o'zgargan maydon muallifini yangilaydi, yangi to'liq holatni qaytaradi (Mini App boshqalar kiritganini ko'rsatadi). Pastdagi tugma "Saqlash"; majburiy maydonlar to'lgan bo'lsa ikkinchi tugma "Saqlash va yakunlash". Boshqa odam kiritgan maydonni o'zgartirish mumkin; muallif o'zgartirgan odamga o'tadi.

**Yakunlash.** Xabar sarlavhasi `✅ Данные о грузе — полные` ga o'zgaradi, tugmalar olib tashlanadi, kim yakunlagani yoziladi. Yakunlangan arizani o'zgartirib bo'lmaydi (API 409 qaytaradi).

**Bekor qilish.** Xabar `❌ Отменено` ga o'zgaradi, tugmalarsiz. Ariza ro'yxatlardan chiqadi.

## Ma'lumotlar modeli

Yangi jadval `ClientCargoDraft` va enum `ClientCargoDraftStatus { OPEN, COMPLETED, CANCELLED }`:

- `id`, `clientId` (Client'ga bog'liq, Cascade), `chatId` (guruh), `status`,
- `data` Json: `{ contractId, branchId, header: {...}, items: [{ uid, fields: {...}, bruttoManual }] }`,
- `authors` Json: maydon yo'li (`header.vehicleNumber`, `items.<uid>.netto`) → `{ tgUserId, name, at }`,
- `messageId` Int? (guruhdagi jonli xabar), `version` Int (har saqlashda +1),
- `createdAt`, `updatedAt`, `completedAt?`, `completedByName?`.

`@@index([clientId, status, updatedAt])`, `@@index([chatId, status])`.
Tovar bloklari mijozda yaratilgan barqaror `uid` bilan aniqlanadi (indeks emas), shunda ikki kishi blok qo'shsa/o'chirsa chalkashmaydi.

## API (hozirgi `tg-cargo` auth middleware bilan: initData imzosi + guruh a'zoligi)

- `GET /api/tg-cargo/drafts` — shu guruhning ochiq arizalari (qisqa ma'lumot).
- `GET /api/tg-cargo/drafts/:id` — to'liq holat (data, authors, version, missingRequired).
- `POST /api/tg-cargo/drafts` — yangi ariza (birinchi saqlash), guruhga jonli xabarni yuboradi.
- `PATCH /api/tg-cargo/drafts/:id` — faqat o'zgargan maydonlar/bloklar; to'liq yangi holatni qaytaradi.
- `POST /api/tg-cargo/drafts/:id/complete` — majburiy maydonlar to'liq bo'lsagina.
- Har so'rovda `draft.clientId` va `draft.chatId` autentifikatsiyadagi guruhga teng ekani tekshiriladi, aks holda 404.
- Muallif ismi `initData.user` dan olinadi (`first_name`, `last_name`, `username`); mijozdan kelgan ismga ishonilmaydi. `verifyInitData` hozir faqat `id` ni qaytaradi, kengaytiriladi.
- Kiritish Zod bilan tekshiriladi, maydon qiymatlari avvalgi `parseFieldInput` qoidalari bo'yicha.

Bot callback'lari (`callback_query`, hozirgi `/arxiv` bilan bir joyda): `cargo:done:<id>`, `cargo:cancel:<id>`, `cargo:cancel-yes:<id>`, `cargo:open:<id>`. Har birida chat ID va ariza egaligi qayta tekshiriladi.

## Cheklovlar

- Migratsiya qo'lda (loyihadagi odatiy tartib: `migration.sql` → `db execute` → `resolve`; `migrate dev` ishlatilmaydi). Faqat Prisma ORM, qo'lda SQL yo'q (migratsiyadan tashqari).
- Telegram xabar tahrirlash cheklovi: bir ariza uchun tahrirlar kamida ~3 soniya oralig'ida birlashtiriladi; "message is not modified" xatosi e'tiborga olinmaydi; xabar o'chirilgan bo'lsa yangi xabar yuboriladi va `messageId` yangilanadi.
- Telegram `startapp` faqat `A-Za-z0-9_-` belgilarini qabul qiladi: `-1001234567890_5` va `-1001234567890_new` mos. Eski tugmalar (`startapp=<chatId>`) ishlashda davom etadi va "yangi ariza" sifatida ochiladi.
- Valyuta/summa hisoblari yo'q: qiymatlar hozirgidek matn sifatida saqlanadi (`Decimal` qoidasi bu yerda summa hisoblamaydi).
- Brutto: avtomatik hisoblangan qiymat saqlanadi; qo'lda o'zgartirilgan bo'lsa `bruttoManual=true`, boshqa odam og'irlik o'zgartirsa ham qayta hisoblanmaydi ("Qayta hisoblash" tugmasi bilan bekor qilinadi).

## Quruvchiga qoldirilgan (men hal qilgan joylar)

- Aniq PATCH tanasi shakli (maydon/blok operatsiyalari).
- Jonli xabar matnidagi markerlar rus tilida (`не заполнено`, `Заполнил`), chunki xabar yorliqlari rus tilida; tugmalar o'zbek tilida.
- Ochiq ariza muddati: avtomatik bekor qilish yo'q; `/yangi` ro'yxatida faqat oxirgi 5 ta ko'rinadi.
- Tahrirlarni birlashtirish oralig'i (3 soniya) va ro'yxatdagi 5 ta chegarasi.

## Sinash

- Sof funksiyalar uchun vitest: `getMissingRequired`, o'zgarishlarni birlashtirish (ikki muallif, o'chirilgan blok, bir maydon ikki marta), muallifli xabar formati, `startapp` parametrini ajratish.
- Qo'lda: ikki Telegram akkauntidan bir arizani navbatma-navbat to'ldirish, bir vaqtda saqlash, yakunlash, bekor qilish, eski `/yangi` tugmasi.
