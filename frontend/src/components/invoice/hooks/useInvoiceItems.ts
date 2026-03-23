import { useState, useCallback } from 'react';
import type { InvoiceItem, SpecRow } from '../types';
import { createDefaultItem } from '../types';

interface UseInvoiceItemsParams {
  selectedContractSpec: SpecRow[];
  invoiceProductOptions: Array<{ name: string; code: string }>;
}

export function useInvoiceItems({ selectedContractSpec, invoiceProductOptions }: UseInvoiceItemsParams) {
  const [items, setItems] = useState<InvoiceItem[]>([createDefaultItem()]);
  const [editingGrossWeight, setEditingGrossWeight] = useState<{ index: number; value: string } | null>(null);
  const [editingNetWeight, setEditingNetWeight] = useState<{ index: number; value: string } | null>(null);

  const handleItemChange = useCallback((index: number, field: keyof InvoiceItem, value: string | number | undefined) => {
    setItems((prev) => {
      const newItems = [...prev];

      newItems[index] = { ...newItems[index], [field]: value };

      // Foydalanuvchi nettoni qo'lda o'zgartirganda formulani tozalash
      if (field === 'netWeight') {
        newItems[index].netWeightFormula = undefined;
      }

      // Brutto yoki Кол-во упаковки o'zgarganda: agar netto formulasi bor bo'lsa, formula bo'yicha yangilash; yo'q bo'lsa nettoni tozalash
      if (field === 'grossWeight' || field === 'packagesCount') {
        setEditingNetWeight((p) => (p?.index === index ? null : p));
        const formula = newItems[index].netWeightFormula?.trim();
        if (formula?.startsWith('*')) {
          const mult = parseFloat(formula.slice(1).trim().replace(',', '.'));
          if (!Number.isNaN(mult)) {
            const gross = field === 'grossWeight' ? (value ?? 0) : (newItems[index].grossWeight ?? 0);
            const pkgCount = field === 'packagesCount' ? (value ?? 0) : (newItems[index].packagesCount ?? 0);
            newItems[index].netWeight = Math.round(Number(gross) - mult * Number(pkgCount));
          } else {
            newItems[index].netWeight = undefined;
          }
        } else {
          newItems[index].netWeight = undefined;
        }
      }

      // Total price ni hisoblash: Нетто * Цена за ед.изм.
      if (field === 'netWeight' || field === 'unitPrice' || field === 'grossWeight' || field === 'packagesCount') {
        const netWeight = newItems[index].netWeight ?? 0;
        const unitPrice = newItems[index].unitPrice ?? 0;
        newItems[index].totalPrice = netWeight * unitPrice;
      }

      return newItems;
    });
  }, []);

  const handleNameChange = useCallback((index: number, value: string) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], name: value };
      const nameTrim = value.trim();
      if (nameTrim && selectedContractSpec.length > 0) {
        const specRow = selectedContractSpec.find(
          (r) => (r.productName || '').trim().toLowerCase() === nameTrim.toLowerCase()
        );
        if (specRow) {
          if (specRow.tnvedCode != null && specRow.tnvedCode.trim() !== '') {
            newItems[index].tnvedCode = specRow.tnvedCode.trim();
          }
          const up = specRow.unitPrice != null ? Number(specRow.unitPrice) : 0;
          const tp = specRow.totalPrice != null ? Number(specRow.totalPrice) : up * (newItems[index].netWeight || 0);
          newItems[index].unitPrice = up;
          newItems[index].totalPrice = tp;
        } else {
          newItems[index].unitPrice = 0;
          newItems[index].totalPrice = 0;
          const match = invoiceProductOptions.find((p) => p.name === nameTrim);
          if (match) newItems[index].tnvedCode = match.code;
        }
      } else {
        const match = invoiceProductOptions.find((p) => p.name === nameTrim);
        if (match) newItems[index].tnvedCode = match.code;
      }
      return newItems;
    });
  }, [selectedContractSpec, invoiceProductOptions]);

  const handleGrossWeightChange = useCallback((index: number, value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      handleItemChange(index, 'grossWeight', undefined);
      setEditingGrossWeight(null);
      return;
    }
    if (trimmed.startsWith('*')) {
      setEditingGrossWeight({ index, value });
      return;
    }
    setEditingGrossWeight(null);
    const num = parseFloat(trimmed.replace(',', '.'));
    handleItemChange(index, 'grossWeight', Number.isNaN(num) ? undefined : num);
  }, [handleItemChange]);

  const applyGrossWeightFormula = useCallback((index: number) => {
    if (editingGrossWeight?.index !== index) return;
    const v = editingGrossWeight.value.trim();
    if (!v.startsWith('*')) {
      setEditingGrossWeight(null);
      return;
    }
    const multiplier = parseFloat(v.slice(1).trim().replace(',', '.'));
    if (Number.isNaN(multiplier)) {
      setEditingGrossWeight(null);
      return;
    }
    setItems((prev) => {
      const pkgCount = prev[index]?.packagesCount ?? 0;
      const result = Math.round(pkgCount * multiplier);
      const next = [...prev];
      next[index] = { ...next[index], grossWeight: result };
      // Total price yangilash
      const netWeight = next[index].netWeight ?? 0;
      const unitPrice = next[index].unitPrice ?? 0;
      next[index].totalPrice = netWeight * unitPrice;
      return next;
    });
    setEditingGrossWeight(null);
  }, [editingGrossWeight]);

  const getGrossWeightDisplayValue = useCallback((index: number, item: InvoiceItem) => {
    if (editingGrossWeight?.index === index) return editingGrossWeight.value;
    return item.grossWeight !== undefined && item.grossWeight !== null ? String(item.grossWeight) : '';
  }, [editingGrossWeight]);

  const handleNetWeightChange = useCallback((index: number, value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      handleItemChange(index, 'netWeight', undefined);
      setEditingNetWeight(null);
      return;
    }
    if (trimmed.startsWith('*')) {
      setEditingNetWeight({ index, value });
      return;
    }
    setEditingNetWeight(null);
    const num = parseFloat(trimmed.replace(',', '.'));
    handleItemChange(index, 'netWeight', Number.isNaN(num) ? undefined : num);
  }, [handleItemChange]);

  const applyNetWeightFormula = useCallback((index: number) => {
    if (editingNetWeight?.index !== index) return;
    const v = editingNetWeight.value.trim();
    if (!v.startsWith('*')) {
      setEditingNetWeight(null);
      return;
    }
    const multiplier = parseFloat(v.slice(1).trim().replace(',', '.'));
    if (Number.isNaN(multiplier)) {
      setEditingNetWeight(null);
      return;
    }
    setItems((prev) => {
      const grossWeight = prev[index]?.grossWeight ?? 0;
      const pkgCount = prev[index]?.packagesCount ?? 0;
      const result = Math.round(grossWeight - multiplier * pkgCount);
      const next = [...prev];
      next[index] = {
        ...next[index],
        netWeight: result,
        netWeightFormula: v,
        totalPrice: result * (next[index].unitPrice ?? 0),
      };
      return next;
    });
    setEditingNetWeight(null);
  }, [editingNetWeight]);

  const getNetWeightDisplayValue = useCallback((index: number, item: InvoiceItem) => {
    if (editingNetWeight?.index === index) return editingNetWeight.value;
    return item.netWeight !== undefined && item.netWeight !== null ? String(item.netWeight) : '';
  }, [editingNetWeight]);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { ...createDefaultItem(), tnvedCode: '', pluCode: '', packageType: '', grossWeight: undefined, netWeight: undefined },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  return {
    items,
    setItems,
    editingGrossWeight,
    editingNetWeight,
    handleItemChange,
    handleNameChange,
    handleGrossWeightChange,
    applyGrossWeightFormula,
    getGrossWeightDisplayValue,
    handleNetWeightChange,
    applyNetWeightFormula,
    getNetWeightDisplayValue,
    addItem,
    removeItem,
  };
}
