// app.expertiza.uz — sahifaning O'Z olamida (manifestda `world: "MAIN"`) ishlaydi.
//
// content.js izolyatsiyalangan olamda ishlaydi va React DOM elementga yozgan
// `__reactFiber$...` xossasini KO'RMAYDI. Variantning ma'lumot yozuvi
// (name_uz/ru/en, alpha2_code, slug) esa aynan o'sha fiberda turibdi — ekrandagi
// matn esa sayt tiliga qarab o'zgaradi. Shuning uchun yozuvni shu yerda o'qib,
// DOM atributiga qo'yamiz: atributlar ikkala olam uchun umumiy.
(() => {
    const ANNOTATE_EVENT = 'prodeklarant:annotate-options';
    const RECORD_ATTR = 'data-prodeklarant-record';

    function findRecord(el) {
        const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
        if (!fiberKey) return null;

        let fiber = el[fiberKey];
        for (let hops = 0; fiber && hops < 12; hops++) {
            const data = fiber.memoizedProps && fiber.memoizedProps.data;
            if (data && typeof data === 'object') return data;
            fiber = fiber.return;
        }
        return null;
    }

    document.addEventListener(ANNOTATE_EVENT, () => {
        document.querySelectorAll('[id^="react-select-"][id*="-option-"]').forEach((el) => {
            const record = findRecord(el);
            if (!record) {
                el.removeAttribute(RECORD_ATTR);
                return;
            }
            // Faqat kerakli satr maydonlari: tilga bog'liq nomlar, ISO kodlar, slug
            const slim = {};
            for (const [key, value] of Object.entries(record)) {
                if (typeof value !== 'string') continue;
                if (key === 'slug' || key === 'code' || /^(name_|alpha)/.test(key)) slim[key] = value;
            }
            el.setAttribute(RECORD_ATTR, JSON.stringify(slim));
        });
    });
})();
