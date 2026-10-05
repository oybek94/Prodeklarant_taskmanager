import { useState, useEffect, useMemo } from 'react';
import type { Invoice, InvoicesFilters, InvoiceStatusTab } from '../components/invoices/types';

export const useInvoiceFilters = (invoices: Invoice[]) => {
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const saved = sessionStorage.getItem('invoices_currentPage');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    return sessionStorage.getItem('invoices_searchQuery') || '';
  });

  const [filters, setFilters] = useState<InvoicesFilters>(() => {
    const saved = sessionStorage.getItem('invoices_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return { branchId: '', clientId: '', startDate: '', endDate: '' };
  });

  const [statusTab, setStatusTab] = useState<InvoiceStatusTab>(() => {
    const saved = sessionStorage.getItem('invoices_statusTab');
    return saved === 'run' || saved === 'err' || saved === 'done' ? saved : '';
  });

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('invoices_currentPage', currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    sessionStorage.setItem('invoices_searchQuery', searchQuery);
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem('invoices_statusTab', statusTab);
    setCurrentPage(1);
  }, [statusTab]);

  useEffect(() => {
    sessionStorage.setItem('invoices_filters', JSON.stringify(filters));
    setCurrentPage(1);
  }, [filters]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusTab ||
    filters.branchId ||
    filters.clientId ||
    filters.startDate ||
    filters.endDate
  );

  const paginatedInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      const addInfo = inv.additionalInfo as Record<string, unknown> | undefined;
      const vehicleNumber = (addInfo?.vehicleNumber as string ?? '').toLowerCase();
      const trailerNumber = (addInfo?.trailerNumber as string ?? '').toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.contractNumber?.toLowerCase().includes(q) ||
        inv.client?.name?.toLowerCase().includes(q) ||
        inv.task?.title?.toLowerCase().includes(q) ||
        vehicleNumber.includes(q) ||
        trailerNumber.includes(q)
      );
    });
  }, [invoices, searchQuery]);

  return {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    statusTab,
    setStatusTab,
    showFiltersPanel,
    setShowFiltersPanel,
    hasActiveFilters,
    paginatedInvoices
  };
};
