// Har bir amal faqat o'z saytida ishlaydi. Kengaytma uchta saytga ulangani
// uchun bu tekshiruvsiz, masalan, "Fito Zayavka" karantin.uz da bosilsa
// fillForm() o'nlab "maydon topilmadi" ogohlantirishini yozib chiqadi.
const ACTION_HOSTS = {
    fill_form: { host: "singlewindow.uz", label: "Fito Zayavka" },
    check_products: { host: "singlewindow.uz", label: "Ma'lumotlarni tekshirish" },
    fill_st1_form: { host: "app.expertiza.uz", label: "ST-1 Zayavka" },
    fill_karantin_fss: { host: "cabinet.karantin.uz", label: "Ichki FSS" },
    fill_cargo_byud: { host: "cargo.customs.uz", label: "BYUD (1-qadam)" },
};

function wrongSiteMessage(action) {
    const rule = ACTION_HOSTS[action];
    if (!rule || location.hostname.includes(rule.host)) return null;
    return `"${rule.label}" faqat ${rule.host} saytida ishlaydi.`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const wrongSite = wrongSiteMessage(request.action);
    if (wrongSite) {
        sendResponse({ success: false, errorMsg: wrongSite });
        return true;
    }

    if (request.action === "fill_form") {
        const data = request.data;
        if (data) {
            fillForm(data);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    } else if (request.action === "fill_st1_form") {
        const data = request.data;
        if (!data) {
            sendResponse({ success: false, errorMsg: "Ma'lumotlar kelmadi!" });
            return true;
        }
        // ST-1 faqat app.expertiza.uz da to'ldiriladi. Eski
        // application.expertiza.uz ishlatilmaydi va qo'llab-quvvatlanmaydi.
        fillAppExpertizaSt1(data)
            .then((warnings) => sendResponse({ success: true, warnings }))
            .catch((err) => sendResponse({ success: false, errorMsg: String(err && err.message || err) }));
    } else if (request.action === "fill_karantin_fss") {
        const data = request.data;
        if (!data) {
            sendResponse({ success: false, errorMsg: "Ma'lumotlar kelmadi!" });
            return true;
        }
        fillKarantinIchkiFss(data)
            .then((warnings) => sendResponse({ success: true, warnings }))
            .catch((err) => sendResponse({ success: false, errorMsg: String(err && err.message || err) }));
    } else if (request.action === "fill_cargo_byud") {
        const data = request.data;
        if (!data) {
            sendResponse({ success: false, errorMsg: "Ma'lumotlar kelmadi!" });
            return true;
        }
        fillCargoByud(data)
            .then((warnings) => sendResponse({ success: true, warnings }))
            .catch((err) => sendResponse({ success: false, errorMsg: String(err && err.message || err) }));
    } else if (request.action === "check_products") {
        const data = request.data;
        console.log("Kengaytma qabul qilgan data:", data);
        if (data) {
            const result = checkData(data);
            sendResponse(result);
        } else {
            sendResponse({ success: false, errorMsg: "Ma'lumotlar kelmadi!" });
        }
    }
    return true; // add return true for async if needed in future
});

function fillForm(data) {
    // 1. Birinchi navbatda avtoToldr chekvoksini bosish
    const avtoToldrCheckbox = document.querySelector('#avtoToldr');
    if (avtoToldrCheckbox) {
        forceCheck(avtoToldrCheckbox);
    } else {
        console.warn(`[AutoFill] Element topilmadi: avtoToldr chekvoksi`);
    }

    // 2. Sayt o'zgarishlarni yuklashga ulgurishi uchun biroz (500 ms) kutib, qolgan maydonlarni to'ldiramiz
    setTimeout(() => {
        const fieldsMap = {
            // Sotuvchi (Eksportyor)
            "EXPPN_NM": data.EXPPN_NM,
            "EXPPN_TXPR_UNIQ_NO": data.EXPPN_TXPR_UNIQ_NO,
            "EXPPN_RPPN_NM": data.EXPPN_RPPN_NM,
            "EXPPN_ADDR": data.EXPPN_ADDR,
            "EXPPN_TELNO": "+998911187007",
            
            // Sotib oluvchi (Importyor)
            "IMPPN_NM": data.IMPPN_NM,
            "IMPPN_ADDR": data.IMPPN_ADDR,
            
            // Shartnoma ma'lumotlari
            "EXP_CTDC_NO": data.EXP_CTDC_NO,
            "EXP_CVNT_DT": data.EXP_CVNT_DT,

            // Maxsus yozuvlar
            "EXP_L_CERT_NO": "Нет",
            "EXP_L_CERT_DT": getTodayDate()
        };

        for (const [name, value] of Object.entries(fieldsMap)) {
            if (value !== undefined) {
                setInputValueByName(name, value);
            }
        }

        // 3. Maxsus mantiqiy shart: Radio yoki Checkbox ni avtomatik bosish ('Маркировка' uchun)
        const targetRadio = document.querySelector('#IDFY_LBL_INDC_YNY');

        if (targetRadio) {
            forceCheck(targetRadio);
        } else {
            console.warn(`[AutoFill] Element topilmadi: #IDFY_LBL_INDC_YNY`);
        }
    }, 500);
}

// ---------------------------------------------------------------------------
// app.expertiza.uz (ST-1, 2-qadam)
// ---------------------------------------------------------------------------

// Har safar bir xil bo'lgani uchun doimiy qilib qo'yilgan tanlovlar.
// Ro'yxatdagi variant sayt tiliga qarab boshqacha chiziladi (o'zbek rejimida
// name_uz, rus rejimida name_ru), shuning uchun qabul qilinadigan yozuvlarning
// hammasi sanab o'tiladi — birinchisi xato xabarida ko'rsatiladi.
const APP_EXPERTIZA_PURPOSE = [
    "Ekspertiza akti asosida kelib chiqish sertifikatini olish",
    "Получение сертификата происхождения на основании акт экспертизы",
    "origin-cert-based-on-act" // saytdagi o'zgarmas `slug`
];
const APP_EXPERTIZA_DELIVERY_TYPE = [
    "Avtoyo'l transporti",
    "Автодорожный транспорт"
];

// Qishloq xo'jaligi mahsulotlari aholidan sotib olinadi — ishlab chiqaruvchi
// har doim shu ikki qiymat bilan yoziladi
const APP_EXPERTIZA_MANUFACTURER_NAME = "Население Республики Узбекистан";
const APP_EXPERTIZA_MANUFACTURER_ADDRESS = "Республика Узбекистан";

