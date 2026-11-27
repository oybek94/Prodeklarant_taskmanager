# Yuk arizasi yakunlanganda invoys avtomatik yaratilishi

## Maqsad

Yuk botida to'ldirilgan ariza "✅ Yakunlash" bosilishi bilan bazaga vazifa va invoys bo'lib tushadi; xodim ma'lumotni qayta termaydi.

## Foydalanuvchi qarorlari

- To'liq avtomatik: tasdiqlash qadami yo'q, tugmani kim bosishidan qat'i nazar (guruh a'zosi).
- Vazifa **PSR yo'q** (`hasPsr = false`) bilan yaratiladi.

## Yondashuvlar

1. **Yakunlash ichida, bitta tranzaksiyada (tanlangan):** ariza holati, vazifa va invoys birga yoziladi. Yarim holat qolmaydi, xato darhol bosgan odamga ko'rinadi.
2. Fon navbati (cron) yakunlangan arizalarni o'qiydi: kechikadi, xato haqida alohida xabar kanali kerak.
3. Bot `POST /tasks` va `POST /invoices` ni HTTP orqali chaqiradi: xodim tokeni kerak, ikki so'rov orasida yarim holat qoladi.

## Xatti-harakat

`completeDraft` (guruh tugmasi va Mini App bir xil yo'l):

1. Mavjud majburiy maydon tekshiruvi.
2. Invoys tekshiruvi: shartnoma bo'yicha raqam takrorlanmasligi, sana kelajakda emasligi, netto/brutto qoidasi (`validateItemWeights`). Xato bo'lsa ariza **ochiq qoladi**, sabab ko'rsatiladi.
3. Bitta tranzaksiyada: ariza `COMPLETED`, vazifa (8 bosqich, narx snapshot'i), invoys va tovarlar, `ClientCargoDraft.taskId`.
4. Commit'dan keyin: vazifa bildirishnomasi va socket (`task:created`, `invoice:saved`).
5. Guruh xabariga "📥 Invoys yaratildi: № …" qatori qo'shiladi.

Ikki kishi bir vaqtda bossa bitta vazifa yaratiladi (mavjud versiya tekshiruvi).

## Maydonlar

| Invoys | Manba |
|---|---|
| raqam, sana | "Инвойс №" matni: `Инвойс № 1/26 от 01.01.2026 год` → `1/26`, `2026-01-01`. Raqam bo'sh → navbatdagi raqam; sana yo'q → bugun (Toshkent) |
| shartnoma, valyuta, GLN | ariza shartnomasi; shartnomasiz ariza → shartnomasiz invoys, USD |
| filial, `shipmentPlace` | ariza filiali (`regionText`, bo'lmasa nomi) |
| `deliveryTerms`, `customsAddress`, `destination`, `vehicleNumber`, `orderNumber`, `temperature` | ariza sarlavhasi |
| Серийный номер датчика | qo'shimcha maydon (`customFields`) |
| `palletWeight`, izoh | poddon og'irliklari yig'indisi; izoh matni ilovadagi bilan bir xil ("Товары уложены на деревянных паллетах … весом N кг.") |
| `origin` | "Республика Узбекистан" |
| `manufacturer`, `harvestYear`, ustun va ko'rinish sozlamalari, PDF shriftlari | shu shartnomaning oxirgi invoysi (bo'lsa) |
| FSS hududi | filialning standart tumani |

| Tovar | Manba |
|---|---|
| nom | arizadagidek |
| Код ТН ВЭД | nom bo'yicha: Sozlamalar TNVED → shartnoma spetsifikatsiyasi → shu shartnoma tarixi; aynan moslik bo'lmasa umumiy tur so'zi (`productNameMatch` qoidasi). Topilmasa bo'sh |
| Вид упаковки, Кол-во упаковки | qadoq turi, yashiklar soni |
| Мест | poddonlar soni |
| netto, brutto | ariza |
| narx | ariza; bo'sh bo'lsa spetsifikatsiya narxi, u ham yo'q bo'lsa 0 |
| birlik, summa | `кг`; netto × narx, 2 kasr |

Vazifa nomi: `<raqam> АВТО <davlat raqami>`; avto raqami bo'lmasa `Invoice - <shartnoma>`.

Vazifa muallifi: arizani to'ldirganlar ichida Telegram hisobi xodimga (`User.telegramChatId`) mos keladigan birinchisi; topilmasa birinchi faol ADMIN.

## Baza

`ClientCargoDraft.taskId Int? @unique`, vazifa o'chirilsa `SET NULL`. Migratsiya qo'lda (`migration.sql` → `db execute` → `migrate resolve`). "🔑 Код водителя" shu bog'lanishdan foydalanadi, bo'lmasa eski moslashtirish qoladi.

## Qamrovdan tashqari

- Oldin yakunlangan arizalar invoysga aylantirilmaydi.
- Yakunlashdan keyingi tuzatish dasturda qilinadi; xato vazifa dasturdan o'chiriladi.
- "Invoys" bosqichi avtomatik bajarilgan deb belgilanmaydi (KPI ga ta'sir qilmasin).

## Quruvchiga qoldirilgan

Fayl bo'linishi, mavjud `createTask` / `saveInvoice` mantiqini tranzaksiyada qayta ishlatish usuli, testlar.
