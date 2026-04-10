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

      const exportData = {
        EXPPN_NM: selectedContract?.sellerName || '',
        EXPPN_ADDR: selectedContract?.sellerLegalAddress || '',
        EXPPN_REGN_TP_NM: form.fssRegionName || '',
        IMPPN_NM: selectedContract?.buyerName || '',
        IMPPN_ADDR: selectedContract?.buyerAddress || '',
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