// Quyidagi qiymatlar saytdagi yozuvning `name_uz` maydoniga mos keladi (u ham
// ruscha, faqat qisqa shaklda: `name_uz` = "Россия", `name_ru` =
// "Российской Федерации"). Solishtirish barcha til maydonlari bo'yicha
// ketgani uchun sayt qaysi tilda ochilganidan qat'i nazar ishlaydi.
// Shartnomadagi `destinationCountry` erkin matn maydoni (Clients.tsx da
// datalist, tanlash majburiy emas) — shu bois lotincha yozuvlar ham
// uchraydi. Bu yerda sanalmagan nomlar to'g'ridan-to'g'ri
// yoki "shu bilan boshlanadi" qoidasi bilan topiladi:
//   МОЛДОВА → "Молдова, Республика", ИРАН → "Иран (Исламская Республика)"
const APP_EXPERTIZA_COUNTRY_ALIASES = {
    // Saytda butunlay boshqacha atalganlari
    "кыргызстан": "Кыргызия",
    "оаэ": "Объединенные Арабские Эмираты",
    // Diqqat: ro'yxatda "Корея, Народно-Демократическая Республика"
    // (Shimoliy Koreya) ham bor, shuning uchun aniq ko'rsatilgan
    "южная корея": "Корея, Республика",

    // Lotincha yozilgan holatlar
    "russia": "Россия",
    "rossiya": "Россия",
    "kazakhstan": "Казахстан",
    "belarus": "Беларусь",
    "kyrgyzstan": "Кыргызия",
    "tajikistan": "Таджикистан",
    "turkmenistan": "Туркменистан",
    "armenia": "Армения",
    "azerbaijan": "Азербайджан",
    "georgia": "Грузия",
    "moldova": "Молдова, Республика",
    "ukraine": "Украина",
    "china": "Китай",
    "xitoy": "Китай",
    "turkey": "Турция",
    "turkiya": "Турция",
    "iran": "Иран (Исламская Республика)",
    "afghanistan": "Афганистан",
    "india": "Индия",
    "pakistan": "Пакистан",
    "mongolia": "Монголия",
    "uae": "Объединенные Арабские Эмираты",
    "south korea": "Корея, Республика",
    "germany": "Германия",
    "poland": "Польша",
    "lithuania": "Литва",
    "latvia": "Латвия",
    "estonia": "Эстония"
};

async function fillAppExpertizaSt1(data) {
    const warnings = [];

    // Ochiq qolgan sana paneli yoki ro'yxat keyingi bosishni yutib yuboradi
    await closeOpenOverlays();

    // 1. Oddiy matn maydonlari.
    // Sotuvchi≠yuk yuboruvchi va sotib oluvchi≠yuk qabul qiluvchi qoidalari
    // (п/п qo'shilishi) payload tayyorlanayotganda hisoblanadi —
    // useInvoiceExtension.ts dagi ST1_GRZ_ADDR va IMPPN_ADDR_ST1 maydonlari
    // eski to'ldirgich ishlatadigan qiymatlarning aynan o'zi.
    const textFields = {
        "manufacturer_name": APP_EXPERTIZA_MANUFACTURER_NAME,
        "manufacturer_address": APP_EXPERTIZA_MANUFACTURER_ADDRESS,
        "consignor_name": data.EXPPN_NM,
        "consignor_address": data.ST1_GRZ_ADDR || data.EXPPN_ADDR,
        "consignee_name": data.IMPPN_NM,
        "consignee_address": data.IMPPN_ADDR_ST1 || data.IMPPN_ADDR
    };

    for (const [name, value] of Object.entries(textFields)) {
        if (value === undefined || value === null || value === '') continue;
        if (!setReactInputValue(name, toSingleLine(value))) {
            warnings.push(`Maydon topilmadi: ${name}`);
        }
    }

    // 2. Dropdownlar (react-select) — ketma-ket, chunki biri yopilmasa
    //    keyingisining menyusi ochilmaydi
    const selects = [
        ["point_id", APP_EXPERTIZA_PURPOSE, "Ariza maqsadi"],
        ["consignee_country_id", resolveCountryName(data.DESTINATION_COUNTRY), "Yuk qabul qiluvchi davlat"],
        ["delivery_type_id", APP_EXPERTIZA_DELIVERY_TYPE, "Yuk tashish turi"]
    ];

    for (const [name, wanted, label] of selects) {
        if (!wanted) {
            warnings.push(`${label}: qiymat yo'q`);
            continue;
        }
        const err = await selectReactSelectOption(name, wanted);
        if (err) warnings.push(`${label}: ${err}`);
    }

    // 3. Yuklash sanasi — antd DatePicker, formati DD.MM.YYYY.
    //    Eng oxirida to'ldiriladi: ochilgan sana paneli keyingi dropdownning
    //    birinchi bosilishini yutib yuboradi.
    if (!(await setDatePickerValue("shipment_date", getTodayDotted()))) {
        warnings.push("Yuklash sanasi to'ldirilmadi");
    }

    return warnings;
}

// React (bu saytdagi kabi) o'zgarishni `_valueTracker` orqali aniqlaydi: hodisa
// yuborilganda tracker DOM qiymatidan FARQ qilishi kerak. Eski
// setInputValueByName() esa trackerga yangi qiymatni yozib qo'yadi — natijada
// React hech narsa o'zgarmagan deb hisoblaydi va qiymat birinchi qayta
// chizishda yo'qoladi.
function setReactInputValue(name, value) {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el) {
        console.warn(`[AutoFill] Maydon (input) topilmadi: ${name}`);
        return false;
    }

    const previous = el.value;
    if (previous === value) return true;

    const prototype = el.tagName.toLowerCase() === 'textarea'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

    if (nativeSetter) {
        nativeSetter.call(el, value);
    } else {
        el.value = value;
    }

    if (el._valueTracker) {
        el._valueTracker.setValue(previous);
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
}

// Sana paneli yoki ro'yxat ochiq qolgan bo'lsa yopadi
async function closeOpenOverlays() {
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        document.activeElement.blur();
        await delay(200);
    }
}

// react-select'ni qiymat o'rnatish orqali to'ldirib bo'lmaydi — yashirin input
// React state'dan boshqariladi. Shuning uchun menyu ochilib, kerakli variant
// bosiladi. Xato bo'lsa matn qaytadi, muvaffaqiyatda null.
async function selectReactSelectOption(name, wanted) {
    const hidden = document.querySelector(`[name="${name}"]`);
    if (!hidden) return "maydon topilmadi";

    // `react-select-20-input` kabi ID'lar render'da o'zgaradi, shuning uchun
    // yashirin inputdan konteynerga chiqiladi
    const container = hidden.closest('[class*="-container"]');
    const input = container && container.querySelector('input[id^="react-select"]');
    if (!input) return "ro'yxat elementi topilmadi";

    // Boshqa element fokusda qolsa, birinchi hodisa menyuni ochish o'rniga
    // avvalgi elementni yopishga ketadi
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
        await delay(150);
    }

    // Sintetik `mousedown` bu react-select qurilishida menyuni ochmaydi
    // (faqat fokus beradi), ArrowDown esa ishonchli ochadi
    input.focus();
    await delay(150);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));

    // Variantlarni FAQAT shu ro'yxatning o'zidan olamiz: `react-select-5-input`
    // → `react-select-5-option-*`. Aks holda oldingi dropdownning kechikib
    // yopilgan menyusi o'qilib qoladi.
    const optionPrefix = `${input.id.replace(/-input$/, '')}-option-`;
    let options = [];
    for (let attempt = 0; attempt < 10 && options.length === 0; attempt++) {
        await delay(150);
        options = [...document.querySelectorAll(`[id^="${optionPrefix}"]`)];
    }
    if (options.length === 0) return "ro'yxat ochilmadi";

    const targets = (Array.isArray(wanted) ? wanted : [wanted])
        .map(normalizeOptionText)
        .filter(Boolean);
    const candidates = options.map(getOptionCandidates);

    // Avval butun ro'yxat bo'ylab aniq moslik qidiriladi, faqat topilmasa
    // prefiks qoidasiga o'tiladi — aks holda "Индия" birinchi uchragan
    // "Индийский океан" ga yopishib qolishi mumkin
    let index = options.findIndex((_, i) => candidates[i].some(c => targets.includes(c)));
    if (index === -1) {
        index = options.findIndex((_, i) => candidates[i].some(c => targets.some(t => c.startsWith(t))));
    }

    if (index === -1) {
        // Menyuni yopib qo'yamiz, aks holda keyingi dropdown ochilmaydi
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        input.blur();
        await delay(150);
        return `"${Array.isArray(wanted) ? wanted[0] : wanted}" ro'yxatda topilmadi`;
    }

    const match = options[index];

    match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    match.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    match.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await delay(250);
    input.blur();
    await delay(100);

    return null;
}

