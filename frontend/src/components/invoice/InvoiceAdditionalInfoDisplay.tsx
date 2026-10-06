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
  packingCustomFields: { id: string; label: string; value: string }[];
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
  packingCustomFields,
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
    
    const merged = activeOrder.filter(key => allActiveKeys.has(key));
    
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

  interface InfoRow {
    key: string;
    label: string;
    value: string;
    copyText?: string;
  }

  /** Asosiy maydonlarning yorlig'i va qiymati; ko'rinmas yoki bo'sh maydon null qaytaradi */
  const rowByKey = (key: string): InfoRow | null => {
    const simple = (label: string, value: string | undefined): InfoRow | null =>
      isAdditionalInfoVisible(key) && value ? { key, label, value } : null;

    switch (key) {
      case 'shipmentPlace':
        return simple('Место отгрузки груза', form.shipmentPlace);
      case 'destination':
        return simple('Место назначения', form.destination);
      case 'origin':
        return isAdditionalInfoVisible('origin')
          ? { key, label: 'Происхождение товара', value: form.origin || 'Республика Узбекистан' }
          : null;
      case 'manufacturer':
        return simple('Производитель', form.manufacturer);
      case 'orderNumber':
        return simple('Номер заказа', form.orderNumber);
      case 'gln':
        return simple('Глобальный идентификационный номер GS1 (GLN)', form.gln);
      case 'temperature':
        return simple('Температура', form.temperature);
      case 'harvestYear':
        return simple('Урожай', form.harvestYear);
      default: {
        if (!key.startsWith('custom_')) return null;
        const field = customFields.find((f) => f.id === key.replace('custom_', ''));
        return field && isAdditionalInfoVisible(`custom_${field.id}`) && field.value
          ? { key, label: field.label, value: field.value }
          : null;
      }
    }
  };

  const rows: InfoRow[] = [
    isAdditionalInfoVisible('deliveryTerms') && form.deliveryTerms
      ? { key: 'deliveryTerms', label: 'Условия поставки', value: form.deliveryTerms }
      : null,
    isAdditionalInfoVisible('vehicleNumber') && form.vehicleNumber
      ? { key: 'vehicleNumber', label: 'Номер автотранспорта', value: form.vehicleNumber, copyText: form.vehicleNumber }
      : null,
    isAdditionalInfoVisible('customsAddress') && form.customsAddress
      ? { key: 'customsAddress', label: 'Место там. очистки', value: form.customsAddress }
      : null,
    ...fieldOrder.map(rowByKey),
    // Упаковочный лист maydonlari — faqat shu tabda
    ...(viewTab === 'packing'
      ? packingCustomFields.map((field): InfoRow | null =>
          isAdditionalInfoVisible(`packing_${field.id}`) && field.value
            ? { key: `packing_${field.id}`, label: field.label, value: field.value }
            : null
        )
      : []),
  ].filter((row): row is InfoRow => row !== null);

  const copyAddress = async () => {
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
    if (!text) {
      toast.error("Nusxalash uchun ma'lumot yo'q");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setAddressCopySuccess(true);
      window.setTimeout(() => setAddressCopySuccess(false), 2000);
    } catch {
      toast.error('Nusxalashda xatolik');
    }
  };

  return (
    <div className="mb-0 overflow-hidden rounded-2xl border border-[#E3E5EE] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECEEF4] px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <h3 className="m-0 text-lg font-semibold leading-tight tracking-tight text-[#151827]">Дополнительная информация</h3>
          <span className="no-screenshot flex h-6 shrink-0 items-center rounded-full bg-[#EEF0FB] px-2.5 text-xs font-semibold text-[#3F3BC4]">
            {rows.length} ta maydon
          </span>
        </div>
        <div className="no-screenshot flex items-center gap-2">
          {!isBuyerConsignee && selectedContract?.consigneeName && (
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Manzilni nusxalash"
              title="Грузополучатель manzili + п/п. + Покупатель nomi + Покупатель manzili"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                addressCopySuccess ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Icon icon={addressCopySuccess ? 'solar:check-circle-bold-duotone' : 'solar:copy-bold-duotone'} className="h-[18px] w-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdditionalInfoModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#D5D8E6] bg-white px-4 text-sm font-semibold text-[#151827] transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Icon icon="solar:pen-bold-duotone" className="h-4 w-4" />
            Tahrirlash
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="m-0 px-6 pb-1 pt-0">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex min-h-8 items-center gap-4 border-b border-[#F0F1F6] py-1 last:border-b-0"
            >
              <dt className="w-[300px] shrink-0 text-sm leading-snug text-[#5B6178]">{row.label}:</dt>
              <dd className="m-0 flex min-w-0 flex-1 items-center gap-2.5 text-[15px] font-medium leading-snug text-[#151827]">
                <span className="min-w-0 break-words">{row.value}</span>
                {row.copyText && (
                  <span className="no-screenshot">
                    <CopyIconButton
                      textToCopy={row.copyText}
                      toastMessage="Avtomobil raqami nusxalandi"
                      className="!h-7 !w-7 !rounded-lg !bg-indigo-600 !p-0 !text-white hover:!bg-indigo-700"
                    />
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
});
