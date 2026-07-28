/**
 * Invoys PDF'i uchun masshtab (shrift o'lchami) hisoblari.
 *
 * Bu yerdagi `estimateScale` — HEURISTIK taxmin: kontent balandligini qator
 * sonini chamalab hisoblaydi va aniq emas. Asosiy yo'l — `pdfFit.tsx`: hujjat
 * chizib o'lchanadi va masshtab haqiqiy layout bo'yicha tanlanadi. `estimateScale`
 * faqat o'lchash imkonsiz bo'lganda zaxira sifatida ishlatiladi.
 */
import { SEAL_HEIGHT } from './PdfStyles';

// A4 sahifa balandligi (pt)
export const PAGE_HEIGHT = 841.89;
// PdfStyles.page vertikal paddinglari (scale bilan birga o'zgaradi)
export const PAGE_PAD_TOP = 40;
export const PAGE_PAD_BOTTOM = 20;
// A4: 841pt balandlik. paddingTop=40, paddingBottom=20 → mavjud: 781pt
const AVAILABLE_HEIGHT = 781;

/** Hujjatning bazaviy matn o'lchami (`PdfStyles.page.fontSize`), pt */
export const BASE_FONT_PT = 9;
/**
 * Matn o'lchamining QAT'IY yuqori chegarasi (pt).
 *
 * Hujjat sarlavhasi ("Инвойс", 24pt bazaviy) bundan MUSTASNO — u masshtab bilan
 * proporsional kattalashadi, aks holda sarlavha oddiy matn bilan bir xil
 * o'lchamda chiqib ierarxiya yo'qoladi. Qolgan barcha matnlar — rekvizitlar,
 * qo'shimcha ma'lumot, Примечания, imzolar — `scaleFont` orqali shu chegarada
 * ushlab turiladi. Jadval matni bundan ham past chegarada (qarang:
 * `PdfItemsTable.MAX_TABLE_FONT`).
 */
export const MAX_FONT_PT = 11;

/**
 * Masshtab chegaralari.
 *
 * `MIN_SCALE` — kontent juda ko'p bo'lsa 1-betga sig'dirish uchun eng kichik
 * masshtab (bazaviy 9pt → ~4pt, o'qish qiyin, lekin bu oxirgi chora).
 *
 * `MAX_SCALE` — kontent kam bo'lganda shriftlar KATTALASHADI, lekin bazaviy 9pt
 * matn aynan `MAX_FONT_PT` (11pt) da to'xtaydi. Chegarani bundan yuqori qo'yish
 * mantiqsiz: `scaleFont` matnni baribir 11pt da ushlab qoladi va faqat
 * paddinglar shishib, sahifa bo'sh joyga to'lib qolardi.
 */
export const MIN_SCALE = 0.4;
export const MAX_SCALE = MAX_FONT_PT / BASE_FONT_PT; // ≈ 1.22

/**
 * Matn o'lchamini masshtablash — natija hech qachon `MAX_FONT_PT` dan oshmaydi.
 * Hujjat sarlavhasidan tashqari BARCHA `fontSize` shu funksiya orqali olinadi
 * (oddiy `sc()` faqat padding/margin kabi o'lchamlar uchun).
 */
export const scaleFont = (base: number, scale: number): number =>
  Math.min(MAX_FONT_PT, Math.round(base * scale));

// Haqiqiy balandlik taxminlari (scale=1.0, pt):
const H = {
  header: 55,          // sarlavha + kontrakt ma'lumotlari
  divider: 18,         // border + marginVertical×2
  parties: 100,        // sotuvchi + sotib oluvchi bloki
  addInfoTitle: 22,    // "Доп. информация" sarlavhasi + marginTop
  addInfoRow: 16,      // har bir qo'shimcha maydon satri
  addInfoBottom: 10,
  tableOverhead: 52,   // jadval marginTop + header + footer + marginBottom
  tableRow: 23,        // har bir mahsulot qatori (paddingVertical×2 + fontSize×lineHeight; jadval shrifti 10pt)
  sumWords: 15,
  notes: 60,           // Примечания bloki (agar bor bo'lsa)
  // Imzo bloki — FAQAT matn va imzo rasmi (pechat alohida, scale'siz hisoblanadi)
  signatures: 100,
  signaturesSpec: 130, // sarlavha(18) + label/nom/direktor(45) + imzo(50) + marginlar
};