// Variantning ekrandagi matni sayt tiliga bog'liq: o'zbek rejimida `name_uz`,
// rus rejimida `name_ru` chiziladi va bular butunlay boshqacha bo'lishi mumkin
// (davlatlarda `name_uz` = "Россия", `name_ru` = "Российской Федерации").
// Shu bois solishtirish uchun react-select variantining ORQASIDAGI yozuv
// olinadi va uning barcha tildagi nomlari nomzod sifatida qaytariladi.
// React ichki tuzilmasi o'zgarib qolsa, ekrandagi matn zaxira bo'lib qoladi.
function getOptionCandidates(el) {
    const values = [el.innerText];

    const record = getReactOptionRecord(el);
    if (record) {
        for (const [key, value] of Object.entries(record)) {
            if (typeof value !== 'string') continue;
            if (key === 'slug' || /^name_/.test(key)) values.push(value);
        }
    }

    return values.map(normalizeOptionText).filter(Boolean);
}

// react-select variantning ma'lumot obyektini `data` prop'ida saqlaydi —
// DOM tugunidan fiber bo'ylab yuqoriga chiqib topamiz
function getReactOptionRecord(el) {
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return null;

    let fiber = el[fiberKey];
    for (let hops = 0; fiber && hops < 12; hops++) {
        const data = fiber.memoizedProps && fiber.memoizedProps.data;
        if (data && typeof data === 'object') return data;
        fiber = fiber.return;
    }
    return null;
}

// antd DatePicker matnni faqat 'input' + Enter dan keyin qabul qiladi
async function setDatePickerValue(name, value) {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el) return false;

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const previous = el.value;

    el.focus();
    await delay(150);

    if (nativeSetter) {
        nativeSetter.call(el, value);
    } else {
        el.value = value;
    }
    if (el._valueTracker) {
        el._valueTracker.setValue(previous);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(200);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    await delay(200);

    // Escape'siz sana paneli ochiq qoladi va sahifadagi keyingi bosishni yutadi
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    el.blur();
    await delay(200);

    return el.value === value;
}

// Bu saytda manzil maydonlari bir qatorli <input>. Brauzer yangi qatorni
// O'RNIGA HECH NARSA QO'YMASDAN tashlab yuboradi, ya'ni ST1_GRZ_ADDR dagi
// "manzil\nп/п sotuvchi" qiymati "manzilп/п sotuvchi" bo'lib birikib qoladi.
// (Eski saytda bu maydon textarea edi, shuning uchun muammo ko'rinmagan.)
function toSingleLine(value) {
    return String(value).replace(/\s+/g, ' ').trim();
}

// Shartnomadagi davlat nomini saytdagi ro'yxat nomiga o'giradi
function resolveCountryName(value) {
    if (!value) return value;
    return APP_EXPERTIZA_COUNTRY_ALIASES[normalizeOptionText(value)] || value;
}

// Katta-kichik harf, ortiqcha probel, ё/е va apostrof turlari farq qilmasin
function normalizeOptionText(str) {
    return String(str)
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[’'`´]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function getTodayDotted() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${today.getFullYear()}`; // DD.MM.YYYY
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Qattiq (majburiy) bosish funksiyasi (barcha frameworklarni chetlab o'tishga harakat)
function forceCheck(element) {
    if (!element) return;
    
    // Asl form elementi bo'lsa
    if (element.type === 'checkbox' || element.type === 'radio') {
        if (!element.checked) {
            // 1) O'zini majburiy belgilash va React uchun native setter ishlatish
            element.checked = true;
            try {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;
                if (nativeSetter) {
                    nativeSetter.call(element, true);
                }
            } catch(e) {}
            
            // 2) Eventlarni jo'natish
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 3) Asl elementni bosish
            element.click();
            
            // 4) Label yoki Parent orqali bosish (Chunki UI kutubxonalari labelni qoplaydi)
            if (element.labels && element.labels.length > 0) {
                element.labels[0].click();
            } else {
                const parentLabel = element.closest('label');
                if (parentLabel && element !== parentLabel) {
                    parentLabel.click();
                } else {
                    // Span yoki div custom-checkbox bo'lsa
                    const parentE = element.parentElement;
                    if (parentE && parentE !== document.body) {
                        try {
                            const mouseEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
                            parentE.dispatchEvent(mouseEvent);
                        } catch(e) {}
                    }
                }
            }
        }
    } else {
        // Asl input bo'lmasa, uni shunchaki click qilish
        element.click();
        triggerEvents(element);
    }
}

// React yoki Vue o'zgarishni bilishi (state update) uchun yordamchi funksiya
function triggerEvents(element) {
    // Ba'zan DOM ustida setValue chaqirilishi kerak bo'ladi (React 15/16)
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(element.value);
    }
    
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setInputValueByName(name, value) {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) {
        // Element turiga ko'ra native setter'ni olish
        const tagName = el.tagName.toLowerCase();
        let prototype = window.HTMLInputElement.prototype;
        
        if (tagName === 'textarea') {
            prototype = window.HTMLTextAreaElement.prototype;
        } else if (tagName === 'select') {
            prototype = window.HTMLSelectElement.prototype;
        }

        const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        
        if (nativeSetter) {
            nativeSetter.call(el, value);
        } else {
            el.value = value;
        }
        
        triggerEvents(el);
        return true;
    } else {
        console.warn(`[AutoFill] Maydon (input) topilmadi: ${name}`);
        return false;
    }
}

function getTodayDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
}

