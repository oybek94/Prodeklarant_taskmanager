import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useIsMobile } from '../utils/useIsMobile';

import { useInvoiceData } from '../hooks/useInvoiceData';
import { useInvoiceFilters } from '../hooks/useInvoiceFilters';
import { useInvoiceSocket } from '../hooks/useInvoiceSocket';

import { InvoicesHeader } from '../components/invoices/InvoicesHeader';
import { InvoicesFilterPanel } from '../components/invoices/InvoicesFilterPanel';
import { InvoicesModalsManager } from '../components/invoices/InvoicesModalsManager';
import { InvoicesView } from '../components/invoices/InvoicesView';
import type { Invoice } from '../components/invoices/types';

const canEditInvoices = (role: string | undefined) => role === 'ADMIN' || role === 'MANAGER' || role === 'DEKLARANT';

const Invoices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canEdit = canEditInvoices(user?.role);
  const isMobile = useIsMobile();
  const socket = useSocket();

  // Custom hooks
  const {
    invoices,
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
  } = useInvoiceData(user?.role);

  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showFiltersPanel,
    setShowFiltersPanel,
    hasActiveFilters,
    paginatedInvoices
  } = useInvoiceFilters(invoices);

  // Initialize data
  useEffect(() => {
    loadClients();
    loadBranches();
    loadWorkers();
  }, [loadClients, loadBranches, loadWorkers]);

  // Load invoices with debounce
  const loadInvoicesDebounced = useCallback((isBackground = false) => {
    loadInvoices(currentPage, 20, searchQuery, filters, isBackground);
  }, [currentPage, searchQuery, filters, loadInvoices]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoicesDebounced();
    }, 400);
    return () => clearTimeout(timer);
  }, [loadInvoicesDebounced]);

  // Handle out of bounds pages
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setCurrentPage((prev) => Math.min(prev, Math.max(1, totalPagesServer)));
  }, [totalPagesServer, setCurrentPage, hasLoadedRef]);

  // Socket
  useInvoiceSocket(socket, (isBg) => loadInvoicesDebounced(isBg));

  // Local state for Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [duplicateInvoiceId, setDuplicateInvoiceId] = useState<number | null>(null);
  const [duplicatingInvoiceId, setDuplicatingInvoiceId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [createTaskForm, setCreateTaskForm] = useState({
    branchId: '',
    hasPsr: false,
    driverPhone: '',
    comments: '',
  });
  const [creatingTask, setCreatingTask] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [invoiceForErrorModal, setInvoiceForErrorModal] = useState<Invoice | null>(null);
  const [errorForm, setErrorForm] = useState({
    workerId: '',
    stageName: '',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);

  const [showTaskModalId, setShowTaskModalId] = useState<number | null>(null);
  const [showClientModalId, setShowClientModalId] = useState<number | null>(null);
  const [showContractModalId, setShowContractModalId] = useState<number | null>(null);

  const filtersPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFiltersPanel && filtersPanelRef.current && !filtersPanelRef.current.contains(event.target as Node)) {
        setShowFiltersPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFiltersPanel]);

  // Error modal from location state (from Tasks page)
  const openErrorModalForTaskId = (location.state as { openErrorModalForTaskId?: number })?.openErrorModalForTaskId;
  useEffect(() => {
    if (!openErrorModalForTaskId || invoices.length === 0) return;
    const inv = invoices.find((i) => i.taskId === openErrorModalForTaskId);
    if (inv) {
      setInvoiceForErrorModal(inv);
      setErrorForm({ workerId: '', stageName: '', amount: '', comment: '', date: new Date().toISOString().split('T')[0] });
      setShowErrorModal(true);
    }
    navigate('/invoices', { replace: true, state: {} });
  }, [openErrorModalForTaskId, invoices, navigate]);

  // Load contracts when client is selected
  useEffect(() => {
    if (selectedClientId) {
      loadContracts(Number(selectedClientId));
    } else {
      setContracts([]);
      setSelectedContractId('');
    }
  }, [selectedClientId, loadContracts, setContracts]);

  // Handlers
  const handleCreateInvoice = async () => {
    if (!selectedClientId) return alert('Iltimos, mijozni tanlang');
    if (!selectedContractId) return alert('Iltimos, shartnomani tanlang');
    if (!createTaskForm.branchId) return alert('Iltimos, filialni tanlang');

    try {
      setCreatingTask(true);
      const contractResponse = await apiClient.get(`/contracts/${selectedContractId}`);
      const contract = contractResponse.data;

      const taskComments = createTaskForm.comments.trim() || `Invoice yaratish uchun. Shartnoma: ${contract.contractNumber}`;

      setShowCreateModal(false);
      setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
      
      navigate(`/invoices/client/${selectedClientId}/contract/${selectedContractId}`, {
        state: {
          newInvoiceTaskForm: {
            branchId: createTaskForm.branchId,
            hasPsr: createTaskForm.hasPsr,
            driverPhone: createTaskForm.driverPhone.trim() || undefined,
            comments: taskComments,
            contractNumber: contract.contractNumber,
          },
          ...(duplicateInvoiceId ? { duplicateInvoiceId } : {}),
        },
      });
      setDuplicateInvoiceId(null);
    } catch (error: any) {
      console.error('Error loading contract:', error);
      alert(error.response?.data?.error || 'Shartnoma ma\'lumotlarini yuklashda xatolik');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDuplicateInvoice = async (invoice: Invoice) => {
    try {
      setDuplicatingInvoiceId(invoice.id);
      const fullRes = await apiClient.get(`/invoices/${invoice.id}`);
      const full = fullRes.data as { clientId: number; contractId?: number; contractNumber?: string; };
      setSelectedClientId(String(full.clientId));
      setSelectedContractId(full.contractId ? String(full.contractId) : '');
      setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
      setDuplicateInvoiceId(invoice.id);
      setShowCreateModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invoice ma\'lumotlarini yuklashda xatolik';
      alert(msg);
    } finally {
      setDuplicatingInvoiceId(null);
    }
  };

  const handleSubmitErrorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForErrorModal) return;
    try {
      const amountValue = errorForm.amount.trim();
      if (!/^\d{1,4}$/.test(amountValue)) {
        alert('Summa faqat USD bo\'lishi va 4 xonagacha bo\'lishi kerak');
        return;
      }
      const taskId = invoiceForErrorModal.taskId;
      await apiClient.post(`/tasks/${taskId}/errors`, {
        taskTitle: invoiceForErrorModal.task?.title ?? `#${invoiceForErrorModal.invoiceNumber}`,
        workerId: parseInt(errorForm.workerId),
        stageName: errorForm.stageName,
        amount: parseFloat(amountValue),
        comment: errorForm.comment || undefined,
        date: new Date(errorForm.date),
      });
      setShowErrorModal(false);
      setInvoiceForErrorModal(null);
      setErrorForm({ workerId: '', stageName: '', amount: '', comment: '', date: new Date().toISOString().split('T')[0] });
      navigate(`/invoices/task/${taskId}`);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string } } };
      alert(errObj.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setDeletingInvoiceId(invoiceToDelete.id);
    try {
      await apiClient.delete(`/invoices/${invoiceToDelete.id}`);
      loadInvoicesDebounced();
      setShowDeleteConfirmModal(false);
      setInvoiceToDelete(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Invoice o\'chirishda xatolik');
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  const PAGE_SIZE = 20;
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="flex-1 flex flex-col sm:min-h-0 bg-transparent px-2 sm:px-0">
      <InvoicesHeader
        canEdit={canEdit}
        filters={filters}
        showFiltersPanel={showFiltersPanel}
        setShowFiltersPanel={setShowFiltersPanel}
        isMobile={isMobile}
        onOpenCreateModal={() => {
          setDuplicateInvoiceId(null);
          setShowCreateModal(true);
        }}
      />

      <div className="relative">
        <InvoicesFilterPanel
          isMobile={isMobile}
          filtersPanelRef={filtersPanelRef}
          showFiltersPanel={showFiltersPanel}
          setShowFiltersPanel={setShowFiltersPanel}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          setCurrentPage={setCurrentPage}
          branches={branches}
          clients={clients}
        />
      </div>

      <InvoicesModalsManager
        canEdit={canEdit}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        duplicateInvoiceId={duplicateInvoiceId}
        setDuplicateInvoiceId={setDuplicateInvoiceId}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        selectedContractId={selectedContractId}
        setSelectedContractId={setSelectedContractId}
        clients={clients}
        contracts={contracts}
        loadingContracts={loadingContracts}
        branches={branches}
        createTaskForm={createTaskForm}
        setCreateTaskForm={setCreateTaskForm}
        creatingTask={creatingTask}
        handleCreateInvoice={handleCreateInvoice}
        setContracts={setContracts}
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        invoiceForErrorModal={invoiceForErrorModal}
        setInvoiceForErrorModal={setInvoiceForErrorModal}
        errorForm={errorForm}
        setErrorForm={setErrorForm}
        workers={workers}
        handleSubmitErrorForm={handleSubmitErrorForm}
        showDeleteConfirmModal={showDeleteConfirmModal}
        setShowDeleteConfirmModal={setShowDeleteConfirmModal}
        invoiceToDelete={invoiceToDelete}
        setInvoiceToDelete={setInvoiceToDelete}
        deletingInvoiceId={deletingInvoiceId}
        handleDeleteInvoice={handleDeleteInvoice}
        showTaskModalId={showTaskModalId}
        setShowTaskModalId={setShowTaskModalId}
        showClientModalId={showClientModalId}
        setShowClientModalId={setShowClientModalId}
        showContractModalId={showContractModalId}
        setShowContractModalId={setShowContractModalId}
      />

      <InvoicesView
        invoices={invoices}
        paginatedInvoices={paginatedInvoices}
        loading={loading}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        isMobile={isMobile}
        canEdit={canEdit}
        branches={branches}
        duplicatingInvoiceId={duplicatingInvoiceId}
        handleDuplicateInvoice={handleDuplicateInvoice}
        setShowTaskModalId={setShowTaskModalId}
        setShowClientModalId={setShowClientModalId}
        setShowContractModalId={setShowContractModalId}
        setInvoiceToDelete={setInvoiceToDelete}
        setShowDeleteConfirmModal={setShowDeleteConfirmModal}
        currentPage={currentPage}
        totalPagesServer={totalPagesServer}
        startItem={startItem}
        endItem={endItem}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
};

export default Invoices;
