import { useState, useCallback, useRef } from 'react';
import apiClient from '../lib/api';
import type { Invoice, Client, Branch, Worker, Contract, InvoicesFilters } from '../components/invoices/types';

export const useInvoiceData = (userRole: string | undefined) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  
  const [totalCount, setTotalCount] = useState(0);
  const [totalPagesServer, setTotalPagesServer] = useState(1);
  const hasLoadedRef = useRef(false);

  const loadInvoices = useCallback(async (
    currentPage: number,
    PAGE_SIZE: number,
    searchQuery: string,
    filters: InvoicesFilters,
    isBackground = false
  ) => {
    try {
      if (!isBackground) setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get(`/invoices?${params.toString()}`);
      
      if (response.data && response.data.pagination) {
        setInvoices(response.data.invoices);
        setTotalCount(response.data.pagination.total);
        setTotalPagesServer(response.data.pagination.totalPages);
      } else if (Array.isArray(response.data)) {
        setInvoices(response.data);
        setTotalCount(response.data.length);
        setTotalPagesServer(Math.max(1, Math.ceil(response.data.length / PAGE_SIZE)));
      } else {
        setInvoices([]);
        setTotalCount(0);
        setTotalPagesServer(1);
      }
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
      setTotalCount(0);
      setTotalPagesServer(1);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await apiClient.get('/clients?selectList=true');
      if (Array.isArray(response.data)) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const response = await apiClient.get('/branches');
      if (Array.isArray(response.data)) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      if (userRole === 'ADMIN') {
        const response = await apiClient.get('/users');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      } else {
        const response = await apiClient.get('/workers');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      setWorkers([]);
    }
  }, [userRole]);

  const loadContracts = useCallback(async (clientId: number) => {
    try {
      setLoadingContracts(true);
      const response = await apiClient.get(`/contracts/client/${clientId}?selectList=true`);
      if (Array.isArray(response.data)) {
        setContracts(response.data);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      setContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  return {
    invoices,
    setInvoices,
    loading,
    clients,
    branches,
    workers,
    contracts,
    setContracts,
    loadingContracts,
    totalCount,
    totalPagesServer,
    hasLoadedRef,
    loadInvoices,
    loadClients,
    loadBranches,
    loadWorkers,
    loadContracts,
  };
};