function checkData(data) {
    let errorsCount = 0;

    // 1. Sotuvchi va Sotib oluvchi maydonlarini tekshirish
    const fieldsMap = {
        "EXPPN_NM": data.EXPPN_NM,
        "EXPPN_TXPR_UNIQ_NO": data.EXPPN_TXPR_UNIQ_NO,
        "EXPPN_RPPN_NM": data.EXPPN_RPPN_NM,
        "EXPPN_ADDR": data.EXPPN_ADDR,
        "EXPPN_TELNO": "+998911187007", // fillForm() da bor bo'lgani uchun
        "IMPPN_NM": data.IMPPN_NM,
        "IMPPN_ADDR": data.IMPPN_ADDR,
        "EXP_CTDC_NO": data.EXP_CTDC_NO,
        "EXP_CVNT_DT": data.EXP_CVNT_DT ? String(data.EXP_CVNT_DT).split('T')[0] : ''
    };

    for (const [name, expectedValue] of Object.entries(fieldsMap)) {
        if (expectedValue === undefined || expectedValue === null) continue;
        
        // Formada yoki ID yoxud NAME orqali topish
        const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
        if (el) {
            el.style.backgroundColor = '';
            el.style.borderColor = '';
            el.style.borderWidth = '';
            el.style.borderStyle = '';

            const actualValue = el.value ? String(el.value).trim() : '';
            // Probel, enter va keraksiz boshqa joylarni o'chirib tekshirish
            const normalizeStr = (str) => String(str).replace(/\s+/g, ' ').trim();

            if (normalizeStr(actualValue) === normalizeStr(expectedValue)) {
                el.style.backgroundColor = '#dcfce7'; 
                el.style.borderColor = '#22c55e';
            } else {
                el.style.backgroundColor = '#fee2e2'; 
                el.style.borderColor = '#ef4444';
                errorsCount++;
            }
            el.style.borderWidth = '2px';
            el.style.borderStyle = 'solid';
        }
    }

    // 2. Mahsulotlarni jadvaldan (#example) tekshirish
    const items = data.items || data.products || data.goods || [];
    const table = document.querySelector('#example tbody');
    if (!table) {
        if (items.length > 0) {
            return { success: false, errorMsg: "Jadval (#example) topilmadi!" };
        }
        return { success: true, errors: errorsCount };
    }

    const rows = table.querySelectorAll('tr');

    const allCells = table.querySelectorAll('td');
    allCells.forEach(td => {
        td.style.backgroundColor = '';
        td.style.borderColor = '';
        td.style.borderWidth = '';
        td.style.borderStyle = '';
    });

    const cleanNumber = (str) => {
        const match = str.replace(/\s+/g, '').match(/^[\d\.]+/);
        return match ? parseFloat(match[0]) : null;
    };

    const checkMatch = (tdElement, sourceValue, isNumber = false) => {
        if (!tdElement) return;
        const cellValue = tdElement.innerText.trim();
        let matches = false;

        if (sourceValue === undefined || sourceValue === null) return;

        if (isNumber) {
            const cellNum = cleanNumber(cellValue);
            const sourceNum = parseFloat(sourceValue);
            matches = (cellNum === sourceNum);
        } else {
            matches = (cellValue == sourceValue); 
        }

        if (!matches) {
            tdElement.style.backgroundColor = '#fee2e2'; 
            tdElement.style.borderColor = '#ef4444';     
            tdElement.style.borderWidth = '2px';
            tdElement.style.borderStyle = 'solid';
            errorsCount++;
        } else {
            tdElement.style.backgroundColor = '#dcfce7'; 
            tdElement.style.borderColor = '#22c55e';
            tdElement.style.borderWidth = '2px';
            tdElement.style.borderStyle = 'solid';
        }
    };

    rows.forEach((row, index) => {
        const item = items[index];
        if (!item) return;

        const tds = row.querySelectorAll('td');
        if (tds.length < 11) return;

        const tdTnved = tds[1];     
        const tdName = tds[2];      
        const tdNet = tds[5];       
        const tdGross = tds[6];     
        const tdQuantity = tds[7];  
        const tdExtraQuantity = tds[8]; 
        const tdVehicleNumber = tds[10];

        checkMatch(tdTnved, item.tnved);
        checkMatch(tdName, item.name);
        checkMatch(tdNet, item.net, true);
        checkMatch(tdGross, item.gross, true);
        
        // Avtomobil raqamini tekshirish (agar bo'lsa)
        if (data.vehicleNumber) {
            checkMatch(tdVehicleNumber, data.vehicleNumber);
        }

        if (tdQuantity) {
            const cellQty = cleanNumber(tdQuantity.innerText);
            if (cellQty === Number(item.quantity) || cellQty === Number(item.packagesCount)) {
                tdQuantity.style.backgroundColor = '#dcfce7'; 
                tdQuantity.style.borderColor = '#22c55e';
            } else {
                tdQuantity.style.backgroundColor = '#fee2e2'; 
                tdQuantity.style.borderColor = '#ef4444';
                errorsCount++;
            }
            tdQuantity.style.borderWidth = '2px';
            tdQuantity.style.borderStyle = 'solid';
        }
        
        if (tdExtraQuantity) {
            const extraQty = cleanNumber(tdExtraQuantity.innerText);
            if (extraQty === Number(item.quantity) || extraQty === Number(item.packagesCount)) {
                tdExtraQuantity.style.backgroundColor = '#dcfce7'; 
                tdExtraQuantity.style.borderColor = '#22c55e';
            } else if (extraQty !== null && !isNaN(extraQty)) {
                tdExtraQuantity.style.backgroundColor = '#fee2e2'; 
                tdExtraQuantity.style.borderColor = '#ef4444';
                errorsCount++;
            }
            tdExtraQuantity.style.borderWidth = '2px';
            tdExtraQuantity.style.borderStyle = 'solid';
        }
    });

    return { success: true, errors: errorsCount };
}

// ---------------------------------------------------------------------------
// cabinet.karantin.uz — "Ichki Fitosanitariya sertifikati" ariza oynasi
// ---------------------------------------------------------------------------
// Sayt React + antd. Bu yerdagi maydonlarning ko'pchiligida `name` yo'q,
// shuning uchun ular ustidagi <label> matni bo'yicha topiladi. antd Select
// ro'yxatlari virtual (rc-virtual-list) — bir vaqtda ~10 ta variant chiziladi,
// shu bois kerakli variant topilmaguncha ro'yxat pastga suriladi.
//
// DIQQAT: bu saytda Escape "Oynani yopish!" tasdig'ini ochadi va tasdiqlansa
// KIRITILGAN HAMMA MA'LUMOT o'chadi. Shuning uchun ochiq dropdownlar Escape
// bilan emas, selektorni qayta bosish orqali yopiladi.

// Invoysda bo'lmagan, har safar bir xil takrorlanadigan tanlovlar.
// Ro'yxatdagi yozuvni sayt lotin/kirill aralash chizadi ("Водий TIF"),
// shuning uchun qabul qilinadigan yozilishlar sanab o'tiladi.
const KARANTIN_DEFAULTS = {
    responsibleName: "Турсунбоев О.У.",
    marketType: "Eksport",
    regionalOffice: ["Farg`ona viloyati", "Farg'ona viloyati", "Fargona viloyati"],
    destinationRegion: ["Farg`ona viloyati", "Farg'ona viloyati", "Fargona viloyati"],
    customsPost: ["Водий TIF", "Водий ТИФ", "Vodiy TIF"],
    packagingType: "Oddiy qadoq",
    productSource: "Yetishtirilgan hudud asosida",
    productLevel: "Tuman darajasida",
    unit: "kg",
};

