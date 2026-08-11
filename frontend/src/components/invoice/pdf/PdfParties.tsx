import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { sectionFont } from './pdfFontSizes';
import { createPdfI18n, type PdfI18n } from './pdfI18n';

interface PdfPartiesProps {
  selectedContract: any;
  task: any;
  isSellerShipper: boolean;
  isBuyerConsignee: boolean;
  scale?: number;
  /** Qo'lda belgilangan shrift (pt); berilmasa masshtabdan hisoblanadi */
  fontSize?: number;
  /** Hujjat tili (qarang: `pdfI18n.ts`); berilmasa ruscha */
  i18n?: PdfI18n;
}

export const PdfParties: React.FC<PdfPartiesProps> = ({
  selectedContract, task, isSellerShipper, isBuyerConsignee, scale = 1, fontSize, i18n,
}) => {
  const sc = (v: number) => Math.round(v * scale);
  const fz = sectionFont(fontSize, 9, scale); // rekvizitlar umumiy masshtab bilan bir xil o'lchamda (≤9pt)
  const txt = { fontSize: fz, marginBottom: sc(2), lineHeight: 1.4 };
  const nameSt = { ...txt, fontWeight: 'bold' as const };
  const titleSt = { fontSize: fz, fontWeight: 'bold' as const, marginBottom: sc(3) };
  const bankTitleSt = { ...nameSt, marginTop: sc(4), marginBottom: sc(1) };

  const { L, t } = i18n ?? createPdfI18n();

  const sellerTitle = isSellerShipper ? L.sellerShipper : L.seller;
  const buyerTitle = isBuyerConsignee ? L.buyerConsignee : L.buyer;

  return (
    <View style={[styles.partiesContainer, { marginVertical: sc(8) }]}>
      {/* Seller */}
      <View style={[styles.partyCol, styles.partyColLeft]}>
        <Text style={titleSt}>{sellerTitle}</Text>

        {selectedContract ? (
          <>
            <Text style={nameSt}>{t('sellerName', selectedContract.sellerName || '')}</Text>
            {selectedContract.sellerLegalAddress && <Text style={txt}>{t('sellerAddress', selectedContract.sellerLegalAddress)}</Text>}
            {(selectedContract.sellerInn || task?.client?.inn) && (
              <Text style={txt}>{L.tin}: {selectedContract.sellerInn || task?.client?.inn}</Text>
            )}
            {selectedContract.sellerOgrn && <Text style={txt}>{L.ogrn}: {selectedContract.sellerOgrn}</Text>}

            {selectedContract.sellerDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{t('sellerDetails', selectedContract.sellerDetails)}</Text>
            ) : selectedContract.sellerBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>{L.bankDetails}</Text>
                <Text style={txt}>{L.bank}: {t('sellerBankName', selectedContract.sellerBankName)}{selectedContract.sellerBankSwift ? `, SWIFT: ${selectedContract.sellerBankSwift}` : ''}</Text>
                {selectedContract.sellerBankAddress && <Text style={txt}>{L.address}: {t('sellerBankAddress', selectedContract.sellerBankAddress)}</Text>}
                {selectedContract.sellerBankAccount && <Text style={txt}>{L.account}: {selectedContract.sellerBankAccount}</Text>}
                {selectedContract.sellerCorrespondentBank && (
                  <View style={{ marginTop: sc(4) }}>
                    <Text style={txt}>{L.correspondentBank}: {t('sellerCorrespondentBank', selectedContract.sellerCorrespondentBank)}{selectedContract.sellerCorrespondentBankSwift ? `, SWIFT: ${selectedContract.sellerCorrespondentBankSwift}` : ''}</Text>
                    {selectedContract.sellerCorrespondentBankAccount && <Text style={txt}>{L.corrAccount}: {selectedContract.sellerCorrespondentBankAccount}</Text>}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={nameSt}>{task?.client?.name ? t('clientName', task.client.name) : L.noClient}</Text>
            {task?.client?.address && <Text style={txt}>{t('clientAddress', task.client.address)}</Text>}
            {task?.client?.inn && <Text style={txt}>{L.tin}: {task.client.inn}</Text>}
            {task?.client?.phone && <Text style={txt}>{L.tel}: {task.client.phone}</Text>}
            {task?.client?.email && <Text style={txt}>{L.email}: {task.client.email}</Text>}
            {task?.client?.bankName && (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>{L.bankDetails}</Text>
                <Text style={txt}>{L.bank}: {t('clientBankName', task.client.bankName)}{task.client.bankSwift ? `, SWIFT: ${task.client.bankSwift}` : ''}</Text>
                {task.client.bankAddress && <Text style={txt}>{L.address}: {t('clientBankAddress', task.client.bankAddress)}</Text>}
                {task.client.bankAccount && <Text style={txt}>{L.account}: {task.client.bankAccount}</Text>}
              </View>
            )}
          </>
        )}

        {!isSellerShipper && selectedContract?.shipperName && (
          <View style={{ marginTop: sc(15) }}>
            <Text style={titleSt}>{L.shipperManufacturer}</Text>
            <Text style={nameSt}>{t('shipperName', selectedContract.shipperName)}</Text>
            {selectedContract.shipperAddress && <Text style={txt}>{t('shipperAddress', selectedContract.shipperAddress)}</Text>}
            {selectedContract.shipperInn && <Text style={txt}>{L.tin}: {selectedContract.shipperInn}</Text>}
            {selectedContract.shipperOgrn && <Text style={txt}>{L.ogrn}: {selectedContract.shipperOgrn}</Text>}
            {selectedContract.shipperDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{t('shipperDetails', selectedContract.shipperDetails)}</Text>
            ) : selectedContract.shipperBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>{L.paymentDetails}</Text>
                <Text style={txt}>{L.bank}: {t('shipperBankName', selectedContract.shipperBankName)}{selectedContract.shipperBankSwift ? `, SWIFT: ${selectedContract.shipperBankSwift}` : ''}</Text>
                {selectedContract.shipperBankAddress && <Text style={txt}>{L.address}: {t('shipperBankAddress', selectedContract.shipperBankAddress)}</Text>}
                {selectedContract.shipperBankAccount && <Text style={txt}>{L.account}: {selectedContract.shipperBankAccount}</Text>}
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.partyDivider} />

      {/* Buyer */}
      <View style={[styles.partyCol, styles.partyColRight]}>
        <Text style={titleSt}>{buyerTitle}</Text>

        {selectedContract ? (
          <>
            <Text style={nameSt}>{t('buyerName', selectedContract.buyerName || '')}</Text>
            {selectedContract.buyerAddress && <Text style={txt}>{t('buyerAddress', selectedContract.buyerAddress)}</Text>}
            {selectedContract.buyerInn && <Text style={txt}>{L.tin}: {selectedContract.buyerInn}</Text>}
            {selectedContract.buyerOgrn && <Text style={txt}>{L.ogrn}: {selectedContract.buyerOgrn}</Text>}
            {selectedContract.buyerDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{t('buyerDetails', selectedContract.buyerDetails)}</Text>
            ) : selectedContract.buyerBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>{L.bankDetails}</Text>
                <Text style={txt}>{L.bank}: {t('buyerBankName', selectedContract.buyerBankName)}{selectedContract.buyerBankSwift ? `, SWIFT: ${selectedContract.buyerBankSwift}` : ''}</Text>
                {selectedContract.buyerBankAddress && <Text style={txt}>{L.address}: {t('buyerBankAddress', selectedContract.buyerBankAddress)}</Text>}
                {selectedContract.buyerBankAccount && <Text style={txt}>{L.account}: {selectedContract.buyerBankAccount}</Text>}
                {selectedContract.buyerCorrespondentBank && (
                  <View style={{ marginTop: sc(4) }}>
                    <Text style={txt}>{L.correspondentBank}: {t('buyerCorrespondentBank', selectedContract.buyerCorrespondentBank)}{selectedContract.buyerCorrespondentBankSwift ? `, SWIFT: ${selectedContract.buyerCorrespondentBankSwift}` : ''}</Text>
                    {selectedContract.buyerCorrespondentBankAccount && <Text style={txt}>{L.corrAccount}: {selectedContract.buyerCorrespondentBankAccount}</Text>}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={nameSt}>{task?.client?.name ? t('clientName', task.client.name) : L.noClient}</Text>
        )}

        {!isBuyerConsignee && selectedContract?.consigneeName && (
          <View style={{ marginTop: sc(15) }}>
            <Text style={titleSt}>{L.consignee}</Text>
            <Text style={nameSt}>{t('consigneeName', selectedContract.consigneeName)}</Text>
            {selectedContract.consigneeAddress && <Text style={txt}>{t('consigneeAddress', selectedContract.consigneeAddress)}</Text>}
            {selectedContract.consigneeInn && <Text style={txt}>{L.tin}: {selectedContract.consigneeInn}</Text>}
            {selectedContract.consigneeOgrn && <Text style={txt}>{L.ogrn}: {selectedContract.consigneeOgrn}</Text>}
            {selectedContract.consigneeDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{t('consigneeDetails', selectedContract.consigneeDetails)}</Text>
            ) : selectedContract.consigneeBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>{L.paymentDetails}</Text>
                <Text style={txt}>{L.bank}: {t('consigneeBankName', selectedContract.consigneeBankName)}{selectedContract.consigneeBankSwift ? `, SWIFT: ${selectedContract.consigneeBankSwift}` : ''}</Text>
                {selectedContract.consigneeBankAddress && <Text style={txt}>{L.address}: {t('consigneeBankAddress', selectedContract.consigneeBankAddress)}</Text>}
                {selectedContract.consigneeBankAccount && <Text style={txt}>{L.account}: {selectedContract.consigneeBankAccount}</Text>}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};
