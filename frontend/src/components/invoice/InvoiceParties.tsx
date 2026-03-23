import React from 'react';
import type { Contract } from './types';

interface InvoicePartiesProps {
  selectedContractId: string;
  contracts: Contract[];
  selectedContract: Contract | undefined;
  task: any;
  isSellerShipper: boolean;
  isBuyerConsignee: boolean;
}

export const InvoiceParties: React.FC<InvoicePartiesProps> = ({
  selectedContractId,
  contracts,
  selectedContract,
  task,
  isSellerShipper,
  isBuyerConsignee,
}) => {
  const contract = contracts.find(c => c.id.toString() === selectedContractId);

  return (
    <div className="mb-2.5 grid grid-cols-2 gap-8">

      <div>

        <h3 className="font-semibold text-gray-800 mb-2">
          {isSellerShipper ? 'Продавец/Грузоотправитель' : 'Sotuvchi'}
        </h3>

        <div className="text-[15px] text-black space-y-1">

          {selectedContractId && contract ? (

            <>

              <div className="text-base font-bold text-black">

                {contract?.sellerName}

              </div>

              {contract?.sellerLegalAddress && (

                <div className="whitespace-pre-line">{contract?.sellerLegalAddress}</div>

              )}

              {(contract?.sellerInn || task?.client?.inn) && (
                <div>
                  INN: {contract?.sellerInn || task?.client?.inn}
                  {!contract?.sellerInn && task?.client?.inn && (
                    <span className="text-gray-500 text-sm"> (mijoz INN, Deklaratsiya Excel da ishlatiladi)</span>
                  )}
                </div>
              )}

              {contract?.sellerOgrn && (

                <div>OGRN: {contract?.sellerOgrn}</div>

              )}

              {contract?.sellerDetails ? (
                <div className="mt-2">
                  <div className="whitespace-pre-line text-black">{contract?.sellerDetails}</div>
                </div>
              ) : contract?.sellerBankName && (
                <div className="mt-2">

                  <div className="text-base font-bold text-black">Bank ma'lumotlari:</div>

                  <div>
                    Bank: {contract?.sellerBankName}
                    {contract?.sellerBankSwift && (
                      <span>, SWIFT: {contract?.sellerBankSwift}</span>
                    )}
                  </div>
                  {contract?.sellerBankAddress && (

                    <div>Manzil: {contract?.sellerBankAddress}</div>

                  )}

                  {contract?.sellerBankAccount && (

                    <div>Hisob raqami: {contract?.sellerBankAccount}</div>

                  )}

                  {contract?.sellerCorrespondentBank && (

                    <div className="mt-1">

                      <div>
                        Korrespondent bank: {contract?.sellerCorrespondentBank}
                        {contract?.sellerCorrespondentBankSwift && (
                          <span>, SWIFT: {contract?.sellerCorrespondentBankSwift}</span>
                        )}
                      </div>
                      {contract?.sellerCorrespondentBankAccount && (

                        <div>Kor. hisob: {contract?.sellerCorrespondentBankAccount}</div>

                      )}

                    </div>

                  )}

                </div>

              )}

            </>

          ) : (

            <>

              <div className="text-base font-bold text-black">{task?.client?.name || 'Mijoz tanlanmagan'}</div>

              {task?.client?.address && <div>{task.client.address}</div>}

              {task?.client?.inn && <div>INN: {task.client.inn}</div>}

              {task?.client?.phone && <div>Tel: {task.client.phone}</div>}

              {task?.client?.email && <div>Email: {task.client.email}</div>}

              {task?.client?.bankName && (

                <div className="mt-2">

                  <div className="text-base font-bold text-black">Bank ma'lumotlari:</div>

                  <div>
                    Bank: {task.client.bankName}
                    {task.client.bankSwift && <span>, SWIFT: {task.client.bankSwift}</span>}
                  </div>
                  {task.client.bankAddress && <div>Manzil: {task.client.bankAddress}</div>}

                  {task.client.bankAccount && <div>Hisob raqami: {task.client.bankAccount}</div>}

                </div>

              )}

            </>

          )}

        </div>

      </div>

      <div>

        <h3 className="font-semibold text-gray-800 mb-2">
          {isBuyerConsignee ? 'Покупатель/Грузополучатель' : 'Покупатель'}
        </h3>

        <div className="text-[15px] text-black space-y-1">

          {selectedContractId && contract ? (

            <>

              <div className="text-base font-bold text-black">

                {contract?.buyerName}

              </div>

              {contract?.buyerAddress && (

                <div className="whitespace-pre-line">{contract?.buyerAddress}</div>

              )}

              {contract?.buyerInn && (

                <div>INN: {contract?.buyerInn}</div>

              )}

              {contract?.buyerOgrn && (

                <div>OGRN: {contract?.buyerOgrn}</div>

              )}

              {contract?.buyerDetails ? (
                <div className="mt-2">
                  <div className="whitespace-pre-line text-black">{contract?.buyerDetails}</div>
                </div>
              ) : contract?.buyerBankName && (
                <div className="mt-2">

                  <div className="text-base font-bold text-black">Bank ma'lumotlari:</div>

                  <div>
                    Bank: {contract?.buyerBankName}
                    {contract?.buyerBankSwift && (
                      <span>, SWIFT: {contract?.buyerBankSwift}</span>
                    )}
                  </div>
                  {contract?.buyerBankAddress && (

                    <div>Manzil: {contract?.buyerBankAddress}</div>

                  )}

                  {contract?.buyerBankAccount && (

                    <div>Hisob raqami: {contract?.buyerBankAccount}</div>

                  )}

                  {contract?.buyerCorrespondentBank && (

                    <div className="mt-1">

                      <div>
                        Korrespondent bank: {contract?.buyerCorrespondentBank}
                        {contract?.buyerCorrespondentBankSwift && (
                          <span>, SWIFT: {contract?.buyerCorrespondentBankSwift}</span>
                        )}
                      </div>
                      {contract?.buyerCorrespondentBankAccount && (

                        <div>Kor. hisob: {contract?.buyerCorrespondentBankAccount}</div>

                      )}

                    </div>

                  )}

                </div>

              )}

            </>

          ) : (

            task?.client?.name || 'Mijoz tanlanmagan'

          )}

        </div>

        {/* Грузополучатель — sotib oluvchi va yukni qabul qiluvchi boshqa bo'lsa */}
        {!isBuyerConsignee && selectedContract?.consigneeName && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-2">Грузополучатель</h3>
            <div className="text-[15px] text-black space-y-1">
              <div className="text-base font-bold text-black">{selectedContract.consigneeName}</div>
              {selectedContract.consigneeAddress && <div>{selectedContract.consigneeAddress}</div>}
              {selectedContract.consigneeInn && <div>ИНН: {selectedContract.consigneeInn}</div>}
              {selectedContract.consigneeOgrn && <div>ОГРН: {selectedContract.consigneeOgrn}</div>}
              {selectedContract.consigneeDetails ? (
                <div className="mt-2">
                  <div className="whitespace-pre-line text-black">{selectedContract.consigneeDetails}</div>
                </div>
              ) : (selectedContract.consigneeBankName && (
                <div className="mt-2">
                  <div className="text-base font-bold text-black">Платежные реквизиты:</div>
                  <div>
                    Банк: {selectedContract.consigneeBankName}
                    {selectedContract.consigneeBankSwift && <span>, SWIFT: {selectedContract.consigneeBankSwift}</span>}
                  </div>
                  {selectedContract.consigneeBankAddress && <div>Адрес: {selectedContract.consigneeBankAddress}</div>}
                  {selectedContract.consigneeBankAccount && <div>Расчётный счёт: {selectedContract.consigneeBankAccount}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
