// Delivery terms va Column labels boshqaruv hook'i

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../lib/api';
import type { ColumnLabels } from './types';
import { DEFAULT_COLUMN_LABELS } from './types';

// --- localStorage key generatorlar ---

const getDeliveryTermsKey = (contractKey: string) => `invoice_delivery_terms_${contractKey}`;
const getColumnLabelsKey = (contractKey: string) => `invoice_column_labels_${contractKey}`;

// --- Pure helpers ---

const loadDeliveryTerms = (contractKey: string): string[] => {
  try {
    const raw = localStorage.getItem(getDeliveryTermsKey(contractKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    }
    return [];
  } catch {
    return [];
  }
};

const mergeDeliveryTerms = (contractTerms: string[], storedTerms: string[]) => {
  const merged: string[] = [];
  const seen = new Set<string>();
  const addUnique = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    merged.push(trimmed);
  };
  contractTerms.forEach(addUnique);
  storedTerms.forEach(addUnique);
  return merged;
};

const loadColumnLabels = (contractKey: string): ColumnLabels => {
  try {
    const raw = localStorage.getItem(getColumnLabelsKey(contractKey));
    if (!raw) return { ...DEFAULT_COLUMN_LABELS };
    const parsed = JSON.parse(raw) as Record<string, string>;
    return { ...DEFAULT_COLUMN_LABELS, ...parsed };
  } catch {
    return { ...DEFAULT_COLUMN_LABELS };
  }
};

// --- Hook ---

interface UseDeliveryTermsParams {
  selectedContractId: string;
  contractIdFromQuery: string | null | undefined;
}

export const useDeliveryTerms = ({ selectedContractId, contractIdFromQuery }: UseDeliveryTermsParams) => {
  const getContractKey = useCallback(
    () => String(selectedContractId || contractIdFromQuery || 'default'),
    [selectedContractId, contractIdFromQuery]
  );

  const [deliveryTermsOptions, setDeliveryTermsOptions] = useState(() =>
    loadDeliveryTerms(getContractKey())
  );
  const [contractDeliveryTerms, setContractDeliveryTerms] = useState<string[]>([]);
  const [columnLabels, setColumnLabels] = useState(() => loadColumnLabels('default'));

  // deliveryTermsOptions -> localStorage ga saqlash
  useEffect(() => {
    const key = getContractKey();
    localStorage.setItem(getDeliveryTermsKey(key), JSON.stringify(deliveryTermsOptions));
  }, [deliveryTermsOptions, getContractKey]);

  // columnLabels -> localStorage ga saqlash
  useEffect(() => {
    const key = String(selectedContractId || 'default');
    localStorage.setItem(getColumnLabelsKey(key), JSON.stringify(columnLabels));
  }, [columnLabels, selectedContractId]);

  // Shartnoma o'zgarganda — columnLabels va deliveryTermsOptions ni yangilash
  useEffect(() => {
    const key = getContractKey();
    setColumnLabels(loadColumnLabels(key));
    setDeliveryTermsOptions(mergeDeliveryTerms(contractDeliveryTerms, loadDeliveryTerms(key)));
  }, [selectedContractId, contractIdFromQuery, contractDeliveryTerms, getContractKey]);

  // Delivery terms ni backendga saqlash
  const persistDeliveryTermsToContract = useCallback(
    async (terms: string[]): Promise<boolean> => {
      const contractIdValue = selectedContractId || contractIdFromQuery;
      const contractIdNumber = contractIdValue ? Number(contractIdValue) : NaN;
      if (!Number.isFinite(contractIdNumber)) return false;
      try {
        await apiClient.patch(`/contracts/${contractIdNumber}/delivery-terms`, {
          deliveryTerms: terms.join('\n') || undefined,
        });
        return true;
      } catch (error) {
        console.error('Error saving delivery terms:', error);
        return false;
      }
    },
    [selectedContractId, contractIdFromQuery]
  );

  // Yangi delivery term qo'shish
  const addDeliveryTermOption = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (contractDeliveryTerms.includes(trimmed)) return;
      const next = [...contractDeliveryTerms, trimmed];
      setContractDeliveryTerms(next);
      setDeliveryTermsOptions(next);
      const key = getContractKey();
      localStorage.setItem(getDeliveryTermsKey(key), JSON.stringify(next));
      const ok = await persistDeliveryTermsToContract(next);
      if (!ok) {
        alert("Условия поставки shartnomaga saqlanmadi. Qaytadan urinib ko'ring yoki administrator bilan bog'laning.");
      }
    },
    [contractDeliveryTerms, getContractKey, persistDeliveryTermsToContract]
  );

  return {
    deliveryTermsOptions,
    setDeliveryTermsOptions,
    contractDeliveryTerms,
    setContractDeliveryTerms,
    columnLabels,
    setColumnLabels,
    addDeliveryTermOption,
    persistDeliveryTermsToContract,
    // Helper larni tashqariga chiqarish (loadData va handleContractSelect ichida ishlatiladi)
    mergeDeliveryTerms,
    loadDeliveryTerms: (key?: string) => loadDeliveryTerms(key ?? getContractKey()),
    loadColumnLabels,
    getContractKey,
  };
};
