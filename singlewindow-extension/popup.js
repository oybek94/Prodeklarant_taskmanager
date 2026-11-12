// Holat qatori: rang CSS klassidan keladi, shunda popup palitrasi bir joyda
// turadi. kind: '' | 'ok' | 'warn' | 'error'
function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = kind ? `status status--${kind}` : 'status';
}

// Prodeklarantda ochiq invoys tabi. Bir nechta bo'lishi mumkin (masalan, boshqa
// korxonaning eski tabi fon rejimida qolgan). tabs.query tartibi qachon
// ochilganiga bog'liq, foydalanuvchi nimani ko'zda tutgani bilan bog'liq emas —
// shu sababli ENG OXIRGI faollashtirilgan tab olinadi, aks holda boshqa
// korxonaning ma'lumotlari yuklanadi.
async function pickInvoiceTab() {
    const appTabs = await chrome.tabs.query({ url: ["http://localhost/*", "https://*.prodeklarant.uz/*", "https://prodeklarant.uz/*"] });
    const validTabs = appTabs.filter(t => t.url && t.url.includes('/invoices/task/'));
    if (validTabs.length === 0) return null;
    return validTabs.length === 1
        ? validTabs[0]
        : [...validTabs].sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
}

async function getProdeklarantData(statusDiv) {
    setStatus(statusDiv, "Ma'lumotlar olinmoqda...");
    try {
        let mockData = null;
        const targetTab = await pickInvoiceTab();

        if (targetTab) {
            const targetTabId = targetTab.id;

            const injectionResults = await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                func: () => {
                    return new Promise((resolve) => {
                        const timeout = setTimeout(() => {
                            window.removeEventListener('message', handler);
                            resolve(null);
                        }, 3000);

                        function handler(event) {
                            if (event.data?.type === 'PRODEKLARANT_INVOICE_DATA') {
                                clearTimeout(timeout);
                                window.removeEventListener('message', handler);
                                resolve(event.data.payload || null);
                            }
                        }

                        window.addEventListener('message', handler);
                        window.postMessage({ type: 'PRODEKLARANT_REQUEST_INVOICE' }, '*');
                    });
                }
            });

            if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                return injectionResults[0].result;
            } else {
                setStatus(statusDiv, "Prodeklarant dasturida ochilgan invoys topilmadi!", 'error');
                return null;
            }
        } else {
            setStatus(statusDiv, "Prodeklarant dasturida biron invoys ochilmagan!", 'error');
            return null;
        }
    } catch (err) {
        console.error(err);
        setStatus(statusDiv, "Ma'lumotlarni olishda xatolik! Saytni yangilab qaytadan urinib ko'ring.", 'error');
        return null;
    }
}

