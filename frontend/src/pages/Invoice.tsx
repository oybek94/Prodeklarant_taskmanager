import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import DateInput from '../components/DateInput';
import { Icon } from '@iconify/react';
import { useClickOutside } from '../hooks/useClickOutside';

import { useInvoiceSocket } from '../components/invoice/hooks/useInvoiceSocket';
import { useInvoiceColumns } from '../components/invoice/hooks/useInvoiceColumns';
import { useInvoiceExtension } from '../components/invoice/hooks/useInvoiceExtension';
import { useInvoiceNumberCheck } from '../components/invoice/hooks/useInvoiceNumberCheck';
import { useProductOptions } from '../components/invoice/hooks/useProductOptions';
import { useInvoiceDownloads } from '../components/invoice/hooks/useInvoiceDownloads';
import { useInvoiceItems } from '../components/invoice/hooks/useInvoiceItems';
import { useInvoiceContract } from '../components/invoice/hooks/useInvoiceContract';
import { useInvoiceSave } from '../components/invoice/hooks/useInvoiceSave';
import { createLoadData } from '../components/invoice/hooks/useInvoiceLoader';
import { useInvoiceSnapshot } from '../components/invoice/hooks/useInvoiceSnapshot';
import { useInvoiceStages } from '../components/invoice/hooks/useInvoiceStages';
import { useInvoiceModalsState } from '../components/invoice/hooks/useInvoiceModalsState';
import { useInvoiceCalculations } from '../components/invoice/hooks/useInvoiceCalculations';
import { InvoiceChangeLog } from '../components/invoice/InvoiceChangeLog';
import { InvoiceWeightSummary } from '../components/invoice/InvoiceWeightSummary';
import { InvoiceSignatures, SpecSignatures } from '../components/invoice/InvoiceSignatures';
import { InvoiceModals } from '../components/invoice/InvoiceModals';
import { InvoiceToolbar } from '../components/invoice/InvoiceToolbar';
import { InvoiceParties } from '../components/invoice/InvoiceParties';
import { InvoiceAdditionalInfoDisplay } from '../components/invoice/InvoiceAdditionalInfoDisplay';
import { InvoiceHeader } from '../components/invoice/InvoiceHeader';
import { InvoiceItemsTable } from '../components/invoice/InvoiceItemsTable';
import { InvoiceBottomActions } from '../components/invoice/InvoiceBottomActions';
import { InvoiceNotes } from '../components/invoice/InvoiceNotes';
import { InvoiceConflictWarning } from '../components/invoice/InvoiceConflictWarning';
import { InvoiceTabs } from '../components/invoice/InvoiceTabs';
import { SertifikatErrorWarning } from '../components/invoice/SertifikatErrorWarning';
import { ContractRequirementsNote } from '../components/invoice/ContractRequirementsNote';

import type {
  InvoiceItem,
  Invoice as InvoiceType,
  Contract,
  Task,
  RegionCode,
  SpecRow,
  ViewTab,
  FssFilePrefix,
  VisibleColumns,
  ColumnLabels,
  ColumnLabelKey,
  InvoiceFormData,
} from '../components/invoice/types';

import {
  resolveUploadUrl,
  canEditInvoices,
  UNIT_OPTIONS,
  DEFAULT_VISIBLE_COLUMNS,
  DEFAULT_COLUMN_LABELS,
  DEFAULT_INVOICE_FORM_STATE,
} from '../components/invoice/types';

import {
  formatDate,
  formatNumber,
  formatNumberFixed,
  getTareRange,
  isTareInRange,
  numberToWordsRu,
} from '../components/invoice/invoiceUtils';

import { useDeliveryTerms } from '../components/invoice/useDeliveryTerms';
import '../components/invoice/invoice.css';

