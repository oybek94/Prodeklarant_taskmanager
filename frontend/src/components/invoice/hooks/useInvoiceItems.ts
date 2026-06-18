import { useState, useCallback } from 'react';
import type { InvoiceItem, SpecRow } from '../types';
import { createDefaultItem } from '../types';

// "=N" formulali qatorlar uchun: changedIndex qatori o'zgarganda boshqa qatorlarni qayta hisoblash
function recalcEqualFormulaRows(items: InvoiceItem[], changedIndex: number): void {
  for (let i = 0; i < items.length; i++) {
    if (i === changedIndex) continue;
    const f = items[i].grossWeightFormula?.trim();
    if (!f?.startsWith('=')) continue;
    const total = parseFloat(f.slice(1).trim().replace(',', '.'));
    if (Number.isNaN(total)) continue;
    const sumOthers = items.reduce((acc, row, j) => j !== i ? acc + (row.grossWeight ?? 0) : acc, 0);
    const gross = Math.round(total - sumOthers);
    items[i] = { ...items[i], grossWeight: gross };
    const pkgF = items[i].packagesCountFormula?.trim();
    if (pkgF?.startsWith('/')) {
      const d = parseFloat(pkgF.slice(1).replace(',', '.'));
      if (!Number.isNaN(d) && d !== 0) items[i].packagesCount = Math.round(gross / d);
    }
    const netF = items[i].netWeightFormula?.trim();
    if (netF?.startsWith('*')) {
      const m = parseFloat(netF.slice(1).replace(',', '.'));
      if (!Number.isNaN(m)) items[i].netWeight = Math.round(gross - m * (items[i].packagesCount ?? 0));
    }
    items[i].totalPrice = (items[i].netWeight ?? 0) * (items[i].unitPrice ?? 0);
  }
}

interface UseInvoiceItemsParams {
  selectedContractSpec: SpecRow[];
  invoiceProductOptions: Array<{ name: string; code: string }>;
  tareRules?: Array<{ packageType: string; tareWeight: number }>;
}

function applyRulesToItem(item: InvoiceItem, tareRules?: Array<{packageType: string, tareWeight: number}>): InvoiceItem {
  if (!tareRules?.length) return item;
  const rule = tareRules.find(r => r.packageType === item.packageType);
  if (rule) {
    const formula = item.netWeightFormula?.trim();
    if (!formula || formula === `*${rule.tareWeight}`) {
      const newItem = { ...item };
      newItem.netWeightFormula = `*${rule.tareWeight}`;
      const gross = newItem.grossWeight ?? 0;
      const pkgCount = newItem.packagesCount ?? 0;
      newItem.netWeight = Math.round(Number(gross) - rule.tareWeight * Number(pkgCount));
      newItem.totalPrice = newItem.netWeight * (newItem.unitPrice ?? 0);
      return newItem;
    }
  }
  return item;
}