// Ishonchnoma API si Prodeklarant sahifasi orqali chaqiriladi: kirish tokeni faqat
// o'sha yerda turadi. action: 'reserve' | 'save'. Xatoda Error tashlaydi.
async function callPowerOfAttorney(action, payload) {
    const tab = await pickInvoiceTab();
    if (!tab) throw new Error("Prodeklarant dasturida biron invoys ochilmagan!");

    const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [action, payload],
        func: (requestAction, requestPayload) => new Promise((resolve) => {
            const requestId = `poa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ ok: false, error: "Prodeklarant sahifasi javob bermadi. Sahifani yangilab qayta urinib ko'ring." });
            }, 15000);

            function handler(event) {
                const data = event.data;
                if (event.source !== window || !data || data.type !== 'PRODEKLARANT_POA_RESPONSE' || data.requestId !== requestId) return;
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                resolve({ ok: data.ok, data: data.data, error: data.error });
            }

            window.addEventListener('message', handler);
            window.postMessage({ type: 'PRODEKLARANT_POA_REQUEST', requestId, action: requestAction, payload: requestPayload }, '*');
        }),
    });

    const result = injection && injection.result;
    if (!result) throw new Error("Prodeklarant sahifasidan javob kelmadi");
    if (!result.ok) throw new Error(result.error || "Ishonchnoma so'rovi bajarilmadi");
    return result.data;
}

// Aktiv tabdagi content scriptga xabar yuboradi va javobni qaytaradi (sendToContentScript'ning
// holat qatori yozmaydigan varianti — qo'ng'iroq qiluvchi holatni o'zi ko'rsatadi)
function askActiveTab(action, data) {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0]) {
                resolve({ success: false, errorMsg: 'Aktiv tab topilmadi.' });
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action, data }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, errorMsg: "Xatolik! Sayt to'liq yuklanganini tekshiring." });
                } else {
                    resolve(response || { success: false, errorMsg: "Noma'lum xatolik yuz berdi." });
                }
            });
        });
    });
}

function sendToContentScript(action, mockData, statusDiv) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
            const url = tabs[0].url;
            const supportedHosts = ['singlewindow.uz', 'app.expertiza.uz', 'cabinet.karantin.uz', 'cargo.customs.uz'];
            if (!supportedHosts.some((host) => url.includes(host))) {
                setStatus(statusDiv, "Bu kengaytma faqat " + supportedHosts.join(', ') + " saytlarida ishlaydi.", 'error');
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {
                action: action,
                data: mockData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    setStatus(statusDiv, "Xatolik! Sayt to'liq yuklanganini tekshiring.", 'error');
                } else if (response && response.success) {
                    if (action === "fill_form" || action === "fill_st1_form" || action === "fill_karantin_fss" || action === "fill_fumigatsiya" || action === "fill_cargo_byud" || action === "fill_cargo_step2") {
                        const warnings = response.warnings || [];
                        if (warnings.length > 0) {
                            // To'ldirilmagan maydonlar jim qolmasligi kerak — ayniqsa
                            // ro'yxatdan tanlanadiganlari ko'zga tashlanmaydi
                            setStatus(statusDiv, `To'ldirildi, lekin: ${warnings.join('; ')}`, 'warn');
                        } else {
                            setStatus(statusDiv, "Shakl muvaffaqiyatli to'ldirildi!", 'ok');
                        }
                    } else if (action === "check_products") {
                        if (response.errors === 0) {
                            setStatus(statusDiv, "Barcha ma'lumotlar to'g'ri!", 'ok');
                        } else {
                            setStatus(statusDiv, `${response.errors} ta xatolik topildi.`, 'error');
                        }
                    }
                } else {
                    setStatus(statusDiv, response && response.errorMsg
                        ? response.errorMsg
                        : "Noma'lum xatolik yuz berdi.", 'error');
                }
            });
        }
    });
}

document.getElementById('fillFormBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("fill_form", mockData, statusDiv);
});

document.getElementById('fillSt1Btn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("fill_st1_form", mockData, statusDiv);
});

// Ichki FSS: fumigatsiya akti invoysda yo'q, shuning uchun avval akt raqami va
// sanasi qo'lda kiritiladi; to'ldirgich faqat "Saqlash" bosilgandan keyin ishlaydi
const actPanel = document.getElementById('actPanel');
const actNumberInput = document.getElementById('actNumber');
const actDateInput = document.getElementById('actDate');

function localIsoDate() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
}

function toggleActPanel(open) {
    actPanel.hidden = !open;
    document.getElementById('here').hidden = open;
}

document.getElementById('fillKarantinBtn').addEventListener('click', () => {
    setStatus(document.getElementById('status'), '');
    actDateInput.max = localIsoDate();
    // Akt odatda shu kuni olinadi, lekin har safar tekshirib chiqilsin deb raqam bo'sh turadi
    if (!actDateInput.value) actDateInput.value = localIsoDate();
    toggleActPanel(true);
    actNumberInput.focus();
});

document.getElementById('actCancelBtn').addEventListener('click', () => toggleActPanel(false));

actNumberInput.addEventListener('input', () => {
    actNumberInput.value = actNumberInput.value.replace(/\D/g, '');
});

