import { useMemo } from 'react';
import type { Contract, InvoiceFormData, ColumnLabels, ViewTab, VisibleColumns, ColumnLabelKey } from '../types';
import { getPartyRoles, getTotalColumnLabel } from '../invoiceViewModel';

interface UseInvoiceCalculationsProps {
  form: InvoiceFormData;
  contracts: Contract[];
  selectedContractId: string;
  selectedContractCurrency: string;
  columnLabels: ColumnLabels;
  viewTab: ViewTab;
  isPdfMode: boolean;
  viewOnly: boolean;
  getLeadingColumnsCount: () => number;
  getEffectiveColumns: (tab: ViewTab, isPdf: boolean, readOnly: boolean) => VisibleColumns;
}

export const useInvoiceCalculations = ({
  form,
  contracts,
  selectedContractId,
  selectedContractCurrency,
  columnLabels,
  viewTab,
  isPdfMode,
  viewOnly,
  getLeadingColumnsCount,
  getEffectiveColumns,
}: UseInvoiceCalculationsProps) => {
  return useMemo(() => {
    const selectedContract = selectedContractId
      ? contracts.find((contract) => contract.id.toString() === selectedContractId)
      : undefined;

    const { isSellerShipper, isBuyerConsignee } = getPartyRoles(selectedContract);

    const leadingColumnsCount = getLeadingColumnsCount();
    const effectiveColumns = getEffectiveColumns(viewTab, isPdfMode, viewOnly);

    const invoiceCurrency = selectedContractCurrency || form.currency || 'USD';
    const totalColumnLabel = getTotalColumnLabel(invoiceCurrency, columnLabels.total);

    return {
      selectedContract,
      isSellerShipper,
      isBuyerConsignee,
      leadingColumnsCount,
      effectiveColumns,
      invoiceCurrency,
      totalColumnLabel,
    };
  }, [
    form.currency,
    contracts,
    selectedContractId,
    selectedContractCurrency,
    columnLabels.total,
    viewTab,
    isPdfMode,
    viewOnly,
    getLeadingColumnsCount,
    getEffectiveColumns,
  ]);
};
