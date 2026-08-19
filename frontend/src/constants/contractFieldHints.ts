import type { FieldHintContent } from '../components/common/FieldHint';

/**
 * Shartnoma formasidagi har bir maydon uchun yordam matni.
 *
 * Matnlar yangi kelgan xodimga tushuntirayotgandek yozilgan: maydonga nima
 * yoziladi, uni shartnomaning qaysi joyidan olish kerak va misol.
 * Kalitlar — `contractForm` dagi maydon nomlari.
 */
export const contractFieldHints = {
  // ── Shartnoma ma'lumotlari ────────────────────────────────────────────────
  contractNumber: {
    title: 'Shartnoma raqami',
    text: 'Shartnomaning birinchi sahifasidagi sarlavhada turadi: «Контракт № ...» yoki «Договор № ...».\nRaqamni hujjatda qanday yozilgan bo\'lsa, xuddi shunday ko\'chiring — harflari, chiziqcha va kasr belgilari bilan. O\'zingizdan raqam o\'ylab topmang.',
    example: '12/2026-EX yoki KZ-004',
  },
  contractDate: {
    title: 'Shartnoma sanasi',
    text: 'Shartnoma raqamining yonida turgan sana: «от 12.03.2026». Bu shartnoma imzolangan kun.\nDiqqat: bu invoys sanasi yoki yuk jo\'natilgan sana emas. Invoys sanasi shartnoma sanasidan oldin bo\'lishi mumkin emas.',
    example: '12.03.2026',
  },
  contractCurrency: {
    title: 'Shartnoma valyutasi',
    text: 'Shartnomada narxlar qaysi pulda yozilgan bo\'lsa, o\'shani tanlang. Odatda «Цена и общая сумма контракта» bandida ko\'rsatiladi.\nShu valyutada invoys tuziladi va bojxona hujjatlari to\'ldiriladi — so\'mda emas, chet el valyutasida.',
    example: 'USD (доллар США)',
  },
  emails: {
    title: 'Email manzillar',
    text: 'Mijoz bilan yozishmalar va hujjat yuborish uchun elektron pochta.\nShartnoma oxiridagi «Реквизиты сторон» bo\'limidan yoki mijoz bergan aloqa ma\'lumotlaridan oling. Bir nechta bo\'lsa vergul bilan ajratib yozing.',
    example: 'info@company.uz, buyer@magnit.ru',
  },

  // ── Sotuvchi (Продавец / Поставщик) ───────────────────────────────────────
  sellerName: {
    title: 'Sotuvchi — korxona nomi',
    text: 'Shartnomada «Продавец» yoki «Поставщик» deb ko\'rsatilgan tomonning to\'liq nomi. Odatda bu bizning mijozimiz — mahsulotni eksport qilayotgan korxona.\nNomni qisqartirmang: mulkchilik shakli («MChJ», «OOO», «ЧП») bilan, qo\'shtirnog\'igacha hujjatdagidek yozing.',
    example: 'ООО «AGRO EXPORT SAVDO»',
  },
  sellerInn: {
    title: 'Sotuvchining INN raqami',
    text: 'Shartnoma oxiridagi rekvizitlar jadvalidagi «ИНН» qatori.\nO\'zbekiston korxonalarida 9 ta raqam, Rossiya korxonalarida 10 yoki 12 ta raqam bo\'ladi. Faqat raqamlarni yozing, bo\'sh joysiz.',
    example: '305123456',
  },
  sellerLegalAddress: {
    title: 'Sotuvchining yuridik manzili',
    text: 'Rekvizitlardagi «Юридический адрес» qatori — davlat, viloyat/shahar, ko\'cha va uy raqami bilan to\'liq.\nOmbor yoki haqiqiy joylashuv manzilini emas, aynan hujjatdagi yuridik manzilni yozing.',
    example: 'Узбекистан, г. Ташкент, Яшнабадский р-н, ул. Паркентская, 15',
  },
  sellerDetails: {
    title: 'Sotuvchining qolgan rekvizitlari',
    text: 'Shartnoma oxiridagi «Реквизиты сторон» jadvalidan bank ma\'lumotlarini ko\'chiring: bank nomi, hisob raqam (р/с), MFO yoki BIK, SWIFT, korrespondent hisob, telefon.\nBular invoys va to\'lov hujjatlariga chiqadi, shuning uchun raqamlarni ikki marta tekshiring.',
    example: 'р/с 20208000123456789001, АКБ «Асака», МФО 00445, SWIFT: ASBKUZ22',
  },
  gln: {
    title: 'GLN kod (GS1)',
    text: 'GS1 tizimi bergan 13 xonali global identifikatsiya raqami. Ko\'pincha Rossiyaning yirik savdo tarmoqlariga (Магнит, X5) yuk ketganda talab qilinadi.\nShartnomada yoki mijozning zakaz xatida beriladi. Berilmagan bo\'lsa, bo\'sh qoldiring — o\'zingiz to\'qib yozmang.',
    example: '4601234567890',
  },
  supplierDirector: {
    title: 'Direktor F.I.O.',
    text: 'Shartnomani sotuvchi tomonidan imzolagan rahbar. Shartnoma boshidagi «в лице директора ...» jumlasida yoki oxirida imzo yonida turadi.\nHujjatda qanday yozilgan bo\'lsa (odatda rus tilida), shundayligicha ko\'chiring — bu ism invoys va boshqa hujjatlarning imzo qatoriga chiqadi.',
    example: 'Каримов А. А.',
  },
  sellerSignatureUrl: {
    title: 'Sotuvchi direktorining imzosi',
    text: 'Direktor imzosining rasmi (skan yoki PNG). Oq fonda, faqat imzo qismi kesib olingan bo\'lsin — atrofida ortiqcha matn qolmasin.\nBu rasm avtomatik ravishda invoys va boshqa hujjatlarning imzo joyiga qo\'yiladi.',
  },
  sellerSealUrl: {
    title: 'Sotuvchining muhri',
    text: 'Korxona muhrining rasmi (skan yoki PNG), oq fonda va aniq ko\'rinadigan bo\'lsin.\nHujjatlar tayyorlanganda shu rasm muhr o\'rniga qo\'yiladi.',
  },

  // ── Sotib oluvchi (Покупатель) ────────────────────────────────────────────
  buyerName: {
    title: 'Sotib oluvchi — korxona nomi',
    text: 'Shartnomada «Покупатель» deb ko\'rsatilgan tomonning to\'liq nomi — mahsulotni sotib olayotgan chet ellik korxona.\nNomni hujjatdagidek, mulkchilik shakli bilan yozing.',
    example: 'ООО «ТД МАГНИТ»',
  },
  destinationCountry: {
    title: 'Sotib oluvchining davlati',
    text: 'Yuk yakunda boradigan davlat, ya\'ni sotib oluvchi joylashgan mamlakat. Ro\'yxatdan tanlang, qo\'lda yozmang.\nBu ma\'lumot hujjatlarda «Страна назначения» sifatida ishlatiladi, shuning uchun xato bo\'lmasin.',
    example: 'Россия',
  },
  buyerAddress: {
    title: 'Sotib oluvchining yuridik manzili',
    text: 'Rekvizitlardagi «Юридический адрес» — davlat, shahar, ko\'cha, uy raqami bilan to\'liq.\nYuk yetkaziladigan ombor manzili bilan aralashtirmang; ombor manzili «Адрес растаможки» yoki yetkazish shartlarida yoziladi.',
    example: 'Россия, г. Краснодар, ул. Солнечная, 15/5',
  },
  buyerDetails: {
    title: 'Sotib oluvchining qolgan rekvizitlari',
    text: 'Shartnoma oxiridagi rekvizitlar jadvalidan sotib oluvchining INN/KPP, bank nomi, hisob raqami, BIK va telefonini ko\'chiring.',
    example: 'ИНН 2309085638, КПП 230901001, р/с 40702810...',
  },
  buyerDirector: {
    title: 'Sotib oluvchining direktori',
    text: 'Shartnomani sotib oluvchi tomonidan imzolagan rahbarning F.I.O. — «в лице генерального директора ...» jumlasidan yoki imzo qatoridan oling.',
    example: 'Иванов И. И.',
  },
  buyerSignatureUrl: {
    title: 'Sotib oluvchining imzosi',
    text: 'Sotib oluvchi direktori imzosining rasmi — agar mijoz bergan bo\'lsa. Oq fonda, kesib olingan bo\'lsin.\nBo\'lmasa bo\'sh qoldiring: hujjatda imzo joyi bo\'sh qoladi va qo\'lda imzolanadi.',
  },
  buyerSealUrl: {
    title: 'Sotib oluvchining muhri',
    text: 'Sotib oluvchi korxona muhrining rasmi — agar berilgan bo\'lsa. Bo\'lmasa bo\'sh qoldiring.',
  },

  // ── Yuk jo'natuvchi (Грузоотправитель) ────────────────────────────────────
  shipperName: {
    title: 'Yuk jo\'natuvchi — korxona nomi',
    text: 'Mahsulotni omboridan haqiqatda jo\'natayotgan korxona («Грузоотправитель»). Ko\'p hollarda u sotuvchining o\'zi bo\'ladi — o\'shanda sotuvchi nomini takrorlab yozing.\nAgar yukni boshqa korxona jo\'natsa (masalan, boshqa viloyatdagi ombor), aynan o\'sha korxonani yozing. Bu nom CMR va invoysga chiqadi.',
    example: 'ООО «AGRO EXPORT SAVDO»',
  },
  shipperInn: {
    title: 'Yuk jo\'natuvchining INN raqami',
    text: 'Yuk jo\'natuvchi korxonaning soliq to\'lovchi raqami — uning rekvizitlarida ko\'rsatiladi. Faqat raqamlarni yozing.',
    example: '305123456',
  },
  shipperAddress: {
    title: 'Yuk jo\'natuvchining manzili',
    text: 'Yuk jo\'natuvchi korxonaning yuridik manzili. Yuk aslida qaysi ombordan chiqayotgan bo\'lsa, hujjatlarda o\'sha korxonaning manzili turishi kerak.',
  },
  shipperDetails: {
    title: 'Yuk jo\'natuvchining qolgan rekvizitlari',
    text: 'INN, bank, hisob raqam, telefon kabi qolgan ma\'lumotlar. Sotuvchi bilan bir xil bo\'lsa, o\'shani takrorlang.',
  },

  // ── Yuk qabul qiluvchi (Грузополучатель) ─────────────────────────────────
  consigneeName: {
    title: 'Yuk qabul qiluvchi — korxona nomi',
    text: 'Yukni borgan joyida qabul qilib oladigan korxona («Грузополучатель»). Odatda sotib oluvchining o\'zi, lekin ba\'zan uchinchi korxona (ombor, distribyutor) bo\'ladi.\nShartnomada yoki mijozning yozma ko\'rsatmasida aniqlanadi. Bu nom CMR va fitosanitariya guvohnomasiga chiqadi.',
    example: 'ООО «ТД МАГНИТ»',
  },
  consigneeAddress: {
    title: 'Yuk qabul qiluvchining manzili',
    text: 'Yuk qabul qiluvchi korxonaning manzili — yuk boradigan shahar va ombor manzili bilan.',
    example: 'Россия, г. Краснодар, ул. Солнечная, 15/5',
  },
  consigneeDetails: {
    title: 'Yuk qabul qiluvchining qolgan rekvizitlari',
    text: 'INN/KPP, bank ma\'lumotlari, telefon. Sotib oluvchi bilan bir xil bo\'lsa, o\'shani takrorlang.',
  },
  consigneeDirector: {
    title: 'Yuk qabul qiluvchining direktori',
    text: 'Yuk qabul qiluvchi korxona rahbarining F.I.O. Hujjatlarda yukni qabul qilish imzosi yoniga chiqadi.',
    example: 'Петров П. П.',
  },
  consigneeSignatureUrl: {
    title: 'Yuk qabul qiluvchining imzosi',
    text: 'Yuk qabul qiluvchi rahbarining imzo rasmi — agar berilgan bo\'lsa. Bo\'lmasa bo\'sh qoldiring.',
  },
  consigneeSealUrl: {
    title: 'Yuk qabul qiluvchining muhri',
    text: 'Yuk qabul qiluvchi korxona muhrining rasmi — agar berilgan bo\'lsa. Bo\'lmasa bo\'sh qoldiring.',
  },

  // ── Qo'shimcha ────────────────────────────────────────────────────────────
  goodsReleasedBy: {
    title: 'Товар отпустил',
    text: 'Mahsulotni omborda berib yuborgan mas\'ul shaxsning F.I.O. Hujjatning pastidagi «Товар отпустил» qatorining yoniga chiqadi.\nKo\'pincha bu direktorning o\'zi yoki omborchi bo\'ladi — mijozdan so\'rab aniqlang.',
    example: 'Каримов А. А.',
  },
  paymentMethod: {
    title: 'To\'lov usuli',
    text: 'Shartnomaning «Условия оплаты» bandidan oling: pul qanday va qachon to\'lanadi.\nMasalan, 100% oldindan to\'lov, yuk yetib borgach 30 kun ichida, yoki akkreditiv orqali.',
    example: '100% предоплата',
  },
  deliveryTerms: {
    title: 'Yetkazib berish sharti (Условия поставки)',
    text: 'Shartnomaning «Условия поставки» bandidagi Incoterms sharti va joy nomi. U xarajat va javobgarlik sotuvchidan sotib oluvchiga qayerda o\'tishini bildiradi.\nQisqartmani (DAP, FCA, CIP, CPT, EXW) shahar nomi bilan birga yozing.',
    example: 'DAP - г. Москва',
  },
  customsAddress: {
    title: 'Rastamojka manzili (Адрес растаможки)',
    text: 'Yuk bojxonada rasmiylashtiriladigan joy — shahar va bojxona posti manzili.\nHar bir yetkazib berish sharti uchun o\'ziga mos manzil yoziladi: chap ustundagi shart bilan o\'ng ustundagi manzil juft bo\'lib turadi.',
    example: 'г. Москва, Каширское шоссе, 19к2',
  },
  companyLogoUrl: {
    title: 'Kompaniya logotipi',
    text: 'Mijoz kompaniyasining logotipi (PNG yoki JPG, oq yoki shaffof fonda).\nInvoys va boshqa blankalarning yuqori qismiga chiqadi. Mijozdan sifatli fayl so\'rang — internetdan olingan past sifatli rasm chop etilganda xunuk chiqadi.',
  },
  files: {
    title: 'Shartnoma fayllari',
    text: 'Imzolangan shartnomaning skani (PDF yoki rasm) va unga tegishli hujjatlar: qo\'shimcha kelishuvlar (доп. соглашение), spetsifikatsiyalar, ilovalar.\nHar bir faylni tushunarli nom bilan yuklang — keyinchalik boshqa xodim ham topa olsin.',
  },

  // ── Spetsifikatsiya jadvali ───────────────────────────────────────────────
  specNumber: {
    title: 'Спецификация №',
    text: 'Mahsulot qaysi spetsifikatsiya (shartnomaga ilova) bo\'yicha ketayotganini bildiradi — o\'sha ilovaning raqami.\nShartnomada bitta spetsifikatsiya bo\'lsa, barcha qatorlarga bir xil raqam yoziladi.',
    example: '1',
  },
  productNumber: {
    title: 'Товар №',
    text: 'Mahsulotning spetsifikatsiya ichidagi tartib raqami: jadvaldagi qatorlar tartibida 1, 2, 3 deb boradi.\nBu raqam invoys va bojxona deklaratsiyasida tovarlarni solishtirishga yordam beradi.',
    example: '1',
  },
  tnvedCode: {
    title: 'TN VED kodi',
    text: 'Mahsulotning bojxona tovar nomenklaturasi bo\'yicha 10 xonali kodi — shartnoma spetsifikatsiyasida ko\'rsatiladi.\nKod noto\'g\'ri bo\'lsa boj ham noto\'g\'ri hisoblanadi, shuning uchun hujjatdagi kod bilan aynan bir xil bo\'lsin.',
    example: '0808100000',
  },
  productName: {
    title: 'Mahsulot nomi',
    text: 'Mahsulotning spetsifikatsiyadagi nomi — odatda rus tilida yoziladi.\nHujjatdagi nomni o\'zgartirmang: shartnomada «Яблоки свежие» deb yozilgan bo\'lsa, invoysda ham shunday bo\'lishi kerak, aks holda bojxonada nomuvofiqlik chiqadi.',
    example: 'Яблоки свежие',
  },
  botanicalName: {
    title: 'Botanik nomi',
    text: 'O\'simlik mahsulotining lotincha (ilmiy) nomi. Fitosanitariya guvohnomasi va karantin hujjatlari uchun kerak bo\'ladi.\nMahsulot o\'simlikdan bo\'lmasa (masalan, sanoat tovari), bo\'sh qoldiring.',
    example: 'Malus domestica',
  },
  unitPrice: {
    title: 'Narx (ЦЕНА)',
    text: 'Mahsulotning bir birligi (1 kg yoki 1 dona) uchun narxi — shartnoma valyutasida.\nSpetsifikatsiyadagi «Цена за единицу» ustunidan oling; umumiy summani emas, aynan birlik narxini yozing.',
    example: '0.65',
  },

  // ── Imzo va muhr (mijoz sahifasidagi forma) ──────────────────────────────
  signatureUrl: {
    title: 'Imzo (PNG/JPG)',
    text: 'Shartnomani imzolagan rahbarning imzo rasmi. Oq fonda, faqat imzo qismi kesib olingan bo\'lsin.\nHujjatlar tayyorlanganda avtomatik ravishda imzo joyiga qo\'yiladi.',
  },
  sealUrl: {
    title: 'Muhr (PNG/JPG)',
    text: 'Korxona muhrining rasmi (skan). Oq fonda va aniq ko\'rinadigan bo\'lsin — hujjatlarda muhr o\'rniga chiqadi.',
  },
} as const satisfies Record<string, FieldHintContent>;

export type ContractFieldHintKey = keyof typeof contractFieldHints;
