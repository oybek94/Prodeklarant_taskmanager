import type { FieldHintContent } from '../components/common/FieldHint';

/**
 * Invoys sahifasidagi maydonlar uchun yordam matni.
 *
 * `contractFieldHints` bilan bir xil uslub: maydonga nima yoziladi, uni qaysi
 * hujjatdan olish kerak va misol. Matnlar yangi kelgan xodimga tushuntirgandek.
 */
export const invoiceFieldHints = {
  // ── Sarlavha ──────────────────────────────────────────────────────────────
  invoiceNumber: {
    title: 'Инвойс №',
    text: 'Invoys raqami. Bo\'sh qoldirsangiz tizim shu shartnoma bo\'yicha keyingi raqamni o\'zi qo\'yadi.\nQo\'lda yozsangiz mijozning raqamlash tartibiga moslang — bir xil raqam ikkinchi marta ishlatilsa, maydon ostida ogohlantirish chiqadi.',
    example: '125',
  },
  invoiceDate: {
    title: 'Invoys sanasi',
    text: 'Invoys tuzilgan kun — odatda yuk jo\'natiladigan sana.\nShartnoma sanasidan oldin bo\'lishi mumkin emas. CMR, TIR va bojxona hujjatlaridagi sana bilan bir xil bo\'lsin.',
    example: '19.08.2026',
  },
  contractSelect: {
    title: 'Контракт №',
    text: 'Yuk qaysi shartnoma bo\'yicha ketayotgani. Tanlaganingizda sotuvchi va sotib oluvchi rekvizitlari, valyuta, yetkazish shartlari va spetsifikatsiya narxlari shu shartnomadan avtomatik tortiladi.\nRo\'yxatda kerakli shartnoma bo\'lmasa — avval Mijozlar bo\'limida shartnoma qo\'shiladi.',
  },

  // ── Tomonlar (shartnomadan keladi) ────────────────────────────────────────
  sellerParty: {
    title: 'Продавец / Грузоотправитель',
    text: 'Bu blok tanlangan shartnomadan avtomatik to\'ldiriladi — invoys sahifasida tahrirlab bo\'lmaydi.\nMa\'lumot xato yoki kam bo\'lsa: Mijozlar → mijoz → shartnomani tahrirlang, so\'ng invoysda shartnomani qayta tanlang.',
  },
  buyerParty: {
    title: 'Покупатель / Грузополучатель',
    text: 'Sotib oluvchi ma\'lumotlari shartnomadan olinadi. Yukni qabul qiluvchi sotib oluvchidan boshqa korxona bo\'lsa, u shartnomadagi «Yuk qabul qiluvchi» blokidan chiqadi.\nTuzatish uchun shartnomani tahrirlang — bu yerda o\'zgartirib bo\'lmaydi.',
  },

  // ── Tovarlar jadvali ustunlari ────────────────────────────────────────────
  colIndex: {
    title: '№ (tartib raqami)',
    text: 'Qatorning tartib raqami — avtomatik qo\'yiladi, qo\'lda o\'zgartirilmaydi.',
  },
  colTnved: {
    title: 'Код ТН ВЭД',
    text: 'Mahsulotning 10 xonali bojxona kodi. Mahsulot nomini yozganingizda shartnoma spetsifikatsiyasidan yoki mahsulot bazasidan o\'zi tushadi.\nTushmasa, spetsifikatsiyadagi kodni qo\'lda ko\'chiring — deklaratsiya va boj stavkasi aynan shu kod bo\'yicha aniqlanadi.',
    example: '0808100000',
  },
  colPlu: {
    title: 'Код PLU',
    text: 'Savdo tarmog\'ining ichki mahsulot kodi (Магнит, X5 kabi). Zakaz xatida yoki mijozning topshirig\'ida beriladi.\nTarmoq talab qilmasa, bo\'sh qoldiring.',
  },
  colName: {
    title: 'Наименование товара',
    text: 'Mahsulot nomi rus tilida — shartnoma spetsifikatsiyasidagidek yozing.\nNomni yozganingizda TN VED kodi va narx spetsifikatsiyadan avtomatik tortiladi. Nomni o\'zgartirsangiz, hujjatlar bojxonada bir-biriga mos kelmay qoladi.',
    example: 'Яблоки свежие',
  },
  colPackage: {
    title: 'Вид упаковки',
    text: 'Qadoq turi: ящик, коробка, мешок, сетка va h.k. Ro\'yxatdan tanlang.\nBo\'sh qadoqning og\'irligi (tara) shu turga qarab tekshiriladi — mos kelmasa saqlashdan oldin tasdiqlash oynasi chiqadi.',
  },
  colPackagesCount: {
    title: 'Кол-во упаковки',
    text: 'Nechta qadoq (quti, qop, yashik) borligi. Omborchi bergan yuklash ma\'lumotidan oling.\nBrutto va netto shu songa bo\'linib, bitta qadoqning tarasi hisoblanadi — shuning uchun soni aniq bo\'lsin.',
  },
  colUnit: {
    title: 'Ед. изм.',
    text: 'O\'lchov birligi: кг, шт., кор., упак.\nNarx ustunining nomi shu tanlovga qarab o\'zgaradi (masalan «Цена за коробку»).',
  },
  colQuantity: {
    title: 'Мест',
    text: 'Yuk joylari (мест) soni — CMR va TIR hujjatlaridagi joylar soni bilan bir xil bo\'lishi kerak.\n«Кол-во упаковки» bo\'sh bo\'lsa, tara hisobida shu ustun ishlatiladi.',
  },
  colShtCount: {
    title: 'шт (dona soni)',
    text: 'Mahsulotning dona hisobi. Savdo tarmoqlari dona bo\'yicha hisob so\'raganda to\'ldiriladi, qolgan hollarda bo\'sh qoladi.',
  },
  colGross: {
    title: 'Брутто',
    text: 'Qadog\'i bilan birgalikdagi og\'irlik, kg. Yuklashda tarozidan olingan qiymatni yozing.\nTekshiruv: Нетто + qadoqlar og\'irligi = Брутто.',
  },
  colNet: {
    title: 'Нетто',
    text: 'Mahsulotning sof og\'irligi (qadoqsiz), kg.\nDIQQAT: invoys summasi aynan shu ustundan hisoblanadi — Нетто × Цена. Netto xato bo\'lsa, butun invoys summasi ham xato bo\'ladi.',
  },
  colUnitPrice: {
    title: 'Цена за ед. изм.',
    text: 'Bir birlik uchun narx — mahsulot nomi bo\'yicha shartnoma spetsifikatsiyasidan tortiladi.\nQo\'lda o\'zgartirsangiz, shartnomadagi narxdan farq qilib qolmasin: bojxona invoys va shartnomani solishtiradi.',
  },
  colTotal: {
    title: 'Сумма',
    text: 'Avtomatik hisoblanadi: Нетто × Цена. Qo\'lda yozilmaydi.\nNatija noto\'g\'ri chiqsa, netto og\'irlikni yoki narxni tuzating.',
  },

  // ── Og'irlik nazorati ─────────────────────────────────────────────────────
  weightSummary: {
    title: 'Og\'irlik nazorati',
    text: 'Maks. og\'irlik = 39 950 kg dan avtotransportning bo\'sh og\'irligi ayirilgani, ya\'ni yukka qolgan zaxira.\nFarq musbat bo\'lsa yana shuncha kg yuklash mumkin, manfiy bo\'lsa yuk ortiqcha. Umumiy og\'irlik 40 tonnadan oshsa, yo\'lda jarima yoziladi.',
  },
  tareCheck: {
    title: 'Tara tekshiruvi',
    text: 'Har bir mahsulot uchun: bitta qadoqning brutto -- netto -- tara og\'irligi ko\'rsatiladi.\nTara qadoq turiga mos kelmasa qator qizil bo\'ladi va mos keladigan qadoq turi taklif qilinadi. Qizil chiqsa: qadoq turini yoki og\'irliklarni tekshiring.',
  },

  // ── Izohlar ───────────────────────────────────────────────────────────────
  notes: {
    title: 'Особые примечания',
    text: 'Invoysning pastida chiqadigan qo\'shimcha izoh.\nPoddon yoki avtotransport og\'irligini kiritsangiz, tegishli jumlalar bu yerga avtomatik yoziladi. Qolgan maxsus shartlarni qo\'lda yozish mumkin.',
  },

  // ── Qo'shimcha ma'lumot oynasi ────────────────────────────────────────────
  shipmentPlace: {
    title: 'Место отгрузки груза',
    text: 'Yuk ortilgan joy — shahar va ombor. Odatda sotuvchining ombori joylashgan shahar.',
    example: 'г. Ташкент',
  },
  destination: {
    title: 'Место назначения',
    text: 'Yuk tushiriladigan joy — sotib oluvchining shahri yoki ombori.\nYetkazish shartida ko\'rsatilgan joy bilan mos bo\'lsin (masalan, DAP Москва bo\'lsa — Москва).',
    example: 'г. Москва',
  },
  origin: {
    title: 'Происхождение товара',
    text: 'Mahsulot yetishtirilgan yoki ishlab chiqarilgan davlat. O\'zbekistondan eksportda odatda «Республика Узбекистан».\nST-1 sertifikati va bojxona imtiyozlari aynan shu ma\'lumotga tayanadi.',
    example: 'Республика Узбекистан',
  },
  manufacturer: {
    title: 'Производитель',
    text: 'Mahsulotni yetishtirgan fermer xo\'jaligi yoki ishlab chiqargan korxona nomi.\nSotuvchidan boshqa bo\'lishi mumkin — mijozdan aniqlab oling.',
  },
  orderNumber: {
    title: 'Номер заказа',
    text: 'Sotib oluvchi bergan zakaz raqami. Savdo tarmoqlarining zakaz xatida ko\'rsatiladi.\nZakaz raqami so\'ralmasa, bo\'sh qoldiring.',
  },
  gln: {
    title: 'GLN (GS1)',
    text: 'GS1 tizimi bergan 13 xonali kod. Shartnomada bo\'lsa avtomatik tushadi.\nBo\'lmasa mijozdan so\'rang — o\'zingiz to\'qib yozmang, xato kod hujjatni rad ettiradi.',
    example: '4601234567890',
  },
  temperature: {
    title: 'Температура',
    text: 'Yuk tashiladigan harorat rejimi. Muzlatkichli (рефрижератор) transportda majburiy.\nMijozning talabidan yoki mahsulot turiga qarab yoziladi.',
    example: '+2 °C',
  },
  harvestYear: {
    title: 'Урожай',
    text: 'Hosil yili. Meva-sabzavot eksportida so\'raladi — odatda joriy yil.',
    example: '2026',
  },
  deliveryTerms: {
    title: 'Условия поставки',
    text: 'Incoterms sharti va joy nomi (DAP, FCA, CIP...). Shartnomada kiritilgan variantlar tugma bo\'lib chiqadi — shulardan tanlang.\nTugmadan tanlasangiz «Место там. очистки» ham shartnomadagi juftiga qarab o\'zi to\'ladi. Bu maydon bo\'sh bo\'lsa invoys saqlanmaydi.',
    example: 'DAP - г. Москва',
  },
  customsAddress: {
    title: 'Место там. очистки',
    text: 'Yuk bojxonada rasmiylashtiriladigan joy.\nYetkazish shartini tugmadan tanlaganingizda shartnomadagi mos manzil avtomatik qo\'yiladi; kerak bo\'lsa qo\'lda tuzatish mumkin.',
  },
  vehicleNumber: {
    title: 'Номер автотранспорта',
    text: 'Yuk mashinasi va pritsepning davlat raqamlari. Haydovchining hujjatidan yoki tashish buyurtmasidan oling.\nCMR va TIR dagi raqam bilan aynan bir xil bo\'lishi shart. Bu maydon bo\'sh bo\'lsa invoys saqlanmaydi.',
    example: '01 A 123 BC / 01 1234 AB',
  },
  vehicleWeight: {
    title: 'Bo\'sh avtotransport og\'irligi',
    text: 'Yuksiz mashinaning og\'irligi (kg) — texnik pasportda yoki tarozida aniqlanadi.\nKiritsangiz izohlarga «Вес пустого автотранспорта...» jumlasi avtomatik qo\'shiladi va maksimal yuk hisobida shu qiymat ishlatiladi.',
    example: '16400',
  },
  loaderWeight: {
    title: 'Yuk tortuvchi (tyagach)',
    text: 'Tortuvchi mashinaning og\'irligi, kg.\nYuqoridagi «Примечание» bo\'sh bo\'lsa, avto og\'irlik = tortuvchi + pritsep sifatida hisoblanadi.',
  },
  trailerWeight: {
    title: 'Pritsep',
    text: 'Pritsepning bo\'sh og\'irligi, kg. Tortuvchi bilan birga umumiy avto og\'irligini beradi.',
  },
  palletWeight: {
    title: 'Poddon',
    text: 'Poddonlarning umumiy og\'irligi, kg.\nKiritsangiz izohlarga «Товары уложены на деревянных паллетах...» jumlasi avtomatik qo\'shiladi — ya\'ni poddon tovar hisoblanmaydi.',
  },
  tirNumber: {
    title: 'TIR №',
    text: 'TIR daftarchasi (carnet) raqami — xalqaro tranzit uchun. Tashuvchi yoki ekspeditor beradi.',
  },
  smrNumber: {
    title: 'SMR (CMR) №',
    text: 'Xalqaro yuk xati (CMR) raqami. Tashuvchi beradi, blankaning yuqori qismida turadi.\nInvoysdagi raqam CMR dagi bilan bir xil bo\'lsin.',
  },
} as const satisfies Record<string, FieldHintContent>;

export type InvoiceFieldHintKey = keyof typeof invoiceFieldHints;