// Shartnomadagi "yetib boradigan davlat" erkin matn (ruscha yoki lotincha),
// saytdagi ro'yxat esa faqat o'zbekcha lotinda. Bu yerda sanalmagan nomlar
// to'g'ridan-to'g'ri ro'yxat bilan solishtiriladi.
const KARANTIN_COUNTRY_ALIASES = {
    "россия": "Rossiya", "российская федерация": "Rossiya", "russia": "Rossiya",
    "казахстан": "Qozog'iston", "kazakhstan": "Qozog'iston", "qozogiston": "Qozog'iston",
    "кыргызстан": "Qirg'iziston", "киргизия": "Qirg'iziston", "kyrgyzstan": "Qirg'iziston",
    "таджикистан": "Tojikiston", "tajikistan": "Tojikiston",
    "туркменистан": "Turkmaniston", "turkmenistan": "Turkmaniston",
    "беларусь": "Belorussiya", "белоруссия": "Belorussiya", "belarus": "Belorussiya",
    "украина": "Ukraina", "ukraine": "Ukraina",
    "китай": "Xitoy", "china": "Xitoy",
    "турция": "Turkiya", "turkey": "Turkiya",
    "афганистан": "Afg'oniston", "afghanistan": "Afg'oniston",
    "монголия": "Mongoliya", "mongolia": "Mongoliya",
    "грузия": "Gruziya", "georgia": "Gruziya",
    "азербайджан": "Ozarbayjon", "azerbaijan": "Ozarbayjon",
    "армения": "Armaniston", "armenia": "Armaniston",
    "молдова": "Moldova", "молдова, республика": "Moldova",
    "иран": "Eron", "иран (исламская республика)": "Eron", "iran": "Eron",
    "пакистан": "Pokiston", "pakistan": "Pokiston",
    "индия": "Hindiston", "india": "Hindiston",
    "германия": "Germaniya", "germany": "Germaniya",
    "латвия": "Latviya", "latvia": "Latviya",
    "литва": "Litva", "lithuania": "Litva",
    "эстония": "Estoniya", "estonia": "Estoniya",
    "польша": "Polsha", "poland": "Polsha",
    "вьетнам": "Vietnam",
    "южная корея": "Janubiy Korea", "корея, республика": "Janubiy Korea", "south korea": "Janubiy Korea",
    "саудовская аравия": "Saudiya Arabistoni",
    "израиль": "Isroil", "israel": "Isroil",
    "египет": "Misr", "egypt": "Misr",
    "нидерланды": "Niderlandiya", "netherlands": "Niderlandiya",
    "франция": "Fransiya", "france": "Fransiya",
    "италия": "Italiya", "italy": "Italiya",
    "испания": "Ispaniya", "spain": "Ispaniya",
    "швеция": "Shvetsiya", "румыния": "Ruminiya", "сербия": "Serbiya",
    "норвегия": "Norvegiya", "словакия": "Slovakiya",
    "япония": "Yaponiya", "japan": "Yaponiya",
    "сингапур": "Singapur", "малайзия": "Malayziya",
    "бельгия": "Belgiya", "болгария": "Bolgariya", "венгрия": "Vengriya",
    "греция": "Gretsiya", "дания": "Daniya",
    "узбекистан": "O'zbekiston", "uzbekistan": "O'zbekiston",
};

