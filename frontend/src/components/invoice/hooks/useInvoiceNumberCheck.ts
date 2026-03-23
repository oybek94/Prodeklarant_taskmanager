import { useState, useEffect, useRef } from 'react';
import apiClient from '../../../lib/api';

/**
 * Invoice raqamining takroriy yoki yo'qligini debounce (300ms) orqali tekshirish.
 */
export function useInvoiceNumberCheck(
  invoiceNumber: string | undefined,
  selectedContractId: string,
  excludeInvoiceId: number | undefined,
) {
  const [invoiceNumberWarning, setInvoiceNumberWarning] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const invNum = invoiceNumber?.trim();
    if (!invNum) {
      setInvoiceNumberWarning(null);
      return;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null;
      try {
        const params = new URLSearchParams({ invoiceNumber: invNum });
        if (selectedContractId) params.set('contractId', selectedContractId);
        if (excludeInvoiceId) params.set('excludeId', String(excludeInvoiceId));
        const res = await apiClient.get(`/invoices/check-number?${params}`);
        const { available } = res.data as { available: boolean };
        setInvoiceNumberWarning(available ? null : 'Bu raqam allaqachon mavjud. Ozgartirish kerak');
      } catch {
        setInvoiceNumberWarning(null);
      }
    }, 300);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [invoiceNumber, selectedContractId, excludeInvoiceId]);

  return { invoiceNumberWarning, setInvoiceNumberWarning };
}
