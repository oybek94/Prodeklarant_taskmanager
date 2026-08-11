import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { formatDate } from '../invoiceUtils';
import { resolveUploadUrl } from '../types';
import { scaleFont } from './pdfScale';
import { createPdfI18n, type PdfI18n } from './pdfI18n';

interface PdfHeaderProps {
  viewTab: 'invoice' | 'spec' | 'packing' | 'pricelist';
  form: any;
  invoice: any;
  selectedContract: any;
  scale?: number;
  /** Hujjat tili (qarang: `pdfI18n.ts`); berilmasa ruscha */
  i18n?: PdfI18n;
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({ viewTab, form, invoice, selectedContract, scale = 1, i18n }) => {
  const sc = (v: number) => Math.round(v * scale);
  // Hujjat sarlavhasidan tashqari barcha matnlar 11pt bilan cheklanadi
  const fz = (v: number) => scaleFont(v, scale);
  const { L } = i18n ?? createPdfI18n();

  const title =
    viewTab === 'invoice' ? L.titleInvoice :
    viewTab === 'spec' ? L.titleSpec :
    viewTab === 'packing' ? L.titlePacking :
    L.titlePriceList;

  const documentType =
    viewTab === 'spec' ? L.docNoSpec :
    viewTab === 'packing' ? L.docNoPacking :
    viewTab === 'pricelist' ? L.docNoPriceList :
    L.docNoInvoice;

  const invoiceNumber = form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '');
  const invoiceDate = form.date ? formatDate(form.date) : '';
  
  const contractNumber = selectedContract?.contractNumber || '';
  const contractDate = selectedContract?.contractDate ? formatDate(selectedContract?.contractDate) : '';

  const logoUrl = selectedContract?.companyLogoUrl ? resolveUploadUrl(selectedContract.companyLogoUrl) : null;

  return (
    <View style={[styles.headerContainer, { marginBottom: sc(10) }]}>
      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { fontSize: sc(24), marginBottom: sc(5) }]}>{title}</Text>
      </View>

      <View style={styles.headerLogoContainer}>
        {logoUrl && <Image src={logoUrl} style={[styles.headerLogo, { height: sc(40) }]} />}
      </View>

      <View style={styles.headerInfoContainer}>
        <View style={[styles.headerInfoRow, { marginBottom: sc(4) }]}>
          <Text style={[styles.headerLabel, { fontSize: fz(10) }]}>{documentType}</Text>
          <Text style={[styles.headerValue, { fontSize: fz(10) }]}>{L.numberDated(invoiceNumber, invoiceDate)}</Text>
        </View>

        {(viewTab === 'spec' || viewTab === 'packing') && (
          <View style={[styles.headerInfoRow, { marginBottom: sc(4) }]}>
            <Text style={[styles.headerLabel, { fontSize: fz(10) }]}>{L.docNoInvoice}</Text>
            <Text style={[styles.headerValue, { fontSize: fz(10) }]}>{L.numberDated(invoiceNumber, invoiceDate)}</Text>
          </View>
        )}

        <View style={[styles.headerInfoRow, { marginBottom: sc(4) }]}>
          <Text style={[styles.headerLabel, { fontSize: fz(10) }]}>{L.contractNo}</Text>
          <Text style={[styles.headerValue, { fontSize: fz(10) }]}>{contractNumber} {L.dated} {contractDate}</Text>
        </View>
      </View>
    </View>
  );
};
