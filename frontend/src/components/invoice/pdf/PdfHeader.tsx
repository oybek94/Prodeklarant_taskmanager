import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { formatDate } from '../invoiceUtils';
import { resolveUploadUrl } from '../types';

interface PdfHeaderProps {
  viewTab: 'invoice' | 'spec' | 'packing' | 'pricelist';
  form: any;
  invoice: any;
  selectedContract: any;
  scale?: number;
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({ viewTab, form, invoice, selectedContract, scale = 1 }) => {
  const sc = (v: number) => Math.round(v * scale);
  const title =
    viewTab === 'invoice' ? 'Инвойс' :
    viewTab === 'spec' ? 'Спецификация' :
    viewTab === 'packing' ? 'Упаковочный лист' :
    'Прайс-лист';

  const documentType =
    viewTab === 'spec' ? 'Спецификация №:' :
    viewTab === 'packing' ? 'Упаковочный лист №:' :
    viewTab === 'pricelist' ? 'Прайс-лист №:' :
    'Инвойс №:';

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
          <Text style={[styles.headerLabel, { fontSize: sc(10) }]}>{documentType}</Text>
          <Text style={[styles.headerValue, { fontSize: sc(10) }]}>{invoiceNumber} от {invoiceDate} г.</Text>
        </View>

        {(viewTab === 'spec' || viewTab === 'packing') && (
          <View style={[styles.headerInfoRow, { marginBottom: sc(4) }]}>
            <Text style={[styles.headerLabel, { fontSize: sc(10) }]}>Инвойс №:</Text>
            <Text style={[styles.headerValue, { fontSize: sc(10) }]}>{invoiceNumber} от {invoiceDate} г.</Text>
          </View>
        )}

        <View style={[styles.headerInfoRow, { marginBottom: sc(4) }]}>
          <Text style={[styles.headerLabel, { fontSize: sc(10) }]}>Контракт №:</Text>
          <Text style={[styles.headerValue, { fontSize: sc(10) }]}>{contractNumber} от {contractDate}</Text>
        </View>
      </View>
    </View>
  );
};
