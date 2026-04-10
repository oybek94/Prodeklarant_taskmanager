chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fill_form") {
        const data = request.data;
        if (data) {
            fillForm(data);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
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
