import React from 'react';
import { Document, Page, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { PdfHeader } from './PdfHeader';
import { PdfParties } from './PdfParties';
import { PdfAdditionalInfo } from './PdfAdditionalInfo';
import { PdfItemsTable } from './PdfItemsTable';
import { PdfNotes } from './PdfNotes';
import { PdfSignatures } from './PdfSignatures';
import { PdfPriceList } from './PdfPriceList';

interface InvoicePDFDocumentProps {
  viewTab: 'invoice' | 'spec' | 'packing' | 'pricelist';
  form: any;
  invoice: any;
  selectedContract: any;
  contracts: any[];
  task: any;
  isSellerShipper: boolean;
  isBuyerConsignee: boolean;
  isAdditionalInfoVisible: (key: string) => boolean;
  customFields: { id: string; label: string; value: string }[];
  specCustomFields: { id: string; label: string; value: string }[];
  additionalFieldsOrder?: string[];
  items: any[];
  orderedVisibleColumns: string[];
  columnLabels: Record<string, string>;
  totalColumnLabel: string;
  invoiceCurrency: string;
  pdfIncludeSeal: boolean;
}

// A4: 841pt balandlik. paddingTop=40, paddingBottom=20 → mavjud: 781pt
const AVAILABLE_HEIGHT = 781;

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
  signatures: 150,     // Pechat rasmi 120pt bo'lishi mumkin
  // spec: sarlavha(18) + imzo(40) + pechat(100) + marginlar(20) ≈ 178
  signaturesSpec: 178,
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

const calcScale = (
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
  // Imzo va pechat borligini tekshirish
  const hasImages = pdfIncludeSeal && selectedContract && (
    selectedContract.sellerSignatureUrl || selectedContract.signatureUrl || 
    selectedContract.sellerSealUrl || selectedContract.sealUrl ||
    selectedContract.buyerSignatureUrl || selectedContract.buyerSealUrl
  );
  
  const addInfoH = H.addInfoTitle + addFieldsCount * H.addInfoRow + H.addInfoBottom;
  // Agar pechat rasmi yo'q bo'lsa, imzo qismi kamroq joy oladi.
  // Spec uchun rasmlar bo'lsa (imzo ustida pechat) balandligi 230 gacha yetadi.
  const sigH = viewTab === 'spec' ? (hasImages ? 230 : 100) : (hasImages ? 150 : 80);
  
  // Notes qismi balandligini hisoblash (har 80 ta harf taxminan 1 qator).
  // Spec sahifada Примечания chiqmaydi — joy ham band qilinmaydi.
  let notesHeight = 0;
  if (form.notes && viewTab !== 'spec') {
    const notesStr = String(form.notes);
    const lines = notesStr.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 80)), 0);
    notesHeight = 20 + lines * 12; // 20 - padding/margin, 12 - qator balandligi
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

  if (total <= available) return 1.0;
  const computed = available / total;
  
  // Kichraytirish darajasini hisoblash (shrift va oraliqlar proporsional kichrayadi)
  // Spec va Invoice ham kerak bo'lsa maksimal 0.40 gacha kichrayib 1-betga sig'diriladi
  const minScale = 0.40;
  return Math.max(minScale, computed);
};

export const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = ({
  viewTab,
  form,
  invoice,
  selectedContract,
  contracts,
  task,
  isSellerShipper,
  isBuyerConsignee,
  isAdditionalInfoVisible,
  customFields,
  specCustomFields,
  additionalFieldsOrder,
  items,
  orderedVisibleColumns,
  columnLabels,
  totalColumnLabel,
  invoiceCurrency,
  pdfIncludeSeal,
}) => {
  // Ko'rinadigan qo'shimcha maydonlar sonini hisoblaymiz
  const visibleAddFields = [
    isAdditionalInfoVisible('deliveryTerms') && !!form.deliveryTerms,
    isAdditionalInfoVisible('vehicleNumber') && !!form.vehicleNumber,
    isAdditionalInfoVisible('customsAddress') && !!form.customsAddress,
    isAdditionalInfoVisible('shipmentPlace') && !!form.shipmentPlace,
    isAdditionalInfoVisible('destination') && !!form.destination,
    isAdditionalInfoVisible('origin'),
    isAdditionalInfoVisible('manufacturer') && !!form.manufacturer,
    isAdditionalInfoVisible('orderNumber') && !!form.orderNumber,
    isAdditionalInfoVisible('gln') && !!form.gln,
    isAdditionalInfoVisible('temperature') && !!form.temperature,
    isAdditionalInfoVisible('harvestYear') && !!form.harvestYear,
    ...customFields.map(f => isAdditionalInfoVisible(`custom_${f.id}`) && !!f.value),
    ...specCustomFields.map(f => isAdditionalInfoVisible(`spec_${f.id}`) && !!f.value),
  ].filter(Boolean).length;

  const scale = calcScale(items, form, visibleAddFields, viewTab, pdfIncludeSeal, selectedContract, task, isSellerShipper, isBuyerConsignee);
  const sc = (v: number) => Math.round(v * scale);

  const pageStyle = {
    ...styles.page,
    paddingTop: sc(40),
    paddingBottom: sc(20),
    paddingHorizontal: sc(30),
  };

  const dividerStyle = {
    ...styles.divider,
    marginVertical: sc(8),
  };

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        {viewTab === 'pricelist' ? (
          <PdfPriceList
            form={form}
            items={items}
            selectedContract={selectedContract}
            pdfIncludeSeal={pdfIncludeSeal}
            scale={scale}
          />
        ) : (
          <>
            <PdfHeader
              viewTab={viewTab}
              form={form}
              invoice={invoice}
              selectedContract={selectedContract}
              scale={scale}
            />

            <PdfParties
              selectedContract={selectedContract}
              task={task}
              isSellerShipper={isSellerShipper}
              isBuyerConsignee={isBuyerConsignee}
              scale={scale}
            />

            <PdfAdditionalInfo
              form={form}
              viewTab={viewTab}
              isAdditionalInfoVisible={isAdditionalInfoVisible}
              customFields={customFields}
              specCustomFields={specCustomFields}
              additionalFieldsOrder={additionalFieldsOrder}
              scale={scale}
            />

            <View style={[dividerStyle, { borderTopWidth: 1.5, marginVertical: sc(8) }]} />

            <PdfItemsTable
              items={items}
              orderedVisibleColumns={orderedVisibleColumns}
              columnLabels={columnLabels}
              totalColumnLabel={totalColumnLabel}
              invoiceCurrency={invoiceCurrency}
              showSumWords={viewTab !== 'packing' && orderedVisibleColumns.includes('total')}
              scale={scale}
            />

            {viewTab !== 'spec' && <PdfNotes notes={form.notes} scale={scale} />}

            <PdfSignatures
              contract={selectedContract || {}}
              viewTab={viewTab}
              pdfIncludeSeal={pdfIncludeSeal}
              isSellerShipper={isSellerShipper}
              isBuyerConsignee={isBuyerConsignee}
              scale={scale}
            />
          </>
        )}
      </Page>
    </Document>
  );
};