export function useInvoiceItems({ selectedContractSpec, invoiceProductOptions, tareRules }: UseInvoiceItemsParams) {
  const [items, setItems] = useState<InvoiceItem[]>([createDefaultItem()]);
  const [editingGrossWeight, setEditingGrossWeight] = useState<{ index: number; value: string } | null>(null);
  const [editingNetWeight, setEditingNetWeight] = useState<{ index: number; value: string } | null>(null);
  const [editingPackagesCount, setEditingPackagesCount] = useState<{ index: number; value: string } | null>(null);

  const handleItemChange = useCallback((index: number, field: keyof InvoiceItem, value: string | number | undefined) => {
    setItems((prev) => {
      const newItems = [...prev];

      newItems[index] = { ...newItems[index], [field]: value };

      // Foydalanuvchi nettoni qo'lda o'zgartirganda formulani tozalash
      if (field === 'netWeight') {
        newItems[index].netWeightFormula = undefined;
      }

      // Foydalanuvchi Кол-во упаковки ni qo'lda o'zgartirganda formulani tozalash
      if (field === 'packagesCount') {
        newItems[index].packagesCountFormula = undefined;
      }

      // Foydalanuvchi Bruttoni qo'lda (plain raqam) o'zgartirganda '=N' formulani tozalash
      if (field === 'grossWeight') {
        newItems[index].grossWeightFormula = undefined;
      }

      // Brutto o'zgarganda: avval Кол-во упаковки formulasi (/N) bo'yicha qayta hisoblash (yaxlitlangan)
      if (field === 'grossWeight') {
        setEditingPackagesCount((p) => (p?.index === index ? null : p));
        const pkgFormula = newItems[index].packagesCountFormula?.trim();
        if (pkgFormula?.startsWith('/')) {
          const divisor = parseFloat(pkgFormula.slice(1).trim().replace(',', '.'));
          if (!Number.isNaN(divisor) && divisor !== 0) {
            newItems[index].packagesCount = Math.round(Number(value ?? 0) / divisor);
          }
        }
      }

      // Brutto yoki Кол-во упаковки o'zgarganda: agar netto formulasi bor bo'lsa, formula bo'yicha yangilash; yo'q bo'lsa nettoni tozalash
      if (field === 'grossWeight' || field === 'packagesCount') {
        setEditingNetWeight((p) => (p?.index === index ? null : p));
        const formula = newItems[index].netWeightFormula?.trim();
        if (formula?.startsWith('*')) {
          const mult = parseFloat(formula.slice(1).trim().replace(',', '.'));
          if (!Number.isNaN(mult)) {
            const gross = newItems[index].grossWeight ?? 0;
            const pkgCount = newItems[index].packagesCount ?? 0;
            newItems[index].netWeight = Math.round(Number(gross) - mult * Number(pkgCount));
          } else {
            newItems[index].netWeight = undefined;
          }
        } else {
          newItems[index].netWeight = undefined;
        }
      }

      if (field === 'grossWeight' || field === 'packagesCount' || field === 'packageType') {
         newItems[index] = applyRulesToItem(newItems[index], tareRules);
      }

      // Total price ni hisoblash: Нетто * Цена за ед.изм. yoki sht * Цена
      if (field === 'netWeight' || field === 'unitPrice' || field === 'grossWeight' || field === 'packagesCount' || field === 'packageType' || field === 'unit') {
        const unitPrice = newItems[index].unitPrice ?? 0;
        if (newItems[index].unit === 'шт' || newItems[index].unit === 'шт.') {
          const sht = Number(newItems[index].customFields?.shtCount) || 0;
          newItems[index].totalPrice = sht * unitPrice;
        } else {
          const netWeight = newItems[index].netWeight ?? 0;
          newItems[index].totalPrice = netWeight * unitPrice;
        }
      }

      // Brutto o'zgarganda: '=N' formulali boshqa qatorlarni qayta hisoblash
      if (field === 'grossWeight') {
        recalcEqualFormulaRows(newItems, index);
      }

      return newItems;
    });
  }, [tareRules]);

  const handleNameChange = useCallback((index: number, value: string) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], name: value };
      const nameTrim = value.trim();
      if (!nameTrim) return newItems;

      let foundTnved = false;

      // 1-qadam: Global TNVED ro'yxatidan qidirish (ustuvor)
      const globalMatch = invoiceProductOptions.find(
        (p) => p.name.trim().toLowerCase() === nameTrim.toLowerCase()
      );
      if (globalMatch && globalMatch.code) {
        newItems[index].tnvedCode = globalMatch.code;
        foundTnved = true;
      }

      // 2-qadam: Shartnoma spetsifikatsiyasidan qidirish (narx va fallback TNVED)
      if (selectedContractSpec.length > 0) {
        const specRow = selectedContractSpec.find(
          (r) => (r.productName || '').trim().toLowerCase() === nameTrim.toLowerCase()
        );
        if (specRow) {
          if (!foundTnved && specRow.tnvedCode != null && specRow.tnvedCode.trim() !== '') {
            newItems[index].tnvedCode = specRow.tnvedCode.trim();
          }
          if (specRow.unitPrice != null) {
            const up = Number(specRow.unitPrice);
            newItems[index].unitPrice = up;
            newItems[index].totalPrice = up * (newItems[index].netWeight ?? 0);
          }
        }
      }

      return newItems;
    });
  }, [selectedContractSpec, invoiceProductOptions]);

  const handleNameEnChange = useCallback((index: number, value: string) => {
    handleItemChange(index, 'nameEn', value);
  }, [handleItemChange]);

  const handleGrossWeightChange = useCallback((index: number, value: string) => {
    // Yozish paytida xom matnni saqlab turamiz (5, yoki 5,0 kabi oraliq holatlar uchun)
    setEditingGrossWeight({ index, value });
  }, []);

  const applyGrossWeightFormula = useCallback((index: number) => {
    if (editingGrossWeight?.index !== index) return;
    const v = editingGrossWeight.value.trim();
    if (v === '') {
      handleItemChange(index, 'grossWeight', undefined);
      setEditingGrossWeight(null);
      return;
    }
    if (v.startsWith('*')) {
      const multiplier = parseFloat(v.slice(1).trim().replace(',', '.'));
      if (Number.isNaN(multiplier)) {
        setEditingGrossWeight(null);
        return;
      }
      setItems((prev) => {
        const pkgCount = prev[index]?.packagesCount ?? 0;
        const result = Math.round(pkgCount * multiplier);
        const next = [...prev];
        next[index] = { ...next[index], grossWeight: result, grossWeightFormula: undefined };
        next[index] = applyRulesToItem(next[index], tareRules);
        const netWeight = next[index].netWeight ?? 0;
        const unitPrice = next[index].unitPrice ?? 0;
        next[index].totalPrice = netWeight * unitPrice;
        recalcEqualFormulaRows(next, index);
        return next;
      });
      setEditingGrossWeight(null);
      return;
    }
    if (v.startsWith('=')) {
      const total = parseFloat(v.slice(1).trim().replace(',', '.'));
      if (Number.isNaN(total)) {
        setEditingGrossWeight(null);
        return;
      }
      setItems((prev) => {
        const next = [...prev];
        const sumOthers = next.reduce((acc, item, j) => j !== index ? acc + (item.grossWeight ?? 0) : acc, 0);
        const gross = Math.round(total - sumOthers);
        next[index] = { ...next[index], grossWeight: gross, grossWeightFormula: v };
        // Cascade: Кол-во упаковки formulasi
        const pkgF = next[index].packagesCountFormula?.trim();
        if (pkgF?.startsWith('/')) {
          const d = parseFloat(pkgF.slice(1).replace(',', '.'));
          if (!Number.isNaN(d) && d !== 0) next[index].packagesCount = Math.round(gross / d);
        }
        // Cascade: Нетто formulasi
        const netF = next[index].netWeightFormula?.trim();
        if (netF?.startsWith('*')) {
          const m = parseFloat(netF.slice(1).replace(',', '.'));
          if (!Number.isNaN(m)) next[index].netWeight = Math.round(gross - m * (next[index].packagesCount ?? 0));
        }
        next[index] = applyRulesToItem(next[index], tareRules);
        next[index].totalPrice = (next[index].netWeight ?? 0) * (next[index].unitPrice ?? 0);
        return next;
      });
      setEditingGrossWeight(null);
      return;
    }
    // Oddiy raqam — kasrli yoki butun
    const num = parseFloat(v.replace(',', '.'));
    handleItemChange(index, 'grossWeight', Number.isNaN(num) ? undefined : num);
    setEditingGrossWeight(null);
  }, [editingGrossWeight, handleItemChange, setItems, tareRules]);

  const getGrossWeightDisplayValue = useCallback((index: number, item: InvoiceItem) => {
    if (editingGrossWeight?.index === index) return editingGrossWeight.value;
    return item.grossWeight !== undefined && item.grossWeight !== null ? String(item.grossWeight) : '';
  }, [editingGrossWeight]);

  const handleNetWeightChange = useCallback((index: number, value: string) => {
    // Yozish paytida xom matnni saqlab turamiz (5, yoki 5,0 kabi oraliq holatlar uchun)
    setEditingNetWeight({ index, value });
  }, []);

  const applyNetWeightFormula = useCallback((index: number) => {
    if (editingNetWeight?.index !== index) return;
    const v = editingNetWeight.value.trim();
    if (v === '') {
      handleItemChange(index, 'netWeight', undefined);
      setEditingNetWeight(null);
      return;
    }
    if (v.startsWith('*')) {
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
      return;
    }
    // Oddiy raqam — kasrli yoki butun
    const num = parseFloat(v.replace(',', '.'));
    handleItemChange(index, 'netWeight', Number.isNaN(num) ? undefined : num);
    setEditingNetWeight(null);
  }, [editingNetWeight, handleItemChange, setItems]);

  const getNetWeightDisplayValue = useCallback((index: number, item: InvoiceItem) => {
    if (editingNetWeight?.index === index) return editingNetWeight.value;
    return item.netWeight !== undefined && item.netWeight !== null ? String(item.netWeight) : '';
  }, [editingNetWeight]);

  const applyMassNetWeightFormula = useCallback((packageType: string, tareWeight: number) => {
    setItems((prev) => {
      return prev.map((item) => {
        if (item.packageType === packageType) {
          const grossWeight = item.grossWeight ?? 0;
          const pkgCount = item.packagesCount ?? 0;
          const result = Math.round(grossWeight - tareWeight * pkgCount);
          return {
            ...item,
            netWeight: result,
            netWeightFormula: `*${tareWeight}`,
            totalPrice: result * (item.unitPrice ?? 0),
          };
        }
        return item;
      });
    });
  }, [setItems]);

  const handlePackagesCountChange = useCallback((index: number, value: string) => {
    setEditingPackagesCount({ index, value });
  }, []);

  const applyPackagesCountFormula = useCallback((index: number) => {
    if (editingPackagesCount?.index !== index) return;
    const v = editingPackagesCount.value.trim();
    if (v === '') {
      handleItemChange(index, 'packagesCount', undefined);
      setEditingPackagesCount(null);
      return;
    }
    if (v.startsWith('/')) {
      const divisor = parseFloat(v.slice(1).trim().replace(',', '.'));
      if (Number.isNaN(divisor) || divisor === 0) {
        setEditingPackagesCount(null);
        return;
      }
      setItems((prev) => {
        const grossWeight = prev[index]?.grossWeight ?? 0;
        const result = Math.round(grossWeight / divisor);
        const next = [...prev];
        next[index] = { ...next[index], packagesCount: result, packagesCountFormula: v };
        // Кол-во упаковки o'zgardi: netto formulasi (*M) bo'lsa qayta hisoblash
        const netFormula = next[index].netWeightFormula?.trim();
        if (netFormula?.startsWith('*')) {
          const mult = parseFloat(netFormula.slice(1).trim().replace(',', '.'));
          if (!Number.isNaN(mult)) {
            next[index].netWeight = Math.round(grossWeight - mult * result);
          }
        }
        next[index] = applyRulesToItem(next[index], tareRules);
        next[index].totalPrice = (next[index].netWeight ?? 0) * (next[index].unitPrice ?? 0);
        return next;
      });
      setEditingPackagesCount(null);
      return;
    }
    const num = parseFloat(v.replace(',', '.'));
    handleItemChange(index, 'packagesCount', Number.isNaN(num) ? undefined : num);
    setEditingPackagesCount(null);
  }, [editingPackagesCount, handleItemChange, setItems, tareRules]);

  const getPackagesCountDisplayValue = useCallback((index: number, item: InvoiceItem) => {
    if (editingPackagesCount?.index === index) return editingPackagesCount.value;
    return item.packagesCount !== undefined && item.packagesCount !== null ? String(item.packagesCount) : '';
  }, [editingPackagesCount]);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { ...createDefaultItem(), tnvedCode: '', pluCode: '', packageType: '', grossWeight: undefined, netWeight: undefined },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const handleCustomFieldChange = useCallback((index: number, key: string, value: string) => {
    setItems((prev) => {
      const newItems = [...prev];
      const customFields = { ...newItems[index].customFields, [key]: value };
      newItems[index] = { ...newItems[index], customFields };
      
      if (key === 'shtCount' && (newItems[index].unit === 'шт' || newItems[index].unit === 'шт.')) {
         const sht = Number(value) || 0;
         const unitPrice = newItems[index].unitPrice ?? 0;
         newItems[index].totalPrice = sht * unitPrice;
      }

      return newItems;
    });
  }, []);

  return {
    items,
    setItems,
    editingGrossWeight,
    editingNetWeight,
    handleItemChange,
    handleCustomFieldChange,
    handleNameChange,
    handleNameEnChange,
    handleGrossWeightChange,
    applyGrossWeightFormula,
    getGrossWeightDisplayValue,
    handleNetWeightChange,
    applyNetWeightFormula,
    getNetWeightDisplayValue,
    handlePackagesCountChange,
    applyPackagesCountFormula,
    getPackagesCountDisplayValue,
    addItem,
    removeItem,
    applyMassNetWeightFormula,
  };
}

