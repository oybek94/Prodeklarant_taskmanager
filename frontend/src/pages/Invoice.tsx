import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import DateInput from '../components/DateInput';
import { Icon } from '@iconify/react';
import { useClickOutside } from '../hooks/useClickOutside';

import { useInvoiceSocket } from '../components/invoice/hooks/useInvoiceSocket';
import { useInvoiceColumns, findActiveCustomColumnKey } from '../components/invoice/hooks/useInvoiceColumns';
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
import { TareWarningModal } from '../components/invoice/TareWarningModal';
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
import { ContractRequirementsNote } from '../components/invoice/ContractRequirementsNote';
import { InvoicePriceList } from '../components/invoice/InvoicePriceList';

import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { renderFittedInvoicePdf } from '../components/invoice/pdf/pdfFit';
import {
  PdfMissingGlyphError,
  describeMissingGlyphs,
  PdfDroppedTextError,
  describeDroppedText,
} from '../components/invoice/pdf/pdfGlyphCheck';
import { buildPdfTranslatableTexts } from '../components/invoice/pdf/pdfTranslatableTexts';
import type { PdfLang } from '../components/invoice/pdf/pdfI18n';
import Tasks from './Tasks';

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
  getVehiclePlate,
} from '../components/invoice/invoiceUtils';

