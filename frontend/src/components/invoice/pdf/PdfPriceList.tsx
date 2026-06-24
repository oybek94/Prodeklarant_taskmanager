import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { formatDate, formatUnitPrice } from '../invoiceUtils';
import { resolveUploadUrl } from '../types';

interface PdfPriceListProps {
  form: any;
  items: any[];
  selectedContract: any;
  pdfIncludeSeal: boolean;
  scale?: number;
}

export const PdfPriceList: React.FC<PdfPriceListProps> = ({
  form,
  items,
  selectedContract,
  pdfIncludeSeal,
  scale = 1
}) => {
  const sc = (v: number) => Math.round(v * scale);
  const deliveryTerms = form.deliveryTerms || '';
  const displayCurrency = selectedContract?.contractCurrency || form.currency || 'USD';

  const invoiceDate = form.date ? formatDate(form.date) : '«___» ________ 20__ г.';
  const contractNumber = form.contractNumber || selectedContract?.contractNumber || '_________';
  const contractDate = selectedContract?.contractDate ? formatDate(selectedContract.contractDate) : '___________';
  const logoUrl = selectedContract?.companyLogoUrl ? resolveUploadUrl(selectedContract.companyLogoUrl) : null;

  return (
    <View style={{ width: '100%' }}>
      {/* HEADER */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sc(10) }}>
        <View style={{ flex: 1.5, paddingRight: sc(15) }}>
          <Text style={{ fontSize: sc(14), color: '#111827', marginBottom: sc(4) }}>
            <Text style={{ fontWeight: 'bold' }}>Контракт №: </Text>
            <Text style={{ fontWeight: 'medium' }}>{contractNumber} от {contractDate}</Text>
          </Text>
          <Text style={{ fontSize: sc(14), color: '#111827', marginBottom: sc(4) }}>
            <Text style={{ fontWeight: 'bold' }}>Дата: </Text>
            <Text style={{ fontWeight: 'medium' }}>{invoiceDate}</Text>
          </Text>
          <Text style={{ fontSize: sc(14), color: '#111827', marginBottom: sc(4) }}>
            <Text style={{ fontWeight: 'bold' }}>Валюта: </Text>
            <Text style={{ fontWeight: 'medium' }}>{displayCurrency}</Text>
          </Text>
        </View>

        <View style={{ flex: 0.5, alignItems: 'center', justifyContent: 'center' }}>
          {logoUrl && <Image src={logoUrl} style={{ height: sc(40), objectFit: 'contain' }} />}
        </View>

        <View style={{ flex: 1, paddingLeft: sc(15), alignItems: 'flex-end' }}>
          <Text style={{ fontSize: sc(32), fontWeight: 'bold', color: '#1f2937', marginBottom: sc(15) }}>
            ПРАЙС-ЛИСТ
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { borderTopWidth: 1.5, marginVertical: sc(10) }]} />

      {/* SELLER INFO */}
      <View style={{ marginTop: sc(20), marginBottom: sc(15) }}>
        <Text style={{ fontSize: sc(12), color: '#111827', marginBottom: sc(4) }}>
          <Text style={{ fontWeight: 'bold' }}>Продавец: </Text>
          <Text style={{ fontWeight: 'medium' }}>{selectedContract?.sellerName || '__________________________________'}</Text>
        </Text>
        {selectedContract?.sellerLegalAddress && (
          <Text style={{ fontSize: sc(11), color: '#374151', marginBottom: sc(2) }}>
            <Text style={{ fontWeight: 'bold' }}>Юр. адрес: </Text>{selectedContract.sellerLegalAddress}
          </Text>
        )}
        {selectedContract?.sellerInn && (
          <Text style={{ fontSize: sc(11), color: '#374151', marginBottom: sc(2) }}>
            <Text style={{ fontWeight: 'bold' }}>ИНН: </Text>{selectedContract.sellerInn}
          </Text>
        )}
        {selectedContract?.sellerBankName && (
          <Text style={{ fontSize: sc(11), color: '#374151', marginBottom: sc(2) }}>
            <Text style={{ fontWeight: 'bold' }}>Банк: </Text>{selectedContract.sellerBankName}
          </Text>
        )}
        {selectedContract?.sellerBankAccount && (
          <Text style={{ fontSize: sc(11), color: '#374151', marginBottom: sc(2) }}>
            <Text style={{ fontWeight: 'bold' }}>Р/с: </Text>{selectedContract.sellerBankAccount}
          </Text>
        )}
      </View>

      {/* TABLE */}
      <View style={{ marginTop: sc(30), marginBottom: sc(20), alignSelf: 'center', width: '90%' }}>
        <View style={{ width: '100%', borderWidth: 1, borderColor: '#000000' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1f2937', backgroundColor: '#ffffff' }}>
            <Text style={[styles.tableCellHeader, styles.textCenter, { width: '8%', fontSize: sc(11) }]}>№</Text>
            <Text style={[styles.tableCellHeader, styles.textLeft, { width: '40%', fontSize: sc(11) }]}>Наименование товара</Text>
            <Text style={[styles.tableCellHeader, styles.textCenter, { width: '15%', fontSize: sc(11) }]}>Ед. изм.</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { width: '17%', fontSize: sc(11) }]}>Цена ({displayCurrency})</Text>
            <Text style={[styles.tableCellHeader, styles.textCenter, { width: '20%', fontSize: sc(11) }]}>Условия поставки</Text>
          </View>
          
          {/* Rows */}
          {items && items.length > 0 ? items.map((item, idx) => (
            <View key={item.id || idx} style={[styles.tableRow, idx === items.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              <Text style={[styles.tableCell, styles.textCenter, { width: '8%', fontSize: sc(11), paddingVertical: sc(6) }]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, styles.textLeft, { width: '40%', fontSize: sc(11), paddingVertical: sc(6) }]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.textCenter, { width: '15%', fontSize: sc(11), paddingVertical: sc(6) }]}>{item.unit || '---'}</Text>
              <Text style={[styles.tableCell, styles.textRight, { width: '17%', fontSize: sc(11), paddingVertical: sc(6), fontWeight: 'bold' }]}>{formatUnitPrice(item.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.textCenter, { width: '20%', fontSize: sc(11), paddingVertical: sc(6) }]}>{deliveryTerms || '---'}</Text>
            </View>
          )) : (
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableCell, styles.textCenter, { width: '100%', fontSize: sc(11), paddingVertical: sc(10), color: '#6b7280' }]}>
                Данные о товарах отсутствуют
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* SIGNATURES */}
      {selectedContract?.supplierDirector && (
        <View style={{ marginTop: sc(40), marginBottom: sc(15) }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: '50%' }}>
              <Text style={{ fontSize: sc(14), fontWeight: 'bold', color: '#374151', marginBottom: sc(4) }}>Руководитель Поставщика:</Text>
              <Text style={{ fontSize: sc(14), color: '#1f2937' }}>{selectedContract.supplierDirector}</Text>
            </View>
            
            <View style={{ width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', height: sc(80) }}>
              {(selectedContract.sellerSignatureUrl || selectedContract.signatureUrl) && pdfIncludeSeal && (
                <Image
                  src={resolveUploadUrl(selectedContract.sellerSignatureUrl || selectedContract.signatureUrl)}
                  style={{ position: 'absolute', width: sc(80), height: sc(35), objectFit: 'contain', zIndex: 2 }}
                />
              )}
              {(selectedContract.sellerSealUrl || selectedContract.sealUrl) && pdfIncludeSeal && (
                <Image
                  src={resolveUploadUrl(selectedContract.sellerSealUrl || selectedContract.sealUrl)}
                  style={{ position: 'absolute', width: sc(120), height: sc(120), objectFit: 'contain', zIndex: 1, opacity: 0.8 }}
                />
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
