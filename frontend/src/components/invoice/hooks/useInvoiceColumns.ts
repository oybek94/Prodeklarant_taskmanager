import { useState, useEffect, useCallback, useRef } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { VisibleColumns, ColumnLabels, ColumnLabelKey, InvoiceItem, ViewTab } from '../types';
import { DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_LABELS, getVisibleColumnsFromPayload } from '../types';

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
        return;
      }
    }
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
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

  const getLeadingColumnsCount = useCallback(() => {
    return [
      visibleColumns.index,
      visibleColumns.tnved,
      visibleColumns.plu,
      visibleColumns.name,
      visibleColumns.package,
      visibleColumns.unit,
    ].filter(Boolean).length;
  }, [visibleColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    setVisibleColumnsAndPersist,
    latestVisibleColumnsRef,
    columnsDropdownOpen,
    setColumnsDropdownOpen,
    columnsDropdownRef,
    getEffectiveColumns,
    getLeadingColumnsCount,
  };
}
