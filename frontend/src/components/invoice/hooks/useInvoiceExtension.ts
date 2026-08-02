import { useEffect } from 'react';
import type { InvoiceItem, Contract } from '../types';

interface ExtensionForm {
  [key: string]: any;
}


/**
 * Chrome extension (AutoFill) integratsiyasi.
 * Extension `PRODEKLARANT_REQUEST_INVOICE` postMessage yuborganda,
 * javob sifatida PRODEKLARANT_INVOICE_DATA qaytaradi.
 */
export function useInvoiceExtension(
  form: ExtensionForm | null,
  items: InvoiceItem[],
  contracts: Contract[],
  selectedContractId: string,
) {
  useEffect(() => {
    const handleExtensionRequest = (event: MessageEvent) => {
      if (event.data?.type !== 'PRODEKLARANT_REQUEST_INVOICE') return;
      if (!form || items.length === 0) return;

      const selectedContract = contracts.find(c => c.id.toString() === selectedContractId);

      const isSellerShipper = !selectedContract?.shipperName || selectedContract.shipperName.trim() === selectedContract.sellerName.trim();
      const exppnNm = isSellerShipper ? (selectedContract?.sellerName || '') : (selectedContract?.shipperName || selectedContract?.sellerName || '');
      const exppnAddr = isSellerShipper 
        ? (selectedContract?.sellerLegalAddress || '') 
        : [selectedContract?.shipperAddress || '', `п/п ${selectedContract?.sellerName || ''}`].filter(Boolean).join('. ');
      const exppnAddrClean = isSellerShipper ? (selectedContract?.sellerLegalAddress || '') : (selectedContract?.shipperAddress || '');
      const st1GrzAddr = isSellerShipper
        ? (selectedContract?.sellerLegalAddress || '')
        : [selectedContract?.shipperAddress || '', `п/п ${selectedContract?.sellerName || ''} ${selectedContract?.sellerLegalAddress || ''}`.trim()].filter(Boolean).join('\n');

      // Sotib oluvchi (buyer) va yuk qabul qiluvchi (consignee) boshqa-boshqa korxona bo'lsa,
      // IMPPN maydonlariga yuk qabul qiluvchi ma'lumotlari + "п/п." orqali sotib oluvchi qo'shiladi.
      const isBuyerConsignee = !selectedContract?.consigneeName
        || selectedContract.consigneeName.trim() === (selectedContract.buyerName || '').trim();
      const imppnNm = isBuyerConsignee
        ? (selectedContract?.buyerName || '')
        : (selectedContract?.consigneeName || selectedContract?.buyerName || '');
      // singlewindow.uz IMPPN_ADDR: yuk qabul qiluvchi manzili + " п/п. " + sotib oluvchi nomi
      const imppnAddr = isBuyerConsignee
        ? (selectedContract?.buyerAddress || '')
        : `${selectedContract?.consigneeAddress || ''} п/п. ${selectedContract?.buyerName || ''}`.replace(/\s+/g, ' ').trim();
      // expertiza.uz ГрузополучательАдрес: yuk qabul qiluvchi manzili + " п/п. " + sotib oluvchi nomi + sotib oluvchi manzili
      const imppnAddrSt1 = isBuyerConsignee
        ? (selectedContract?.buyerAddress || '')
        : `${selectedContract?.consigneeAddress || ''} п/п. ${selectedContract?.buyerName || ''} ${selectedContract?.buyerAddress || ''}`.replace(/\s+/g, ' ').trim();

      const exportData = {
        EXPPN_NM: exppnNm,
        EXPPN_ADDR: exppnAddr,
        EXPPN_ADDR_CLEAN: exppnAddrClean,
        ST1_GRZ_ADDR: st1GrzAddr,
        EXPPN_REGN_TP_NM: form.fssRegionName || '',
        IMPPN_NM: imppnNm,
        IMPPN_ADDR: imppnAddr,
        IMPPN_ADDR_ST1: imppnAddrSt1,
        // app.expertiza.uz "Yuk qabul qiluvchi davlat" ro'yxati ruscha —
        // shartnomadagi davlat nomi shu ro'yxatga moslashtiriladi
        DESTINATION_COUNTRY: selectedContract?.destinationCountry || '',
        EXP_CTDC_NO: (selectedContract?.contractNumber || form.contractNumber || form.invoiceNumber) || '',
        EXP_CVNT_DT: (selectedContract?.contractDate ? String(selectedContract.contractDate).split('T')[0] : (form.date ? String(form.date).split('T')[0] : '')) || '',
        vehicleNumber: form.vehicleNumber || '',
        items: items.map(item => ({
          tnved: item.tnvedCode || '',
          name: item.name || '',
          net: item.netWeight || '',
          gross: item.grossWeight || '',
          quantity: item.quantity || 0,
          packagesCount: item.packagesCount || 0,
        })),
      };

      window.postMessage({ type: 'PRODEKLARANT_INVOICE_DATA', payload: exportData }, '*');
    };

    window.addEventListener('message', handleExtensionRequest);
    return () => {
      window.removeEventListener('message', handleExtensionRequest);
      sessionStorage.removeItem('current_export_invoice');
    };
  }, [form, items, contracts, selectedContractId]);
}
