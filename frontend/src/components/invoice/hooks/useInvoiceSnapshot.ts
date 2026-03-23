import { useState, useMemo, useEffect } from 'react';
import type { InvoiceFormData, InvoiceItem } from '../types';

interface UseInvoiceSnapshotProps {
  form: InvoiceFormData;
  items: InvoiceItem[];
  selectedContractId: string;
  customFields: Array<{ id: string; label: string; value: string }>;
  specCustomFields: Array<{ id: string; label: string; value: string }>;
  invoiceId?: number;
  saving?: boolean;
}

export const useInvoiceSnapshot = ({
  form,
  items,
  selectedContractId,
  customFields,
  specCustomFields,
  invoiceId,
  saving,
}: UseInvoiceSnapshotProps) => {
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [markSnapshotAfterSave, setMarkSnapshotAfterSave] = useState(false);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ form, items, selectedContractId, customFields, specCustomFields }),
    [form, items, selectedContractId, customFields, specCustomFields]
  );
  
  const isDirty = savedSnapshot === '' ? true : currentSnapshot !== savedSnapshot;
  const templatesDisabled = Boolean(saving) || isDirty;

  useEffect(() => {
    if (markSnapshotAfterSave) {
      setSavedSnapshot(currentSnapshot);
      setMarkSnapshotAfterSave(false);
    }
  }, [markSnapshotAfterSave, currentSnapshot]);

  useEffect(() => {
    if (invoiceId && savedSnapshot === '' && !markSnapshotAfterSave) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [invoiceId, savedSnapshot, currentSnapshot, markSnapshotAfterSave]);

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
