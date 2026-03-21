async function getProdeklarantData(statusDiv) {
    statusDiv.textContent = "Ma'lumotlar olinmoqda...";
    statusDiv.style.color = "#475569";
    try {
        const appTabs = await chrome.tabs.query({ url: ["http://localhost/*", "https://*.prodeklarant.uz/*", "https://prodeklarant.uz/*"] });
        
        let mockData = null;
        const validTabs = appTabs.filter(t => t.url && t.url.includes('/invoices/task/'));

        if (validTabs && validTabs.length > 0) {
            const targetTabId = validTabs[0].id;
            
            const injectionResults = await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                func: () => {
                   const data = sessionStorage.getItem('current_export_invoice');
                   if (data) {
                       try {
                           return JSON.parse(data);
                       } catch (e) {
                           return null;
                       }
                   }
                   return null;
                }
            });

            if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                return injectionResults[0].result;
            } else {
                statusDiv.textContent = "Prodeklarant dasturida ochilgan invoys topilmadi!";
                statusDiv.style.color = "#ef4444";
                return null;
            }
        } else {
            statusDiv.textContent = "Prodeklarant dasturida biron invoys ochilmagan!";
            statusDiv.style.color = "#ef4444";
            return null;
        }
    } catch (err) {
        console.error(err);
        statusDiv.textContent = "Ma'lumotlarni olishda xatolik! Saytni yangilab qaytadan urinib ko'ring.";
        statusDiv.style.color = "#ef4444";
        return null;
    }
}

function sendToContentScript(action, mockData, statusDiv) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
            const url = tabs[0].url;
            if (!url.includes('singlewindow.uz')) {
                statusDiv.textContent = "Bu kengaytma faqat singlewindow.uz saytida ishlaydi.";
                statusDiv.style.color = "#ef4444";
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {
                action: action,
                data: mockData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    statusDiv.textContent = "Xatolik! Sayt to'liq yuklanganini tekshiring.";
                    statusDiv.style.color = "#ef4444";
                } else if (response && response.success) {
                    if (action === "fill_form") {
                        statusDiv.textContent = "Shakl muvaffaqiyatli to'ldirildi!";
                        statusDiv.style.color = "#10b981";
                    } else if (action === "check_products") {
                        if (response.errors === 0) {
                            statusDiv.textContent = "Barcha ma'lumotlar to'g'ri!";
                            statusDiv.style.color = "#10b981";
                        } else {
                            statusDiv.textContent = `${response.errors} ta xatolik topildi.`;
                            statusDiv.style.color = "#ef4444";
                        }
                    }
                } else {
                    if (action === "check_products" && response && response.errorMsg) {
                        statusDiv.textContent = response.errorMsg;
                    } else {
                        statusDiv.textContent = "Noma'lum xatolik yuz berdi.";
                    }
                    statusDiv.style.color = "#ef4444";
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

document.getElementById('checkDataBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const mockData = await getProdeklarantData(statusDiv);
    if (!mockData) return;
    sendToContentScript("check_products", mockData, statusDiv);
});
