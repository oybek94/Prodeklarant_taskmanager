import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { InvoiceFormData, InvoiceItem } from '../types';

interface UseInvoiceSnapshotProps {
  form: InvoiceFormData;
  items: InvoiceItem[];
  selectedContractId: string;
  customFields: Array<{ id: string; label: string; value: string }>;
  specCustomFields: Array<{ id: string; label: string; value: string }>;
  invoiceId?: number;
  saving?: boolean;
  loading?: boolean;
}

export const useInvoiceSnapshot = ({
  form,
  items,
  selectedContractId,
  customFields,
  specCustomFields,
  invoiceId,
  saving,
  loading = false,
}: UseInvoiceSnapshotProps) => {
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [markSnapshotAfterSave, setMarkSnapshotAfterSave] = useState(false);
  const initialSnapshotSet = useRef(false);
  const stabilizationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ form, items, selectedContractId, customFields, specCustomFields }),
    [form, items, selectedContractId, customFields, specCustomFields]
  );
  
  // isDirty faqat boshlang'ich snapshot o'rnatilgandan keyin tekshiriladi.
  // Snapshot hali o'rnatilmagan bo'lsa — isDirty = false (shablonlar ishlaydi).
  const isDirty = savedSnapshot === '' ? false : currentSnapshot !== savedSnapshot;
  const templatesDisabled = Boolean(saving) || isDirty;

  // Saqlashdan keyin snapshotni yangilash
  useEffect(() => {
    if (markSnapshotAfterSave) {
      setSavedSnapshot(currentSnapshot);
      setMarkSnapshotAfterSave(false);
      initialSnapshotSet.current = true;
    }
  }, [markSnapshotAfterSave, currentSnapshot]);

  // Boshlang'ich snapshotni loading tugagandan keyin olish.
  // 1500ms kutib turamiz — chunki ExportPriceCalculator, contract selection va boshqa 
  // side-effect'lar loading tugagandan keyin ham form'ni o'zgartirishi mumkin.
  // Shu vaqt ichida barcha avtomatik o'zgarishlar tugab bo'ladi.
  useEffect(() => {
    if (!loading && !initialSnapshotSet.current) {
      // Oldingi timerni bekor qilish
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }
      stabilizationTimer.current = setTimeout(() => {
        setSavedSnapshot(currentSnapshot);
        initialSnapshotSet.current = true;
      }, 1500);
    }
    return () => {
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }
    };
  }, [loading, currentSnapshot]);

  // Agar snapshot o'rnatilgandan keyin ham form o'zgarib ketsa (late side-effect),
  // snapshotni yangilash — faqat birinchi 5 soniya ichida
  const snapshotSetTime = useRef<number>(0);
  useEffect(() => {
    if (initialSnapshotSet.current && savedSnapshot !== '' && snapshotSetTime.current === 0) {
      snapshotSetTime.current = Date.now();
    }
  }, [savedSnapshot]);

  useEffect(() => {
    if (
      initialSnapshotSet.current && 
      savedSnapshot !== '' && 
      currentSnapshot !== savedSnapshot &&
      snapshotSetTime.current > 0 &&
      Date.now() - snapshotSetTime.current < 5000 &&
      !markSnapshotAfterSave
    ) {
      // 5 soniya ichidagi avtomatik o'zgarishlarni snapshot'ga kiritamiz
      setSavedSnapshot(currentSnapshot);
      snapshotSetTime.current = Date.now();
    }
  }, [currentSnapshot, savedSnapshot, markSnapshotAfterSave]);

  return {
    savedSnapshot,
    setSavedSnapshot,
    markSnapshotAfterSave,
    setMarkSnapshotAfterSave,
    isDirty,
    templatesDisabled,
    currentSnapshot
  };
};
