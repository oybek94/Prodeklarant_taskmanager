/**
 * Mijozning Telegram shablon matnidan invoys maydonlarini ajratish prompti.
 *
 * JSON format promptda emas — OpenAI structured outputs (strict JSON Schema,
 * cargo-text.schema.ts) orqali majburlanadi. Bu yerda faqat maydonlarning
 * MAZMUNI va shablonga xos qoidalar tushuntiriladi.
 */

export interface CargoTextPromptOptions {
  /** Shartnomadagi "Условия поставки" variantlari */
  deliveryTermsOptions?: string[];
  /** Bazadagi qadoq turlari (masalan "пласт.ящик") */
  packagingTypeOptions?: string[];
  /** Bazadagi tovar nomlari — TNVED kodi shu nom orqali avtomatik to'ladi */
  productNameOptions?: string[];
}

/** Berilgan variantlardan eng yaqinini tanlash bo'yicha umumiy ko'rsatma bloki */
function optionBlock(title: string, field: string, options: string[], example: string): string {
  if (options.length === 0) {
    return `\n${field} — matndagi qiymatni xom holicha qaytaring.`;
  }
  return `
${title}:
${options.map((opt) => `- ${opt}`).join('\n')}

${field} uchun MAJBURIY qoida: matndagi yozuvni shu ro'yxat bilan solishtiring va
ma'nan mos keladigan variantning TO'LIQ matnini qaytaring — matndagi xom yozuvni
EMAS. Ro'yxatdagi yozuv qisqartirilgan, boshqa sonda (birlik/ko'plik), boshqa
rod/kelishikda yoki boshqa so'z tartibida bo'lishi mumkin — bular MOS hisoblanadi.
${example}
Faqat ro'yxatda ma'nan yaqin variant UMUMAN bo'lmagandagina matndagi xom qiymatni qaytaring.`;
}