const Invoice = () => {
  const { user } = useAuth();
  const canEdit = canEditInvoices(user?.role);
  const { taskId, clientId, contractId } = useParams<{ taskId?: string; clientId?: string; contractId?: string }>();
  const location = useLocation();
  const locationState = location.state as { newInvoiceTaskForm?: { branchId: string; hasPsr: boolean; driverPhone?: string; comments?: string; contractNumber?: string }; duplicateInvoiceId?: number; viewOnly?: boolean };
  const newInvoiceTaskForm = locationState?.newInvoiceTaskForm;
  const duplicateInvoiceId = locationState?.duplicateInvoiceId;
  const viewOnly = locationState?.viewOnly === true;



  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  // URL'dan contractId ni olish (query parameter sifatida)

  const contractIdFromQuery = searchParams.get('contractId') || contractId;

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);

  const [task, setTask] = useState<Task | null>(null);

  const {
    invoysStageReady,
    setInvoysStageReady,
    sertifikatStageCompleted,
    taskHasErrors,
  } = useInvoiceStages(task);

  const canEditEffective = canEdit && !viewOnly && (!sertifikatStageCompleted || taskHasErrors);

  const [invoice, setInvoice] = useState<InvoiceType | null>(null);

  // Socket.io: invoice tahrirlash konflikti (invoice e'lon qilingandan keyin)
  const { editingConflictEditors } = useInvoiceSocket(invoice?.id);

  const [contracts, setContracts] = useState<Contract[]>([]);

  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const [selectedContractCurrency, setSelectedContractCurrency] = useState<string>('USD');
  const [selectedContractSpec, setSelectedContractSpec] = useState<SpecRow[]>([]);

  // Delivery terms va Column labels hook
  const {
    deliveryTermsOptions,
    setDeliveryTermsOptions,
    contractDeliveryTerms,
    setContractDeliveryTerms,
    columnLabels,
    setColumnLabels,
    addDeliveryTermOption,
    mergeDeliveryTerms,
    loadDeliveryTerms,
    loadColumnLabels,
    getContractKey: getDeliveryTermsContractKey,
  } = useDeliveryTerms({ selectedContractId, contractIdFromQuery });

  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const initialForChangeLogRef = useRef<{ form: Record<string, unknown>; items: InvoiceItem[] } | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>('invoice');
  const [pdfIncludeSeal, setPdfIncludeSeal] = useState(true);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);
  const defaultVisibleColumns = DEFAULT_VISIBLE_COLUMNS;

  // Mobil ekranlar uchun invoys masshtabini hisoblaymiz (faqat ortadagi oq blok uchun)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Invoysning original kengligi ~950px deb faraz qilamiz
  const invoiceScale = windowWidth < 1024 ? Math.min(1, (windowWidth - 32) / 950) : 1;

  const duplicateInvoiceIdFromState = (location.state as { duplicateInvoiceId?: number })?.duplicateInvoiceId ?? null;

  // Ustunlar boshqaruvi (extracted hook)
  const {
    visibleColumns,
    setVisibleColumns,
    setVisibleColumnsAndPersist,
    latestVisibleColumnsRef,
    columnsDropdownOpen,
    setColumnsDropdownOpen,
    columnsDropdownRef,
    getEffectiveColumns,
    getLeadingColumnsCount,
  } = useInvoiceColumns({
    invoiceId: invoice?.id,
    invoiceAdditionalInfo: invoice?.additionalInfo && typeof invoice.additionalInfo === 'object' ? invoice.additionalInfo as Record<string, unknown> : undefined,
    duplicateInvoiceIdFromState,
  });

  const [tirSmrDropdownOpen, setTirSmrDropdownOpen] = useState(false);
  const tirSmrDropdownRef = useRef<HTMLDivElement>(null);
  const [sertifikatlarDropdownOpen, setSertifikatlarDropdownOpen] = useState(false);
  const sertifikatlarDropdownRef = useRef<HTMLDivElement>(null);
  const [invoysDropdownOpen, setInvoysDropdownOpen] = useState(false);
  const invoysDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(tirSmrDropdownRef, tirSmrDropdownOpen, useCallback(() => setTirSmrDropdownOpen(false), []));
  useClickOutside(sertifikatlarDropdownRef, sertifikatlarDropdownOpen, useCallback(() => setSertifikatlarDropdownOpen(false), []));
  useClickOutside(invoysDropdownRef, invoysDropdownOpen, useCallback(() => setInvoysDropdownOpen(false), []));

  const [form, setForm] = useState<InvoiceFormData>({ ...DEFAULT_INVOICE_FORM_STATE });

  const {
    showAdditionalInfoModal, setShowAdditionalInfoModal,
    additionalInfoError, setAdditionalInfoError,
    customFields, setCustomFields,
    specCustomFields, setSpecCustomFields,
    additionalInfoVisible, setAdditionalInfoVisible,
    toggleAdditionalInfoVisible, isAdditionalInfoVisible,
    showAddFieldModal, setShowAddFieldModal,
    newFieldLabel, setNewFieldLabel,
    regionCodes, setRegionCodes,
    regionCodesLoading, setRegionCodesLoading,
    regionSearch, setRegionSearch,
    showFssRegionModal, setShowFssRegionModal,
    fssFilePrefix, setFssFilePrefix,
    fssAutoDownload, setFssAutoDownload,
    addressCopySuccess, setAddressCopySuccess,
  } = useInvoiceModalsState();

  // Extracted hooks
  const { packagingTypes, invoiceProductOptions } = useProductOptions(selectedContractSpec);
  const { invoiceNumberWarning, setInvoiceNumberWarning } = useInvoiceNumberCheck(form.invoiceNumber, selectedContractId, invoice?.id);
  const {
    items,
    setItems,
    editingGrossWeight,
    editingNetWeight,
    handleItemChange,
    handleNameChange,
    handleNameEnChange,
    handleGrossWeightChange,
    applyGrossWeightFormula,
    getGrossWeightDisplayValue,
    handleNetWeightChange,
    applyNetWeightFormula,
    getNetWeightDisplayValue,
    addItem,
    removeItem,
  } = useInvoiceItems({ selectedContractSpec, invoiceProductOptions });
  useInvoiceExtension(form, items, contracts, selectedContractId);


  // task stages effect removed, handled by useInvoiceStages





  const {
    generatePdf,
    generateSmrExcel,
    generateTirExcel,
    generateST1Excel,
    generateCommodityEkExcel,
    generateFssExcel,
    generateInvoiceExcel,
    generatePdfEn,
    openFssRegionPicker,
    openFssRegionSelector,
    loadRegionCodes,
    trackProcessDownload,
    buildFssQuery,
  } = useInvoiceDownloads({
    form,
    setForm,
    invoice,
    invoiceRef,
    task,
    taskId,
    regionCodes,
    setRegionCodes,
    regionCodesLoading,
    setRegionCodesLoading,
    fssFilePrefix,
    setFssFilePrefix,
    fssAutoDownload,
    setFssAutoDownload,
    setShowFssRegionModal,
    setIsPdfMode,
    setPdfIncludeSeal,
  });

  const {
    markSnapshotAfterSave, setMarkSnapshotAfterSave,
    isDirty, templatesDisabled
  } = useInvoiceSnapshot({
    form, items, selectedContractId, customFields, specCustomFields, invoiceId: invoice?.id, saving
  });

  useClickOutside(pdfMenuRef, showPdfMenu, useCallback(() => setShowPdfMenu(false), []));

  const { handleContractSelect, handleMarkInvoysReady } = useInvoiceContract({
    setSelectedContractId,
    setSelectedContractSpec,
    setSelectedContractCurrency,
    setItems,
    setContractDeliveryTerms,
    setForm,
    setDeliveryTermsOptions,
    deliveryTermsHook: {
      getDeliveryTermsContractKey: getDeliveryTermsContractKey,
      mergeDeliveryTerms,
      loadDeliveryTerms,
    },
    taskId,
    invoice,
    setInvoysStageReady,
    setMarkingReady,
  });

  const loadData = createLoadData({
    clientId,
    contractIdFromQuery,
    taskId,
    duplicateInvoiceId,
    setLoading,
    setContracts,
    setSelectedContractId,
    setSelectedContractSpec,
    setSelectedContractCurrency,
    setForm,
    setInvoice,
    setTask,
    setItems,
    setCustomFields,
    setSpecCustomFields,
    setVisibleColumns,
    setColumnLabels,
    setAdditionalInfoVisible,
    setContractDeliveryTerms,
    setDeliveryTermsOptions,
    initialForChangeLogRef,
    handleContractSelect,
    mergeDeliveryTerms,
    loadDeliveryTerms,
  });

  useEffect(() => {
    let cancelled = false;
    loadData(() => cancelled);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, clientId, contractIdFromQuery]);

  const { handleSubmit } = useInvoiceSave({
    form,
    setForm,
    items,
    setItems,
    invoice,
    setInvoice,
    task,
    setTask,
    taskId,
    clientId,
    selectedContractId,
    setSelectedContractId,
    customFields,
    specCustomFields,
    additionalInfoVisible,
    visibleColumns,
    columnLabels,
    packagingTypes,
    canEditEffective,
    invoiceNumberWarning,
    setInvoiceNumberWarning,
    additionalInfoError,
    setAdditionalInfoError,
    setShowAdditionalInfoModal,
    saving,
    setSaving,
    setMarkSnapshotAfterSave,
    initialForChangeLogRef,
    navigate,
    newInvoiceTaskForm,
  });
  const {
    selectedContract,
    isSellerShipper,
    isBuyerConsignee,
    leadingColumnsCount,
    effectiveColumns,
    invoiceCurrency,
    totalColumnLabel,
  } = useInvoiceCalculations({
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
  });


  if (loading) {
    return (

      <div className="flex items-center justify-center min-h-screen">

        <div className="text-gray-600">Yuklanmoqda...</div>

      </div>

    );
  }

  if (!task && taskId) {
    return (

      <div className="p-6">

        <div className="text-red-600">Task topilmadi</div>

        <button

          onClick={() => navigate(-1)}

          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"

        >

          Orqaga

        </button>

      </div>

    );
  }


  return (

    <div className="min-h-full bg-gray-50 py-2 sm:py-8">

      <div className="max-w-6xl mx-auto px-4">
        {/* Invoice tahrirlash konflikti xabari */}
        <InvoiceConflictWarning editors={editingConflictEditors} />

        {/* Header */}
        <InvoiceToolbar
          invoysStageReady={invoysStageReady}
          markingReady={markingReady}
          taskId={taskId}
          handleMarkInvoysReady={handleMarkInvoysReady}
          viewTab={viewTab}
          templatesDisabled={templatesDisabled}
          task={task}
          form={form}
          navigate={navigate}
          tirSmrDropdownRef={tirSmrDropdownRef}
          tirSmrDropdownOpen={tirSmrDropdownOpen}
          setTirSmrDropdownOpen={setTirSmrDropdownOpen}
          sertifikatlarDropdownRef={sertifikatlarDropdownRef}
          sertifikatlarDropdownOpen={sertifikatlarDropdownOpen}
          setSertifikatlarDropdownOpen={setSertifikatlarDropdownOpen}
          invoysDropdownRef={invoysDropdownRef}
          invoysDropdownOpen={invoysDropdownOpen}
          setInvoysDropdownOpen={setInvoysDropdownOpen}
          generateSmrExcel={generateSmrExcel}
          generateTirExcel={generateTirExcel}
          generateST1Excel={generateST1Excel}
          generateCommodityEkExcel={generateCommodityEkExcel}
          generateInvoiceExcel={generateInvoiceExcel}
          generatePdf={generatePdf}
          generatePdfEn={generatePdfEn}
          openFssRegionSelector={openFssRegionSelector}
          openFssRegionPicker={openFssRegionPicker}
        />

        {/* Invoice form + Requirements note side panel */}
        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
        <form onSubmit={handleSubmit} className={`invoice-form${!canEditEffective ? ' invoice-form-readonly' : ''}`}>

          <datalist id="invoice-tnved-products">
            {invoiceProductOptions.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <datalist id="invoice-packaging-types">
            {packagingTypes.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>

          {user?.role === 'ADMIN' && invoice?.additionalInfo && typeof invoice.additionalInfo === 'object' && Array.isArray((invoice.additionalInfo as any).changeLog) && (invoice.additionalInfo as any).changeLog.length > 0 && (
            <InvoiceChangeLog changeLog={(invoice.additionalInfo as any).changeLog} />
          )}

          <SertifikatErrorWarning
            sertifikatStageCompleted={sertifikatStageCompleted}
            canEdit={canEdit}
            taskHasErrors={taskHasErrors}
            taskId={task?.id}
            navigate={navigate}
          />

          <InvoiceTabs viewTab={viewTab} setViewTab={setViewTab} />

          <div
            ref={invoiceRef}
            className={`flex flex-col bg-white rounded-lg shadow-lg p-8${isPdfMode ? ' pdf-mode' : ''}`}
            style={{ 
              minWidth: isPdfMode ? undefined : '950px',
              ...(invoiceScale < 1 && !isPdfMode ? { zoom: invoiceScale } as React.CSSProperties : {})
            }}
          >

            {/* Invoice Header */}
            <InvoiceHeader
              viewTab={viewTab}
              isPdfMode={isPdfMode}
              form={form}
              setForm={setForm}
              invoice={invoice}
              invoiceNumberWarning={invoiceNumberWarning}
              selectedContractId={selectedContractId}
              selectedContract={selectedContract}
              contracts={contracts}
              contractIdFromQuery={contractIdFromQuery}
              handleContractSelect={handleContractSelect}
            />

            {/* Ajratuvchi chiziq */}
            <div className="border-t border-gray-300 mb-8"></div>

            {/* Sotuvchi va Sotib oluvchi Info */}
            <InvoiceParties
              selectedContractId={selectedContractId}
              contracts={contracts}
              selectedContract={selectedContract}
              task={task}
              isSellerShipper={isSellerShipper}
              isBuyerConsignee={isBuyerConsignee}
            />

            {/* Дополнительная информация */}
            <InvoiceAdditionalInfoDisplay
              form={form}
              viewTab={viewTab}
              selectedContract={selectedContract}
              isBuyerConsignee={isBuyerConsignee}
              isAdditionalInfoVisible={isAdditionalInfoVisible}
              customFields={customFields}
              specCustomFields={specCustomFields}
              addressCopySuccess={addressCopySuccess}
              setAddressCopySuccess={setAddressCopySuccess}
              setShowAdditionalInfoModal={setShowAdditionalInfoModal}
            />

            {/* Items Table */}
            <InvoiceItemsTable
              viewTab={viewTab}
              isPdfMode={isPdfMode}
              canEditEffective={canEditEffective}
              items={items}
              effectiveColumns={effectiveColumns}
              visibleColumns={visibleColumns}
              columnLabels={columnLabels}
              totalColumnLabel={totalColumnLabel}
              leadingColumnsCount={leadingColumnsCount}
              invoiceCurrency={invoiceCurrency}
              columnsDropdownRef={columnsDropdownRef}
              columnsDropdownOpen={columnsDropdownOpen}
              setColumnsDropdownOpen={setColumnsDropdownOpen}
              setVisibleColumnsAndPersist={setVisibleColumnsAndPersist}
              setColumnLabels={setColumnLabels}
              addItem={addItem}
              removeItem={removeItem}
              handleItemChange={handleItemChange}
              handleNameChange={handleNameChange}
              handleNameEnChange={handleNameEnChange}
              handleGrossWeightChange={handleGrossWeightChange}
              handleNetWeightChange={handleNetWeightChange}
              applyGrossWeightFormula={applyGrossWeightFormula}
              applyNetWeightFormula={applyNetWeightFormula}
              getGrossWeightDisplayValue={getGrossWeightDisplayValue}
              getNetWeightDisplayValue={getNetWeightDisplayValue}
              packagingTypes={packagingTypes}
              form={{ loaderWeight: form.loaderWeight, trailerWeight: form.trailerWeight, palletWeight: form.palletWeight }}
            />

            {/* Notes */}
            <InvoiceNotes
              viewTab={viewTab}
              isPdfMode={isPdfMode}
              notes={form.notes}
              setNotes={(val) => setForm({ ...form, notes: val })}
            />

            {/* Руководитель Поставщика va Товар отпустил */}
            {viewTab !== 'spec' && selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) && (
              <div className="mb-8 space-y-3">
                <InvoiceSignatures
                  contract={contracts.find(c => c.id.toString() === selectedContractId)!}
                  isPdfMode={isPdfMode}
                  pdfIncludeSeal={pdfIncludeSeal}
                />
              </div>
            )}

            {viewTab === 'spec' && selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) && (
              <div className="mb-8 w-full">
                <SpecSignatures
                  contract={contracts.find(c => c.id.toString() === selectedContractId) as any}
                  isPdfMode={isPdfMode}
                  pdfIncludeSeal={pdfIncludeSeal}
                />
              </div>
            )}

            {/* Action Buttons */}
            <InvoiceBottomActions
              additionalInfoError={additionalInfoError}
              canEditEffective={canEditEffective}
              invoysStageReady={invoysStageReady}
              markingReady={markingReady}
              taskId={taskId}
              saving={saving}
              handleMarkInvoysReady={handleMarkInvoysReady}
              navigate={navigate}
            />

          </div>
        </form>
        </div>

        {/* Requirements sticky note — outside invoice, on the right */}
        {selectedContract?.requirements && (
          <ContractRequirementsNote
            requirements={selectedContract.requirements}
            contractNumber={selectedContract.contractNumber}
          />
        )}
        </div>

      </div>

      <InvoiceModals
        showAdditionalInfoModal={showAdditionalInfoModal}
        setShowAdditionalInfoModal={setShowAdditionalInfoModal}
        form={form}
        setForm={setForm}
        viewTab={viewTab}
        canEditEffective={canEditEffective}
        selectedContract={selectedContract ?? null}
        contractDeliveryTerms={contractDeliveryTerms}
        customFields={customFields}
        setCustomFields={setCustomFields}
        specCustomFields={specCustomFields}
        setSpecCustomFields={setSpecCustomFields}
        additionalInfoError={additionalInfoError}
        setAdditionalInfoError={setAdditionalInfoError}
        toggleAdditionalInfoVisible={toggleAdditionalInfoVisible}
        isAdditionalInfoVisible={isAdditionalInfoVisible}
        addDeliveryTermOption={addDeliveryTermOption}
        showFssRegionModal={showFssRegionModal}
        setShowFssRegionModal={setShowFssRegionModal}
        regionCodes={regionCodes}
        regionCodesLoading={regionCodesLoading}
        regionSearch={regionSearch}
        setRegionSearch={setRegionSearch}
        fssAutoDownload={fssAutoDownload}
        fssFilePrefix={fssFilePrefix}
        handleSubmit={handleSubmit}
        generateFssExcel={generateFssExcel}
        loadRegionCodes={loadRegionCodes}
        showAddFieldModal={showAddFieldModal}
        setShowAddFieldModal={setShowAddFieldModal}
        newFieldLabel={newFieldLabel}
        setNewFieldLabel={setNewFieldLabel}
      />
    </div>

  );
};

export default Invoice;