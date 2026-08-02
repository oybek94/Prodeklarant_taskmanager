chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        // app.expertiza.uz — eski application.expertiza.uz saytining React'dagi yangi
        // versiyasi: maydon nomlari va shakl tuzilishi butunlay boshqa.
        if (location.hostname === 'app.expertiza.uz') {
            fillAppExpertizaSt1(data)
                .then((warnings) => sendResponse({ success: true, warnings }))
                .catch((err) => sendResponse({ success: false, errorMsg: String(err && err.message || err) }));
        } else {
            fillSt1Form(data);
            sendResponse({ success: true, warnings: [] });
        }
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

function fillSt1Form(data) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    const fieldsMap = {
        "ИзготовительНаименование": data.EXPPN_NM,
        "ИзготовительАдрес": data.EXPPN_ADDR_CLEAN || data.EXPPN_ADDR,
        "ГрузоотправительНаименование": data.EXPPN_NM,
        "ГрузоотправительАдрес": data.ST1_GRZ_ADDR || data.EXPPN_ADDR,
        "ГрузополучательНаименование": data.IMPPN_NM,
        "ГрузополучательАдрес": data.IMPPN_ADDR_ST1 || data.IMPPN_ADDR,
        "ДатаОтгрузки": formattedDate,
        "ТоварыТекст": "Сельскохозяйственные продукты"
    };

    for (const [name, value] of Object.entries(fieldsMap)) {
        if (value !== undefined && value !== null) {
            setInputValueByName(name, value);
        }
    }

    // Eslatma: "Вид отгрузки" va "Страна назначения" maydonlari expertizada
    // angular-ui-select (native <select> emas) va so'rov nusxasida allaqachon
    // to'g'ri keladi, shuning uchun kengaytma ularni to'ldirmaydi.
}

// ---------------------------------------------------------------------------
// app.expertiza.uz (ST-1, 2-qadam)
// ---------------------------------------------------------------------------

// Har safar bir xil bo'lgani uchun doimiy qilib qo'yilgan tanlovlar
const APP_EXPERTIZA_PURPOSE = "Ekspertiza akti asosida kelib chiqish sertifikatini olish";
const APP_EXPERTIZA_DELIVERY_TYPE = "Avtoyo'l transporti";

// Prodeklarant ro'yxati (frontend/src/constants/countries.ts) bilan saytdagi
// 252 ta davlat nomi mos kelmaydigan holatlar. Qolganlari to'g'ridan-to'g'ri
// yoki "shu bilan boshlanadi" qoidasi bilan topiladi:
//   МОЛДОВА → "Молдова, Республика", ИРАН → "Иран (Исламская Республика)"
const APP_EXPERTIZA_COUNTRY_ALIASES = {
    "кыргызстан": "Кыргызия",
    "оаэ": "Объединенные Арабские Эмираты",
    // Diqqat: "Корея, Народно-Демократическая Республика" — Shimoliy Koreya,
    // shuning uchun aniq ko'rsatilgan
    "южная корея": "Корея, Республика"
};

async function fillAppExpertizaSt1(data) {
    const warnings = [];

    // Ochiq qolgan sana paneli yoki ro'yxat keyingi bosishni yutib yuboradi
    await closeOpenOverlays();

    // 1. Oddiy matn maydonlari
    // Eslatma: "Ishlab chiqaruvchi" (manufacturer_*) maydonlari ataylab
    // to'ldirilmaydi — majburiy emas va ko'pincha boshqa korxona bo'ladi.
    const textFields = {
        "consignor_name": data.EXPPN_NM,
        "consignor_address": data.ST1_GRZ_ADDR || data.EXPPN_ADDR,
        "consignee_name": data.IMPPN_NM,
        "consignee_address": data.IMPPN_ADDR_ST1 || data.IMPPN_ADDR
    };

    for (const [name, value] of Object.entries(textFields)) {
        if (value === undefined || value === null || value === '') continue;
        if (!setReactInputValue(name, value)) {
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

    const target = normalizeOptionText(wanted);
    const match = options.find(o => normalizeOptionText(o.innerText) === target)
        || options.find(o => normalizeOptionText(o.innerText).startsWith(target));

    if (!match) {
        // Menyuni yopib qo'yamiz, aks holda keyingi dropdown ochilmaydi
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        input.blur();
        await delay(150);
        return `"${wanted}" ro'yxatda topilmadi`;
    }

    match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    match.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    match.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await delay(250);
    input.blur();
    await delay(100);

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
