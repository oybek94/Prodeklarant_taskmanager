# Tranzaksiyalar sahifasi: eski qarzni olib tashlash, tezlik, yangi ko'rinish

Sana: 2026-09-26 · Holat: tasdiqlangan dizayn

## Maqsad

Tranzaksiyalar sahifasi (`/transactions`) tez, tushunarli va toza ko'rinishda ishlasin.
O'tgan yil (mavsum) qarzi yopilgan — bu funksiya tizimdan butunlay olib tashlanadi.

Foydalanuvchi qarorlari:
- Eski qarz — **hamma joydan** olib tashlanadi (faqat Tranzaksiyalardan emas).
- Dizayn — **toza, ixcham jadval** (shisha/gradient effektlarsiz).

## 1. O'tgan yil qarzini olib tashlash

Ikki eski mexanizm bor, ikkalasi ham ketadi:
- `PreviousYearWorkerDebt` — admin qo'lda kiritgan snapshot (`/workers/previous-year-debt*`).
- `User.legacyDebtUsd` + `WorkerPayment.isLegacyPayment` — "o'tgan mavsum qarzidan chegirish" to'lovlari,
  ishchi hisobotidagi `legacy` bo'limi.

Olib tashlanadi:
- Frontend: `PreviousYearDebtModal`, Tranzaksiyalar sarlavhasidagi tugma, ish haqi formasidagi
  "O'tgan mavsum qarzidan chegirish" katagi, ishchi kartochkasidagi `legacyDebt`, profildagi eski
  qarz kartochkasi, ishchi hisobotidagi eski qarz bloki, tegishli tiplar.
- Backend: `GET/POST /workers/previous-year-debt(s)`, `services/previous-year-debt.ts` (+ testi),
  hisobot javobidagi `legacy` bo'limi va `legacyDebt` maydonlari; `isLegacyPayment` endi qabul
  qilinmaydi (tranzaksiya va ishchi to'lovi yaratishda doim `false`).

O'zgarmaydi:
- Joriy mavsum hisobi — `SEASON_SPLIT_DATE` (2026-02-15) dan boshlanadigan davr.
- Bazadagi eski yozuvlar (jadval/ustunlar) — migratsiya yo'q.
- Ishchini o'chirishdagi "ishtiroki bor" tekshiruvi (`previousYearWorkerDebt.count`) — FK sababli qoladi.

## 2. Tezlik

Frontend:
- Izoh qidiruvi 350 ms debounce; har yangi ro'yxat so'rovi oldingisini `AbortController` bilan bekor qiladi.
- Ekranda ko'rsatilmaydigan `workerStats` so'rovlari (admin 1 ta, xodim 3 ta) olib tashlanadi.
- Mijozlar ro'yxati faqat admin uchun yuklanadi.
- Saqlash/o'chirishdan keyin ro'yxat va oylik statistika parallel yangilanadi.

Backend `GET /transactions`:
- Query Zod bilan tekshiriladi: `type` enum, `paymentMethod` enum, id'lar musbat butun, sanalar,
  `page ≥ 1`, `limit` 1–100 (sukut 15). Noto'g'ri qiymat → 400 (hozir 500 yoki cheksiz so'rov).

## 3. Yangi ko'rinish

Tuzilma (yuqoridan pastga):
1. Sarlavha: "Tranzaksiyalar" + bitta asosiy tugma ("Yangi tranzaksiya" / xodimda "Olgan pulimni qo'shish").
2. Admin uchun 3 ta ixcham kartochka: Oylik kirim, Oylik chiqim, Sof foyda — summa + o'tgan oyga nisbatan %.
3. Filtr qatori: tur uchun segmentli tugmalar (Hammasi/Kirim/Chiqim/Ish haqi), izoh qidiruvi,
   Mijoz/Xodim (admin), To'lov usuli, sana oralig'i, "Tozalash" (faqat filtr bor bo'lsa).
4. Jadval: Sana · Tur · Kim/Nima · Izoh · To'lov usuli · Summa · (amallar). Summa o'ngga tekislangan,
   `1 250 000` formatida, kirim yashil `+`, chiqim/ish haqi `−`. Tahrirlash/o'chirish ikonkalari
   qatorga sichqoncha olib borilganda ko'rinadi. Pastda "1–15 / 342" va sahifalash.
5. Mobil: mavjud kartochkali ro'yxat shu uslubda.

Qoidalar:
- Barcha yozuvlar o'zbekcha; `alert()`/`confirm()` o'rniga toast va tasdiqlash oynasi.
- Oq fon, yupqa chegaralar, gradient/blur yo'q; qorong'i rejim `index.css` dagi mavjud tokenlar orqali.
- Ikonkalar — Solar Bold Duotone (`@iconify/react`).
- Forma mazmuni o'zgarmaydi (virtual karta tanlovi qoladi — moliya boti ishlatadi), faqat uslub va xabarlar.

## 4. Test

- Backend: `GET /transactions` query validatsiyasi va `isLegacyPayment` e'tiborga olinmasligi uchun unit test;
  `tsc`, `vitest`.
- Frontend: `tsc`, `vite build`; lokal ishga tushirib, admin va xodim ko'rinishini skrinshot bilan tekshirish.

## Doiradan tashqari

- Bazadan eski jadval/ustunlarni o'chirish (migratsiya).
- Virtual kartalar mantiqi, tranzaksiya yaratish/tahrirlash backend mantiqi.
