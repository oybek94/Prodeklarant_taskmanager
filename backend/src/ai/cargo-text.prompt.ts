/**
 * Mijozning Telegram shablon matnidan invoys maydonlarini ajratish prompti.
 *
 * JSON format promptda emas — OpenAI structured outputs (strict JSON Schema,
 * cargo-text.schema.ts) orqali majburlanadi. Bu yerda faqat maydonlarning
 * MAZMUNI va shablonga xos qoidalar tushuntiriladi.
 */

/**
 * @param deliveryTermsOptions Shartnomada mavjud "Условия поставки" variantlari —
 *   AI matndagi qisqa yozuvga eng yaqinini shu ro'yxatdan tanlaydi.
 */
export function buildCargoTextPrompt(deliveryTermsOptions: string[] = []): string {
  const deliveryTermsBlock =
    deliveryTermsOptions.length > 0
      ? `\nУСЛОВИЯ ПОСТАВКИ VARIANTLARI (shartnomadan):\n${deliveryTermsOptions
          .map((opt) => `- ${opt}`)
          .join('\n')}\n
delivery_terms uchun matndagi qisqa yozuvga (masalan "DAP Москва") ENG YAQIN variantni
shu ro'yxatdan tanlab, uning TO'LIQ matnini qaytaring (masalan "DAP - г.Москва, Российская Федерация").
Ro'yxatda mos variant bo'lmasa — matndagi xom qiymatni qaytaring.`
      : `\ndelivery_terms — matndagi yetkazib berish shartini xom holicha qaytaring (masalan "DAP Москва").`;

  return `Siz bojxona deklaranti uchun ishlaydigan AI siz. Mijoz Telegram orqali yuborgan
erkin shablon matnidan invoys maydonlarini AJRATIB OLING.

MUHIM:
- Faqat matnda BOR ma'lumotlarni ajratib oling; hech qanday qiymatni o'ylab topmang
- Maydon matnda topilmasa → null (massivlar uchun bo'sh massiv)
- Raqamlardagi probel va minglik ajratgichlarini olib tashlang (3 648 → 3648, 19 170 → 19170)
- O'nlik ajratgich sifatida nuqta ishlating (5,25 → 5.25)

E'TIBORSIZ QOLDIRILADIGAN QATORLAR (ULARNI HECH QAYERGA YOZMANG):
- "Отправитель: ..." — yuk jo'natuvchi
- "Изготовитель: ..." — ishlab chiqaruvchi
- "Клиент: ..." — mijoz
Bu uchtasi tizimda shartnoma va mijoz yozuvlaridan olinadi, matndan olinmaydi.
Ularni extra_fields ga ham QO'SHMANG.

MAYDONLAR MAZMUNI:
- invoice_number — "Номер инвойса" qiymati (masalan "PIN-98")
- vehicle_number — "Номер ТС" qiymati BUTUN HOLICHA, qismlarga ajratmang
  (masalan "40906MCA/405284BA" — shundayligicha)
- harvest_year — "Год урожая" qiymati
- order_number — buyurtma/partiya kodi: alohida turgan uzun defisli kod
  (masalan "RVI-2026-29-31-TKGARDENS-3682719-BGR-DSC_1")
- customs_address — "Таможня:" sarlavhasidan keyingi BARCHA qatorlar,
  \\n bilan birlashtirilgan bitta matn
- destination — "Выгрузка:" sarlavhasidan keyingi BARCHA qatorlar,
  \\n bilan birlashtirilgan bitta matn (raqamli ro'yxat belgilari saqlanadi)
${deliveryTermsBlock}

TOVARLAR (products):
Har bir tovar bloki alohida element bo'ladi. Bir nechta tovar bo'lishi mumkin.
- name — tovar nomi (masalan "Нектарины свежие")
- plu_code — "PLU:" qiymati MATN HOLICHA, ikkala raqam ham
  (masalan "3682719 / 3639748" → "3682719 / 3639748")
- packages_count va package_type — "3 648 Пластиковый ящик" kabi qatordan:
  packages_count=3648, package_type="Пластиковый ящик"
- net_weight — "нетто" so'zi turgan qatordagi raqam (masalan "19 170 нетто" → 19170)
- gross_weight — "брутто" so'zi turgan qatordagi raqam (masalan "20 760 брутто" → 20760)
- places_count — "паллет" so'zi turgan qatordagi BIRINCHI raqam
  (masalan "33 паллет х 15 кг" → places_count=33).
  DIQQAT: "х 15 кг" qismi ISHLATILMAYDI — uni hech qaysi maydonga yozmang
  va extra_fields ga ham qo'shmang
- unit_price — "Цена $1.25" → 1.25
- currency — narx belgisidan aniqlang: "$" → "USD", "сум"/"so'm" → "UZS"

PACKING_FIELDS:
"В упаковочный лист:" sarlavhasidan keyingi qatorlar shu massivga tushadi.
Har biri { label, value } ko'rinishida: qatordagi izohdan oldingi qism — label,
qiymat — value. Masalan "Серийный номер датчика -8083254" →
{ label: "Серийный номер датчика", value: "8083254" }.

EXTRA_FIELDS:
Yuqoridagi maydonlarning hech biriga tushmagan, lekin nomi bor qiymatlar.
Masalan "Квант 5.25" → { label: "Квант", value: "5.25" },
"Калибр 40mm+" → { label: "Калибр", value: "40mm+" }.
Sarlavhalarni ("Таможня:", "Выгрузка:", "В упаковочный лист:") extra_fields ga qo'shmang.`;
}