// Ikki tomonda kirill alifbosi bir xil emas: Prodeklarantdagi tuman nomlari
// ruscha harflar bilan ("ОЛТИАРИК ТУМАНИ"), karantin.uz da esa o'zbek kirilida
// ("Олтиариқ тумани"). Solishtirishdan oldin қ/ғ/ў/ҳ ruscha juftiga keltiriladi.
function karantinNorm(str) {
    return String(str == null ? '' : str)
        .toLowerCase()
        .replace(/қ/g, 'к').replace(/ғ/g, 'г').replace(/ў/g, 'у')
        .replace(/ҳ/g, 'х').replace(/ҷ/g, 'ж').replace(/ё/g, 'е')
        .replace(/[’'`´ʻʼ‘]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// Ariza oynasi. Sarlavha o'rniga ichidagi maydon nomi bo'yicha topiladi —
// sayt sarlavhani oddiy div bilan chizadi, `.ant-modal-title` yo'q.
function karantinModal() {
    return [...document.querySelectorAll('.ant-modal')]
        .find(el => el.offsetParent !== null && el.innerText.includes('Ariza beruvchi')) || null;
}

// Maydon konteynerini <label> matni bo'yicha topadi. Label va maydonning o'zi
// bitta `ant-space` ichidagi qo'shni elementlar.
function karantinWrap(labelText, root, exact) {
    const scope = root || karantinModal();
    if (!scope) return null;
    const wanted = karantinNorm(labelText);
    const label = [...scope.querySelectorAll('label')].find(el => {
        const text = karantinNorm(el.innerText.replace(/\*\s*$/, ''));
        return exact ? text === wanted : text.startsWith(wanted);
    });
    if (!label) return null;
    const item = label.closest('.ant-space-item');
    return item ? item.nextElementSibling : null;
}

// React `_valueTracker` ni eski qiymatga qaytarmasak, React hech narsa
// o'zgarmagan deb hisoblaydi va qiymat birinchi qayta chizishda yo'qoladi.
function karantinSetInput(el, value) {
    if (!el) return false;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const previous = el.value;
    if (nativeSetter) nativeSetter.call(el, value); else el.value = value;
    if (el._valueTracker) el._valueTracker.setValue(previous);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}

function karantinSetInputByName(name, value, root) {
    const scope = root || karantinModal();
    const el = scope && scope.querySelector(`[name="${name}"]`);
    return el ? karantinSetInput(el, value) : false;
}

// `container` — ichida bitta antd Select bo'lgan istalgan element
async function karantinOpenSelect(container) {
    const select = container.querySelector('.ant-select');
    const selector = container.querySelector('.ant-select-selector');
    if (!select || !selector) return false;
    for (let attempt = 0; attempt < 4; attempt++) {
        if (select.classList.contains('ant-select-open')) return true;
        selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await delay(300);
    }
    return select.classList.contains('ant-select-open');
}

// Escape bu saytda oynani yopish tasdig'ini chaqiradi, shuning uchun ro'yxat
// faqat selektorni qayta bosish orqali yopiladi
async function karantinCloseSelect(container) {
    const select = container.querySelector('.ant-select');
    if (select && select.classList.contains('ant-select-open')) {
        container.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await delay(200);
    }
}

// Ochiq antd Select ro'yxatidan kerakli variantni topib bosadi.
// Ro'yxat virtual — 250 ta davlatning faqat ~10 tasi chizilgan bo'ladi,
// shuning uchun moslik topilmaguncha ro'yxat suriladi.
async function karantinChooseInOpenSelect(container, wanted, label) {
    const targets = (Array.isArray(wanted) ? wanted : [wanted]).map(karantinNorm).filter(Boolean);
    if (targets.length === 0) return `${label}: qiymat yo'q`;

    const input = container.querySelector('input');
    const list = input && document.getElementById(`${input.id}_list`);
    if (!list) return `${label}: ro'yxat topilmadi`;
    const dropdown = list.closest('.ant-select-dropdown');
    const holder = dropdown.querySelector('.rc-virtual-list-holder');

    const findMatch = () => {
        const items = [...dropdown.querySelectorAll('.ant-select-item-option')];
        let index = items.findIndex(el => targets.includes(karantinNorm(el.innerText)));
        if (index === -1) index = items.findIndex(el => targets.some(t => karantinNorm(el.innerText).startsWith(t)));
        return index === -1 ? null : items[index];
    };

    let match = null;
    for (let step = 0; step < 40; step++) {
        match = findMatch();
        if (match || !holder) break;
        const before = holder.scrollTop;
        holder.scrollTop = before + holder.clientHeight * 0.8;
        holder.dispatchEvent(new Event('scroll', { bubbles: true }));
        await delay(120);
        if (holder.scrollTop <= before) break;
    }

    if (!match) {
        await karantinCloseSelect(container);
        return `${label}: "${Array.isArray(wanted) ? wanted[0] : wanted}" ro'yxatda topilmadi`;
    }

    match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    match.click();
    await delay(300);
    return null;
}

// <label> li maydonlar uchun (formadagi asosiy ro'yxatlar)
async function karantinPickOption(labelText, wanted, options) {
    const opts = options || {};
    const container = karantinWrap(labelText, opts.root, opts.exact);
    if (!container) return `"${labelText}" maydoni topilmadi`;
    if (!container.querySelector('.ant-select')) return `"${labelText}" ro'yxat emas`;
    if (!(await karantinOpenSelect(container))) return `${labelText}: ro'yxat ochilmadi`;
    return karantinChooseInOpenSelect(container, wanted, labelText);
}

// Yozuvi <label> emas, oddiy <span> bo'lgan ro'yxatlar uchun:
// "Mahsulot ma'lumotlari" (.product-header__input-type) va
// "To'ldirish darajasi" (.product-mode-field)
async function karantinPickOptionIn(container, wanted, label) {
    if (!container || !container.querySelector('.ant-select')) return `${label}: ro'yxat topilmadi`;
    if (!(await karantinOpenSelect(container))) return `${label}: ro'yxat ochilmadi`;
    return karantinChooseInOpenSelect(container, wanted, label);
}

// antd DatePicker. Matn ko'rinishi YYYY-MM-DD; matn yozilganda panel o'sha oyga
// o'tadi, so'ng kerakli katak bosiladi — Enter bilan tasdiqlash bu qurilishda
// ishonchsiz (qiymat o'chib ketadi).
async function karantinSetDate(labelText, isoDate, root) {
    const container = karantinWrap(labelText, root);
    if (!container) return `"${labelText}" maydoni topilmadi`;
    const el = container.querySelector('input');
    if (!el) return `"${labelText}" sana maydoni topilmadi`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ''))) return `${labelText}: sana formati noto'g'ri`;

    el.focus();
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.click();
    await delay(350);
    karantinSetInput(el, isoDate);
    await delay(500);

    const panel = document.querySelector('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
    const cell = panel && panel.querySelector(`td[title="${isoDate}"]`);
    if (!cell) return `${labelText}: sana katagi topilmadi`;
    (cell.querySelector('.ant-picker-cell-inner') || cell).click();
    await delay(350);
    return el.value === isoDate ? null : `${labelText}: sana yozilmadi`;
}

// "Mahsulot" maydoni oddiy input emas — bosilganda TIF TN bo'yicha qidiriladigan
// jadvalli oyna ochiladi, mahsulot o'sha jadvaldan tanlanadi.
async function karantinPickProduct(card, tnved, name) {
    const container = karantinWrap('Mahsulot', card, true);
    const trigger = container && container.querySelector('input');
    if (!trigger) return "Mahsulot maydoni topilmadi";

    const query = String(tnved || name || '').trim();
    if (!query) return "Mahsulot: TIF TN ham, nomi ham yo'q";

    // Har bir mahsulot kartasi O'ZINING tanlash oynasini yaratadi va yopilgandan
    // keyin ham uni DOMda qoldiradi — hammasi bir xil "ko'rinadigan" bo'lib
    // turadi. Shu sababli oynani "birinchi topilgani" bo'yicha emas, YANGI
    // qo'shilgani bo'yicha aniqlaymiz.
    const allPickers = () => [...document.querySelectorAll('.ant-modal')].filter(el => el.querySelector('table'));
    const before = new Set(allPickers());

    trigger.click();

    let picker = null;
    for (let attempt = 0; attempt < 15 && !picker; attempt++) {
        await delay(200);
        picker = allPickers().find(el => !before.has(el)) || null;
    }
    // Karta oynasi allaqachon yaratilgan bo'lsa (qayta to'ldirish) — oxirgisi
    if (!picker) picker = allPickers().pop() || null;
    if (!picker) return "Mahsulot tanlash oynasi ochilmadi";

    // Oyna ochiq qolsa formaning qolgan qismini to'sib qo'yadi
    const closePicker = async () => {
        const closeBtn = picker.querySelector('.ant-modal-close');
        if (closeBtn) { closeBtn.click(); await delay(400); }
    };

    const search = picker.querySelector('input');
    if (!search) { await closePicker(); return "Mahsulot qidiruv maydoni topilmadi"; }
    karantinSetInput(search, query);
    await delay(1500);

    const rows = [...picker.querySelectorAll('tbody tr')].filter(row => row.querySelectorAll('td').length >= 3);
    // Jadvalning 2-ustuni — TIF TN. To'liq kod bo'yicha faqat aniq moslik olinadi:
    // aks holda jimgina boshqa mahsulot tanlanib qolishi mumkin. Kod qisqa yoki
    // nom bo'yicha qidirilganda esa birinchi qator olinadi.
    const isFullCode = /^\d{8,}$/.test(query);
    const exact = rows.find(row => row.querySelectorAll('td')[1].innerText.trim() === query);
    const target = exact || (isFullCode ? null : rows[0]);
    if (!target) {
        await closePicker();
        return `Mahsulot: "${query}" ro'yxatdan topilmadi`;
    }

    target.click();
    await delay(600);
    if (trigger.value) return null;
    await closePicker();
    return `Mahsulot: "${query}" tanlanmadi`;
}

function karantinResolveCountry(value) {
    if (!value) return null;
    const alias = KARANTIN_COUNTRY_ALIASES[karantinNorm(value)];
    return alias ? [alias, value] : [value];
}

// Bir xil TIF TN li qatorlar bitta mahsulotga birlashtiriladi (netto qo'shiladi) —
// aks holda arizada bir xil mahsulot bir necha marta takrorlanib qoladi
function karantinGroupItems(items) {
    const grouped = [];
    const byCode = new Map();
    (items || []).forEach(item => {
        const key = String(item.tnved || item.name || '').trim();
        if (!key) return;
        const net = Number(item.net) || 0;
        const existing = byCode.get(key);
        if (existing) {
            existing.net += net;
        } else {
            const row = { tnved: item.tnved, name: item.name, net };
            byCode.set(key, row);
            grouped.push(row);
        }
    });
    return grouped;
}

async function fillKarantinIchkiFss(data) {
    const warnings = [];
    const modal = karantinModal();
    if (!modal) {
        throw new Error("Ariza oynasi ochilmagan. Avval \"Ariza berish\" tugmasini bosing.");
    }

    const push = (err) => { if (err) warnings.push(err); };

    // 1. Ro'yxatlar birinchi to'ldiriladi: variant tanlanganda React formani
    //    qayta chizadi va oldin yozilgan matnli maydonlarni tozalab yuboradi
    push(await karantinPickOption('Hududiy boshqarma', KARANTIN_DEFAULTS.regionalOffice));
    push(await karantinPickOption('Ichki bozorga yoki eksportga', KARANTIN_DEFAULTS.marketType));
    push(await karantinPickOption('Mahsulot yetib boradigan hudud', KARANTIN_DEFAULTS.destinationRegion));
    push(await karantinPickOption('TIF', KARANTIN_DEFAULTS.customsPost));
    push(await karantinPickOption('Qadoq turi', KARANTIN_DEFAULTS.packagingType));

    const country = karantinResolveCountry(data.DESTINATION_COUNTRY);
    if (country) {
        push(await karantinPickOption('Importer davlat nomi', country));
    } else {
        warnings.push("Importer davlat nomi: shartnomada davlat ko'rsatilmagan");
    }

    // 2. Shartnoma sanasi. Ochiq qolgan sana paneli keyingi bosishni yutadi,
    //    shuning uchun mahsulotlardan oldin tugatiladi.
    if (data.EXP_CVNT_DT) {
        push(await karantinSetDate('Importer-eksportyor kontrakt sanasi', String(data.EXP_CVNT_DT).split('T')[0]));
    } else {
        warnings.push("Kontrakt sanasi: qiymat yo'q");
    }

    // 3. Matnli maydonlar
    const textFields = {
        applicant_responsible_name: KARANTIN_DEFAULTS.responsibleName,
        importer_name: toSingleLine(data.IMPPN_NM || ''),
        importer_exporter_contract_number: String(data.EXP_CTDC_NO || '').trim(),
    };
    for (const [name, value] of Object.entries(textFields)) {
        if (!value) { warnings.push(`${name}: qiymat yo'q`); continue; }
        if (!karantinSetInputByName(name, value, modal)) warnings.push(`Maydon topilmadi: ${name}`);
    }

    // 4. Mahsulot(lar)
    const items = karantinGroupItems(data.items);
    if (items.length === 0) {
        warnings.push("Invoysda mahsulot qatori yo'q");
    } else {
        push(await karantinPickOptionIn(
            modal.querySelector('.product-header__input-type'),
            KARANTIN_DEFAULTS.productSource,
            "Mahsulot ma'lumotlari",
        ));

        for (let index = 0; index < items.length; index++) {
            let cards = [...modal.querySelectorAll('.product-card')];
            if (index >= cards.length) {
                const addBtn = [...modal.querySelectorAll('button')]
                    .find(btn => karantinNorm(btn.innerText).includes("mahsulot qo'shish"));
                if (!addBtn) { warnings.push(`#${index + 1} mahsulot: qo'shish tugmasi topilmadi`); break; }
                addBtn.click();
                await delay(700);
                cards = [...modal.querySelectorAll('.product-card')];
            }
            const card = cards[index];
            if (!card) { warnings.push(`#${index + 1} mahsulot kartasi topilmadi`); continue; }

            // Daraja tanlanmaguncha kartaning qolgan maydonlari chizilmaydi
            const levelError = await karantinPickOptionIn(
                card.querySelector('.product-mode-field'),
                KARANTIN_DEFAULTS.productLevel,
                `#${index + 1} to'ldirish darajasi`,
            );
            if (levelError) { warnings.push(levelError); continue; }
            await delay(400);

            if (data.vehicleNumber) {
                if (!karantinSetInputByName(`products.${index}.transport_number`, toSingleLine(data.vehicleNumber), modal)) {
                    warnings.push(`#${index + 1} mahsulot: transport raqami yozilmadi`);
                }
            } else {
                warnings.push(`#${index + 1} mahsulot: transport raqami yo'q`);
            }

            if (data.EXPPN_REGN_TP_NM) {
                push(await karantinPickOption('Mahsulot yetishtirilgan tuman', data.EXPPN_REGN_TP_NM, { root: card }));
            } else {
                warnings.push(`#${index + 1} mahsulot: dasturda tuman tanlanmagan`);
            }

            push(await karantinPickProduct(card, items[index].tnved, items[index].name));

            const net = Number(items[index].net) || 0;
            if (net > 0) {
                if (!karantinSetInputByName(`products.${index}.quantity`, String(net), modal)) {
                    warnings.push(`#${index + 1} mahsulot: miqdori yozilmadi`);
                }
            } else {
                warnings.push(`#${index + 1} mahsulot: netto vazn yo'q`);
            }

            push(await karantinPickOption("O'lchov birligi", KARANTIN_DEFAULTS.unit, { root: card }));
        }
    }

    // 5. Ro'yxat tanlashlari formani qayta chizganda matnli maydonlar tozalanib
    //    ketishi mumkin — oxirida tekshirib, kerak bo'lsa qaytadan yoziladi
    for (const [name, value] of Object.entries(textFields)) {
        if (!value) continue;
        const el = modal.querySelector(`[name="${name}"]`);
        if (el && el.value !== value) karantinSetInput(el, value);
    }

    return warnings;
}

// ---------------------------------------------------------------------------
// cargo.customs.uz (Экспорт (3-қадам), 1-qadam "Умумий маълумотлар")
// ---------------------------------------------------------------------------

// Har safar bir xil bo'lgani uchun doimiy qilib qo'yilgan qiymatlar.
const CARGO_DEFAULTS = {
    paymentMethodCode: '50',       // Тўлов усули: 50 - Экспорт факти бўйича
    borderCustomsPost: '27009',    // Чегара божхона пости: "С. Нажимов" чегара пости
    g54Address: 'Ферганская обл., Алтыарыкский район',
    g54Email: 'docs@prodeklarant.uz',
    customsValueTotal: '4000',     // Ҳаражатлар суммаси
    customsValueCurrency: '840',   // Валюта тури: 840 - АҚШ доллари
};

// 1-qadam paneli. Boshqa qadam yoki boshqa sahifa ochiq bo'lsa topilmaydi.
function cargoStep1() {
    const pane = document.getElementById('AutodeclEk');
    return pane && pane.offsetParent !== null ? pane : null;
}

async function cargoWaitFor(check, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 4000);
    while (Date.now() < deadline) {
        const result = check();
        if (result) return result;
        await delay(150);
    }
    return null;
}