export function buildCargoTextPrompt({
  deliveryTermsOptions = [],
  packagingTypeOptions = [],
  productNameOptions = [],
}: CargoTextPromptOptions = {}): string {
  const deliveryTermsBlock = optionBlock(
    'УСЛОВИЯ ПОСТАВКИ VARIANTLARI (shartnomadan)',
    'delivery_terms',
    deliveryTermsOptions,
    'Masalan "DAP Москва" → "DAP - г.Москва, Российская Федерация".'
  );

  const packagingBlock = optionBlock(
    'QADOQ TURLARI (bazadan)',
    'package_type',
    packagingTypeOptions,
    'Masalan "Пластиковый ящик" → "пласт.ящик", "Картонная коробка" → "картон.короб.".'
  );

  const productNameBlock = optionBlock(
    'TOVAR NOMLARI (bazadan)',
    'name',
    productNameOptions,
    'Masalan matnda "Персик свежий" bo\'lsa va ro\'yxatda "Персики свежие" tursa — ' +
      '"Персики свежие" ni qaytaring. "Томат свежий" → "Томаты свежие", ' +
      '"Свежий гранат" → "Гранат свежий". Bu nom bo\'yicha Код ТН ВЭД topiladi, ' +
      'shuning uchun xom yozuv qaytarilsa kod bo\'sh qolib ketadi.'
  );

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

YIG'INDI qatorlari ("Итого", "Всего") — masalan
"Итого: 18 800 нетто / 20 390 брутто" — tovarlar yig'indisi bo'lib, invoys
jadvali ularni o'zi hisoblaydi. Hech qaysi maydonga, jumladan extra_fields
ga ham YOZMANG.

MAYDONLAR MAZMUNI:
- invoice_number — "Номер инвойса" qiymati (masalan "PIN-98")
- vehicle_number — "Номер ТС" qiymati BUTUN HOLICHA, qismlarga ajratmang
  (masalan "40906MCA/405284BA" — shundayligicha)
- harvest_year — "Год урожая" qiymati
- order_number — buyurtma/partiya kodi: alohida turgan uzun defisli kod
  (masalan "RVI-2026-29-31-TKGARDENS-3682719-BGR-DSC_1")
- customs_address — "Таможня:" sarlavhasidan keyingi BARCHA qatorlar,
  \\n bilan birlashtirilgan bitta matn
- destination — FAQAT "Выгрузка:" sarlavhasidan keyingi qatorlar, \\n bilan
  birlashtirilgan bitta matn (raqamli ro'yxat belgilari saqlanadi).
  Matnda "Выгрузка:" sarlavhasi YO'Q bo'lsa → null. Manzilni boshqa joydan
  (masalan "DAP Москва" yoki "Таможня" satridan) OLMANG va O'YLAB TOPMANG
${deliveryTermsBlock}

TOVARLAR (products):
Har bir tovar bloki alohida element bo'ladi. Bir nechta tovar bo'lishi mumkin.
- plu_code — "PLU:" qiymati MATN HOLICHA, ikkala raqam ham
  (masalan "3682719 / 3639748" → "3682719 / 3639748")
- packages_count — "3 648 Пластиковый ящик" kabi qatordagi SON (3648)
- net_weight — "нетто" so'zi turgan qatordagi raqam (masalan "19 170 нетто" → 19170)
- gross_weight — "брутто" so'zi turgan qatordagi raqam (masalan "20 760 брутто" → 20760)
- places_count — "паллет" so'zi turgan qatordagi BIRINCHI raqam
  (masalan "33 паллет х 15 кг" → places_count=33).
  DIQQAT: "х 15 кг" qismi ISHLATILMAYDI — uni hech qaysi maydonga yozmang
  va extra_fields ga ham qo'shmang
- unit_price — "Цена $1.25" → 1.25
- currency — narx belgisidan aniqlang: "$" → "USD", "сум"/"so'm" → "UZS"
- kvant — "Квант 5.25" qatoridagi son (5.25). Har tovarda o'ziniki bo'lishi mumkin
- calibre — "Калибр 40mm+" qatoridagi qiymat ("40mm+"), matndagi yozuv holicha.
  Har tovarda o'ziniki bo'lishi mumkin
- distribution_center — "РЦ" bilan boshlanadigan qatorning QATORI BO'YICHA
  TO'LIQ matni, "РЦ" so'zi BILAN BIRGA. Masalan "РЦ Москов Север Алкоголь"
  qatoridan qiymat aynan "РЦ Москов Север Алкоголь" bo'ladi — "РЦ" ni
  tashlab yubormang va qisqartirmang

Квант, Калибр va РЦ — SHU tovar maydonlariga yoziladi. Ularni extra_fields ga
QO'SHMANG, hatto tovar blokidan tashqarida yozilgan bo'lsa ham.

РЦ QATORLARI QAYERDA TURISHI MUMKIN — HAMMASINI QAMRANG:
1) Tovar bloki ichida — o'sha tovarga tegishli
2) Barcha tovarlardan keyin (yoki oldin) alohida ro'yxat bo'lib — bunda
   RO'YXAT TARTIBI BO'YICHA taqsimlang: 1-РЦ → 1-tovarga, 2-РЦ → 2-tovarga
3) "Выгрузка:" bo'limi ichida — u yerdan ham РЦ qatorini oling
   (destination matnida ham qolaversin, bu ikkisi bir-biriga xalaqit bermaydi)
Agar РЦ bitta bo'lib, tovarlar bir nechta bo'lsa — o'sha bitta РЦ ni HAR BIR
tovarga yozing. Matnda "РЦ" bilan boshlanadigan qator bo'lsa, hech bo'lmaganda
bitta tovarning distribution_center maydoni null BO'LMASLIGI kerak.
${packagingBlock}
${productNameBlock}

PACKING_FIELDS:
"В упаковочный лист:" sarlavhasidan keyingi qatorlar shu massivga tushadi.
Har biri { label, value } ko'rinishida: qatordagi izohdan oldingi qism — label,
qiymat — value. Masalan "Серийный номер датчика -8083254" →
{ label: "Серийный номер датчика", value: "8083254" }.

EXTRA_FIELDS:
Yuqoridagi maydonlarning HECH BIRIGA tushmagan, lekin nomi bor HAR BIR qiymat
shu massivga tushishi SHART — hech qaysi ma'lumot yo'qolmasligi kerak.
Har biri { label, value } ko'rinishida, label — sof nom, qo'shimchasiz.
Sarlavhalarni ("Таможня:", "Выгрузка:", "В упаковочный лист:") va tovarning
o'z maydoni bor qiymatlarni (Квант, Калибр, РЦ) extra_fields ga QO'SHMANG.`;
}
