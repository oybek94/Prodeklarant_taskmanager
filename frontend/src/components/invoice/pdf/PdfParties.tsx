import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';

interface PdfPartiesProps {
  selectedContract: any;
  task: any;
  isSellerShipper: boolean;
  isBuyerConsignee: boolean;
  scale?: number;
}

export const PdfParties: React.FC<PdfPartiesProps> = ({
  selectedContract, task, isSellerShipper, isBuyerConsignee, scale = 1,
}) => {
  const sc = (v: number) => Math.round(v * scale);
  const fz = sc(9) - (scale < 1 ? 2 : 0); // sig'masa 2px qo'shimcha kichik
  const txt = { fontSize: fz, marginBottom: sc(2), lineHeight: 1.4 };
  const nameSt = { ...txt, fontWeight: 'bold' as const };
  const titleSt = { fontSize: fz, fontWeight: 'bold' as const, marginBottom: sc(3) };
  const bankTitleSt = { ...nameSt, marginTop: sc(4), marginBottom: sc(1) };

  const sellerTitle = isSellerShipper ? 'Продавец/Грузоотправитель' : 'Продавец';
  const buyerTitle = isBuyerConsignee ? 'Покупатель/Грузополучатель' : 'Покупатель';

  return (
    <View style={[styles.partiesContainer, { marginVertical: sc(8) }]}>
      {/* Seller */}
      <View style={[styles.partyCol, styles.partyColLeft]}>
        <Text style={titleSt}>{sellerTitle}</Text>

        {selectedContract ? (
          <>
            <Text style={nameSt}>{selectedContract.sellerName || ''}</Text>
            {selectedContract.sellerLegalAddress && <Text style={txt}>{selectedContract.sellerLegalAddress}</Text>}
            {(selectedContract.sellerInn || task?.client?.inn) && (
              <Text style={txt}>ИНН: {selectedContract.sellerInn || task?.client?.inn}</Text>
            )}
            {selectedContract.sellerOgrn && <Text style={txt}>OGRN: {selectedContract.sellerOgrn}</Text>}

            {selectedContract.sellerDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{selectedContract.sellerDetails}</Text>
            ) : selectedContract.sellerBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>Bank ma'lumotlari:</Text>
                <Text style={txt}>Bank: {selectedContract.sellerBankName}{selectedContract.sellerBankSwift ? `, SWIFT: ${selectedContract.sellerBankSwift}` : ''}</Text>
                {selectedContract.sellerBankAddress && <Text style={txt}>Manzil: {selectedContract.sellerBankAddress}</Text>}
                {selectedContract.sellerBankAccount && <Text style={txt}>Hisob raqami: {selectedContract.sellerBankAccount}</Text>}
                {selectedContract.sellerCorrespondentBank && (
                  <View style={{ marginTop: sc(4) }}>
                    <Text style={txt}>Korrespondent bank: {selectedContract.sellerCorrespondentBank}{selectedContract.sellerCorrespondentBankSwift ? `, SWIFT: ${selectedContract.sellerCorrespondentBankSwift}` : ''}</Text>
                    {selectedContract.sellerCorrespondentBankAccount && <Text style={txt}>Kor. hisob: {selectedContract.sellerCorrespondentBankAccount}</Text>}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={nameSt}>{task?.client?.name || 'Mijoz tanlanmagan'}</Text>
            {task?.client?.address && <Text style={txt}>{task.client.address}</Text>}
            {task?.client?.inn && <Text style={txt}>ИНН: {task.client.inn}</Text>}
            {task?.client?.phone && <Text style={txt}>Tel: {task.client.phone}</Text>}
            {task?.client?.email && <Text style={txt}>Email: {task.client.email}</Text>}
            {task?.client?.bankName && (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>Bank ma'lumotlari:</Text>
                <Text style={txt}>Bank: {task.client.bankName}{task.client.bankSwift ? `, SWIFT: ${task.client.bankSwift}` : ''}</Text>
                {task.client.bankAddress && <Text style={txt}>Manzil: {task.client.bankAddress}</Text>}
                {task.client.bankAccount && <Text style={txt}>Hisob raqami: {task.client.bankAccount}</Text>}
              </View>
            )}
          </>
        )}

        {!isSellerShipper && selectedContract?.shipperName && (
          <View style={{ marginTop: sc(15) }}>
            <Text style={titleSt}>Грузоотправитель/Изготовитель</Text>
            <Text style={nameSt}>{selectedContract.shipperName}</Text>
            {selectedContract.shipperAddress && <Text style={txt}>{selectedContract.shipperAddress}</Text>}
            {selectedContract.shipperInn && <Text style={txt}>ИНН: {selectedContract.shipperInn}</Text>}
            {selectedContract.shipperOgrn && <Text style={txt}>ОГРН: {selectedContract.shipperOgrn}</Text>}
            {selectedContract.shipperDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{selectedContract.shipperDetails}</Text>
            ) : selectedContract.shipperBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>Платежные реквизиты:</Text>
                <Text style={txt}>Банк: {selectedContract.shipperBankName}{selectedContract.shipperBankSwift ? `, SWIFT: ${selectedContract.shipperBankSwift}` : ''}</Text>
                {selectedContract.shipperBankAddress && <Text style={txt}>Адрес: {selectedContract.shipperBankAddress}</Text>}
                {selectedContract.shipperBankAccount && <Text style={txt}>Расчётный счёт: {selectedContract.shipperBankAccount}</Text>}
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
            <Text style={nameSt}>{selectedContract.buyerName || ''}</Text>
            {selectedContract.buyerAddress && <Text style={txt}>{selectedContract.buyerAddress}</Text>}
            {selectedContract.buyerInn && <Text style={txt}>ИНН: {selectedContract.buyerInn}</Text>}
            {selectedContract.buyerOgrn && <Text style={txt}>OGRN: {selectedContract.buyerOgrn}</Text>}
            {selectedContract.buyerDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{selectedContract.buyerDetails}</Text>
            ) : selectedContract.buyerBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>Bank ma'lumotlari:</Text>
                <Text style={txt}>Bank: {selectedContract.buyerBankName}{selectedContract.buyerBankSwift ? `, SWIFT: ${selectedContract.buyerBankSwift}` : ''}</Text>
                {selectedContract.buyerBankAddress && <Text style={txt}>Manzil: {selectedContract.buyerBankAddress}</Text>}
                {selectedContract.buyerBankAccount && <Text style={txt}>Hisob raqami: {selectedContract.buyerBankAccount}</Text>}
                {selectedContract.buyerCorrespondentBank && (
                  <View style={{ marginTop: sc(4) }}>
                    <Text style={txt}>Korrespondent bank: {selectedContract.buyerCorrespondentBank}{selectedContract.buyerCorrespondentBankSwift ? `, SWIFT: ${selectedContract.buyerCorrespondentBankSwift}` : ''}</Text>
                    {selectedContract.buyerCorrespondentBankAccount && <Text style={txt}>Kor. hisob: {selectedContract.buyerCorrespondentBankAccount}</Text>}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={nameSt}>{task?.client?.name || 'Mijoz tanlanmagan'}</Text>
        )}

        {!isBuyerConsignee && selectedContract?.consigneeName && (
          <View style={{ marginTop: sc(15) }}>
            <Text style={titleSt}>Грузополучатель</Text>
            <Text style={nameSt}>{selectedContract.consigneeName}</Text>
            {selectedContract.consigneeAddress && <Text style={txt}>{selectedContract.consigneeAddress}</Text>}
            {selectedContract.consigneeInn && <Text style={txt}>ИНН: {selectedContract.consigneeInn}</Text>}
            {selectedContract.consigneeOgrn && <Text style={txt}>ОГРН: {selectedContract.consigneeOgrn}</Text>}
            {selectedContract.consigneeDetails ? (
              <Text style={[txt, { marginTop: sc(4) }]}>{selectedContract.consigneeDetails}</Text>
            ) : selectedContract.consigneeBankName ? (
              <View style={{ marginTop: sc(4) }}>
                <Text style={bankTitleSt}>Платежные реквизиты:</Text>
                <Text style={txt}>Банк: {selectedContract.consigneeBankName}{selectedContract.consigneeBankSwift ? `, SWIFT: ${selectedContract.consigneeBankSwift}` : ''}</Text>
                {selectedContract.consigneeBankAddress && <Text style={txt}>Адрес: {selectedContract.consigneeBankAddress}</Text>}
                {selectedContract.consigneeBankAccount && <Text style={txt}>Расчётный счёт: {selectedContract.consigneeBankAccount}</Text>}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};