import { useDeliveryTerms } from '../components/invoice/useDeliveryTerms';
import { useCargoImport } from '../components/invoice/useCargoImport';
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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMounted, setTaskModalMounted] = useState(false);

  useEffect(() => {
    if (showTaskModal && !taskModalMounted) setTaskModalMounted(true);
  }, [showTaskModal]);

  const [task, setTask] = useState<Task | null>(null);

  const {
    stageSummary,
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
  const [selectedContractFrequentProducts, setSelectedContractFrequentProducts] = useState<Array<{name: string, tnvedCode?: string, count: number}>>([]);

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
  const formRef = useRef<HTMLFormElement | null>(null);
  const initialForChangeLogRef = useRef<{ form: Record<string, unknown>; items: InvoiceItem[] } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (formRef.current && canEditEffective) {
          formRef.current.requestSubmit();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canEditEffective]);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>('invoice');
  const [pdfIncludeSeal, setPdfIncludeSeal] = useState(true);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);
  const defaultVisibleColumns = DEFAULT_VISIBLE_COLUMNS;

  const duplicateInvoiceIdFromState = (location.state as { duplicateInvoiceId?: number })?.duplicateInvoiceId ?? null;

  // Ustunlar boshqaruvi (extracted hook)
  const {
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
    packingCustomFields, setPackingCustomFields,
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
    additionalFieldsOrder, setAdditionalFieldsOrder,
    showPdfFontSizeModal, setShowPdfFontSizeModal,
    pdfFontSizes, setPdfFontSizes,
  } = useInvoiceModalsState();

  // Extracted hooks
  const { packagingTypes, invoiceProductOptions } = useProductOptions(selectedContractSpec, selectedContractFrequentProducts);
  const { invoiceNumberWarning, setInvoiceNumberWarning } = useInvoiceNumberCheck(form.invoiceNumber, selectedContractId, invoice?.id);
  const tareRules = Array.isArray(form.additionalInfo?.tareRules) ? form.additionalInfo.tareRules as Array<{packageType: string, tareWeight: number}> : [];
  const {
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
  } = useInvoiceItems({ selectedContractSpec, invoiceProductOptions, tareRules });
  useInvoiceExtension(form, items, contracts, selectedContractId, invoice?.id);


  // task stages effect removed, handled by useInvoiceStages





  const {
    generateSmrExcel,
    generateCmrDoc,
    generateTirExcel,
    generateST1GoodsExcel,
    generateCommodityEkExcel,
    generateFssExcel,
    generateInvoiceExcel,
    openFssRegionPicker,
    openFssRegionSelector,
    loadRegionCodes,
    trackProcessDownload,
    buildFssQuery,
  } = useInvoiceDownloads({
    form,
    setForm,
    invoice,
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
  });

  const {
    markSnapshotAfterSave, setMarkSnapshotAfterSave,
    isDirty, templatesDisabled
  } = useInvoiceSnapshot({
    form, items, selectedContractId, customFields, specCustomFields, packingCustomFields, invoiceId: invoice?.id, saving, loading
  });

  const [showCargoImportModal, setShowCargoImportModal] = useState(false);
  /**
   * Matndan import Квант/РЦ ustunlarini o'zi qo'shadi — kalitini darrov qaytarishi kerak.
   *
   * Mavjud ustunni qayta ishlatish faqat u SHU invoysda faol bo'lganda mumkin:
   * `columnLabels` localStorage'da shartnoma bo'yicha yashab, eski invoyslardan
   * qolgan `custom_*` yorliqlarni to'playdi. Faqat yorliqqa qarab kalit tanlansa,
   * qiymat `columnOrder` da yo'q kalitga yozilib, ustun ham, ma'lumot ham
   * ko'rinmay qoladi.
   */
  const handleEnsureCargoColumn = useCallback(
    (label: string, afterKey?: string) => {
      const existing = findActiveCustomColumnKey(columnOrder, columnLabels, label);
      if (!existing) return addCustomColumn(label, setColumnLabels, afterKey);
      // Ustun bor, lekin yashirilgan bo'lsa — qiymat ko'rinishi uchun ochamiz
      if (!visibleColumns[existing as keyof VisibleColumns]) {
        setVisibleColumnsAndPersist((prev) => ({ ...prev, [existing]: true }));
      }
      return existing;
    },
    [columnOrder, columnLabels, visibleColumns, setVisibleColumnsAndPersist, addCustomColumn, setColumnLabels]
  );
  const cargoImport = useCargoImport({
    form,
    setForm,
    items,
    setItems,
    customFields,
    setCustomFields,
    packingCustomFields,
    setPackingCustomFields,
    contractDeliveryTerms,
    packagingTypes,
    invoiceProductOptions,
    selectedContractSpec,
    ensureColumn: handleEnsureCargoColumn,
  });

  useClickOutside(pdfMenuRef, showPdfMenu, useCallback(() => setShowPdfMenu(false), []));

  const { handleContractSelect, handleMarkInvoysReady } = useInvoiceContract({
    setSelectedContractId,
    setSelectedContractSpec,
    setSelectedContractCurrency,
    setSelectedContractFrequentProducts,
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
    setContracts,
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
    setSelectedContractFrequentProducts,
    setForm,
    setInvoice,
    setTask,
    setItems,
    setCustomFields,
    setSpecCustomFields,
    setPackingCustomFields,
    setVisibleColumns,
    setColumnLabels,
    setColumnOrder,
    setCustomColumns,
    setAdditionalInfoVisible,
    setAdditionalFieldsOrder,
    setPdfFontSizes,
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

  const { handleSubmit, showItemErrors, tareWarnings, dismissTareWarnings, confirmTareAndSave } = useInvoiceSave({
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
    packingCustomFields,
    additionalInfoVisible,
    visibleColumns,
    columnLabels,
    columnOrder,
    customColumns,
    additionalFieldsOrder,
    pdfFontSizes,
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

  const handleAddCustomColumn = useCallback((label: string) => {
    addCustomColumn(label, setColumnLabels);
  }, [addCustomColumn, setColumnLabels]);

  const handleRemoveCustomColumn = useCallback((key: string) => {
    removeCustomColumn(key, setColumnLabels);
  }, [removeCustomColumn, setColumnLabels]);

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
  
  const handleSetNotes = useCallback((val: string) => {
    setForm(prev => ({ ...prev, notes: val }));
  }, []);

  const handleOpenTaskModal = useCallback(() => {
    setShowTaskModal(true);
  }, []);

  const handleOpenCargoImport = useCallback(() => {
    setShowCargoImportModal(true);
  }, []);


  const orderedVisibleColumns = useMemo(() => {
    const hasSht = items.some(i => i.unit === 'шт' || i.unit === 'шт.');
    return columnOrder.filter((key) => {
      if (key === 'actions') return false; // PDF da actions umuman chiqmaydi
      if (key === 'shtCount') return hasSht && effectiveColumns['shtCount'];
      return effectiveColumns[key as keyof VisibleColumns];
    });
  }, [columnOrder, effectiveColumns, items]);

  /**
   * Inglizcha PDF uchun matn tarjimalari. Hujjat RUSCHA PDF bilan aynan bir xil
   * komponentlardan chiziladi (qarang: `pdf/pdfI18n.ts`) — bu yerdan faqat
   * tarjima matni keladi. Tarjima serverda invoysga keshlanadi.
   */
  const loadPdfTranslations = useCallback(async (): Promise<Record<string, string>> => {
    if (!invoice?.id) throw new Error('Invoys saqlanmagan — avval saqlang');

    const texts = buildPdfTranslatableTexts({
      viewTab,
      form,
      selectedContract,
      task,
      isAdditionalInfoVisible,
      customFields,
      specCustomFields,
      packingCustomFields,
      items,
      orderedVisibleColumns,
      columnLabels,
      totalColumnLabel,
    });

    const response = await apiClient.post(`/invoices/${invoice.id}/translations-en`, { texts });
    const translations = response.data?.translations;
    return translations && typeof translations === 'object' ? translations : {};
  }, [
    invoice?.id, viewTab, form, selectedContract, task, isAdditionalInfoVisible,
    customFields, specCustomFields, packingCustomFields, items,
    orderedVisibleColumns, columnLabels, totalColumnLabel,
  ]);

  const generatePdf = useCallback(async (withSeal: boolean, lang: PdfLang = 'ru') => {
    // Inglizcha nusxa — tarjima varianti, unda pechat va imzo rasmi HECH QACHON
    // chiqmaydi (imzolangan original faqat ruscha hujjatda beriladi)
    const includeSeal = lang === 'en' ? false : withSeal;
    // `catch` blokida ham kerak — xato bo'lganda o'sha toast almashtiriladi
    const toastId = toast.loading(lang === 'en' ? "Tarjima qilinmoqda..." : "PDF tayyorlanmoqda...");
    try {

      if (viewTab === 'pricelist') {
        setIsPdfMode(true);
        setPdfIncludeSeal(includeSeal);

        setTimeout(async () => {
          try {
            if (!invoiceRef.current) throw new Error("Invoice elementi topilmadi");
            const element = invoiceRef.current;
            
            const canvas = await html2canvas(element, {
              scale: 3,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdfDoc = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
            });

            const pdfWidth = pdfDoc.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdfDoc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            const inv = invoice?.invoiceNumber || form.invoiceNumber || 'Invoice';
            const plateStr = getVehiclePlate(form.vehicleNumber);
            const plate = plateStr ? ` АВТО ${plateStr}` : '';
            pdfDoc.save(`${inv}${plate}.pdf`);

            setIsPdfMode(false);
            toast.success("PDF muvaffaqiyatli yuklab olindi", { id: toastId });
          } catch (err) {
            console.error(err);
            setIsPdfMode(false);
            toast.error("PDF yaratishda xatolik yuz berdi", { id: toastId });
          }
        }, 500);
        return;
      }

      const translations = lang === 'en' ? await loadPdfTranslations() : undefined;

      // Shriftlar sahifadagi ma'lumot miqdoriga qarab tanlanadi: hujjat avval
      // o'lchanadi, so'ng eng katta sig'adigan masshtabda qayta render qilinadi
      // (qarang: pdf/pdfFit.tsx)
      const blob = await renderFittedInvoicePdf({
        viewTab,
        form,
        invoice,
        selectedContract,
        contracts,
        task,
        isSellerShipper,
        isBuyerConsignee,
        isAdditionalInfoVisible,
        customFields,
        specCustomFields,
        packingCustomFields,
        additionalFieldsOrder,
        items,
        orderedVisibleColumns,
        columnLabels,
        totalColumnLabel,
        invoiceCurrency,
        pdfIncludeSeal: includeSeal,
        pdfFontSizes,
        lang,
        translations,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const inv = invoice?.invoiceNumber || form.invoiceNumber || 'Invoice';
      const plateStr = getVehiclePlate(form.vehicleNumber);
      const plate = plateStr ? ` АВТО ${plateStr}` : '';
      const langSuffix = lang === 'en' ? '_EN' : '';
      link.download = `${inv}${plate}${langSuffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF muvaffaqiyatli yuklab olindi", { id: toastId });
    } catch (err) {
      console.error(err);
      // Hujjatda shriftda chiqmaydigan belgi bor — bunday PDF'da harf JIMGINA
      // yo'qoladi ("Valley" -> "alley"), chet el bojxonasida esa bu hujjat
      // xatosi hisoblanadi. Shuning uchun yuklab olish to'xtatiladi.
      if (err instanceof PdfMissingGlyphError) {
        toast.error(describeMissingGlyphs(err.missing), { id: toastId, duration: 20000 });
        return;
      }
      // Chizishda matn manbaga mos kelmadi — hujjatdan harf yo'qolgan. Sabab
      // foydalanuvchi matnida emas, chizish quvurida (qarang: pdf/fontGlyphCache.ts).
      if (err instanceof PdfDroppedTextError) {
        toast.error(describeDroppedText(err.lines), { id: toastId, duration: 20000 });
        return;
      }
      // Tarjima bosqichi alohida ko'rsatiladi: sabab boshqa (server/AI), va
      // foydalanuvchi ruscha PDF ishlayotganini bilishi kerak
      if (lang === 'en') {
        const apiError = axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
          ? err.response.data.error
          : (err instanceof Error ? err.message : '');
        toast.error(apiError || "Tarjima qilishda xatolik yuz berdi", { id: toastId });
        return;
      }
      toast.error("PDF yaratishda xatolik yuz berdi", { id: toastId });
    }
  }, [
    viewTab, form, invoice, selectedContract, contracts, task, isSellerShipper, isBuyerConsignee,
    isAdditionalInfoVisible, customFields, specCustomFields, additionalFieldsOrder, items,
    orderedVisibleColumns, columnLabels, totalColumnLabel, invoiceCurrency, pdfFontSizes,
    loadPdfTranslations
  ]);

  const generatePdfEn = useCallback(() => generatePdf(false, 'en'), [generatePdf]);

  const handleUpdateContractRequirements = async (newRequirements: string) => {
    if (!selectedContractId) return;
    try {
      await apiClient.patch(`/contracts/${selectedContractId}/requirements`, { requirements: newRequirements });
      setContracts(contracts.map(c => c.id.toString() === selectedContractId.toString() ? { ...c, requirements: newRequirements } : c));
      toast.success("Shartnoma eslatmasi saqlandi");
    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi");
      throw error;
    }
  };

  /* ── Eslatma paneli ─────────────────────────────────────────────────────
     Eslatma shartnomada saqlanadi, ya'ni bir marta qo'shilsa o'sha
     shartnomadagi BARCHA invoyslarda chiqadi. Invoys ochilganda panel bir
     marta o'zi ko'rinadi va 15 soniyadan keyin yashirinadi; keyin uni faqat
     toolbar'dagi "Eslatma" tugmasi qaytaradi. Eslatmasi yo'q shartnomalarda
     panel umuman render qilinmaydi. */
  const clientRequirements = task?.client?.requirements;
  const hasReminder = Boolean(selectedContract?.requirements?.trim() || clientRequirements?.trim());
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderAutoHide, setReminderAutoHide] = useState(false);
  const [reminderStartInEdit, setReminderStartInEdit] = useState(false);
  // Qaysi shartnoma uchun panel avtomatik ko'rsatilgani — qayta ko'rsatmaslik uchun
  const reminderAutoShownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!hasReminder) return;
    const key = selectedContractId || 'client';
    if (reminderAutoShownFor.current === key) return;
    reminderAutoShownFor.current = key;
    setReminderStartInEdit(false);
    setReminderAutoHide(true);
    setReminderOpen(true);
  }, [hasReminder, selectedContractId]);

  const handleCloseReminder = useCallback(() => setReminderOpen(false), []);

  const handleToggleReminder = useCallback(() => {
    if (reminderOpen) {
      setReminderOpen(false);
      return;
    }
    // Foydalanuvchi o'zi ochdi — endi avtomatik yashirish yo'q
    setReminderAutoHide(false);
    setReminderStartInEdit(!hasReminder);
    setReminderOpen(true);
  }, [reminderOpen, hasReminder]);

  const canEditReminder = canEditEffective && Boolean(selectedContractId);

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
          stageSummary={stageSummary}
          invoysStageReady={invoysStageReady}
          markingReady={markingReady}
          taskId={taskId}
          handleMarkInvoysReady={handleMarkInvoysReady}
          viewTab={viewTab}
          setViewTab={setViewTab}
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
          generateCmrDoc={generateCmrDoc}
          generateTirExcel={generateTirExcel}
          generateST1GoodsExcel={generateST1GoodsExcel}
          generateCommodityEkExcel={generateCommodityEkExcel}
          generateInvoiceExcel={generateInvoiceExcel}
          generatePdf={generatePdf}
          generatePdfEn={generatePdfEn}
          openFssRegionSelector={openFssRegionSelector}
          openFssRegionPicker={openFssRegionPicker}
          onOpenTaskModal={handleOpenTaskModal}
          onOpenCargoImport={handleOpenCargoImport}
          onOpenPdfFontSizes={() => setShowPdfFontSizeModal(true)}
          canEditEffective={canEditEffective}
          needsErrorReport={sertifikatStageCompleted && canEdit && !taskHasErrors}
          hasReminder={hasReminder}
          reminderOpen={reminderOpen}
          onToggleReminder={handleToggleReminder}
          reminderAvailable={hasReminder || canEditReminder}
        />

        {/* Invoice form + Requirements note side panel */}
        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
        <form ref={formRef} onSubmit={handleSubmit} className={`invoice-form${!canEditEffective ? ' invoice-form-readonly' : ''}`}>

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

          <div
            ref={invoiceRef}
            className={`flex flex-col bg-white ${isPdfMode ? 'px-10 pt-8 pb-6 pdf-mode' : 'rounded-lg shadow-lg px-4 md:px-14 pt-6 md:pt-10 pb-6 md:pb-8'}`}
            style={{ 
              minWidth: isPdfMode ? '950px' : undefined,
            }}
          >

            {viewTab === 'pricelist' ? (
              <InvoicePriceList
                contract={selectedContract ?? null}
                form={form}
                items={items}
                isPdfMode={isPdfMode}
                pdfIncludeSeal={pdfIncludeSeal}
              />
            ) : (
              <>
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
                  showItemErrors={showItemErrors}
                />

                {/* Ajratuvchi chiziq */}
                <div className="border-t-[1.5px] border-gray-400 my-6"></div>

                {/* Sotuvchi va Sotib oluvchi Info */}
                <InvoiceParties
                  selectedContractId={selectedContractId}
                  contracts={contracts}
                  selectedContract={selectedContract}
                  task={task}
                  isSellerShipper={isSellerShipper}
                  isBuyerConsignee={isBuyerConsignee}
                />

                {/* Ajratuvchi chiziq */}
                <div className="border-t-[1.5px] border-gray-400 my-4"></div>

                <div id="invoice-screenshot-area" className="bg-white">
                  {/* Дополнительная информация */}
                  <InvoiceAdditionalInfoDisplay
                    form={form}
                    viewTab={viewTab}
                    selectedContract={selectedContract}
                    isBuyerConsignee={isBuyerConsignee}
                    isAdditionalInfoVisible={isAdditionalInfoVisible}
                    customFields={customFields}
                    specCustomFields={specCustomFields}
                    packingCustomFields={packingCustomFields}
                    addressCopySuccess={addressCopySuccess}
                    setAddressCopySuccess={setAddressCopySuccess}
                    setShowAdditionalInfoModal={setShowAdditionalInfoModal}
                    additionalFieldsOrder={additionalFieldsOrder}
                  />

                  {/* Ajratuvchi chiziq */}
                  <div className="border-t-[1.5px] border-gray-400 my-4 no-screenshot"></div>

                  {/* Items Table */}
                  <InvoiceItemsTable
                    viewTab={viewTab}
                    isPdfMode={isPdfMode}
                    canEditEffective={canEditEffective}
                    items={items}
                    effectiveColumns={effectiveColumns}
                    visibleColumns={visibleColumns}
                    columnLabels={columnLabels}
                    columnOrder={columnOrder}
                    customColumns={customColumns}
                    moveColumn={moveColumn}
                    onAddCustomColumn={handleAddCustomColumn}
                    onRemoveCustomColumn={handleRemoveCustomColumn}
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
                    handleCustomFieldChange={handleCustomFieldChange}
                    handleNameChange={handleNameChange}
                    handleNameEnChange={handleNameEnChange}
                    handleGrossWeightChange={handleGrossWeightChange}
                    handleNetWeightChange={handleNetWeightChange}
                    applyGrossWeightFormula={applyGrossWeightFormula}
                    applyNetWeightFormula={applyNetWeightFormula}
                    getGrossWeightDisplayValue={getGrossWeightDisplayValue}
                    getNetWeightDisplayValue={getNetWeightDisplayValue}
                    handlePackagesCountChange={handlePackagesCountChange}
                    applyPackagesCountFormula={applyPackagesCountFormula}
                    getPackagesCountDisplayValue={getPackagesCountDisplayValue}
                    packagingTypes={packagingTypes}
                    applyMassNetWeightFormula={applyMassNetWeightFormula}
                    form={form}
                    setForm={setForm}
                    showItemErrors={showItemErrors}
                  />
                </div>

                {/* Notes */}
                <InvoiceNotes
                  viewTab={viewTab}
                  isPdfMode={isPdfMode}
                  notes={form.notes}
                  setNotes={handleSetNotes}
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
              </>
            )}

            {/* Action Buttons */}
            {!isPdfMode && (
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
            )}
          </div>
        </form>
        </div>
        </div>

      </div>

      {/* Eslatma — suzuvchi, tortib ko'chiriladigan panel */}
      {(hasReminder || reminderOpen) && (
        <ContractRequirementsNote
          requirements={selectedContract?.requirements}
          clientRequirements={clientRequirements}
          contractNumber={selectedContract?.contractNumber}
          clientName={task?.client?.name}
          onUpdateRequirements={canEditReminder ? handleUpdateContractRequirements : undefined}
          open={reminderOpen}
          onClose={handleCloseReminder}
          autoHide={reminderAutoHide}
          startInEdit={reminderStartInEdit}
        />
      )}

      {/* Qadoq turi tara og'irligiga mos kelmasa — saqlashdan oldin tasdiqlash */}
      <TareWarningModal
        warnings={tareWarnings}
        onCancel={dismissTareWarnings}
        onConfirm={confirmTareAndSave}
        saving={saving}
      />

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
        packingCustomFields={packingCustomFields}
        setPackingCustomFields={setPackingCustomFields}
        additionalInfoError={additionalInfoError}
        setAdditionalInfoError={setAdditionalInfoError}
        toggleAdditionalInfoVisible={toggleAdditionalInfoVisible}
        isAdditionalInfoVisible={isAdditionalInfoVisible}
        addDeliveryTermOption={addDeliveryTermOption}
        additionalFieldsOrder={additionalFieldsOrder}
        setAdditionalFieldsOrder={setAdditionalFieldsOrder}
        showPdfFontSizeModal={showPdfFontSizeModal}
        setShowPdfFontSizeModal={setShowPdfFontSizeModal}
        pdfFontSizes={pdfFontSizes}
        setPdfFontSizes={setPdfFontSizes}
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
        showCargoImportModal={showCargoImportModal}
        setShowCargoImportModal={setShowCargoImportModal}
        cargoImport={cargoImport}
      />
      {taskModalMounted && taskId && (
        <div style={{ display: showTaskModal ? undefined : 'none' }}>
          <Tasks isModalMode={true} modalTaskId={Number(taskId)} onCloseModal={() => setShowTaskModal(false)} />
        </div>
      )}
    </div>

  );
};

export default Invoice;