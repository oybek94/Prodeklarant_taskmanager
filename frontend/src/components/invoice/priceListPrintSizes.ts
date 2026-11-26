import { PAGE_WIDTH, SEAL_HEIGHT, SIGNATURE_HEIGHT } from './pdf/pdfScale';

/** `<img data-print-image="...">` qiymati -> rasmning qog'ozdagi balandligi (pt) */
const PRINT_HEIGHT_PT: Record<string, number> = {
  seal: SEAL_HEIGHT,
  signature: SIGNATURE_HEIGHT,
};

interface PrintImage {
  dataset: { printImage?: string };
  style: { height: string };
}

interface PrintPage {
  offsetWidth: number;
  querySelectorAll(selector: string): Iterable<PrintImage>;
}

/**
 * Prays-list PDF'i sahifa suratidan yasaladi: `page` kengligi A4 kengligiga
 * cho'ziladi, ya'ni ekrandagi piksel o'lchami qog'ozda element kengligiga qarab
 * turlicha chiqadi. Shu sababli pechat va imzo balandligi kenglikdan hisoblanadi
 * va invoys PDF'idagi bilan bir xil bo'ladi.
 *
 * html2canvas `onclone` ida, ya'ni faqat suratga olinadigan nusxada chaqiriladi.
 */
export const sizePriceListPrintImages = (page: PrintPage): void => {
  const pxPerPt = page.offsetWidth / PAGE_WIDTH;
  for (const image of page.querySelectorAll('img[data-print-image]')) {
    const heightPt = PRINT_HEIGHT_PT[image.dataset.printImage ?? ''];
    if (heightPt) image.style.height = `${heightPt * pxPerPt}px`;
  }
};
