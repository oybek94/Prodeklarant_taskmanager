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
    } else {
        console.warn(`[AutoFill] Maydon (input) topilmadi: ${name}`);
    }
}

function getTodayDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
}