// Sayt bootstrap-select ishlatadi. Content script sahifaning jQuery'siga kira
// olmaydi (izolyatsiyalangan olam), shuning uchun `selectpicker('refresh')`
// o'rniga chizilgan ro'yxatdagi bandning o'ziga click qilinadi.
async function cargoPickOption(selectId, wanted, label) {
    const select = document.getElementById(selectId);
    if (!select) return `${label}: maydon topilmadi`;

    // Avval kod bo'yicha aniq moslik, keyingina matn bo'yicha — aks holda
    // "840" kabi kod boshqa variantning nomi ichidan topilib qolishi mumkin
    const target = normalizeOptionText(wanted);
    const options = [...select.options];
    let index = options.findIndex((opt) => opt.value && normalizeOptionText(opt.value) === target);
    if (index < 0) {
        index = options.findIndex((opt) => {
            if (!opt.value) return false;
            const text = opt.getAttribute('data-content') || opt.text;
            return normalizeOptionText(text).includes(target);
        });
    }
    if (index < 0) return `${label}: "${wanted}" ro'yxatda yo'q`;
    if (select.selectedIndex === index) return null;

    return await cargoClickOption(select, index, label);
}

// Ro'yxatdagi birinchi bo'sh bo'lmagan variantni tanlaydi
async function cargoPickFirstOption(selectId, label) {
    const select = document.getElementById(selectId);
    if (!select) return `${label}: maydon topilmadi`;
    if (select.value) return null;

    const index = [...select.options].findIndex((opt) => opt.value);
    if (index < 0) return `${label}: ro'yxat bo'sh`;

    return await cargoClickOption(select, index, label);
}

async function cargoClickOption(select, index, label) {
    const wrap = select.closest('.bootstrap-select');
    if (!wrap) return `${label}: ro'yxat chizilmagan`;
    const toggle = wrap.querySelector('button.dropdown-toggle');
    if (!toggle) return `${label}: ro'yxat ochilmadi`;

    toggle.click();
    // Ro'yxat `container: 'body'` bilan chizilgan bo'lsa wrap ichida bo'lmaydi
    const menu = await cargoWaitFor(
        () => (wrap.querySelector('.dropdown-menu li a.dropdown-item')
            ? wrap.querySelector('.dropdown-menu')
            : document.querySelector('.dropdown-menu.show')),
        3000,
    );
    if (!menu) return `${label}: ro'yxat ochilmadi`;

    // bootstrap-select bandlarni select.options bilan bir xil tartibda chizadi
    const items = menu.querySelectorAll('li a.dropdown-item');
    let item = items[index];
    if (!item || !cargoSameOption(item, select.options[index])) {
        const option = select.options[index];
        const target = normalizeOptionText(option.getAttribute('data-content') || option.text);
        item = [...items].find((el) => normalizeOptionText(el.innerText) === target);
    }
    if (!item) {
        toggle.click();
        return `${label}: ro'yxatdan band topilmadi`;
    }

    item.click();
    await delay(300);
    if (select.selectedIndex !== index) return `${label}: tanlanmadi`;
    return null;
}