// Taraflar (Продавец/Покупатель) bloki balandligini kontrakt ma'lumotlaridan
// hisoblaymiz. Blok ikki ustunli, balandligi ustunlarning KATTASI bilan
// belgilanadi. Har bir maydon ~1 qator; uzun manzil/rekvizit bir necha qatorga
// bo'linadi. Ilgari bu qiymat "100" deb belgilangan edi va bank rekvizitlari
// bo'lgan kontraktlarda haqiqiy balandlik (200–300pt) juda past baholanardi —
// natijada spec sahifada imzo bloki 2-betga sakrab ketardi.
const estimatePartiesHeight = (
  c: any,
  task: any,
  isSellerShipper: boolean,
  isBuyerConsignee: boolean
): number => {
  const lineOf = (s: any): number =>
    String(s || '')
      .split('\n')
      .reduce((n, ln) => n + Math.max(1, Math.ceil(ln.length / 45)), 0) || 1;

  let left = 2; // sarlavha + nom
  let right = 2;

  if (c) {
    // Chap ustun: Продавец (+ Грузоотправитель)
    if (c.sellerLegalAddress) left += lineOf(c.sellerLegalAddress);
    if (c.sellerInn || task?.client?.inn) left += 1;
    if (c.sellerOgrn) left += 1;
    if (c.sellerDetails) left += lineOf(c.sellerDetails);
    else if (c.sellerBankName) {
      left += 2;
      if (c.sellerBankAddress) left += 1;
      if (c.sellerBankAccount) left += 1;
      if (c.sellerCorrespondentBank) { left += 1; if (c.sellerCorrespondentBankAccount) left += 1; }
    }
    if (!isSellerShipper && c.shipperName) {
      left += 3; // marginTop + sarlavha + nom
      if (c.shipperAddress) left += lineOf(c.shipperAddress);
      if (c.shipperInn) left += 1;
      if (c.shipperOgrn) left += 1;
      if (c.shipperDetails) left += lineOf(c.shipperDetails);
      else if (c.shipperBankName) {
        left += 2;
        if (c.shipperBankAddress) left += 1;
        if (c.shipperBankAccount) left += 1;
      }
    }

    // O'ng ustun: Покупатель (+ Грузополучатель)
    if (c.buyerAddress) right += lineOf(c.buyerAddress);
    if (c.buyerInn) right += 1;
    if (c.buyerOgrn) right += 1;
    if (c.buyerDetails) right += lineOf(c.buyerDetails);
    else if (c.buyerBankName) {
      right += 2;
      if (c.buyerBankAddress) right += 1;
      if (c.buyerBankAccount) right += 1;
      if (c.buyerCorrespondentBank) { right += 1; if (c.buyerCorrespondentBankAccount) right += 1; }
    }
    if (!isBuyerConsignee && c.consigneeName) {
      right += 3;
      if (c.consigneeAddress) right += lineOf(c.consigneeAddress);
      if (c.consigneeInn) right += 1;
      if (c.consigneeOgrn) right += 1;
      if (c.consigneeDetails) right += lineOf(c.consigneeDetails);
      else if (c.consigneeBankName) {
        right += 2;
        if (c.consigneeBankAddress) right += 1;
        if (c.consigneeBankAccount) right += 1;
      }
    }
  }

  const lines = Math.max(left, right);
  return lines * 15 + 16; // ~15pt/qator + blok marginlari
};

/**
 * Pechat (muhr) rasmi balandligi — `scale` bilan kichraymaydi, shuning uchun
 * masshtab hisobidan chiqarib tashlanadi (qarang: `PdfStyles.SEAL_HEIGHT`).
 */
export const calcSealHeight = (pdfIncludeSeal: boolean, selectedContract: any): number => {
  const hasSeal = !!(pdfIncludeSeal && selectedContract && (
    selectedContract.sellerSealUrl || selectedContract.sealUrl ||
    selectedContract.buyerSealUrl || selectedContract.consigneeSealUrl
  ));
  return hasSeal ? SEAL_HEIGHT + 10 : 0;
};

