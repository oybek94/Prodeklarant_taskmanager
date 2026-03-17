chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fill_form") {
        const data = request.data;
        if (data) {
            fillForm(data);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    }
    // Asinxron javobni kutuvchi funksiyalar uchun return true kerak emas, 
    // chunki darhol javob qaytaramiz.
});

function fillForm(data) {
    // 1. Sotuvchi va Sotib oluvchi maydonlarini hamda maxsus maydonlarni kiritish
    const fieldsMap = {
        // Sotuvchi (Eksportyor)
        "EXPPN_NM": data.EXPPN_NM,
        "EXPPN_TXPR_UNIQ_NO": data.EXPPN_TXPR_UNIQ_NO,
        "EXPPN_RPPN_NM": data.EXPPN_RPPN_NM,
        "EXPPN_ADDR": data.EXPPN_ADDR,
        "EXPPN_TELNO": data.EXPPN_TELNO,
        "EXPPN_REGN_TP_NM": data.EXPPN_REGN_TP_NM,
        
        // Sotib oluvchi (Importyor)
        "IMPPN_NM": data.IMPPN_NM,
        "IMPPN_ADDR": data.IMPPN_ADDR,
        
        // Maxsus yozuvlar
        "EXP_L_CERT_NO": "Нет",
        "EXP_L_CERT_DT": getTodayDate()
    };

    for (const [name, value] of Object.entries(fieldsMap)) {
        if (value !== undefined) {
            setInputValueByName(name, value);
        }
    }

    // 2. Maxsus mantiqiy shart: Radio yoki Checkbox ni avtomatik bosish
    const radioElement = document.querySelector('[name="IDFY_LBL_INDC_YNY"]');
    if (radioElement) {
        // Agar tanlanmagan bo'lsa tanlash
        if (radioElement.type === 'radio' || radioElement.type === 'checkbox') {
            if (!radioElement.checked) {
                radioElement.click();
                triggerEvents(radioElement);
            }
        } else {
            // Agar boshqa turdagi element bo'lsa, baribir clickni jo'natamiz
            radioElement.click();
            triggerEvents(radioElement);
        }
    } else {
        console.warn(`[AutoFill] Element topilmadi: IDFY_LBL_INDC_YNY`);
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
    } else {
        console.warn(`[AutoFill] Maydon (input) topilmadi: ${name}`);
    }
}

function getTodayDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`; // DD.MM.YYYY
}
