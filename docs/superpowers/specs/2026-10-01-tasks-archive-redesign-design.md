# Vazifalar → Arxiv tabi: redizayn va tezlik

Sana: 2026-10-01 · Holat: tasdiqlangan dizayn

## Maqsad

Arxiv tabi (`/tasks/archive`) tez seziladigan, ma'lumot oson topiladigan, zamonaviy va mobilda qulay bo'lsin.

Foydalanuvchi qarorlari:
- Qamrov — **faqat Arxiv tabi**. Faol vazifalar ro'yxati, vazifa kartochkasi (TaskDetailPanel) va modallar o'zgarmaydi.
- Muammolar — sekinlik, eskirgan ko'rinish, ma'lumot topish qiyinligi, mobil noqulaylik (hammasi).
- Tartib — **invoys sanasi bo'yicha, yangisi tepada**; invoysi yo'q vazifalar oxirida.

## 1. Tuzilma

Yangi `components/tasks/archive/` papkasi:
- `ArchiveView.tsx` — toolbar + jadval/kartochkalar + sahifalash; `TasksView` arxiv rejimida shuni chizadi.
- `ArchiveToolbar.tsx` — qidiruv, filtr tugmalari, faol filtr chiplari, natija soni.
- `ArchiveTable.tsx` (desktop) va `ArchiveCard.tsx` (mobil).
- `ArchiveFiltersSheet.tsx` — mobil filtr oynasi (pastdan chiqadi).
- `ArchiveReportModal.tsx` — "Hisobot…" ustunlarini tanlash (hozir filtr panelida).
- `ArchivePagination.tsx`.

Olib tashlanadi: `ArchiveFiltersPanel.tsx` (eski popover); `TaskTable` ichidagi barcha `isArchive` tarmoqlari
(TaskTable faqat faol filial jadvallari uchun qoladi). `REPORT_COLUMNS` va `ArchiveFiltersState` tiplari
`archive/types.ts` ga ko'chadi. `TasksHeader` arxivda faqat "⬇ Eksport" menyusini ko'rsatadi
(Excel (jadval) / Hisobot…).

## 2. Ko'rinish

Desktop:
- Toolbar doim ko'rinadi: qidiruv (task yoki mijoz), `Invoys sanasi` (dan–gacha), `Filial`, `Mijoz`
  (qidiruvli), `PSR`. Faol filtrlar × bilan chip; "Tozalash"; o'ngda "N ta natija".
- Ustunlar: **Sana** (invoys) · Task · Mijoz · Filial · PSR · BXM · Vaqt · Izoh. "Status" olib tashlanadi.
- Sticky sarlavha, ixcham qatorlar, qator bosilsa vazifa kartochkasi ochiladi (hozirgidek).
- Pastda: "1–20 / 128" va `‹ 1 2 3 … 7 ›`.
- Dark mode — `dark:` klasslar; ikonkalar Solar bold-duotone.

Mobil:
- Qidiruv qatori + "Filtrlar (n)" tugmasi → `ArchiveFiltersSheet`. `/tasks/archive/filters` route
  saqlanadi (orqaga tugmasi yopadi).
- Kartochka: task nomi + sana; mijoz; filial / PSR / BXM belgilari.

Bo'sh holat: "Arxivda vazifalar topilmadi" + filtr bo'lsa "Filtrlarni tozalash" tugmasi.

## 3. Tezlik

Frontend:
- Sahifa/filtr almashganda jadval joyida qoladi, xiralashadi (`opacity-60`) va tepada ingichka progress
  chizig'i chiqadi. Skeleton faqat birinchi yuklashda.
- `loadTasks` har yangi so'rovda oldingisini `AbortController` bilan bekor qiladi (hozirgi `seq` tekshiruvi qoladi).
- Keyingi sahifa fonda oldindan yuklanadi (kesh: so'rov kaliti → javob, faqat joriy filtrlar uchun;
  filtr o'zgarsa tozalanadi; socket yangilanishi keshni tozalaydi).
- Arxivda `/workers` so'rovi yuborilmaydi — xodimlar ro'yxati faqat ularga muhtoj modal ochilganda yuklanadi.

Backend (`GET /tasks`, `dateBy=invoice` bilan bir qatorda yangi `sort=invoiceDate`):
- Tartib: avval invoysi bor vazifalar `invoice.date desc, createdAt desc`, keyin invoysi yo'qlar
  `createdAt desc`. Prisma 5 da talab qilinmaydigan relation maydoni uchun `nulls: 'last'` yo'q, shuning
  uchun ikki segment: `count(invoysli)` va `skip/take` segmentlar bo'ylab bo'linadi. Sana filtri berilganda
  ikkinchi segment bo'sh (filtr invoysi yo'qlarni chiqarib tashlaydi).
- `/tasks/archive-report` ham shu tartibda.
- Indeks: `Invoice(date)`. Prod'ga `CREATE INDEX CONCURRENTLY` bilan qo'lda qo'llanadi, keyin migratsiya
  papkasi + `migrate resolve` (migrate dev ishlatilmaydi). **Prod DB'ga yozish — alohida tasdiq bilan.**

## 4. Xatolar

- Ro'yxat so'rovi xatosi: ko'rinib turgan jadval saqlanadi, toast "Arxivni yuklashda xatolik"; birinchi
  yuklashda — bo'sh holat + "Qayta urinish".
- Bekor qilingan (abort) so'rovlar xato sifatida ko'rsatilmaydi.

## 5. Sinov

- `tsc` (frontend + backend).
- Backend: repository uchun ikki segmentli sahifalash testi (chegaradagi sahifa, filtr bilan, invoysi
  yo'qlar oxirida).
- Lokal dev serverda brauzerda: qidiruv, har bir filtr, chiplar, sahifalash (oldindan yuklash), ikkala eksport,
  qator → kartochka, mobil o'lcham, dark mode.
