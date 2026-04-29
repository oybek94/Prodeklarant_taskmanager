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

  /**
   * Har doim global TNVED ro'yxati birinchi, keyin shartnoma spetsifikatsiyasidan
   * global da yo'q mahsulotlarni qo'shamiz.
   */
  const invoiceProductOptions = useMemo(() => {
    const globalNames = new Set(tnvedProducts.map((p) => p.name.trim().toLowerCase()));
    const specExtras = selectedContractSpec
      .filter((r) => {
        const name = (r.productName || '').trim();
        return name !== '' && !globalNames.has(name.toLowerCase());
      })
      .map((r, i) => ({
        id: `spec-${i}`,
        name: (r.productName || '').trim(),
        code: (r.tnvedCode || '').trim(),
      }));
    return [...tnvedProducts, ...specExtras];
  }, [selectedContractSpec, tnvedProducts]);

  return {
    tnvedProducts,
    packagingTypes,
    invoiceProductOptions,
    loadPackagingTypes,
  };
}
