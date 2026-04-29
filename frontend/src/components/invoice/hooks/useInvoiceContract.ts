import { useCallback } from 'react';
import apiClient from '../../../lib/api';
import type { SpecRow } from '../types';

type DeliveryTermsHook = {
  getDeliveryTermsContractKey: () => string;
  mergeDeliveryTerms: (contractTerms: string[], stored: string[]) => string[];
  loadDeliveryTerms: (key: string) => string[];
};

interface UseInvoiceContractParams {
  setSelectedContractId: (id: string) => void;
  setSelectedContractSpec: (spec: SpecRow[]) => void;
  setSelectedContractCurrency: (currency: string) => void;
  setItems: (updater: (prev: any[]) => any[]) => void;
  setContractDeliveryTerms: (terms: string[]) => void;
  setForm: (updater: (prev: any) => any) => void;
  setDeliveryTermsOptions: (terms: string[]) => void;
  deliveryTermsHook: DeliveryTermsHook;
  // handleMarkInvoysReady deps
  taskId: string | undefined;
  invoice: { taskId?: number } | null;
  setInvoysStageReady: (ready: boolean) => void;
  setMarkingReady: (marking: boolean) => void;
  setContracts: (updater: (prev: any[]) => any[]) => void;
}

export function useInvoiceContract({
  setSelectedContractId,
  setSelectedContractSpec,
  setSelectedContractCurrency,
  setItems,
  setContractDeliveryTerms,
  setForm,
  setDeliveryTermsOptions,
  deliveryTermsHook,
  taskId,
  invoice,
  setInvoysStageReady,
  setMarkingReady,
  setContracts,
}: UseInvoiceContractParams) {
  const { getDeliveryTermsContractKey, mergeDeliveryTerms, loadDeliveryTerms } = deliveryTermsHook;

  const handleContractSelect = useCallback(async (contractId: string) => {
    setSelectedContractId(contractId);

    if (!contractId) {
      setSelectedContractSpec([]);
      setSelectedContractCurrency('USD');
      return;
    }

    try {
      const response = await apiClient.get(`/contracts/${contractId}`);
      const contract = response.data;
      setContracts((prev: any[]) => {
        if (prev.some(c => c.id === contract.id)) {
          return prev.map(c => c.id === contract.id ? contract : c);
        }
        return [...prev, contract];
      });

      let spec: SpecRow[] = [];
      if (contract.specification) {
        if (Array.isArray(contract.specification)) spec = contract.specification;
        else if (typeof contract.specification === 'string') {
          try { spec = JSON.parse(contract.specification); } catch { spec = []; }
        }
      }
      setSelectedContractSpec(spec);
      // Shartnoma spetsifikatsiyasi faqat fallback lookup uchun saqlanadi,
      // invoys qatorlarini avtomatik qayta yozmaydi.

      // Shartnoma ma'lumotlarini invoice form'ga to'ldirish
      const dtArr = String(contract.deliveryTerms || '').split('\n').map((s: string) => s.trim());
      const caArr = String(contract.customsAddress || '').split('\n').map((s: string) => s.trim());
      const maxLen = Math.max(dtArr.length, caArr.length);
      while (dtArr.length < maxLen) dtArr.push('');
      while (caArr.length < maxLen) caArr.push('');
      const deliveryTermsList = dtArr.filter(Boolean);
      const firstDt = deliveryTermsList[0] || dtArr[0] || '';
      const pairedCustoms = firstDt ? (() => { const i = dtArr.indexOf(firstDt); return i >= 0 && caArr[i]?.trim() ? caArr[i].trim() : ''; })() : '';
      setContractDeliveryTerms(deliveryTermsList.length ? deliveryTermsList : (firstDt ? [firstDt] : []));
      const contractCurrency = (contract.contractCurrency && ['USD', 'RUB', 'EUR'].includes(contract.contractCurrency)) ? contract.contractCurrency : 'USD';
      setSelectedContractCurrency(contractCurrency);
      setForm((prev: any) => ({
        ...prev,
        contractNumber: contract.contractNumber,
        paymentTerms: contract.deliveryTerms || '',
        deliveryTerms: firstDt || prev.deliveryTerms,
        customsAddress: pairedCustoms,
        gln: contract.gln != null ? contract.gln : prev.gln,
      }));
      const deliveryTermsKey = getDeliveryTermsContractKey();
      const mergedDeliveryTerms = mergeDeliveryTerms(deliveryTermsList, loadDeliveryTerms(deliveryTermsKey));
      setDeliveryTermsOptions(mergedDeliveryTerms);

      if (contract.paymentMethod) {
        setForm((prev: any) => ({
          ...prev,
          additionalInfo: {
            ...prev.additionalInfo,
            paymentMethod: contract.paymentMethod,
          }
        }));
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      alert('Shartnoma ma\'lumotlarini yuklashda xatolik yuz berdi');
    }
  }, [setSelectedContractId, setSelectedContractSpec, setSelectedContractCurrency, setItems, setContractDeliveryTerms, setForm, setDeliveryTermsOptions, getDeliveryTermsContractKey, mergeDeliveryTerms, loadDeliveryTerms, setContracts]);

  const handleMarkInvoysReady = useCallback(async () => {
    const tid = taskId || invoice?.taskId;
    if (!tid) {
      alert('Task topilmadi');
      return;
    }
    try {
      setMarkingReady(true);
      const stagesRes = await apiClient.get(`/tasks/${tid}/stages`);
      const stages = stagesRes.data as Array<{ id: number; name: string; status: string }>;
      const invoysStage = stages.find((s) => s.name === 'Invoys');
      if (!invoysStage) {
        alert('Invoys jarayoni topilmadi');
        return;
      }
      if (invoysStage.status === 'TAYYOR') {
        alert('Invoys jarayoni allaqachon tayyor');
        return;
      }
      await apiClient.patch(`/tasks/${tid}/stages/${invoysStage.id}`, { status: 'TAYYOR' });
      setInvoysStageReady(true);
      alert('Invoys jarayoni tayyor qilindi');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Invoys jarayonini tayyor qilishda xatolik');
    } finally {
      setMarkingReady(false);
    }
  }, [taskId, invoice, setInvoysStageReady, setMarkingReady]);

  return { handleContractSelect, handleMarkInvoysReady };
}
