import React from 'react';
import { Document, Page, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { PdfHeader } from './PdfHeader';
import { PdfParties } from './PdfParties';
import { PdfAdditionalInfo } from './PdfAdditionalInfo';
import { PdfItemsTable } from './PdfItemsTable';
import { PdfNotes } from './PdfNotes';
import { PdfSignatures } from './PdfSignatures';

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
  tableRow: 21,        // har bir mahsulot qatori (paddingVertical×2 + fontSize×lineHeight)
  sumWords: 15,
  notes: 60,           // Примечания bloki (agar bor bo'lsa)
  signatures: 80,
  // spec: sarlavha(18) + imzo(40) + pechat(100) + marginlar(20) ≈ 178
  signaturesSpec: 178,
};

const calcScale = (
  itemCount: number,
  hasNotes: boolean,
  addFieldsCount: number,
  viewTab: string,
): number => {
  const addInfoH = H.addInfoTitle + addFieldsCount * H.addInfoRow + H.addInfoBottom;
  const sigH = viewTab === 'spec' ? H.signaturesSpec : H.signatures;
  const fixed = H.header + H.divider * 3 + H.parties + addInfoH +
                H.tableOverhead + H.sumWords + sigH +
                (hasNotes ? H.notes : 0);
  // Spec uchun 12% ortiqcha (H taxminlari pastroq, xavfsizlik uchun)
  const overhead = viewTab === 'spec' ? 1.12 : 1.0;
  const total = (fixed + itemCount * H.tableRow) * overhead;
  if (total <= AVAILABLE_HEIGHT) return 1.0;
  const computed = AVAILABLE_HEIGHT / total;
  // Spec: pechat belgilangan o'lchamidan max 10% kichrayishi mumkin (scale >= 0.90)
  // Invoice: 0.40 gacha kichrayishi mumkin
  const minScale = viewTab === 'spec' ? 0.90 : 0.40;
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

  const scale = calcScale(items.length, !!form.notes, visibleAddFields, viewTab);
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

        <PdfNotes notes={form.notes} scale={scale} />

        <PdfSignatures
          contract={selectedContract || {}}
          viewTab={viewTab}
          pdfIncludeSeal={pdfIncludeSeal}
          scale={scale}
        />
      </Page>
    </Document>
  );
};