/**
 * Masshtabning DASTLABKI taxmini — kontent balandligini heuristikalar bilan
 * chamalaydi. Aniq qiymat `renderFittedInvoicePdf` da haqiqiy layout o'lchovidan
 * hisoblanadi; bu funksiya faqat birinchi urinish uchun boshlang'ich nuqta
 * (va o'lchov imkonsiz bo'lsa — zaxira variant).
 */
export const estimateScale = (
  items: any[],
  form: any,
  addFieldsCount: number,
  viewTab: string,
  pdfIncludeSeal: boolean,
  selectedContract: any,
  task: any,
  isSellerShipper: boolean,
  isBuyerConsignee: boolean
): number => {
  // Imzo rasmi (scale bilan kichrayadi) va pechat (doimiy SEAL_HEIGHT) alohida
  const hasSignature = !!(pdfIncludeSeal && selectedContract && (
    selectedContract.sellerSignatureUrl || selectedContract.signatureUrl ||
    selectedContract.buyerSignatureUrl || selectedContract.consigneeSignatureUrl
  ));

  const addInfoH = H.addInfoTitle + addFieldsCount * H.addInfoRow + H.addInfoBottom;
  // Imzo bloki matn qismi — imzo rasmi bo'lmasa kamroq joy oladi
  const sigH = viewTab === 'spec'
    ? (hasSignature ? H.signaturesSpec : 100)
    : (hasSignature ? H.signatures : 80);
  // Pechat balandligi qat'iy (3.8 sm) — scale bilan kichraymaydi, shuning uchun
  // uni scale hisobidan chiqarib, mavjud balandlikdan to'g'ridan-to'g'ri ayiramiz
  const sealH = calcSealHeight(pdfIncludeSeal, selectedContract);

  // Notes qismi balandligini hisoblash (9pt shriftda har ~62 ta harf 1 qator).
  // Spec sahifada Примечания chiqmaydi — joy ham band qilinmaydi.
  let notesHeight = 0;
  if (form.notes && viewTab !== 'spec') {
    const notesStr = String(form.notes);
    const lines = notesStr.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 62)), 0);
    notesHeight = 24 + lines * 15; // 24 - padding/margin, 15 - qator balandligi (9pt)
  }

  // Items balandligini hisoblash (uzun nomli tovarlar ko'p qatorga bo'linadi)
  let itemsHeight = 0;
  for (const item of items) {
    const nameLen = item.name ? String(item.name).length : 0;
    const lines = Math.max(1, Math.ceil(nameLen / 32)); // taxminan 32 ta harf 1 qatorga (10pt jadval shrifti bo'yicha)
    itemsHeight += H.tableRow + (lines - 1) * 12; // har bir qo'shimcha qator uchun +12pt
  }

  const partiesH = estimatePartiesHeight(selectedContract, task, isSellerShipper, isBuyerConsignee);

  const fixed = H.header + H.divider * 3 + partiesH + addInfoH +
                H.tableOverhead + H.sumWords + sigH + notesHeight;
                
  // Qatorlarni aniq hisoblaganimiz uchun overhead'ni kichraytiramiz
  const overhead = viewTab === 'spec' ? 1.05 : 1.08;
  const total = (fixed + itemsHeight) * overhead;

  // Spec sahifada "Подписи сторон" bloki wrap={false} — bo'linmaydi, joy yetmasa
  // butun blok keyingi betga o'tib ketadi. Shuning uchun spec uchun xavfsizlik
  // zaxirasini qoldiramiz: kontent biroz zichroq bo'lib 1-betga sig'adi.
  const available = viewTab === 'spec' ? AVAILABLE_HEIGHT - 80 : AVAILABLE_HEIGHT;
  // Pechat kichraymagani uchun qolgan kontentga faqat shu qism qoladi
  const scalable = Math.max(60, available - sealH);

  // Kontent kam bo'lsa 1.0 dan yuqoriga ham chiqadi (shriftlar kattalashadi),
  // ko'p bo'lsa kichrayadi. Aniq qiymat baribir o'lchov bilan tuzatiladi.
  return clampScale(scalable / total);
};

/** Masshtabni ruxsat etilgan oraliqqa keltirish */
export const clampScale = (scale: number): number =>
  Number.isFinite(scale) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) : 1;
