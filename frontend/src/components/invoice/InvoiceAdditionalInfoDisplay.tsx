import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { CopyIconButton } from '../CopyIconButton';
import type { ViewTab } from './types';

interface InvoiceAdditionalInfoDisplayProps {
  form: any;
  viewTab: ViewTab;
  selectedContract: any;
  isBuyerConsignee: boolean;
  isAdditionalInfoVisible: (key: string) => boolean;
  customFields: { id: string; label: string; value: string }[];
  specCustomFields: { id: string; label: string; value: string }[];
  addressCopySuccess: boolean;
  setAddressCopySuccess: (v: boolean) => void;
  setShowAdditionalInfoModal: (v: boolean) => void;
  additionalFieldsOrder?: string[];
}

export const InvoiceAdditionalInfoDisplay: React.FC<InvoiceAdditionalInfoDisplayProps> = React.memo(({
  form,
  viewTab,
  selectedContract,
  isBuyerConsignee,
  isAdditionalInfoVisible,
  customFields,
  specCustomFields,
  addressCopySuccess,
  setAddressCopySuccess,
  setShowAdditionalInfoModal,
  additionalFieldsOrder,
}) => {
  const fieldOrder = useMemo(() => {
    const order = additionalFieldsOrder ? [...additionalFieldsOrder] : [];
    const baseFields = ['shipmentPlace', 'destination', 'origin', 'manufacturer', 'orderNumber', 'gln', 'temperature', 'harvestYear'];
    const activeOrder = order.length > 0 ? order : [...baseFields];
    const customKeys = customFields.map(f => `custom_${f.id}`);
    const allActiveKeys = new Set([...baseFields, ...customKeys]);
    
    let merged = activeOrder.filter(key => allActiveKeys.has(key));
    
    customKeys.forEach(key => {
      if (!merged.includes(key)) {
        const tempIdx = merged.indexOf('temperature');
        if (tempIdx !== -1) {
          merged.splice(tempIdx, 0, key);
        } else {
          merged.push(key);
        }
      }
    });
    
    baseFields.forEach(key => {
      if (!merged.includes(key)) {
        merged.push(key);
      }
    });
    
    return merged;
  }, [additionalFieldsOrder, customFields]);

  const renderFieldByKey = (key: string) => {
    switch (key) {
      case 'shipmentPlace':
        return isAdditionalInfoVisible('shipmentPlace') && form.shipmentPlace ? (
          <div key={key}>
            <strong>Место отгрузки груза:</strong> {form.shipmentPlace}
          </div>
        ) : null;
      case 'destination':
        return isAdditionalInfoVisible('destination') && form.destination ? (
          <div key={key}>
            <strong>Место назначения:</strong> {form.destination}
          </div>
        ) : null;
      case 'origin':
        return isAdditionalInfoVisible('origin') ? (
          <div key={key}>
            <strong>Происхождение товара:</strong> {form.origin || 'Республика Узбекистан'}
          </div>
        ) : null;
      case 'manufacturer':
        return isAdditionalInfoVisible('manufacturer') && form.manufacturer ? (
          <div key={key}>
            <strong>Производитель:</strong> {form.manufacturer}
          </div>
        ) : null;
      case 'orderNumber':
        return isAdditionalInfoVisible('orderNumber') && form.orderNumber ? (
          <div key={key}>
            <strong>Номер заказа:</strong> {form.orderNumber}
          </div>
        ) : null;
      case 'gln':
        return isAdditionalInfoVisible('gln') && form.gln ? (
          <div key={key}>
            <strong>Глобальный идентификационный номер GS1 (GLN):</strong> {form.gln}
          </div>
        ) : null;
      case 'temperature':
        return isAdditionalInfoVisible('temperature') && form.temperature ? (
          <div key={key}>
            <strong>Температура:</strong> {form.temperature}
          </div>
        ) : null;
      case 'harvestYear':
        return isAdditionalInfoVisible('harvestYear') && form.harvestYear ? (
          <div key={key}>
            <strong>Урожай:</strong> {form.harvestYear}
          </div>
        ) : null;
      default:
        if (key.startsWith('custom_')) {
          const fieldId = key.replace('custom_', '');
          const field = customFields.find(f => f.id === fieldId);
          if (!field) return null;
          return isAdditionalInfoVisible(`custom_${field.id}`) && field.value ? (
            <div key={field.id}>
              <strong>{field.label}:</strong> {field.value}
            </div>
          ) : null;
        }
        return null;
    }
  };

  return (
    <div className="mb-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Дополнительная информация</h3>
        <div className="flex items-center gap-2 no-screenshot">
          {!isBuyerConsignee && selectedContract?.consigneeName && (
            <button
              type="button"
              onClick={async () => {
                const parts: string[] = [];
                if (selectedContract) {
                  const gruzManzil = (selectedContract.consigneeAddress ?? '').trim().replace(/\n/g, ' ');
                  if (gruzManzil) parts.push(gruzManzil);
                  parts.push('п/п.');
                  const buyerName = (selectedContract.buyerName ?? '').trim();
                  if (buyerName) parts.push(buyerName);
                  const buyerAddr = (selectedContract.buyerAddress ?? '').trim();
                  if (buyerAddr) parts.push(buyerAddr);
                }
                const text = parts.join(' ');
                if (text) {
                  try {
                    await navigator.clipboard.writeText(text);
                    setAddressCopySuccess(true);
                    window.setTimeout(() => setAddressCopySuccess(false), 2000);
                  } catch {
                    alert('Nusxalashda xatolik');
                  }
                } else {
                  alert('Nusxalash uchun ma\'lumot yo\'q');
                }
              }}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 text-sm ${addressCopySuccess
                ? 'bg-green-500 text-white scale-110 shadow-lg shadow-green-500/40'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              title="Грузополучатель manzili + п/п. + Покупатель nomi + Покупатель manzili"
            >
              {addressCopySuccess ? (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <Icon icon="lucide:copy" className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdditionalInfoModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Tahrirlash
          </button>
        </div>
      </div>
      <div
        className="p-4 pt-0 rounded-lg text-base text-black space-y-1"
        style={{ backgroundColor: 'var(--tw-ring-offset-color)', background: 'unset' }}
      >
        {isAdditionalInfoVisible('deliveryTerms') && form.deliveryTerms && (
          <div>
            <strong>Условия поставки:</strong> {form.deliveryTerms}
          </div>
        )}
        {isAdditionalInfoVisible('vehicleNumber') && form.vehicleNumber && (
          <div className="flex items-center gap-2">
            <div>
              <strong>Номер автотранспорта:</strong> {form.vehicleNumber}
            </div>
            <div className="no-screenshot">
              <CopyIconButton 
                textToCopy={form.vehicleNumber} 
                toastMessage="Avtomobil raqami nusxalandi" 
              />
            </div>
          </div>
        )}
        {isAdditionalInfoVisible('customsAddress') && form.customsAddress && (
          <div>
            <strong>Место там. очистки:</strong> {form.customsAddress}
          </div>
        )}

        {viewTab === 'spec' ? (
          specCustomFields.map((field) =>
            isAdditionalInfoVisible(`spec_${field.id}`) && field.value ? (
              <div key={field.id}>
                <strong>{field.label}:</strong> {field.value}
              </div>
            ) : null
          )
        ) : (
          fieldOrder.map((key) => renderFieldByKey(key))
        )}
      </div>
    </div>
  );
});
