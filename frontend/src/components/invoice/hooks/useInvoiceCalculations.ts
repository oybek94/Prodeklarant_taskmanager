import { useMemo } from 'react';
import type { Contract, InvoiceFormData, ColumnLabels, ViewTab, VisibleColumns, ColumnLabelKey } from '../types';
import { getVisibleColumnsFromPayload } from '../types';

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

    const isSellerShipper =
      !!selectedContract?.sellerName &&
      (!selectedContract?.shipperName ||
        selectedContract.shipperName.trim() === selectedContract.sellerName.trim());

    // isSellerShipper bilan bir xil mantiq: yuk qabul qiluvchi umuman
    // ko'rsatilmagan bo'lsa ham sotib oluvchi o'zi yuk qabul qiluvchi hisoblanadi
    // (sarlavha "Покупатель/Грузополучатель" bo'ladi).
    const isBuyerConsignee =
      !!selectedContract?.buyerName &&
      (!selectedContract?.consigneeName ||
        selectedContract.consigneeName.trim() === selectedContract.buyerName.trim());

    const leadingColumnsCount = getLeadingColumnsCount();
    const effectiveColumns = getEffectiveColumns(viewTab, isPdfMode, viewOnly);

    const invoiceCurrency = selectedContractCurrency || form.currency || 'USD';
    const totalColumnLabel =
      invoiceCurrency === 'USD'
        ? 'Общая сумма в Долл. США'
        : invoiceCurrency === 'RUB'
        ? 'Общая сумма Рубли РФ'
        : invoiceCurrency === 'EUR'
        ? 'Общая сумма в Евро'
        : columnLabels.total;

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
