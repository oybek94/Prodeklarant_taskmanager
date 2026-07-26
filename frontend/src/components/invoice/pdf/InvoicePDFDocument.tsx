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
import type { PdfOnRender } from './pdfLayout';
import { PAGE_PAD_TOP, PAGE_PAD_BOTTOM, clampScale, estimateScale } from './pdfScale';

export interface InvoicePDFDocumentProps {
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
  packingCustomFields: { id: string; label: string; value: string }[];
  additionalFieldsOrder?: string[];
  items: any[];
  orderedVisibleColumns: string[];
  columnLabels: Record<string, string>;
  totalColumnLabel: string;
  invoiceCurrency: string;
  pdfIncludeSeal: boolean;
  /**
   * Tashqaridan berilgan masshtab — `estimateScale` heuristikasini bekor qiladi.
   * `renderFittedInvoicePdf` haqiqiy layout o'lchovi asosida aniq qiymatni
   * hisoblab beradi (qarang: `pdfFit.tsx`).
   */
  scaleOverride?: number;
  /** @react-pdf `Document.onRender` — layout o'lchash uchun (qarang: `pdfFit.tsx`) */
  onRender?: PdfOnRender;
}

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
  packingCustomFields,
  additionalFieldsOrder,
  items,
  orderedVisibleColumns,
  columnLabels,
  totalColumnLabel,
  invoiceCurrency,
  pdfIncludeSeal,
  scaleOverride,
  onRender,
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
    ...(viewTab === 'packing'
      ? packingCustomFields.map(f => isAdditionalInfoVisible(`packing_${f.id}`) && !!f.value)
      : []),
  ].filter(Boolean).length;

  const scale = scaleOverride != null
    ? clampScale(scaleOverride)
    : estimateScale(items, form, visibleAddFields, viewTab, pdfIncludeSeal, selectedContract, task, isSellerShipper, isBuyerConsignee);
  const sc = (v: number) => Math.round(v * scale);

  const pageStyle = {
    ...styles.page,
    paddingTop: sc(PAGE_PAD_TOP),
    paddingBottom: sc(PAGE_PAD_BOTTOM),
    paddingHorizontal: sc(30),
  };

  const dividerStyle = {
    ...styles.divider,
    marginVertical: sc(8),
  };

  return (
    <Document onRender={onRender}>
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
              packingCustomFields={packingCustomFields}
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
