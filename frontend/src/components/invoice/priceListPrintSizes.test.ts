/**
 * Prays-list PDF'i sahifa suratidan (html2canvas) yasaladi: element kengligi A4
 * kengligiga cho'ziladi. Pechat va imzo qog'ozda invoysdagidek o'lchamda
 * chiqishi element kengligiga bog'liq bo'lmasligi kerak.
 */
import { describe, it, expect } from 'vitest';
import { sizePriceListPrintImages } from './priceListPrintSizes';
import { SEAL_HEIGHT, SIGNATURE_HEIGHT } from './pdf/pdfScale';

const A4_WIDTH_PT = 595.28;

const fakeImage = (kind: string) => ({ dataset: { printImage: kind }, style: { height: '' } });

describe('sizePriceListPrintImages', () => {
  it.each([950, 1280])('element kengligi %ipx bo‘lsa ham qog‘ozdagi o‘lcham invoysdagidek', (width) => {
    const seal = fakeImage('seal');
    const signature = fakeImage('signature');

    sizePriceListPrintImages({ offsetWidth: width, querySelectorAll: () => [seal, signature] });

    const onPaperPt = (css: string) => (parseFloat(css) / width) * A4_WIDTH_PT;
    expect(onPaperPt(seal.style.height)).toBeCloseTo(SEAL_HEIGHT, 1);
    expect(onPaperPt(signature.style.height)).toBeCloseTo(SIGNATURE_HEIGHT, 1);
  });
});
