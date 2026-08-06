/**
 * To'liq shartnoma PDF'i Node'da chizilishini tekshiradi.
 *
 * Nima uchun kerak: @react-pdf 4.5.1 da `fixed` + `position: absolute` element
 * balandligi har betda ~81 barobar o'sadi; bet raqami `bottom` bilan
 * joylashtirilgan bo'lsa, 10-betga borib pdfkit `unsupported number` bilan
 * yiqilardi va PDF UMUMAN yaratilmasdi. Xato faqat UZUN (ko'p betli) hujjatda
 * chiqadi, shuning uchun test to'liq `v1` shablonini chizadi va betlar sonini
 * ham tekshiradi — shablon qisqarib qolsa, qamrov yo'qolganini bilib olamiz.
 */
import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
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

const font = (name: string) => path.resolve(process.cwd(), 'public/fonts', name);

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
  templateVersion: 'v1', status: 'DRAFT', terminatedAt: null, terminationReason: null,
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

  it('hujjat ko\'p betli — xato aynan shu holatda chiqadi', async () => {
    const clean = deepNormalizeStrings(agreement);
    const tokens = deepNormalizeStrings(buildTokens(clean, BHM_UZS));

    let layout: PdfLayoutNode | undefined;
    await pdf(
      React.createElement(AgreementPdfDocument, {
        template: getTemplate('v1'),
        tokens,
        onRender: (info) => { layout = info._INTERNAL__LAYOUT__DATA_; },
      }),
    ).toBlob();

    expect(measureLayout(layout)?.pageCount ?? 0).toBeGreaterThan(10);
  }, 60_000);

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
