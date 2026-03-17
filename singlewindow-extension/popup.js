document.getElementById('fillFormBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = "Ma'lumotlar olinmoqda...";
    statusDiv.style.color = "#475569";
    
    try {
        // Find the user's web app tab to read localStorage from.
        // We look for any tab that might be running the Prodeklarant app (localhost or prodeklarant.uz)
        const appTabs = await chrome.tabs.query({ url: ["http://localhost/*", "https://*.prodeklarant.uz/*", "https://prodeklarant.uz/*"] });
        
        let mockData = null;

        if (appTabs && appTabs.length > 0) {
            // Pick the first matching tab
            const targetTabId = appTabs[0].id;
            
            // Execute script in the context of the web app tab to get the localStorage data
            const injectionResults = await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                func: () => {
                   const data = localStorage.getItem('current_export_invoice');
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
                mockData = injectionResults[0].result;
            } else {
                statusDiv.textContent = "Prodeklarant dasturida ochilgan invoys topilmadi!";
                statusDiv.style.color = "#ef4444";
                return;
            }
        } else {
            statusDiv.textContent = "Prodeklarant dasturi ochilmagan!";
            statusDiv.style.color = "#ef4444";
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                const url = tabs[0].url;
                if (!url.includes('singlewindow.uz')) {
                    statusDiv.textContent = "Bu kengaytma faqat singlewindow.uz saytida ishlaydi.";
                    statusDiv.style.color = "#ef4444";
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "fill_form",
                    data: mockData
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        statusDiv.textContent = "Xatolik! Sayt to'liq yuklanganini tekshiring.";
                        statusDiv.style.color = "#ef4444";
                    } else if (response && response.success) {
                        statusDiv.textContent = "Shakl muvaffaqiyatli to'ldirildi!";
                        statusDiv.style.color = "#10b981";
                    } else {
                        statusDiv.textContent = "Noma'lum xatolik yuz berdi.";
                        statusDiv.style.color = "#ef4444";
                    }
                });
            }
        });
    } catch (err) {
        console.error(err);
        statusDiv.textContent = "Ma'lumotlarni olishda xatolik!";
        statusDiv.style.color = "#ef4444";
    }
});
