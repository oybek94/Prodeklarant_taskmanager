// Holat qatori: rang CSS klassidan keladi, shunda popup palitrasi bir joyda
// turadi. kind: '' | 'ok' | 'warn' | 'error'
function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = kind ? `status status--${kind}` : 'status';
}

async function getProdeklarantData(statusDiv) {
    setStatus(statusDiv, "Ma'lumotlar olinmoqda...");
    try {
        const appTabs = await chrome.tabs.query({ url: ["http://localhost/*", "https://*.prodeklarant.uz/*", "https://prodeklarant.uz/*"] });
        
        let mockData = null;
        const validTabs = appTabs.filter(t => t.url && t.url.includes('/invoices/task/'));

        if (validTabs && validTabs.length > 0) {
            const targetTabId = validTabs[0].id;
            
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

document.getElementById('fillKarantinBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("fill_karantin_fss", mockData, statusDiv);
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

document.getElementById('fillCargoBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("fill_cargo_byud", mockData, statusDiv);
});

document.getElementById('fillCargoStep2Btn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;

    sendToContentScript("fill_cargo_step2", mockData, statusDiv);
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