actPanel.addEventListener('submit', async (event) => {
    event.preventDefault();
    const statusDiv = document.getElementById('status');
    const actNumber = actNumberInput.value.replace(/\D/g, '');
    const actDate = actDateInput.value; // YYYY-MM-DD

    if (!/^\d{11}$/.test(actNumber)) {
        setStatus(statusDiv, "Akt raqami 11 ta raqamdan iborat bo'lishi kerak.", 'error');
        actNumberInput.focus();
        return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(actDate)) {
        setStatus(statusDiv, "Akt sanasini kiriting.", 'error');
        actDateInput.focus();
        return;
    }

    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    toggleActPanel(false);
    sendToContentScript("fill_karantin_fss", {
        ...mockData,
        fumigationActNumber: actNumber,
        fumigationActDate: actDate,
    }, statusDiv);
});

// Fumigatsiya arizasidagi maydonlar butunlay doimiy qiymatlardan iborat, lekin
// invoys baribir kerak: saytda ochiq korxona invoysdagi eksportyorga mos
// kelishini tekshirmasdan ariza to'ldirilmaydi
document.getElementById('fillFumigatsiyaBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("fill_fumigatsiya", mockData, statusDiv);
});

// BYUD 1-qadam: avval haydovchi JSHSHIR i so'raladi (50-grafa uchun ishonchnoma),
// xuddi fumigatsiya akti raqami kabi. "Ishonchnomasiz" eski xatti-harakat.
const poaPanel = document.getElementById('poaPanel');
const poaPinflInput = document.getElementById('poaPinfl');

function togglePoaPanel(open) {
    poaPanel.hidden = !open;
    document.getElementById('here').hidden = open;
}

document.getElementById('fillCargoBtn').addEventListener('click', () => {
    setStatus(document.getElementById('status'), '');
    togglePoaPanel(true);
    poaPinflInput.focus();
});

document.getElementById('poaCancelBtn').addEventListener('click', () => togglePoaPanel(false));

poaPinflInput.addEventListener('input', () => {
    poaPinflInput.value = poaPinflInput.value.replace(/\D/g, '');
});

// 1-qadamda kiritilgan haydovchi JSHSHIR i 2-qadamda ham kerak. Popup har
// ochilganda holati yo'qoladi, shuning uchun invoys ID si bo'yicha saqlanadi.
const driverPinflKey = (invoiceId) => `driverPinfl:${invoiceId}`;

async function rememberDriverPinfl(invoiceId, pinfl) {
    if (!invoiceId) return;
    try {
        if (pinfl) await chrome.storage.local.set({ [driverPinflKey(invoiceId)]: pinfl });
        else await chrome.storage.local.remove(driverPinflKey(invoiceId));
    } catch (err) {
        console.warn('[AutoFill] Haydovchi JSHSHIR ini saqlab bo\'lmadi:', err);
    }
}

async function recallDriverPinfl(invoiceId) {
    if (!invoiceId) return '';
    try {
        const stored = await chrome.storage.local.get(driverPinflKey(invoiceId));
        return String(stored[driverPinflKey(invoiceId)] || '');
    } catch (err) {
        console.warn('[AutoFill] Haydovchi JSHSHIR ini o\'qib bo\'lmadi:', err);
        return '';
    }
}

document.getElementById('poaSkipBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    togglePoaPanel(false);
    // Ishonchnomasiz bajarilsa eski JSHSHIR 2-qadamga o'tib qolmasin
    await rememberDriverPinfl(mockData.INVOICE_ID, '');
    sendToContentScript("fill_cargo_byud", mockData, statusDiv);
});

