/**
 * To'liq shartnoma PDF'i Node'da chizilishini tekshiradi.
 *
 * Nima uchun kerak: @react-pdf 4.5.1 da `fixed` + `position: absolute` element
 * balandligi har betda ~81 barobar o'sadi; bet raqami `bottom` bilan
 * joylashtirilgan bo'lsa, 10-betga borib pdfkit `unsupported number` bilan
 * yiqilardi va PDF UMUMAN yaratilmasdi. Xato faqat UZUN (ko'p betli) hujjatda
 * chiqadi, shuning uchun test eng uzun (`v1`) shablonni ham chizadi va betlar
 * sonini tekshiradi — shablon qisqarib qolsa, qamrov yo'qolganini bilib olamiz.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Font, pdf } from '@react-pdf/renderer';
import { renderAgreementPdf } from './renderAgreementPdf';
import { AgreementPdfDocument } from './AgreementPdfDocument';
import { getTemplate } from '../templates';
import { buildTokens } from '../tokens';
import { deepNormalizeStrings } from '../../../utils/textNormalize';
import { measureLayout } from '../../../components/invoice/pdf/pdfLayout';
import type { PdfLayoutNode } from '../../../components/invoice/pdf/pdfLayout';
import type { ServiceAgreement } from '../types';

// `fonts.ts` shriftlarni brauzer URL'i (`/fonts/*.ttf`) bilan ro'yxatdan
// o'tkazadi — Node'da ular topilmaydi. Faqat shu modul almashtiriladi, PDF
// quvurining qolgan qismi o'zgarishsiz sinaladi.
vi.mock('../../../components/pdf/fonts', () => ({ PDF_FONT_STACK: ['Roboto', 'NotoSans'] }));

/**
 * `public/fonts/` ichidagi shriftga fayl tizimi yo'li. `node:path` ishlatilmaydi:
 * `tsconfig.app.json` da `"types": []` — ilova loyihasida Node turlari yo'q.
 */
const font = (name: string): string => {
  const decoded = decodeURIComponent(new URL(`../../../../public/fonts/${name}`, import.meta.url).pathname);
  // Windows: "/G:/…" ko'rinishidagi yo'ldan boshidagi qiya chiziq olib tashlanadi
  return /^\/[A-Za-z]:/.test(decoded) ? decoded.slice(1) : decoded;
};

Font.register({
  family: 'Roboto',
  fonts: [
    { src: font('Roboto-Regular.ttf'), fontWeight: 400 },
    { src: font('Roboto-Medium.ttf'), fontWeight: 500 },
    { src: font('Roboto-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.register({ family: 'NotoSans', fonts: [{ src: font('NotoSans-Regular.ttf'), fontWeight: 400 }] });

/** Muharrirdagi yangi shartnoma holati: to'ldirilmagan maydonlar `null` */
const agreement: ServiceAgreement = {
  id: 1, clientId: 7, agreementNumber: '2026/001', agreementDate: '2026-08-06T00:00:00.000Z',
  templateVersion: 'v2', status: 'DRAFT', terminatedAt: null, terminationReason: null,
  customerName: 'TEST MCHJ', customerInn: '123456789', customerAddress: null, customerDirector: null,
  customerDirectorBasis: 'Устав', customerBankName: null, customerBankAccount: null,
  customerMfo: null, customerOked: null, customerPhone: null, customerEmail: null,
  executorName: 'PRODEKLARANT MCHJ', executorInn: null, executorAddress: null, executorDirector: null,
  executorBankName: null, executorBankAccount: null, executorMfo: null, executorOked: null,
  executorPhone: null, executorEmail: null,
  paymentModel: 'PREPAID', monthlyDueDay: null, perCountThreshold: null, perCountDueDays: null,
  perAmountThreshold: null, perAmountDueDays: null, creditLimit: null, prepaidRevertDays: 10,
  mainTariffBhm: '3', tariffs: [{ name: 'Электрон БЮД расмийлаштириш', unit: '1 БЮД', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: null, brokerRegistryNumber: null,
  signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

const BHM_UZS = 412_000;

describe('renderAgreementPdf', () => {
  it('to\'liq shartnomani chizadi (ko\'p betli, yiqilmasdan)', async () => {
    const blob = await renderAgreementPdf(agreement, BHM_UZS);
    expect(blob.size).toBeGreaterThan(0);
  }, 60_000);

  /** Berilgan versiyani chizib, betlar sonini qaytaradi */
  const pageCount = async (version: string): Promise<number> => {
    const clean = deepNormalizeStrings({ ...agreement, templateVersion: version });
    const tokens = deepNormalizeStrings(buildTokens(clean, BHM_UZS));

    let layout: PdfLayoutNode | undefined;
    await pdf(
      React.createElement(AgreementPdfDocument, {
        template: getTemplate(version),
        tokens,
        onRender: (info) => { layout = info._INTERNAL__LAYOUT__DATA_; },
      }),
    ).toBlob();

    return measureLayout(layout)?.pageCount ?? 0;
  };

  it('v1 (uzun, ilovali) hujjat ham chiziladi — bet raqami xatosi aynan shunda chiqardi', async () => {
    // Bet raqami xatosi 10-betdan boshlab chiqadi, shuning uchun qamrov uchun
    // eng uzun versiya sinaladi. v2 qisqa bo'lgani bilan tuzatish kerak bo'lib
    // qolaveradi: shablon o'ssa yoki tariflar ko'paysa yana 10 betga chiqadi.
    expect(await pageCount('v1')).toBeGreaterThan(10);
  }, 60_000);

  it('v2 v1 dan kam betga sig\'adi', async () => {
    const [v1Pages, v2Pages] = [await pageCount('v1'), await pageCount('v2')];
    expect(v2Pages).toBeLessThan(v1Pages);
  }, 120_000);

  it('B modeli (kredit limiti bandlari bilan) ham chiziladi', async () => {
    const monthly: ServiceAgreement = {
      ...agreement,
      paymentModel: 'MONTHLY',
      monthlyDueDay: 10,
      creditLimit: '50000000',
    };
    const blob = await renderAgreementPdf(monthly, BHM_UZS);
    expect(blob.size).toBeGreaterThan(0);
  }, 60_000);
});