function cargoSameOption(item, option) {
    if (!option) return false;
    const text = option.getAttribute('data-content') || option.text;
    return normalizeOptionText(item.innerText) === normalizeOptionText(text);
}

function cargoWriteValue(el, value) {
    const prototype = el.tagName.toLowerCase() === 'textarea'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(el, value); else el.value = value;
}

// Inputmask ostidagi maydonlar (masalan `TOTAL_VALUE`, class="decimal") butun
// qiymat bir yo'la yozilsa uni buzib tashlaydi: "4000" -> "40". Shuning uchun
// oddiy yozuv natijasi tekshiriladi va mos kelmasa harfma-harf teriladi.
async function cargoSetInput(el, value) {
    if (!el) return false;
    const text = String(value);

    cargoWriteValue(el, text);
    triggerEvents(el);
    if (el.value === text) return true;

    cargoWriteValue(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(120);
    for (const char of text) {
        cargoWriteValue(el, el.value + char);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(120);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value === text;
}

async function cargoSetInputById(id, value, warnings, label) {
    const el = document.getElementById(id);
    if (!el) { warnings.push(`${label}: maydon topilmadi`); return false; }
    if (!value) { warnings.push(`${label}: qiymat yo'q`); return false; }
    const ok = await cargoSetInput(el, value);
    if (!ok) warnings.push(`${label}: "${value}" o'rniga "${el.value}" yozildi`);
    return ok;
}

// "+" tugmasini bosib modalni ochadi
async function cargoOpenModal(onclickPart, modalId, label) {
    const button = document.querySelector(`button[onclick*="${onclickPart}"]`);
    if (!button) throw new Error(`${label}: "+" tugmasi topilmadi`);
    button.click();
    const modal = await cargoWaitFor(
        () => {
            const el = document.getElementById(modalId);
            return el && el.classList.contains('show') ? el : null;
        },
        5000,
    );
    if (!modal) throw new Error(`${label}: oyna ochilmadi`);
    await delay(400);
    return modal;
}

async function cargoSaveModal(modal, onclickPart, label, warnings) {
    const button = [...modal.querySelectorAll('button')]
        .find((el) => (el.getAttribute('onclick') || '').includes(onclickPart));
    if (!button) { warnings.push(`${label}: saqlash tugmasi topilmadi`); return; }
    button.click();
    const closed = await cargoWaitFor(() => !modal.classList.contains('show'), 6000);
    if (!closed) warnings.push(`${label}: oyna yopilmadi, qiymatlarni tekshiring`);
    await delay(400);
}

// 54-grafa: "Декларацияловчи шахс ҳақида маълумотлар" oynasi.
// ФИО, телефон, ЖШШИР va sana saytning o'zi to'ldiradi — ularga tegilmaydi.
async function cargoFillG54(data, warnings) {
    const existing = document.getElementById('G54_ID');
    if (existing && existing.value) {
        warnings.push("54-grafa allaqachon tanlangan — o'zgartirilmadi");
        return;
    }

    const modal = await cargoOpenModal('win1G54Ek', 'ModalWin54Id', '54-grafa');

    await cargoSetInputById('G54ADDRESS', CARGO_DEFAULTS.g54Address, warnings, '54-grafa Жой');
    await cargoSetInputById('G54_EMAIL', CARGO_DEFAULTS.g54Email, warnings, '54-grafa Электрон почта');
    await cargoSetInputById('G54_NO', String(data.EXP_CTDC_NO || '').trim(), warnings, '54-grafa Битим рақами');
    await cargoSetInputById('G54_NO_DATE', String(data.EXP_CVNT_DT || '').split('T')[0], warnings, '54-grafa Битим санаси');

    const byudNo = cargoByudNumber(data.INVOICE_ID);
    if (byudNo) {
        await cargoSetInputById('G54_IDNUMBERS_NO', byudNo, warnings, '54-grafa БЮД рақами');
    } else {
        warnings.push("54-grafa БЮД рақами: invoys ID si yo'q");
    }

    // Saytning o'zi to'ldiradigan maydonlar bo'sh qolsa saqlashda xato chiqadi
    const autoFilled = [['FULLNAME', 'ФИО'], ['G54_PHONE', 'Телефон'], ['g54IdNumbersPinfl', 'ЖШШИР']];
    for (const [id, label] of autoFilled) {
        const el = document.getElementById(id);
        if (el && !el.value) warnings.push(`54-grafa ${label}: sayt to'ldirmadi, qo'lda yozing`);
    }

    await cargoSaveModal(modal, 'saveFromG54', '54-grafa', warnings);

    const saved = document.getElementById('G54_ID');
    if (saved && !saved.value) warnings.push('54-grafa: saqlangandan keyin ham tanlanmadi');
}

// Invoys ID si — takrorlanmas tartib raqam sifatida 6 xonaga to'ldiriladi
function cargoByudNumber(invoiceId) {
    const id = Number(invoiceId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return String(id).padStart(6, '0');
}

async function cargoFillCustomsValue(warnings) {
    const existing = document.getElementById('CUSTOMS_VALUE_NAME');
    if (existing && existing.value.trim()) {
        warnings.push("Божхона қиймати allaqachon kiritilgan — o'zgartirilmadi");
        return;
    }

    const modal = await cargoOpenModal('win1CustomsValue', 'ModalWin1CustomsValue', 'Божхона қиймати');

    await cargoSetInputById('TOTAL_VALUE', CARGO_DEFAULTS.customsValueTotal, warnings, 'Ҳаражатлар суммаси');

    const currencyError = await cargoPickOption('CURRENCY_TYPE', CARGO_DEFAULTS.customsValueCurrency, 'Валюта тури');
    if (currencyError) warnings.push(currencyError);

    // Чегарагача айириш
    const operation = document.getElementById('OPERATION_TYPE_2');
    if (operation) forceCheck(operation); else warnings.push('Чегарагача айириш: maydon topilmadi');

    await cargoSaveModal(modal, "editCustomsValue('1')", 'Божхона қиймати', warnings);

    const saved = document.getElementById('CUSTOMS_VALUE_NAME');
    if (saved && !saved.value.trim()) warnings.push('Божхона қиймати: saqlangandan keyin ham bo\'sh');
}

async function fillCargoByud(data) {
    const warnings = [];
    if (!cargoStep1()) {
        throw new Error('Декларация 1-қадам ("Умумий маълумотлар") ochilmagan.');
    }

    const push = (err) => { if (err) warnings.push(err); };

    push(await cargoPickOption('G20', CARGO_DEFAULTS.paymentMethodCode, 'Тўлов усули'));
    push(await cargoPickOption('G29', CARGO_DEFAULTS.borderCustomsPost, 'Чегара божхона пости'));
    push(await cargoPickFirstOption('G50_ID', 'Ишонч билдирилган шахс'));

    await cargoFillG54(data, warnings);
    await cargoFillCustomsValue(warnings);

    return warnings;
}
