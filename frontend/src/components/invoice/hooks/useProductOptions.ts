import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiClient from '../../../lib/api';
import { getTnvedProducts } from '../../../utils/tnvedProducts';
import type { SpecRow } from '../types';

/**
 * TNVED mahsulotlar va qadoq turlarini yuklash va taklif qilish.
 */
export function useProductOptions(selectedContractSpec: SpecRow[]) {
  const [tnvedProducts, setTnvedProducts] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [packagingTypes, setPackagingTypes] = useState<Array<{ id: string; name: string; code?: string }>>([]);

  const loadPackagingTypes = useCallback(async () => {
    try {
      const res = await apiClient.get<Array<{ id: string; name: string; code?: string }>>('/packaging-types');
      setPackagingTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPackagingTypes([]);
    }
  }, []);

  useEffect(() => {
    const loadTnved = async () => {
      try {
        const products = await getTnvedProducts();
        setTnvedProducts(products);
      } catch {
        setTnvedProducts([]);
      }
    };
    loadTnved();
    loadPackagingTypes();
  }, [loadPackagingTypes]);

  // Focus orqali throttled qayta yuklash
  const lastPackagingLoadRef = useRef<number>(0);
  useEffect(() => {
    const throttledLoad = () => {
      if (Date.now() - lastPackagingLoadRef.current < 60_000) return;
      lastPackagingLoadRef.current = Date.now();
      loadPackagingTypes();
    };
    window.addEventListener('focus', throttledLoad);
    return () => window.removeEventListener('focus', throttledLoad);
  }, [loadPackagingTypes]);

  /** Shartnoma tanlanganda shu shartnoma spetsifikatsiyasidagi mahsulotlar, aks holda global TNVED ro'yxati. */
  const invoiceProductOptions = useMemo(() => {
    if (selectedContractSpec.length > 0) {
      return selectedContractSpec
        .map((r, i) => ({
          id: `spec-${i}`,
          name: (r.productName || '').trim(),
          code: (r.tnvedCode || '').trim(),
        }))
        .filter((p) => p.name !== '');
    }
    return tnvedProducts;
  }, [selectedContractSpec, tnvedProducts]);

  return {
    tnvedProducts,
    packagingTypes,
    invoiceProductOptions,
    loadPackagingTypes,
  };
}