poaPanel.addEventListener('submit', async (event) => {
    event.preventDefault();
    const statusDiv = document.getElementById('status');
    const pinfl = poaPinflInput.value.replace(/\D/g, '');
    if (!/^\d{14}$/.test(pinfl)) {
        setStatus(statusDiv, "JSHSHIR 14 ta raqamdan iborat bo'lishi kerak.", 'error');
        poaPinflInput.focus();
        return;
    }

    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    if (!mockData.INVOICE_ID) {
        setStatus(statusDiv, "Invoys hali saqlanmagan. Avval Prodeklarantda saqlang.", 'error');
        return;
    }
    togglePoaPanel(false);
    await rememberDriverPinfl(mockData.INVOICE_ID, pinfl);

    // Raqam saytga yozishdan OLDIN olinadi. Sayt xato bersa ham raqam invoysga
    // bog'langan qoladi — qayta urinish o'sha raqamni ishlatadi, yangisini olmaydi.
    setStatus(statusDiv, 'Ishonchnoma raqami olinmoqda...');
    let reserved;
    try {
        reserved = await callPowerOfAttorney('reserve', { pinfl });
    } catch (err) {
        setStatus(statusDiv, String(err.message || err), 'error');
        return;
    }

    setStatus(statusDiv, `Ishonchnoma № ${reserved.number} bilan to'ldirilmoqda...`);
    const response = await askActiveTab('fill_cargo_byud', {
        ...mockData,
        powerOfAttorney: {
            pinfl,
            number: reserved.number,
            date: reserved.date, // YYYY-MM-DD, invoys sanasi
            validUntil: `${reserved.date.slice(0, 4)}-12-31`,
        },
    });
    if (!response.success) {
        setStatus(statusDiv, response.errorMsg || "Noma'lum xatolik yuz berdi.", 'error');
        return;
    }

    const warnings = [...(response.warnings || [])];
    if (response.driver) {
        try {
            await callPowerOfAttorney('save', response.driver);
        } catch (err) {
            warnings.push(`haydovchi ma'lumoti Prodeklarantga saqlanmadi (${err.message || err}) — ishonchnoma PDF si chiqmaydi`);
        }
    }

    const done = response.driver
        ? `Ishonchnoma № ${reserved.number} bilan to'ldirildi. PDF: Prodeklarant → Sertifikatlar → Ishonchnoma (haydovchi).`
        : "Shakl to'ldirildi, lekin ishonchli vakil qo'shilmadi";
    if (warnings.length > 0) {
        setStatus(statusDiv, `${done} Lekin: ${warnings.join('; ')}`, 'warn');
    } else {
        setStatus(statusDiv, done, 'ok');
    }
});

document.getElementById('fillCargoStep2Btn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;

    const driverPinfl = await recallDriverPinfl(mockData.INVOICE_ID);
    sendToContentScript("fill_cargo_step2", { ...mockData, driverPinfl }, statusDiv);
});

document.getElementById('checkDataBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("check_products", mockData, statusDiv);
});

// Aktiv tabdagi saytning to'ldirgichlarini yuqoriga chiqaradi, qolganlarini
// bosilmaydigan ro'yxatga aylantiradi. Tugmalar tinglovchilari yuqorida
// ulangani uchun bu blok eng oxirida turishi shart.
(async () => {
    const here = document.getElementById('here');
    const elsewhere = document.getElementById('elsewhere');
    const statusDiv = document.getElementById('status');
    const groups = [...document.querySelectorAll('#stage .group')];

    let url = '';
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        url = (tab && tab.url) || '';
    } catch (err) {
        console.warn('[AutoFill] Aktiv tabni aniqlab bo\'lmadi:', err);
    }

    for (const group of groups) {
        const host = group.dataset.host;
        if (url.includes(host)) {
            here.appendChild(group);
            continue;
        }
        // Ishlamaydigan tugmani ko'rsatib turishdan ko'ra, qayerda ishlashini
        // aytib qo'ygan ma'qul
        const row = document.createElement('div');
        row.className = 'away';
        const hostEl = document.createElement('span');
        hostEl.className = 'away__host';
        hostEl.textContent = host;
        const itemsEl = document.createElement('span');
        itemsEl.className = 'away__items';
        itemsEl.textContent = [...group.querySelectorAll('.btn')]
            .map((btn) => btn.textContent)
            .join(', ');
        row.append(hostEl, itemsEl);
        elsewhere.appendChild(row);
        group.remove();
    }

    document.getElementById('here-title').hidden = here.children.length === 0;
    document.getElementById('elsewhere-title').hidden = elsewhere.children.length === 0;

    if (here.children.length === 0) {
        setStatus(statusDiv, "Bu saytda to'ldirish mumkin emas. Quyidagi saytlardan birini oching.");
    }
})();
