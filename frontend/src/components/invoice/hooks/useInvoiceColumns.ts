import { useState, useEffect, useCallback, useRef } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { VisibleColumns, ColumnLabels, ColumnLabelKey, InvoiceItem, ViewTab } from '../types';
import { DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_LABELS, DEFAULT_COLUMN_ORDER, getVisibleColumnsFromPayload } from '../types';

export interface UseInvoiceColumnsOpts {
  invoiceId: number | undefined;
  invoiceAdditionalInfo: Record<string, unknown> | undefined;
  duplicateInvoiceIdFromState: number | null;
}

/**
 * Ustunlar ko'rinishi va labellar boshqaruvi.
 * visibleColumns, columnLabels, dropdown refs va togglelar shu hookda boshqariladi.
 */
export function useInvoiceColumns({ invoiceId, invoiceAdditionalInfo, duplicateInvoiceIdFromState }: UseInvoiceColumnsOpts) {
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const lastInvoiceIdRef = useRef<number | null>(null);
  const latestVisibleColumnsRef = useRef<VisibleColumns>(DEFAULT_VISIBLE_COLUMNS);
  latestVisibleColumnsRef.current = visibleColumns;

  useEffect(() => {
    const id = invoiceId ?? null;
    const prevId = lastInvoiceIdRef.current;
    if (id === prevId && (id != null || duplicateInvoiceIdFromState == null)) return;
    lastInvoiceIdRef.current = id;
    if (id != null && invoiceAdditionalInfo && typeof invoiceAdditionalInfo === 'object') {
      const fromServer = getVisibleColumnsFromPayload(invoiceAdditionalInfo);
      if (fromServer) {
        setVisibleColumns(fromServer);
      }
      if (Array.isArray(invoiceAdditionalInfo.columnOrder)) {
        setColumnOrder(invoiceAdditionalInfo.columnOrder as string[]);
      } else {
        setColumnOrder(DEFAULT_COLUMN_ORDER);
      }
      if (Array.isArray(invoiceAdditionalInfo.customColumns)) {
        setCustomColumns(invoiceAdditionalInfo.customColumns as string[]);
      } else {
        setCustomColumns([]);
      }
      if (fromServer) return;
    }
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setCustomColumns([]);
  }, [invoiceId, invoiceAdditionalInfo, duplicateInvoiceIdFromState]);

  const setVisibleColumnsAndPersist = useCallback(
    (update: React.SetStateAction<VisibleColumns>) => {
      setVisibleColumns((prev) => {
        const next = typeof update === 'function' ? (update as (p: VisibleColumns) => VisibleColumns)(prev) : update;
        return next;
      });
    },
    []
  );

  // Dropdown state'lar
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const columnsDropdownRef = useRef<HTMLDetailsElement>(null);
  useClickOutside(columnsDropdownRef, columnsDropdownOpen, useCallback(() => setColumnsDropdownOpen(false), []));

  // Effective columns hisoblash uchun yordamchi
  const getEffectiveColumns = useCallback(
    (viewTab: ViewTab, isPdfMode: boolean, viewOnly: boolean) => {
      const isPackingView = viewTab === 'packing';
      const base = (isPdfMode || viewOnly) ? { ...visibleColumns, actions: false } : visibleColumns;
      if (!isPackingView) return base;
      return { ...base, unitPrice: false, total: false };
    },
    [visibleColumns]
  );

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= DEFAULT_COLUMN_ORDER.length) return;
    setColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const getLeadingColumnsCount = useCallback(() => {
    const SUM_COLUMNS = ['quantity', 'packagesCount', 'gross', 'net', 'total'];
    const orderedVisible = columnOrder.filter((key) => visibleColumns[key as keyof VisibleColumns]);
    const firstSumColIdx = orderedVisible.findIndex((key) => SUM_COLUMNS.includes(key));
    if (firstSumColIdx === -1) return orderedVisible.length;
    return firstSumColIdx;
  }, [columnOrder, visibleColumns]);

  const addCustomColumn = useCallback((label: string, setColumnLabels: React.Dispatch<React.SetStateAction<ColumnLabels>>) => {
    const key = `custom_${Date.now()}`;
    setCustomColumns((prev) => [...prev, key]);
    setColumnOrder((prev) => {
      const next = [...prev];
      // Qo'shilayotgan ustun actions dan oldin bo'lishi uchun
      const actionsIdx = next.indexOf('actions');
      if (actionsIdx !== -1) {
        next.splice(actionsIdx, 0, key);
      } else {
        next.push(key);
      }
      return next;
    });
    setColumnLabels((prev) => ({ ...prev, [key]: label }));
    setVisibleColumnsAndPersist((prev) => ({ ...prev, [key]: true }));
  }, [setVisibleColumnsAndPersist]);

  const removeCustomColumn = useCallback((key: string, setColumnLabels: React.Dispatch<React.SetStateAction<ColumnLabels>>) => {
    setCustomColumns((prev) => prev.filter((k) => k !== key));
    setColumnOrder((prev) => prev.filter((k) => k !== key));
    setColumnLabels((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setVisibleColumnsAndPersist((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [setVisibleColumnsAndPersist]);

  return {
    visibleColumns,
    setVisibleColumns,
    setVisibleColumnsAndPersist,
    latestVisibleColumnsRef,
    columnOrder,
    setColumnOrder,
    customColumns,
    setCustomColumns,
    addCustomColumn,
    removeCustomColumn,
    moveColumn,
    columnsDropdownOpen,
    setColumnsDropdownOpen,
    columnsDropdownRef,
    getEffectiveColumns,
    getLeadingColumnsCount,
  };
}
