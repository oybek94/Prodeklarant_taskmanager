import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import DateInput from '../components/DateInput';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getTnvedProducts } from '../utils/tnvedProducts';
import { Icon } from '@iconify/react';

const resolveUploadUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = apiClient.defaults.baseURL || '';
  if (!base || base.startsWith('/')) return url;
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${url}`;
};



interface InvoiceItem {

  id?: number;

  tnvedCode?: string;

  pluCode?: string;

  name: string;

  packageType?: string;

  unit: string;

  quantity: number;

  packagesCount?: number;

  grossWeight?: number;

  netWeight?: number;

  /** Netto formulasi, masalan "*1.2" — Brutto/Кол-во упаковки o'zgarganda shu bo'yicha qayta hisoblanadi */
  netWeightFormula?: string;

  unitPrice: number;

  totalPrice: number;

  orderIndex?: number;

}



interface Invoice {

  id: number;

  invoiceNumber: string;

  contractNumber?: string;

  taskId: number;

  clientId: number;

  branchId: number;

  date: string;

  currency: 'USD' | 'UZS';

  totalAmount: number;

  notes?: string;

  additionalInfo?: any;

}

interface RegionCode {
  id: number;
  name: string;
  internalCode: string;
  externalCode: string;
}



interface Contract {

  id: number;

  contractNumber: string;

  contractDate: string;

  sellerName: string;

  sellerLegalAddress: string;

  sellerDetails?: string;
  sellerInn?: string;

  sellerOgrn?: string;

  sellerBankName?: string;

  sellerBankAddress?: string;

  sellerBankAccount?: string;

  sellerBankSwift?: string;

  sellerCorrespondentBank?: string;

  sellerCorrespondentBankAccount?: string;

  sellerCorrespondentBankSwift?: string;

  buyerName: string;

  buyerAddress: string;

  buyerDetails?: string;
  buyerInn?: string;

  buyerOgrn?: string;

  buyerBankName?: string;

  buyerBankAddress?: string;

  buyerBankAccount?: string;

  buyerBankSwift?: string;

  buyerCorrespondentBank?: string;

  buyerCorrespondentBankAccount?: string;

  buyerCorrespondentBankSwift?: string;

  shipperName?: string;

  shipperAddress?: string;

  shipperDetails?: string;
  shipperInn?: string;

  shipperOgrn?: string;

  shipperBankName?: string;

  shipperBankAddress?: string;

  shipperBankAccount?: string;

  shipperBankSwift?: string;

  consigneeName?: string;

  consigneeAddress?: string;

  consigneeDetails?: string;
  consigneeInn?: string;

  consigneeOgrn?: string;

  consigneeBankName?: string;

  consigneeBankAddress?: string;

  consigneeBankAccount?: string;

  consigneeBankSwift?: string;

  deliveryTerms?: string;

  customsAddress?: string;

  paymentMethod?: string;

  contractCurrency?: string; // Shartnoma valyutasi (USD, RUB, EUR)

  supplierDirector?: string; // Руководитель Поставщика
  goodsReleasedBy?: string; // Товар отпустил
  signatureUrl?: string;
  sealUrl?: string;
  sellerSignatureUrl?: string;
  sellerSealUrl?: string;
  buyerSignatureUrl?: string;
  buyerSealUrl?: string;
  consigneeSignatureUrl?: string;
  consigneeSealUrl?: string;
  gln?: string; // GLN код
  specification?: Array<{ productName?: string; quantity?: number; unit?: string; unitPrice?: number; totalPrice?: number }>;
}



interface Task {

  id: number;

  title: string;

  client: {

    id: number;

    name: string;

    address?: string;

    inn?: string;

    phone?: string;

    email?: string;

    bankName?: string;

    bankAddress?: string;

    bankAccount?: string;

    transitAccount?: string;

    bankSwift?: string;

    correspondentBank?: string;

    correspondentBankAccount?: string;

    correspondentBankSwift?: string;

    contractNumber?: string;

  };

  branch?: {
    id: number;
    name: string;
  };

}



const canEditInvoices = (role: string | undefined) => role === 'ADMIN' || role === 'MANAGER';

const Invoice = () => {
  const { user } = useAuth();
  const canEdit = canEditInvoices(user?.role);
  const { taskId, clientId, contractId } = useParams<{ taskId?: string; clientId?: string; contractId?: string }>();
  const location = useLocation();
  const locationState = location.state as { newInvoiceTaskForm?: { branchId: string; hasPsr: boolean; driverPhone?: string; comments?: string; contractNumber?: string }; duplicateInvoiceId?: number; viewOnly?: boolean };
  const newInvoiceTaskForm = locationState?.newInvoiceTaskForm;
  const duplicateInvoiceId = locationState?.duplicateInvoiceId;
  const viewOnly = locationState?.viewOnly === true;
  const [invoysStageReady, setInvoysStageReady] = useState(false);
  const [sertifikatStageCompleted, setSertifikatStageCompleted] = useState(false);
  const [taskHasErrors, setTaskHasErrors] = useState(false);
  const canEditEffective = canEdit && !viewOnly && (!sertifikatStageCompleted || taskHasErrors);

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  

  // URL'dan contractId ni olish (query parameter sifatida)

  const contractIdFromQuery = searchParams.get('contractId') || contractId;


  // Sana formatlash funksiyasi (DD.MM.YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);

  const [task, setTask] = useState<Task | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);

  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const [selectedContractCurrency, setSelectedContractCurrency] = useState<string>('USD');
  type SpecRow = { productName?: string; tnvedCode?: string; quantity?: number; unit?: string; unitPrice?: number; totalPrice?: number };
  const [selectedContractSpec, setSelectedContractSpec] = useState<SpecRow[]>([]);

  /** Shartnoma spetsifikatsiyasidagi nom va boshqa maydonlarni invoys qatorlariga (indeks bo‘yicha) yozadi. */
  const syncItemsFromSpec = (currentItems: InvoiceItem[], spec: SpecRow[]): InvoiceItem[] =>
    currentItems.map((item, i) => {
      const row = spec[i];
      if (!row) return item;
      const next = { ...item };
      if (row.productName != null && String(row.productName).trim() !== '') next.name = String(row.productName).trim();
      if (row.tnvedCode != null && String(row.tnvedCode).trim() !== '') next.tnvedCode = String(row.tnvedCode).trim();
      if (row.unitPrice != null) next.unitPrice = Number(row.unitPrice);
      if (row.totalPrice != null) next.totalPrice = Number(row.totalPrice);
      return next;
    });

  const invoiceRef = useRef<HTMLDivElement | null>(null);
  type ChangeLogEntry = { fieldLabel: string; oldValue: string; newValue: string; changedAt?: string };
  const initialForChangeLogRef = useRef<{ form: Record<string, unknown>; items: InvoiceItem[] } | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [viewTab, setViewTab] = useState<'invoice' | 'spec' | 'packing'>('invoice');
  const [pdfIncludeSeal, setPdfIncludeSeal] = useState(true);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<InvoiceItem[]>([

    {

      name: '',

      unit: 'кг',

      quantity: 0,

      packagesCount: undefined,

      unitPrice: 0,

      totalPrice: 0,

    }

  ]);
  const UNIT_OPTIONS = ['кг', 'шт', 'л', 'м', 'т', 'упак.', 'ящ.', 'кор.', 'меш.', 'бут.', 'банк.'];
  const defaultVisibleColumns = {
    index: true,
    tnved: true,
    plu: true,
    name: true,
    package: true,
    packagesCount: true,
    unit: true,
    quantity: true,
    gross: true,
    net: true,
    unitPrice: true,
    total: true,
    actions: true,
  };
  // Ustunlar tanlovi backendda (additionalInfo.visibleColumns / columnLabels) saqlanadi — invoysni har safar ochganda serverdan yuklanadi
  const getVisibleColumnsFromPayload = (payload: Record<string, unknown> | null | undefined): typeof defaultVisibleColumns | null => {
    if (!payload || typeof payload !== 'object' || !payload.visibleColumns || typeof payload.visibleColumns !== 'object') return null;
    const v = payload.visibleColumns as Record<string, boolean>;
    return { ...defaultVisibleColumns, ...v };
  };
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const lastInvoiceIdRef = useRef<number | null>(null);
  const latestVisibleColumnsRef = useRef<typeof defaultVisibleColumns>(defaultVisibleColumns);
  latestVisibleColumnsRef.current = visibleColumns;

  const duplicateInvoiceIdFromState = (location.state as { duplicateInvoiceId?: number })?.duplicateInvoiceId ?? null;
  useEffect(() => {
    const id = invoice?.id ?? null;
    const prevId = lastInvoiceIdRef.current;
    if (id === prevId && (id != null || duplicateInvoiceIdFromState == null)) return;
    lastInvoiceIdRef.current = id;
    if (id != null && invoice?.additionalInfo && typeof invoice.additionalInfo === 'object') {
      const fromServer = getVisibleColumnsFromPayload(invoice.additionalInfo as Record<string, unknown>);
      if (fromServer) {
        setVisibleColumns(fromServer);
        return;
      }
    }
    if (id != null) {
      if (prevId === null) {
        // Yangi saqlangan invoys: joriy ustunlar keyingi save da serverga yoziladi
      }
      setVisibleColumns(defaultVisibleColumns);
    } else {
      if (duplicateInvoiceIdFromState != null) {
        // Dublikat: asl invoys ma'lumotlari keyinroq yuklanadi (setInvoice(inv) da visibleColumns o‘rnatiladi)
        setVisibleColumns(defaultVisibleColumns);
      } else {
        setVisibleColumns(defaultVisibleColumns);
      }
    }
  }, [invoice?.id, invoice?.additionalInfo, duplicateInvoiceIdFromState]);

  // Toggle paytida faqat state yangilanadi; saqlashda additionalInfo.visibleColumns serverga yuboriladi
  const setVisibleColumnsAndPersist = useCallback(
    (update: React.SetStateAction<typeof defaultVisibleColumns>) => {
      setVisibleColumns((prev) => {
        const next = typeof update === 'function' ? (update as (p: typeof prev) => typeof prev)(prev) : update;
        return next;
      });
    },
    []
  );

  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const columnsDropdownRef = useRef<HTMLDetailsElement>(null);
  const [tirSmrDropdownOpen, setTirSmrDropdownOpen] = useState(false);
  const tirSmrDropdownRef = useRef<HTMLDivElement>(null);
  const [sertifikatlarDropdownOpen, setSertifikatlarDropdownOpen] = useState(false);
  const sertifikatlarDropdownRef = useRef<HTMLDivElement>(null);
  const [invoysDropdownOpen, setInvoysDropdownOpen] = useState(false);
  const invoysDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!columnsDropdownOpen) return;
    const closeOnClickOutside = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setColumnsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => document.removeEventListener('mousedown', closeOnClickOutside);
  }, [columnsDropdownOpen]);
  useEffect(() => {
    if (!tirSmrDropdownOpen) return;
    const closeOnClickOutside = (e: MouseEvent) => {
      if (tirSmrDropdownRef.current && !tirSmrDropdownRef.current.contains(e.target as Node)) {
        setTirSmrDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => document.removeEventListener('mousedown', closeOnClickOutside);
  }, [tirSmrDropdownOpen]);
  useEffect(() => {
    if (!sertifikatlarDropdownOpen) return;
    const closeOnClickOutside = (e: MouseEvent) => {
      if (sertifikatlarDropdownRef.current && !sertifikatlarDropdownRef.current.contains(e.target as Node)) {
        setSertifikatlarDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => document.removeEventListener('mousedown', closeOnClickOutside);
  }, [sertifikatlarDropdownOpen]);
  useEffect(() => {
    if (!invoysDropdownOpen) return;
    const closeOnClickOutside = (e: MouseEvent) => {
      if (invoysDropdownRef.current && !invoysDropdownRef.current.contains(e.target as Node)) {
        setInvoysDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => document.removeEventListener('mousedown', closeOnClickOutside);
  }, [invoysDropdownOpen]);
  const getDeliveryTermsKey = (contractKey: string) => `invoice_delivery_terms_${contractKey}`;
  const getDeliveryTermsContractKey = () => String(selectedContractId || contractIdFromQuery || 'default');
  const loadDeliveryTerms = (contractKey: string): string[] => {
    try {
      const raw = localStorage.getItem(getDeliveryTermsKey(contractKey));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      }
      return [];
    } catch {
      return [];
    }
  };
  const mergeDeliveryTerms = (contractTerms: string[], storedTerms: string[]) => {
    const merged: string[] = [];
    const seen = new Set<string>();
    const addUnique = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (seen.has(trimmed)) return;
      seen.add(trimmed);
      merged.push(trimmed);
    };
    contractTerms.forEach(addUnique);
    storedTerms.forEach(addUnique);
    return merged;
  };
  const [deliveryTermsOptions, setDeliveryTermsOptions] = useState(() => loadDeliveryTerms(getDeliveryTermsContractKey()));
  const [contractDeliveryTerms, setContractDeliveryTerms] = useState<string[]>([]);
  useEffect(() => {
    const key = getDeliveryTermsContractKey();
    localStorage.setItem(getDeliveryTermsKey(key), JSON.stringify(deliveryTermsOptions));
  }, [deliveryTermsOptions, selectedContractId, contractIdFromQuery]);
  const persistDeliveryTermsToContract = async (terms: string[]): Promise<boolean> => {
    const contractIdValue = selectedContractId || contractIdFromQuery;
    const contractIdNumber = contractIdValue ? Number(contractIdValue) : NaN;
    if (!Number.isFinite(contractIdNumber)) return false;
    try {
      await apiClient.patch(`/contracts/${contractIdNumber}/delivery-terms`, {
        deliveryTerms: terms.join('\n') || undefined,
      });
      return true;
    } catch (error) {
      console.error('Error saving delivery terms:', error);
      return false;
    }
  };
  const addDeliveryTermOption = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (contractDeliveryTerms.includes(trimmed)) return;
    const next = [...contractDeliveryTerms, trimmed];
    setContractDeliveryTerms(next);
    setDeliveryTermsOptions(next);
    const key = getDeliveryTermsContractKey();
    localStorage.setItem(getDeliveryTermsKey(key), JSON.stringify(next));
    const ok = await persistDeliveryTermsToContract(next);
    if (!ok) {
      alert("Условия поставки shartnomaga saqlanmadi. Qaytadan urinib ko'ring yoki administrator bilan bog'laning.");
    }
  };

  const defaultColumnLabels = {
    index: '№',
    tnved: 'Код ТН ВЭД',
    plu: 'Код PLU',
    name: 'Наименование товара',
    package: 'Вид упаковки',
    packagesCount: 'Кол-во упаковки',
    unit: 'Ед. изм.',
    quantity: 'Мест',
    gross: 'Брутто (кг)',
    net: 'Нетто (кг)',
    unitPrice: 'Цена за ед.изм.',
    total: 'Сумма с НДС',
    actions: 'Amallar',
  };
  type ColumnLabelKey = keyof typeof defaultColumnLabels;
  const getColumnLabelsKey = (contractKey: string) => `invoice_column_labels_${contractKey}`;
  const loadColumnLabels = (contractKey: string): typeof defaultColumnLabels => {
    try {
      const raw = localStorage.getItem(getColumnLabelsKey(contractKey));
      if (!raw) return { ...defaultColumnLabels };
      const parsed = JSON.parse(raw) as Record<string, string>;
      return { ...defaultColumnLabels, ...parsed };
    } catch {
      return { ...defaultColumnLabels };
    }
  };
  const [columnLabels, setColumnLabels] = useState(() => loadColumnLabels('default'));
  useEffect(() => {
    const key = String(selectedContractId || 'default');
    localStorage.setItem(getColumnLabelsKey(key), JSON.stringify(columnLabels));
  }, [columnLabels, selectedContractId]);

  useEffect(() => {
    const key = getDeliveryTermsContractKey();
    setColumnLabels(loadColumnLabels(key));
    setDeliveryTermsOptions(mergeDeliveryTerms(contractDeliveryTerms, loadDeliveryTerms(key)));
  }, [selectedContractId, contractIdFromQuery, contractDeliveryTerms]);

  const [form, setForm] = useState({

    invoiceNumber: undefined as string | undefined,

    date: new Date().toISOString().split('T')[0],

    currency: 'USD' as 'USD' | 'UZS',

    contractNumber: '',

    paymentTerms: '',

    dueDate: '',

    poNumber: '',

    notes: '',

    terms: '',

    tax: 0,

    discount: 0,

    shipping: 0,

    amountPaid: 0,

    additionalInfo: {} as any,

    // Дополнительная информация
    deliveryTerms: '', // Условия поставки
    vehicleNumber: '', // Номер автотранспорта
    fssRegionInternalCode: '', // FSS hudud ichki kodi
    fssRegionName: '', // FSS hudud nomi
    fssRegionExternalCode: '', // FSS hudud tashqi kodi
    loaderWeight: '', // Yuk tortuvchi og'irligi
    trailerWeight: '', // Pritsep og'irligi
    palletWeight: '', // Poddon og'irligi
    trailerNumber: '', // Pritsep raqami
    smrNumber: '', // SMR №
    shipmentPlace: '', // Место отгрузки груза
    destination: '', // Место назначения
    origin: 'Республика Узбекистан', // Происхождение товара
    manufacturer: '', // Производитель
    orderNumber: '', // Номер заказа
    gln: '', // Глобальный идентификационный номер GS1 (GLN)
    harvestYear: '', // Урожай года
    customsAddress: '', // Место там. очистки (shartnomadan tanlash)
    documents: '', // Прилагаемые документы
    carrier: '', // Перевозчик
    tirNumber: '', // TIR №
  });

  const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [markSnapshotAfterSave, setMarkSnapshotAfterSave] = useState(false);
  const [additionalInfoError, setAdditionalInfoError] = useState<string | null>(null);
  const [invoiceNumberWarning, setInvoiceNumberWarning] = useState<string | null>(null);
  const invoiceNumberCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [specCustomFields, setSpecCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [regionCodes, setRegionCodes] = useState<RegionCode[]>([]);
  const [regionCodesLoading, setRegionCodesLoading] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const [showFssRegionModal, setShowFssRegionModal] = useState(false);
  const [fssFilePrefix, setFssFilePrefix] = useState<'Ichki' | 'Tashqi'>('Ichki');
  const [fssAutoDownload, setFssAutoDownload] = useState(true);
  const [tnvedProducts, setTnvedProducts] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [packagingTypes, setPackagingTypes] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [editingGrossWeight, setEditingGrossWeight] = useState<{ index: number; value: string } | null>(null);
  const [editingNetWeight, setEditingNetWeight] = useState<{ index: number; value: string } | null>(null);
  const [addressCopySuccess, setAddressCopySuccess] = useState(false);

  useEffect(() => {

    loadData();

  }, [taskId, clientId, contractIdFromQuery]);

  useEffect(() => {
    const stages = (task as { stages?: Array<{ name: string; status: string }> })?.stages;
    const errors = (task as { errors?: unknown[] })?.errors;
    if (stages && Array.isArray(stages)) {
      const invoys = stages.find((s) => s.name === 'Invoys');
      setInvoysStageReady(!!invoys && invoys.status === 'TAYYOR');
      const sertifikat = stages.find((s) => String(s.name).trim() === 'Sertifikat olib chiqish');
      setSertifikatStageCompleted(!!sertifikat && sertifikat.status === 'TAYYOR');
    } else {
      setInvoysStageReady(false);
      setSertifikatStageCompleted(false);
    }
    setTaskHasErrors(Array.isArray(errors) && errors.length > 0);
  }, [task]);

  const loadPackagingTypes = useCallback(async () => {
    try {
      const res = await apiClient.get<Array<{ id: string; name: string; code?: string }>>('/packaging-types');
      setPackagingTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPackagingTypes([]);
    }
  }, []);

  useEffect(() => {
    setTnvedProducts(getTnvedProducts());
    loadPackagingTypes();
  }, [loadPackagingTypes]);

  /** "Наименование товара" uchun takliflar: shartnoma tanlanganida shu shartnoma spetsifikatsiyasidagi mahsulotlar, aks holda global TNVED ro'yxati. */
  const invoiceProductOptions = useMemo(() => {
    if (selectedContractSpec.length > 0) {
      return selectedContractSpec
        .map((r, i) => ({
          id: `spec-${i}`,
          name: (r.productName || '').trim(),
          code: (r.tnvedCode || '').trim(),
        }))
        .filter((p) => p.name !== '');
    }
    return tnvedProducts;
  }, [selectedContractSpec, tnvedProducts]);

  useEffect(() => {
    window.addEventListener('focus', loadPackagingTypes);
    return () => window.removeEventListener('focus', loadPackagingTypes);
  }, [loadPackagingTypes]);

  // Invoice raqam takroriy yoki yo'qligini tekshirish (debounce 300ms)
  useEffect(() => {
    const invNum = form.invoiceNumber?.trim();
    if (!invNum) {
      setInvoiceNumberWarning(null);
      return;
    }
    if (invoiceNumberCheckTimeoutRef.current) {
      clearTimeout(invoiceNumberCheckTimeoutRef.current);
    }
    invoiceNumberCheckTimeoutRef.current = setTimeout(async () => {
      invoiceNumberCheckTimeoutRef.current = null;
      try {
        const params = new URLSearchParams({ invoiceNumber: invNum });
        if (selectedContractId) params.set('contractId', selectedContractId);
        if (invoice?.id) params.set('excludeId', String(invoice.id));
        const res = await apiClient.get(`/invoices/check-number?${params}`);
        const { available } = res.data as { available: boolean };
        setInvoiceNumberWarning(available ? null : 'Bu raqam allaqachon mavjud. Ozgartirish kerak');
      } catch {
        setInvoiceNumberWarning(null);
      }
    }, 300);
    return () => {
      if (invoiceNumberCheckTimeoutRef.current) {
        clearTimeout(invoiceNumberCheckTimeoutRef.current);
      }
    };
  }, [form.invoiceNumber, selectedContractId, invoice?.id]);

  const normalizeItem = (item: InvoiceItem): InvoiceItem => ({
    ...item,
    tnvedCode: item.tnvedCode ?? undefined,
    pluCode: item.pluCode ?? undefined,
    packageType: item.packageType ?? undefined,
    packagesCount: item.packagesCount ?? undefined,
    grossWeight: item.grossWeight ?? undefined,
    netWeight: item.netWeight ?? undefined,
  });

  const loadData = async () => {

    try {

      setLoading(true);

      

      // Agar clientId va contractId bo'lsa, yangi invoice yaratish

      if (clientId && contractIdFromQuery) {

        // Mijozning shartnomalarini olish

        try {

          const contractsResponse = await apiClient.get(`/contracts/client/${clientId}`);

          setContracts(contractsResponse.data);

        } catch (error: any) {
          console.error('Error loading contracts:', error);

        }

        

        // Tanlangan shartnomani o'rnatish

        setSelectedContractId(contractIdFromQuery);

        

        // Shartnoma ma'lumotlarini yuklash va form'ga to'ldirish

        try {

          const contractResponse = await apiClient.get(`/contracts/${contractIdFromQuery}`);

          const contract = contractResponse.data;

          setForm(prev => ({

            ...prev,

            contractNumber: contract.contractNumber,

            paymentTerms: contract.deliveryTerms || prev.paymentTerms,

            date: new Date().toISOString().split('T')[0],
            gln: contract.gln || prev.gln,

          }));

          

          // Shartnoma ma'lumotlarini avtomatik to'ldirish

          handleContractSelect(contractIdFromQuery);

          // Dublikat rejimida: asl invoys ma'lumotlarini (sana, currency, notes, additionalInfo) nusxalash; tovarlar va avtomobil raqami tozalanadi
          if (duplicateInvoiceId) {
            try {
              // Keyingi invoys raqamini olish
              let nextInvoiceNumber: string | undefined;
              try {
                const nextRes = await apiClient.get(`/invoices/next-number?contractId=${contractIdFromQuery}`);
                nextInvoiceNumber = (nextRes.data as { nextNumber?: string })?.nextNumber;
              } catch {
                // next-number olinmasa bo'sh qoladi
              }
              const dupRes = await apiClient.get(`/invoices/${duplicateInvoiceId}`);
              const dup = dupRes.data as {
                date?: string;
                currency?: string;
                notes?: string;
                contractId?: number | null;
                contractNumber?: string | null;
                additionalInfo?: Record<string, unknown>;
              };
              if (dup.contractId != null) {
                setSelectedContractId(String(dup.contractId));
              }
              if (dup.contractNumber != null && dup.contractNumber.trim() !== '') {
                setForm((prev) => ({ ...prev, contractNumber: dup.contractNumber!.trim() }));
              }
              const dupAi = dup.additionalInfo && typeof dup.additionalInfo === 'object' ? dup.additionalInfo : null;
              const dupVisible = getVisibleColumnsFromPayload(dupAi ?? undefined);
              if (dupVisible) setVisibleColumns(dupVisible);
              if (dupAi?.columnLabels && typeof dupAi.columnLabels === 'object') {
                setColumnLabels((prev) => ({ ...prev, ...(dupAi.columnLabels as Record<string, string>) }));
              }
              const todayIso = new Date().toISOString().split('T')[0];
              setForm(prev => ({
                ...prev,
                invoiceNumber: nextInvoiceNumber ?? prev.invoiceNumber,
                date: todayIso,
                currency: (dup.currency as 'USD' | 'UZS') || prev.currency,
                notes: dup.notes || '',
                vehicleNumber: '',
                deliveryTerms: '',
                paymentTerms: '',
                dueDate: '',
                poNumber: '',
                terms: '',
                tax: 0,
                discount: 0,
                shipping: 0,
                amountPaid: 0,
                fssRegionInternalCode: '',
                fssRegionName: '',
                fssRegionExternalCode: '',
                loaderWeight: '',
                trailerWeight: '',
                palletWeight: '',
                trailerNumber: '',
                smrNumber: '',
                shipmentPlace: '',
                customsAddress: '',
                destination: '',
                origin: 'Республика Узбекистан',
                manufacturer: '',
                orderNumber: '',
                gln: '',
                harvestYear: '',
                documents: '',
                carrier: '',
                tirNumber: '',
              }));
              setItems([{ name: '', unit: 'кг', quantity: 0, packagesCount: undefined, unitPrice: 0, totalPrice: 0 }]);
              setCustomFields([]);
              setSpecCustomFields([]);
              // dublikat yuklanmasa oddiy yangi invoice qoldiramiz
              // dublikat yuklanmasa oddiy yangi invoice qoldiramiz
            } catch (e) {
              console.error('Error loading duplicate invoice:', e);
            }
          }

        } catch (error) {

          console.error('Error loading contract:', error);

        }

        

        setLoading(false);

        return;

      }

      

      // Eski usul: taskId orqali

      if (taskId) {

        // Task ma'lumotlarini olish

        const taskResponse = await apiClient.get(`/tasks/${taskId}`);

        setTask(taskResponse.data);

        

        // Mijozning shartnomalarini olish

        try {

          const contractsResponse = await apiClient.get(`/contracts/client/${taskResponse.data.clientId}`);

          setContracts(contractsResponse.data);

          

          // Agar URL'da contractId bo'lsa, uni tanlash

          if (contractIdFromQuery) {

            setSelectedContractId(contractIdFromQuery);

            // Contract ma'lumotlarini yuklash — form faqat invoice yo'q bo'lsa to'ldiriladi (pastda)

            try {

              const contractResponse = await apiClient.get(`/contracts/${contractIdFromQuery}`);

              const contract = contractResponse.data;

              setForm(prev => ({

                ...prev,

                contractNumber: contract.contractNumber,

                paymentTerms: contract.deliveryTerms || prev.paymentTerms,
                gln: contract.gln || prev.gln,

              }));

              // handleContractSelect faqat invoice yo'q bo'lganda chaqiriladi (saqlangan ma'lumotlarni ustidan yozmaslik uchun)

            } catch (error) {

              console.error('Error loading contract:', error);

            }

          }

        } catch (error: any) {
          console.error('Error loading contracts:', error);

        }

        

        // Invoice ma'lumotlarini olish (yo'q bo'lsa 200 + null qaytadi)

        try {

          const invoiceResponse = await apiClient.get(`/invoices/task/${taskId}`);

          const inv = invoiceResponse.data;

          if (!inv) {

            setInvoice(null);

            if (taskResponse.data?.client?.contractNumber) {

              setForm(prev => ({

                ...prev,

                contractNumber: taskResponse.data.client.contractNumber,

              }));

            }

            // Yangi invoice — shartnoma ma'lumotlari bilan form'ni to'ldirish

            if (contractIdFromQuery) {

              handleContractSelect(contractIdFromQuery);

            }

          } else {

            setInvoice(inv);

            setForm(prev => ({
              ...prev,
              invoiceNumber: inv.invoiceNumber || undefined,
              date: inv.date ? inv.date.split('T')[0] : new Date().toISOString().split('T')[0],
              currency: inv.currency || 'USD',
              contractNumber: inv.contractNumber || '',
              paymentTerms: inv.additionalInfo?.paymentTerms ?? prev.paymentTerms,
              dueDate: inv.additionalInfo?.dueDate ?? prev.dueDate,
              poNumber: inv.additionalInfo?.poNumber ?? prev.poNumber,
              notes: inv.notes ?? prev.notes,
              terms: inv.additionalInfo?.terms ?? prev.terms,
              tax: inv.additionalInfo?.tax ?? prev.tax,
              discount: inv.additionalInfo?.discount ?? prev.discount,
              shipping: inv.additionalInfo?.shipping ?? prev.shipping,
              amountPaid: inv.additionalInfo?.amountPaid ?? prev.amountPaid,
              deliveryTerms: inv.additionalInfo?.deliveryTerms ?? prev.deliveryTerms,
              vehicleNumber: inv.additionalInfo?.vehicleNumber ?? prev.vehicleNumber,
              fssRegionInternalCode:
                inv.additionalInfo?.fssRegionInternalCode ?? prev.fssRegionInternalCode,
              fssRegionName: inv.additionalInfo?.fssRegionName ?? prev.fssRegionName,
              fssRegionExternalCode:
                inv.additionalInfo?.fssRegionExternalCode ?? prev.fssRegionExternalCode,
              loaderWeight: inv.additionalInfo?.loaderWeight ?? prev.loaderWeight,
              trailerWeight: inv.additionalInfo?.trailerWeight ?? prev.trailerWeight,
              palletWeight: inv.additionalInfo?.palletWeight ?? prev.palletWeight,
              trailerNumber: inv.additionalInfo?.trailerNumber ?? prev.trailerNumber,
              smrNumber: inv.additionalInfo?.smrNumber ?? prev.smrNumber,
              shipmentPlace: inv.additionalInfo?.shipmentPlace ?? prev.shipmentPlace,
              customsAddress: inv.additionalInfo?.customsAddress ?? prev.customsAddress,
              destination: inv.additionalInfo?.destination ?? prev.destination,
              manufacturer: inv.additionalInfo?.manufacturer ?? prev.manufacturer,
              orderNumber: inv.additionalInfo?.orderNumber ?? prev.orderNumber,
              gln: inv.additionalInfo?.gln ?? prev.gln,
              harvestYear: inv.additionalInfo?.harvestYear ?? prev.harvestYear,
              documents: inv.additionalInfo?.documents ?? prev.documents,
              carrier: inv.additionalInfo?.carrier ?? prev.carrier,
              tirNumber: inv.additionalInfo?.tirNumber ?? prev.tirNumber,
            }));
            const loadedItems = (inv.items || []).map(normalizeItem);
            setItems(loadedItems);
            setCustomFields(inv.additionalInfo?.customFields || []);
            setSpecCustomFields(inv.additionalInfo?.specCustomFields || []);
            const ai = inv.additionalInfo && typeof inv.additionalInfo === 'object' ? inv.additionalInfo as Record<string, unknown> : null;
            const savedVisible = getVisibleColumnsFromPayload(ai);
            if (savedVisible) setVisibleColumns(savedVisible);
            if (ai?.columnLabels && typeof ai.columnLabels === 'object') {
              setColumnLabels((prev) => ({ ...prev, ...(ai.columnLabels as Record<string, string>) }));
            }

            initialForChangeLogRef.current = {
              form: {
                invoiceNumber: inv.invoiceNumber ?? '',
                date: inv.date ? inv.date.split('T')[0] : '',
                currency: inv.currency ?? 'USD',
                contractNumber: inv.contractNumber ?? '',
                paymentTerms: inv.additionalInfo?.paymentTerms ?? '',
                dueDate: inv.additionalInfo?.dueDate ?? '',
                poNumber: inv.additionalInfo?.poNumber ?? '',
                notes: inv.notes ?? '',
                deliveryTerms: inv.additionalInfo?.deliveryTerms ?? '',
                vehicleNumber: inv.additionalInfo?.vehicleNumber ?? '',
                loaderWeight: inv.additionalInfo?.loaderWeight ?? '',
                trailerWeight: inv.additionalInfo?.trailerWeight ?? '',
                palletWeight: inv.additionalInfo?.palletWeight ?? '',
                trailerNumber: inv.additionalInfo?.trailerNumber ?? '',
                smrNumber: inv.additionalInfo?.smrNumber ?? '',
                shipmentPlace: inv.additionalInfo?.shipmentPlace ?? '',
                destination: inv.additionalInfo?.destination ?? '',
                origin: inv.additionalInfo?.origin ?? 'Республика Узбекистан',
                manufacturer: inv.additionalInfo?.manufacturer ?? '',
                orderNumber: inv.additionalInfo?.orderNumber ?? '',
                gln: inv.additionalInfo?.gln ?? '',
                customsAddress: inv.additionalInfo?.customsAddress ?? '',
              },
              items: loadedItems,
            };

            if (inv.contractId) {
              setSelectedContractId(inv.contractId.toString());
              try {
                const contractResponse = await apiClient.get(`/contracts/${inv.contractId}`);
                const contract = contractResponse.data;
                const contractCurrency = (contract.contractCurrency && ['USD', 'RUB', 'EUR'].includes(contract.contractCurrency)) ? contract.contractCurrency : 'USD';
                setSelectedContractCurrency(contractCurrency);
                let spec: SpecRow[] = [];
                if (contract.specification) {
                  if (Array.isArray(contract.specification)) spec = contract.specification;
                  else if (typeof contract.specification === 'string') {
                    try { spec = JSON.parse(contract.specification); } catch { spec = []; }
                  }
                }
                setSelectedContractSpec(spec);
                setItems(syncItemsFromSpec(loadedItems, spec));
                // Faqat contractNumber — paymentTerms/gln saqlangan inv.additionalInfo dan qoladi
                setForm(prev => ({
                  ...prev,
                  contractNumber: contract.contractNumber,
                }));
                // Modal uchun delivery terms ro'yxati
                const deliveryTermsList = String(contract.deliveryTerms || '')
                  .split('\n')
                  .map((item: string) => item.trim())
                  .filter(Boolean);
                setContractDeliveryTerms(deliveryTermsList);
                const deliveryTermsKey = inv.contractId.toString();
                const merged = mergeDeliveryTerms(deliveryTermsList, loadDeliveryTerms(deliveryTermsKey));
                setDeliveryTermsOptions(merged);
                localStorage.setItem(getDeliveryTermsKey(deliveryTermsKey), JSON.stringify(merged));
              } catch (error) {
                console.error('Error loading contract:', error);
              }
            }

          }

        } catch (error: any) {

          if (error.response?.status === 404) {

            setInvoice(null);
            if (taskResponse.data?.client?.contractNumber) {
              setForm(prev => ({
                ...prev,
                contractNumber: taskResponse.data.client.contractNumber,
              }));
            }

          } else {

            console.error('Error loading invoice:', error);

          }

        }

      }

    } catch (error) {

      console.error('Error loading data:', error);

      alert('Ma\'lumotlarni yuklashda xatolik yuz berdi');

    } finally {

      setLoading(false);

    }

  };



  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {

    const newItems = [...items];

    newItems[index] = { ...newItems[index], [field]: value };

    // Foydalanuvchi nettoni qo'lda o'zgartirganda formulani tozalash
    if (field === 'netWeight') {
      newItems[index].netWeightFormula = undefined;
    }

    // Brutto yoki Кол-во упаковки o'zgarganda: agar netto formulasi bor bo'lsa, formula bo'yicha yangilash; yo'q bo'lsa nettoni tozalash
    if (field === 'grossWeight' || field === 'packagesCount') {
      setEditingNetWeight((prev) => (prev?.index === index ? null : prev));
      const formula = newItems[index].netWeightFormula?.trim();
      if (formula?.startsWith('*')) {
        const mult = parseFloat(formula.slice(1).trim().replace(',', '.'));
        if (!Number.isNaN(mult)) {
          const gross = field === 'grossWeight' ? (value ?? 0) : (newItems[index].grossWeight ?? 0);
          const pkgCount = field === 'packagesCount' ? (value ?? 0) : (newItems[index].packagesCount ?? 0);
          newItems[index].netWeight = Math.round(gross - mult * pkgCount);
        } else {
          newItems[index].netWeight = undefined;
        }
      } else {
        newItems[index].netWeight = undefined;
      }
    }

    // Total price ni hisoblash: Нетто * Цена за ед.изм.
    if (field === 'netWeight' || field === 'unitPrice' || field === 'grossWeight' || field === 'packagesCount') {
      const netWeight = newItems[index].netWeight ?? 0;
      const unitPrice = newItems[index].unitPrice ?? 0;
      newItems[index].totalPrice = netWeight * unitPrice;
    }

    setItems(newItems);

  };

  const handleNameChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name: value };
    const nameTrim = value.trim();
    if (nameTrim && selectedContractSpec.length > 0) {
      const specRow = selectedContractSpec.find(
        (r) => (r.productName || '').trim().toLowerCase() === nameTrim.toLowerCase()
      );
      if (specRow) {
        if (specRow.tnvedCode != null && specRow.tnvedCode.trim() !== '') {
          newItems[index].tnvedCode = specRow.tnvedCode.trim();
        }
        const up = specRow.unitPrice != null ? Number(specRow.unitPrice) : 0;
        const tp = specRow.totalPrice != null ? Number(specRow.totalPrice) : up * (newItems[index].netWeight || 0);
        newItems[index].unitPrice = up;
        newItems[index].totalPrice = tp;
      } else {
        newItems[index].unitPrice = 0;
        newItems[index].totalPrice = 0;
        const match = invoiceProductOptions.find((p) => p.name === nameTrim);
        if (match) newItems[index].tnvedCode = match.code;
      }
    } else {
      const match = invoiceProductOptions.find((p) => p.name === nameTrim);
      if (match) newItems[index].tnvedCode = match.code;
    }
    setItems(newItems);
  };

  const handleGrossWeightChange = (index: number, value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      handleItemChange(index, 'grossWeight', undefined);
      setEditingGrossWeight(null);
      return;
    }
    if (trimmed.startsWith('*')) {
      setEditingGrossWeight({ index, value });
      return;
    }
    setEditingGrossWeight(null);
    const num = parseFloat(trimmed.replace(',', '.'));
    handleItemChange(index, 'grossWeight', Number.isNaN(num) ? undefined : num);
  };

  const applyGrossWeightFormula = (index: number) => {
    if (editingGrossWeight?.index !== index) return;
    const v = editingGrossWeight.value.trim();
    if (!v.startsWith('*')) {
      setEditingGrossWeight(null);
      return;
    }
    const multiplier = parseFloat(v.slice(1).trim().replace(',', '.'));
    if (Number.isNaN(multiplier)) {
      setEditingGrossWeight(null);
      return;
    }
    const pkgCount = items[index]?.packagesCount ?? 0;
    const result = Math.round(pkgCount * multiplier);
    handleItemChange(index, 'grossWeight', result);
    setEditingGrossWeight(null);
  };

  const getGrossWeightDisplayValue = (index: number, item: InvoiceItem) => {
    if (editingGrossWeight?.index === index) return editingGrossWeight.value;
    return item.grossWeight !== undefined && item.grossWeight !== null ? String(item.grossWeight) : '';
  };

  const handleNetWeightChange = (index: number, value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      handleItemChange(index, 'netWeight', undefined);
      setEditingNetWeight(null);
      return;
    }
    if (trimmed.startsWith('*')) {
      setEditingNetWeight({ index, value });
      return;
    }
    setEditingNetWeight(null);
    const num = parseFloat(trimmed.replace(',', '.'));
    handleItemChange(index, 'netWeight', Number.isNaN(num) ? undefined : num);
  };

  const applyNetWeightFormula = (index: number) => {
    if (editingNetWeight?.index !== index) return;
    const v = editingNetWeight.value.trim();
    if (!v.startsWith('*')) {
      setEditingNetWeight(null);
      return;
    }
    const multiplier = parseFloat(v.slice(1).trim().replace(',', '.'));
    if (Number.isNaN(multiplier)) {
      setEditingNetWeight(null);
      return;
    }
    const grossWeight = items[index]?.grossWeight ?? 0;
    const pkgCount = items[index]?.packagesCount ?? 0;
    const result = Math.round(grossWeight - multiplier * pkgCount);
    setItems((prev) => {
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
  };

  const getNetWeightDisplayValue = (index: number, item: InvoiceItem) => {
    if (editingNetWeight?.index === index) return editingNetWeight.value;
    return item.netWeight !== undefined && item.netWeight !== null ? String(item.netWeight) : '';
  };

  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  const getVehiclePlate = (value?: string) => {
    if (!value) return '';
    return value.split('/')[0].trim();
  };
  const buildTaskTitle = (invoiceNumber?: string, vehicleNumber?: string) => {
    const safeInvoice = invoiceNumber?.trim();
    const plate = getVehiclePlate(vehicleNumber);
    if (!safeInvoice || !plate) return '';
    return `${safeInvoice} АВТО ${plate}`;
  };

  const buildDownloadBase = (type: string) => {
    const sanitize = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '_').trim();
    const plate = sanitize(getVehiclePlate(form.vehicleNumber) || (invoice?.invoiceNumber || form.invoiceNumber || 'N')).replace(/\s+/g, '_');
    return `${type}_${plate}`;
  };

  /** Invoys PDF va Invoys Excel uchun: "DZA-157 АВТО 40232BAA" ko'rinishi */
  const buildInvoiceDownloadBase = () => {
    const sanitize = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '_').trim();
    const inv = sanitize(invoice?.invoiceNumber || form.invoiceNumber || 'Invoice');
    const plate = getVehiclePlate(form.vehicleNumber)?.trim() || '';
    return plate ? `${inv} АВТО ${plate}` : inv;
  };

  const generatePdf = async (includeSeal: boolean) => {
    if (!invoiceRef.current) {
      alert("Invoice ko'rinishi topilmadi");
      return;
    }

    setPdfIncludeSeal(includeSeal);
    setIsPdfMode(true);
    await waitForPaint();

    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginVertical = 20;
    const marginHorizontal = 10;
    const maxWidth = pageWidth - marginHorizontal * 2;
    const maxHeight = pageHeight - marginVertical * 2;
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const imgWidth = canvas.width * scale;
    const imgHeight = canvas.height * scale;
    const x = marginHorizontal;
    const y = marginVertical;
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');

    const fileBase = buildInvoiceDownloadBase();
    pdf.save(`${fileBase}.pdf`);

    setIsPdfMode(false);
    setPdfIncludeSeal(true);
  };

  const extractBlobErrorMessage = async (blob: Blob, fallback: string) => {
    try {
      const text = await blob.text();
      if (!text) {
        return fallback;
      }
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) {
          return String(parsed.error);
        }
      } catch {
        // Not JSON, fall back to raw text
      }
      return text;
    } catch {
      return fallback;
    }
  };

  const downloadExcelResponse = async (
    response: { data: Blob; status: number; headers?: any },
    fileName: string,
    fallbackError: string
  ) => {
    if (response.status >= 400) {
      const message = await extractBlobErrorMessage(response.data, fallbackError);
      throw new Error(message);
    }
    const contentType = String(response.headers?.['content-type'] || response.headers?.['Content-Type'] || '');
    if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      const message = await extractBlobErrorMessage(response.data, fallbackError);
      throw new Error(message);
    }
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const trackProcessDownload = (processType: 'TIR' | 'CERT' | 'DECLARATION') => {
    const tid = taskId ? Number(taskId) : invoice?.taskId;
    if (!tid || !Number.isFinite(tid)) return;
    apiClient.post('/process/download', { taskId: tid, processType }).catch(() => {});
  };

  const loadRegionCodes = async (): Promise<RegionCode[]> => {
    if (regionCodesLoading) return regionCodes;
    setRegionCodesLoading(true);
    try {
      const response = await apiClient.get('/region-codes');
      const data = Array.isArray(response.data) ? (response.data as RegionCode[]) : [];
      setRegionCodes(data);
      return data;
    } catch (error) {
      console.error('Error loading region codes:', error);
      alert('Hudud kodlarini yuklashda xatolik yuz berdi');
      return [];
    } finally {
      setRegionCodesLoading(false);
    }
  };

  const findOltiariqRegion = (list: RegionCode[]) => {
    return list.find((region) => {
      const name = region.name.toLowerCase();
      return name.includes('олтиарик') || name.includes('oltiariq');
    });
  };

  const openFssRegionPicker = async (prefix: 'Ichki' | 'Tashqi' = 'Ichki') => {
    setFssFilePrefix(prefix);
    setFssAutoDownload(true);
    const hasSavedRegion =
      form.fssRegionName &&
      (form.fssRegionInternalCode || form.fssRegionExternalCode);
    if (hasSavedRegion) {
      await generateFssExcel({
        internalCode: form.fssRegionInternalCode,
        name: form.fssRegionName,
        externalCode: form.fssRegionExternalCode,
        filePrefix: prefix,
        templateType: prefix === 'Ichki' ? 'ichki' : 'tashqi',
      });
      return;
    }
    const branchName = task?.branch?.name?.toLowerCase() || '';
    const isOltiariqBranch = branchName.includes('oltiariq');
    if (isOltiariqBranch) {
      const list = regionCodes.length ? regionCodes : await loadRegionCodes();
      const match = findOltiariqRegion(list);
      if (match) {
        setForm(prev => ({
          ...prev,
          fssRegionInternalCode: match.internalCode,
          fssRegionName: match.name,
          fssRegionExternalCode: match.externalCode,
        }));
        setShowFssRegionModal(false);
        await generateFssExcel({
          internalCode: match.internalCode,
          name: match.name,
          externalCode: match.externalCode,
          filePrefix: prefix,
          templateType: prefix === 'Ichki' ? 'ichki' : 'tashqi',
        });
        return;
      }
    }
    setShowFssRegionModal(true);
    if (!regionCodes.length) {
      await loadRegionCodes();
    }
  };

  const openFssRegionSelector = async () => {
    setFssAutoDownload(false);
    const branchName = task?.branch?.name?.toLowerCase() || '';
    const isOltiariqBranch = branchName.includes('oltiariq');
    if (isOltiariqBranch) {
      const list = regionCodes.length ? regionCodes : await loadRegionCodes();
      const match = findOltiariqRegion(list);
      if (match) {
        setForm(prev => ({
          ...prev,
          fssRegionInternalCode: match.internalCode,
          fssRegionName: match.name,
          fssRegionExternalCode: match.externalCode,
        }));
        setShowFssRegionModal(false);
        return;
      }
    }
    setShowFssRegionModal(true);
    if (!regionCodes.length) {
      await loadRegionCodes();
    }
  };

  const buildFssQuery = (override?: {
    internalCode?: string;
    name?: string;
    externalCode?: string;
    templateType?: 'ichki' | 'tashqi';
  }) => {
    const params = new URLSearchParams();
    const internalCode = override?.internalCode ?? form.fssRegionInternalCode;
    const name = override?.name ?? form.fssRegionName;
    const externalCode = override?.externalCode ?? form.fssRegionExternalCode;
    if (internalCode) params.set('regionInternalCode', internalCode);
    if (name) params.set('regionName', name);
    if (externalCode) params.set('regionExternalCode', externalCode);
    if (override?.templateType) params.set('template', override.templateType);
    return params.toString();
  };

  const currentSnapshot = useMemo(
    () => JSON.stringify({ form, items, selectedContractId, customFields, specCustomFields }),
    [form, items, selectedContractId, customFields, specCustomFields]
  );
  const isDirty = savedSnapshot === '' ? true : currentSnapshot !== savedSnapshot;
  const templatesDisabled = saving || isDirty;

  useEffect(() => {
    if (markSnapshotAfterSave) {
      setSavedSnapshot(currentSnapshot);
      setMarkSnapshotAfterSave(false);
    }
  }, [markSnapshotAfterSave, currentSnapshot]);

  useEffect(() => {
    if (invoice?.id && savedSnapshot === '' && !markSnapshotAfterSave) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [invoice?.id, savedSnapshot, currentSnapshot, markSnapshotAfterSave]);

  useEffect(() => {
    if (!showPdfMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!pdfMenuRef.current) return;
      if (pdfMenuRef.current.contains(event.target as Node)) return;
      setShowPdfMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPdfMenu]);

  const generateSmrExcel = async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/cmr`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('SMR')}.xlsx`;
      await downloadExcelResponse(response, fileName, 'CMR yuklab olishda xatolik yuz berdi');
      trackProcessDownload('TIR');
    } catch (error) {
      console.error('Error downloading CMR:', error);
      alert(error instanceof Error ? error.message : 'CMR yuklab olishda xatolik yuz berdi');
    }
  };

  const generateTirExcel = async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/tir`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('TIR')}.xlsx`;
      await downloadExcelResponse(response, fileName, 'TIR yuklab olishda xatolik yuz berdi');
      trackProcessDownload('TIR');
    } catch (error) {
      console.error('Error downloading TIR:', error);
      alert(error instanceof Error ? error.message : 'TIR yuklab olishda xatolik yuz berdi');
    }
  };

  const generateFssExcel = async (override?: {
    internalCode?: string;
    name?: string;
    externalCode?: string;
    filePrefix?: 'Ichki' | 'Tashqi';
    templateType?: 'ichki' | 'tashqi';
  }) => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const query = buildFssQuery(override);
      const url = query ? `/invoices/${invoice.id}/fss?${query}` : `/invoices/${invoice.id}/fss`;
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });
      const prefix = override?.filePrefix || fssFilePrefix || 'Ichki';
      const fileName = `${buildDownloadBase(prefix.toUpperCase())}.xlsx`;
      await downloadExcelResponse(response, fileName, 'FSS yuklab olishda xatolik yuz berdi');
      trackProcessDownload('CERT');
    } catch (error) {
      console.error('Error downloading FSS:', error);
      alert(error instanceof Error ? error.message : 'FSS yuklab olishda xatolik yuz berdi');
    }
  };

  const generateInvoiceExcel = async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/xlsx`, {
        responseType: 'blob',
      });
      const fileName = `${buildInvoiceDownloadBase()}.xlsx`;
      await downloadExcelResponse(response, fileName, 'Invoys Excel yuklab olishda xatolik yuz berdi');
    } catch (error) {
      console.error('Error downloading Invoice Excel:', error);
      alert(error instanceof Error ? error.message : 'Invoys Excel yuklab olishda xatolik yuz berdi');
    }
  };

  const generateST1Excel = async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/st1`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('ST1')}.xlsx`;
      await downloadExcelResponse(response, fileName, 'ST-1 shabloni yuklab olishda xatolik yuz berdi');
      trackProcessDownload('CERT');
    } catch (error) {
      console.error('Error downloading ST-1 Excel:', error);
      alert(error instanceof Error ? error.message : 'ST-1 shabloni yuklab olishda xatolik yuz berdi');
    }
  };

  const generateCommodityEkExcel = async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/commodity-ek`, {
        responseType: 'blob',
      });
      const fileName = 'CommodityEk_New.xlsx';
      await downloadExcelResponse(response, fileName, 'Deklaratsiya shabloni yuklab olishda xatolik yuz berdi');
      trackProcessDownload('DECLARATION');
    } catch (error) {
      console.error('Error downloading Deklaratsiya Excel:', error);
      alert(error instanceof Error ? error.message : 'Deklaratsiya shabloni yuklab olishda xatolik yuz berdi');
    }
  };

  const addItem = () => {

    setItems([...items, {

      name: '',

      unit: 'кг',

      quantity: 0,

      packagesCount: undefined,

      unitPrice: 0,

      totalPrice: 0,

      tnvedCode: '',
      pluCode: '',
      packageType: '',
      grossWeight: undefined,
      netWeight: undefined,
    }]);

  };



  const removeItem = (index: number) => {

    if (items.length > 1) {

      setItems(items.filter((_, i) => i !== index));

    }

  };



  const handleContractSelect = async (contractId: string) => {

    setSelectedContractId(contractId);

    if (!contractId) {
      setSelectedContractSpec([]);
      setSelectedContractCurrency('USD');
      return;
    }

    

    try {

      const response = await apiClient.get(`/contracts/${contractId}`);

      const contract = response.data;

      let spec: SpecRow[] = [];
      if (contract.specification) {
        if (Array.isArray(contract.specification)) spec = contract.specification;
        else if (typeof contract.specification === 'string') {
          try { spec = JSON.parse(contract.specification); } catch { spec = []; }
        }
      }
      setSelectedContractSpec(spec);
      setItems((prev) => syncItemsFromSpec(prev, spec));

      // Shartnoma ma'lumotlarini invoice form'ga to'ldirish
      const dtArr = String(contract.deliveryTerms || '').split('\n').map((s: string) => s.trim());
      const caArr = String(contract.customsAddress || '').split('\n').map((s: string) => s.trim());
      const maxLen = Math.max(dtArr.length, caArr.length);
      while (dtArr.length < maxLen) dtArr.push('');
      while (caArr.length < maxLen) caArr.push('');
      const deliveryTermsList = dtArr.filter(Boolean);
      const firstDt = deliveryTermsList[0] || dtArr[0] || '';
      const pairedCustoms = firstDt ? (() => { const i = dtArr.indexOf(firstDt); return i >= 0 && caArr[i]?.trim() ? caArr[i].trim() : ''; })() : '';
      setContractDeliveryTerms(deliveryTermsList.length ? deliveryTermsList : (firstDt ? [firstDt] : []));
      const contractCurrency = (contract.contractCurrency && ['USD', 'RUB', 'EUR'].includes(contract.contractCurrency)) ? contract.contractCurrency : 'USD';
      setSelectedContractCurrency(contractCurrency);
      setForm(prev => ({
        ...prev,
        contractNumber: contract.contractNumber,
        paymentTerms: contract.deliveryTerms || '',
        deliveryTerms: firstDt || prev.deliveryTerms,
        customsAddress: pairedCustoms,
        gln: contract.gln || prev.gln,
      }));
      const deliveryTermsKey = getDeliveryTermsContractKey();
      const mergedDeliveryTerms = mergeDeliveryTerms(deliveryTermsList, loadDeliveryTerms(deliveryTermsKey));
      setDeliveryTermsOptions(mergedDeliveryTerms);
      localStorage.setItem(getDeliveryTermsKey(deliveryTermsKey), JSON.stringify(mergedDeliveryTerms));

      

      // AdditionalInfo'ga to'lov usulini qo'shish

      if (contract.paymentMethod) {

        setForm(prev => ({

          ...prev,

          additionalInfo: {

            ...prev.additionalInfo,

            paymentMethod: contract.paymentMethod,

          }

        }));

      }

    } catch (error: any) {
      console.error('Error loading contract:', error);

      alert('Shartnoma ma\'lumotlarini yuklashda xatolik yuz berdi');

    }

  };



  const handleMarkInvoysReady = async () => {
    const tid = taskId || invoice?.taskId;
    if (!tid) {
      alert('Task topilmadi');
      return;
    }
    try {
      setMarkingReady(true);
      const stagesRes = await apiClient.get(`/tasks/${tid}/stages`);
      const stages = stagesRes.data as Array<{ id: number; name: string; status: string }>;
      const invoysStage = stages.find((s) => s.name === 'Invoys');
      if (!invoysStage) {
        alert('Invoys jarayoni topilmadi');
        return;
      }
      if (invoysStage.status === 'TAYYOR') {
        alert('Invoys jarayoni allaqachon tayyor');
        return;
      }
      await apiClient.patch(`/tasks/${tid}/stages/${invoysStage.id}`, { status: 'TAYYOR' });
      setInvoysStageReady(true);
      alert('Invoys jarayoni tayyor qilindi');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Invoys jarayonini tayyor qilishda xatolik');
    } finally {
      setMarkingReady(false);
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    invoiceNumber: 'Invoice raqami',
    date: 'Sana',
    currency: 'Valyuta',
    contractNumber: 'Shartnoma raqami',
    paymentTerms: 'To\'lov shartlari',
    dueDate: 'Muddat',
    poNumber: 'Buyurtma raqami',
    notes: 'Izohlar',
    deliveryTerms: 'Yetkazib berish shartlari',
    vehicleNumber: 'Avtomobil raqami',
    loaderWeight: 'Yuk tortuvchi og\'irligi',
    trailerWeight: 'Pritsep og\'irligi',
    palletWeight: 'Poddon og\'irligi',
    trailerNumber: 'Pritsep raqami',
    smrNumber: 'SMR №',
    shipmentPlace: 'Yuk tushirish joyi',
    destination: 'Yetkazib berish manzili',
    origin: 'Kelib chiqishi',
    manufacturer: 'Ishlab chiqaruvchi',
    orderNumber: 'Buyurtma raqami',
    gln: 'GLN',
    customsAddress: 'Bo\'jxona manzili',
    items: 'Tovarlar ro\'yxati',
  };

  const formatChangeLogDateTime = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${h}:${min}`;
  };

  const buildChangeLog = (): ChangeLogEntry[] => {
    const initial = initialForChangeLogRef.current;
    if (!initial) return [];
    const changedAt = formatChangeLogDateTime(new Date());
    const entries: ChangeLogEntry[] = [];
    const curForm: Record<string, unknown> = {
      invoiceNumber: form.invoiceNumber ?? '',
      date: form.date ?? '',
      currency: form.currency ?? 'USD',
      contractNumber: form.contractNumber ?? '',
      paymentTerms: form.paymentTerms ?? '',
      dueDate: form.dueDate ?? '',
      poNumber: form.poNumber ?? '',
      notes: form.notes ?? '',
      deliveryTerms: form.deliveryTerms ?? '',
      vehicleNumber: form.vehicleNumber ?? '',
      loaderWeight: form.loaderWeight ?? '',
      trailerWeight: form.trailerWeight ?? '',
      palletWeight: form.palletWeight ?? '',
      trailerNumber: form.trailerNumber ?? '',
      smrNumber: form.smrNumber ?? '',
      shipmentPlace: form.shipmentPlace ?? '',
      destination: form.destination ?? '',
      origin: form.origin || 'Республика Узбекистан',
      manufacturer: form.manufacturer ?? '',
      orderNumber: form.orderNumber ?? '',
      gln: form.gln ?? '',
      customsAddress: form.customsAddress ?? '',
    };
    for (const key of Object.keys(FIELD_LABELS)) {
      if (key === 'items') continue;
      const oldV = String(initial.form[key] ?? '');
      const newV = String(curForm[key] ?? '');
      if (oldV !== newV) entries.push({ fieldLabel: FIELD_LABELS[key] || key, oldValue: oldV || '—', newValue: newV || '—', changedAt });
    }
    const ITEM_FIELD_LABELS: Record<string, string> = {
      name: 'Наименование товара',
      quantity: 'Мест',
      packagesCount: 'Кол-во упаковки',
      unit: 'Ед. изм.',
      packageType: 'Вид упаковки',
      grossWeight: 'Брутто (кг)',
      netWeight: 'Нетто (кг)',
      unitPrice: 'Цена за ед.изм.',
      totalPrice: 'Сумма с НДС',
    };
    const maxRows = Math.max(initial.items.length, items.length);
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      const oldRow = initial.items[rowIdx];
      const newRow = items[rowIdx];
      const rowNum = rowIdx + 1;
      if (!oldRow && newRow) {
        entries.push({
          fieldLabel: `Tovar ${rowNum}`,
          oldValue: '—',
          newValue: 'Qo\'shilgan',
          changedAt,
        });
        continue;
      }
      if (oldRow && !newRow) {
        entries.push({
          fieldLabel: `Tovar ${rowNum}`,
          oldValue: 'O\'chirilgan',
          newValue: '—',
          changedAt,
        });
        continue;
      }
      if (!oldRow || !newRow) continue;
      for (const [key, label] of Object.entries(ITEM_FIELD_LABELS)) {
        const oldV = oldRow[key as keyof InvoiceItem];
        const newV = newRow[key as keyof InvoiceItem];
        const oldStr = oldV != null ? String(oldV) : '';
        const newStr = newV != null ? String(newV) : '';
        if (oldStr !== newStr) {
          entries.push({
            fieldLabel: `Tovar ${rowNum} — ${label}`,
            oldValue: oldStr || '—',
            newValue: newStr || '—',
            changedAt,
          });
        }
      }
    }
    return entries;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditEffective) return;

    if (!form.deliveryTerms.trim() || !form.vehicleNumber.trim()) {
      setAdditionalInfoError('Iltimos, "Условия поставки" va "Номер автотранспорта" maydonlarini to‘ldiring');
      setShowAdditionalInfoModal(true);
      return;
    }

    if (additionalInfoError) {
      setAdditionalInfoError(null);
    }

    if (invoiceNumberWarning) {
      alert('Invoice raqamini ozgartiring. ' + invoiceNumberWarning);
      return;
    }

    

    const hasValidItems =
      items.length > 0 &&
      items.every(
        (item) =>
          item.name?.trim() &&
          (Number(item.quantity) > 0 || Number(item.packagesCount ?? 0) > 0) &&
          Number(item.unitPrice) > 0
      );
    if (!hasValidItems) {
      alert('Iltimos, barcha tovarlarni to\'liq to\'ldiring (Наименование, Мест yoki Кол-во упаковки, Цена за ед.изм.)');
      return;
    }



    try {

      setSaving(true);

      let currentTaskId = taskId ? Number(taskId) : undefined;
      let currentTask = task;

      // Yangi invoys (taskId yo'q): avval task yaratamiz, keyin invoys saqlanadi
      if (!currentTaskId && clientId && newInvoiceTaskForm?.branchId) {
        const taskTitle = `Invoice - ${newInvoiceTaskForm.contractNumber || form.contractNumber || 'yangi'}`;
        const taskResponse = await apiClient.post('/tasks', {
          clientId: Number(clientId),
          branchId: Number(newInvoiceTaskForm.branchId),
          title: taskTitle,
          comments: newInvoiceTaskForm.comments || `Invoice yaratish. Shartnoma: ${form.contractNumber}`,
          hasPsr: newInvoiceTaskForm.hasPsr ?? false,
          driverPhone: newInvoiceTaskForm.driverPhone || undefined,
        });
        const createdTask = taskResponse.data as { id: number; clientId?: number; branchId?: number; title?: string; client?: unknown };
        currentTaskId = createdTask.id;
        currentTask = createdTask as Task | null;
        setTask(currentTask);
      }

      if (!currentTaskId) {
        alert('Yangi invoys uchun filial tanlangan bo\'lishi kerak. Iltimos, Invoyslar sahifasidan "Yangi Invoice" orqali kirishni urinib ko\'ring.');
        setSaving(false);
        return;
      }

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      const normalizedItems = items.map((item, index) => {
        const normalized = normalizeItem(item);
        const qty = normalized.quantity != null ? Number(normalized.quantity) : 0;
        const pkgCount = normalized.packagesCount != null ? Number(normalized.packagesCount) : undefined;
        // Мест (quantity) ni foydalanuvchi kiritgan qiymat sifatida yuboramiz; 0 bo‘lsa 0 qoladi, packagesCount ga ustunlik bermaymiz
        const quantityForBackend = qty;
        return {
          ...normalized,
          quantity: quantityForBackend,
          packagesCount: pkgCount,
          unitPrice: Number(normalized.unitPrice) || 0,
          totalPrice: Number(normalized.totalPrice) || 0,
          orderIndex: index,
        };
      });

      const invoiceData = {

        taskId: currentTaskId,

        clientId: clientId ? Number(clientId) : (currentTask?.client?.id ?? (currentTask as { clientId?: number })?.clientId) || undefined,

        invoiceNumber: form.invoiceNumber && form.invoiceNumber.trim() !== '' ? form.invoiceNumber.trim() : undefined, // Agar bo'sh bo'lsa, backend avtomatik yaratadi

        date: form.date,

        currency: form.currency,

        contractNumber: form.contractNumber,

        contractId: selectedContractId ? Number(selectedContractId) : undefined,

        items: normalizedItems,
        totalAmount: normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0),

        notes: form.notes,

        additionalInfo: (() => {
          const base = {
            paymentTerms: form.paymentTerms,
            dueDate: form.dueDate,
            poNumber: form.poNumber,
            terms: form.terms,
            tax: form.tax,
            discount: form.discount,
            shipping: form.shipping,
            amountPaid: form.amountPaid,
            paymentMethod: form.additionalInfo?.paymentMethod,
            deliveryTerms: form.deliveryTerms,
            vehicleNumber: form.vehicleNumber,
            fssRegionInternalCode: form.fssRegionInternalCode,
            fssRegionName: form.fssRegionName,
            fssRegionExternalCode: form.fssRegionExternalCode,
            packagingTypeCodes: packagingTypes.map((entry) => ({
              name: entry.name,
              code: entry.code || '',
            })),
            loaderWeight: form.loaderWeight,
            trailerWeight: form.trailerWeight,
            palletWeight: form.palletWeight,
            trailerNumber: form.trailerNumber,
            smrNumber: form.smrNumber,
            shipmentPlace: form.shipmentPlace,
            customsAddress: form.customsAddress ?? undefined,
            destination: form.destination,
            origin: form.origin || 'Республика Узбекистан',
            manufacturer: form.manufacturer,
            orderNumber: form.orderNumber,
            gln: form.gln,
            harvestYear: form.harvestYear,
            documents: form.documents,
            carrier: form.carrier,
            tirNumber: form.tirNumber,
            customFields: customFields,
            specCustomFields: specCustomFields,
            visibleColumns,
            columnLabels,
          };
          if (invoice) {
            const taskErrorsCount = (invoice as any).task?._count?.errors ?? 0;
            const onlyLogAfterError = taskErrorsCount > 0;
            const newEntries = onlyLogAfterError ? buildChangeLog() : [];
            const existingLog = (invoice.additionalInfo && typeof invoice.additionalInfo === 'object' && Array.isArray((invoice.additionalInfo as any).changeLog))
              ? (invoice.additionalInfo as any).changeLog
              : [];
            if (newEntries.length > 0) {
              (base as any).changeLog = [...existingLog, ...newEntries];
            } else if (existingLog.length > 0) {
              (base as any).changeLog = existingLog;
            }
          }
          return base;
        })(),
      };



      const response = invoice
        ? await apiClient.post(`/invoices`, { ...invoiceData, id: invoice.id })
        : await apiClient.post('/invoices', invoiceData);

      const savedInvoice = response.data;
      setInvoice(savedInvoice);
      if (savedInvoice?.items) {
        setItems(savedInvoice.items.map(normalizeItem));
      }
      if (savedInvoice?.invoiceNumber) {
        setForm(prev => ({
          ...prev,
          invoiceNumber: savedInvoice.invoiceNumber,
        }));
      }
      if (savedInvoice?.contractId) {
        setSelectedContractId(savedInvoice.contractId.toString());
      }
      const nextTaskTitle = buildTaskTitle(
        savedInvoice?.invoiceNumber || form.invoiceNumber,
        form.vehicleNumber
      );
      if (currentTaskId && nextTaskTitle && currentTask?.title !== nextTaskTitle) {
        try {
          await apiClient.patch(`/tasks/${currentTaskId}`, { title: nextTaskTitle });
        } catch (error: any) {
          console.error('Error updating task title:', error);
          alert(error.response?.data?.error || 'Task nomini yangilashda xatolik yuz berdi');
        }
      }

      setMarkSnapshotAfterSave(true);
      alert(invoice ? 'Invoice muvaffaqiyatli yangilandi' : 'Invoice muvaffaqiyatli yaratildi');

      // Yangi task yaratilgan bo'lsa, URL ni /invoices/task/:taskId ga o'zgartirish (state tozalanadi)
      if (!taskId && currentTaskId) {
        navigate(`/invoices/task/${currentTaskId}${selectedContractId ? `?contractId=${selectedContractId}` : ''}`, { replace: true });
      }

    } catch (error: any) {

      console.error('Error saving invoice:', error);

      const errMsg = error.response?.data?.error || 'Invoice saqlashda xatolik yuz berdi';
      if (typeof errMsg === 'string' && errMsg.includes('invoice raqami allaqachon mavjud')) {
        setInvoiceNumberWarning('Bu raqam allaqachon mavjud. Ozgartirish kerak');
      }
      alert(errMsg);

    } finally {

      setSaving(false);

    }

  };

  const filteredRegionCodes = regionCodes.filter((region) => {
    const query = regionSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      region.name.toLowerCase().includes(query) ||
      region.internalCode.toLowerCase().includes(query) ||
      region.externalCode.toLowerCase().includes(query)
    );
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



  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const taxAmount = (subtotal * form.tax) / 100;

  const total = subtotal + taxAmount + form.shipping - form.discount;

  const balanceDue = total - form.amountPaid;
  const selectedContract = selectedContractId
    ? contracts.find((contract) => contract.id.toString() === selectedContractId)
    : undefined;
  const isSellerShipper =
    !!selectedContract?.sellerName &&
    (!selectedContract?.shipperName ||
      selectedContract.shipperName.trim() === selectedContract.sellerName.trim());
  const isBuyerConsignee =
    !!selectedContract?.consigneeName &&
    !!selectedContract?.buyerName &&
    selectedContract.consigneeName.trim() === selectedContract.buyerName.trim();
  const leadingColumnsCount = [
    visibleColumns.index,
    visibleColumns.tnved,
    visibleColumns.plu,
    visibleColumns.name,
    visibleColumns.package,
    visibleColumns.unit,
  ].filter(Boolean).length;
  const isPackingView = viewTab === 'packing';
  const effectiveColumns = (() => {
    const base = (isPdfMode || viewOnly) ? { ...visibleColumns, actions: false } : visibleColumns;
    if (!isPackingView) return base;
    return { ...base, unitPrice: false, total: false };
  })();
  const formatNumber = (value?: number) =>
    value !== undefined && value !== null && !Number.isNaN(value)
      ? value.toLocaleString('ru-RU', {
          minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
          maximumFractionDigits: 2,
        })
      : '';
  const formatNumberFixed = (value?: number) =>
    value !== undefined && value !== null && !Number.isNaN(value)
      ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';

  /** Qadoq turi bo'yicha tara (кг) ruxsat etilgan oralig'i. Oraliqdan tashqarida bo'lsa tekshiruvda qizil. */
  const getTareRange = (packageType: string): { min: number; max: number } | null => {
    const key = (packageType || '').trim().toLowerCase().replace(/\s+/g, '');
    const ranges: Record<string, { min: number; max: number }> = {
      'дер.ящик': { min: 0.8, max: 2.5 },
      'пласт.ящик': { min: 0.3, max: 0.7 },
      'пласт.ящик.': { min: 0.3, max: 0.7 },
      'мешки': { min: 0.01, max: 0.1 },
      'картон.короб.': { min: 0.3, max: 2.5 },
      'картон.короб': { min: 0.3, max: 2.5 },
      'навалом': { min: 0, max: 0 },
    };
    return ranges[key] ?? null;
  };
  const isTareInRange = (tareKg: number, packageType: string): boolean => {
    const range = getTareRange(packageType);
    if (!range) return true;
    if (range.min === 0 && range.max === 0) return Math.abs(tareKg) < 1e-6;
    const eps = 1e-9;
    return tareKg >= range.min - eps && tareKg <= range.max + eps;
  };

  const numberToWordsRu = (num: number, currency: string): string => {
    const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const convertHundreds = (n: number): string => {
      if (n === 0) return '';
      let r = '';
      const h = Math.floor(n / 100);
      if (h > 0) r += hundreds[h] + ' ';
      const rem = n % 100;
      if (rem >= 10 && rem < 20) return (r + teens[rem - 10]).trim();
      const t = Math.floor(rem / 10), o = rem % 10;
      if (t > 0) r += tens[t] + ' ';
      if (o > 0) r += ones[o];
      return r.trim();
    };
    const zeroPhrase = currency === 'USD' ? 'ноль долларов США' : currency === 'RUB' ? 'ноль рублей РФ' : currency === 'EUR' ? 'ноль евро' : 'ноль сумов';
    if (num === 0) return zeroPhrase;
    const whole = Math.floor(num);
    const dec = Math.round((num - whole) * 100);
    let result = '';
    const th = Math.floor(whole / 1000);
    if (th > 0) {
      if (th === 1) result += 'одна тысяча ';
      else if (th < 5) result += convertHundreds(th) + ' тысячи ';
      else result += convertHundreds(th) + ' тысяч ';
    }
    const rem = whole % 1000;
    if (rem > 0) result += convertHundreds(rem);
    if (currency === 'USD') {
      if (whole === 1) result += ' доллар США';
      else if (whole < 5) result += ' доллара США';
      else result += ' долларов США';
    } else if (currency === 'RUB') {
      if (whole === 1) result += ' рубль РФ';
      else if (whole >= 2 && whole <= 4) result += ' рубля РФ';
      else result += ' рублей РФ';
    } else if (currency === 'EUR') {
      if (whole === 1) result += ' евро';
      else if (whole >= 2 && whole <= 4) result += ' евро';
      else result += ' евро';
    } else {
      if (whole === 1) result += ' сум';
      else if (whole < 5) result += ' сума';
      else result += ' сумов';
    }
    const fracWord = currency === 'USD' ? 'центов' : currency === 'RUB' ? 'копеек' : currency === 'EUR' ? 'евроцентов' : 'тиин';
    if (dec > 0) result += ` ${dec} ${fracWord}`;
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const invoiceCurrency = selectedContractCurrency || form.currency || 'USD';
  const totalColumnLabel = invoiceCurrency === 'USD' ? 'Общая сумма в Долл. США' : invoiceCurrency === 'RUB' ? 'Общая сумма Рубли РФ' : invoiceCurrency === 'EUR' ? 'Общая сумма в Евро' : columnLabels.total;

  return (

    <div className="min-h-screen bg-gray-50 py-8">

      <div className="max-w-6xl mx-auto px-4">
        <style>
          {`
            .invoice-form input[type="number"]::-webkit-outer-spin-button,
            .invoice-form input[type="number"]::-webkit-inner-spin-button,
            .invoice-additional-info-modal input[type="number"]::-webkit-outer-spin-button,
            .invoice-additional-info-modal input[type="number"]::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            .invoice-form input[type="number"],
            .invoice-additional-info-modal input[type="number"] {
              -moz-appearance: textfield;
              appearance: textfield;
            }
            .items-table-compact tbody td {
              padding-top: 6px;
              padding-bottom: 6px;
            }
            form.invoice-form,
            #invoice-tnved-products,
            #invoice-packaging-types,
            .bg-white.rounded-lg.shadow-lg.p-8 {
              vertical-align: top;
            }
          `}
        </style>
        {isPdfMode && (
          <style>
            {`
              .pdf-mode input,
              .pdf-mode select,
              .pdf-mode textarea {
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
              }
              .pdf-mode table,
              .pdf-mode th,
              .pdf-mode td {
                border: none !important;
                vertical-align: middle !important;
              }
              .pdf-mode .items-table-compact thead th {
                background: #fff !important;
                color: #111 !important;
                vertical-align: top !important;
                position: relative;
                top: -6px;
              }
              .pdf-mode .items-table-compact tfoot td {
                vertical-align: top !important;
                position: relative;
                top: -6px;
              }
              .pdf-mode .pdf-hide-border {
                border-top: none !important;
              }
              .pdf-mode button,
              .pdf-mode summary,
              .pdf-mode details {
                display: none !important;
              }
              .pdf-mode .items-table-compact tbody tr {
                min-height: 48px;
              }
              .pdf-mode .items-table-compact tbody td {
                line-height: 1.2;
                vertical-align: middle !important;
                padding-top: 0px;
                padding-bottom: 12px;
              }
              .pdf-mode .invoice-header {
                margin-top: 0px;
              }
              .pdf-mode .flex.flex-col.bg-white {
                align-items: flex-start;
                justify-content: flex-start;
              }
            `}
          </style>
        )}

        {/* Header */}

        <div className="mb-6 flex items-center justify-between">

          <h1 className="text-2xl font-bold text-gray-800">Invoice</h1>

          <div className="flex flex-wrap items-center gap-2">
            {!invoysStageReady && (
              <button
                type="button"
                onClick={handleMarkInvoysReady}
                disabled={markingReady || !taskId}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:opacity-50"
                title="Invoys jarayonini tayyor qilish"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M7.75 13.5 4.5 10.25l1.4-1.4 1.85 1.85 6.35-6.35 1.4 1.4z"
                  />
                </svg>
                {markingReady ? 'Jarayon...' : 'Tayyor'}
              </button>
            )}
            {invoysStageReady && viewTab === 'invoice' && (
              <div className="relative" ref={tirSmrDropdownRef}>
                <button
                  type="button"
                  onClick={() => setTirSmrDropdownOpen((prev) => !prev)}
                  disabled={templatesDisabled}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="TIR yoki SMR blankasini Excel formatida yuklab olish"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M10 2a1 1 0 0 1 1 1v7.59l2.3-2.3 1.4 1.42-4.7 4.7-4.7-4.7 1.4-1.42 2.3 2.3V3a1 1 0 0 1 1-1z"
                    />
                    <path
                      fill="currentColor"
                      d="M4 16a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z"
                    />
                  </svg>
                  TIR-SMR
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 ml-0.5" aria-hidden="true">
                    <path fill="currentColor" d="M10 12 5 7h10l-5 5z" />
                  </svg>
                </button>
                {tirSmrDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-40 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      type="button"
                      onClick={() => {
                        generateSmrExcel();
                        setTirSmrDropdownOpen(false);
                      }}
                      disabled={templatesDisabled}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      SMR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        generateTirExcel();
                        setTirSmrDropdownOpen(false);
                      }}
                      disabled={templatesDisabled}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      TIR
                    </button>
                  </div>
                )}
              </div>
            )}
            {invoysStageReady && viewTab === 'invoice' && (
              (() => {
                const branchName = task?.branch?.name?.toLowerCase() || '';
                const isOltiariqBranch = branchName.includes('oltiariq');
                if (isOltiariqBranch) return null;
                return (
                  <button
                    type="button"
                    onClick={openFssRegionSelector}
                    disabled={templatesDisabled}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tuman tanlashni o'zgartirish"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M4 3h7l5 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 1.5V7h3.5L11 4.5z"
                      />
                      <path
                        fill="currentColor"
                        d="M5 11h10v2H5zm0-4h6v2H5z"
                      />
                    </svg>
                    Tuman
                  </button>
                );
              })()
            )}
            {invoysStageReady && viewTab === 'invoice' && (
              <div className="relative" ref={sertifikatlarDropdownRef}>
                <button
                  type="button"
                  onClick={() => setSertifikatlarDropdownOpen((prev) => !prev)}
                  disabled={templatesDisabled}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sertifikatlar va blankalarni yuklab olish"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 1.5V7h3.5L12 3.5z"
                    />
                  </svg>
                  Sertifikatlar
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 ml-0.5" aria-hidden="true">
                    <path fill="currentColor" d="M10 12 5 7h10l-5 5z" />
                  </svg>
                </button>
                {sertifikatlarDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-52 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    {(() => {
                      const branchName = task?.branch?.name?.toLowerCase() || '';
                      const isOltiariqBranch = branchName.includes('oltiariq');
                      const hasRegionSelected =
                        Boolean(form.fssRegionInternalCode) || Boolean(form.fssRegionName);
                      const showIchkiTashqiSt1 = isOltiariqBranch || hasRegionSelected;
                      return (
                        <>
                          {showIchkiTashqiSt1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  openFssRegionPicker('Ichki');
                                  setSertifikatlarDropdownOpen(false);
                                }}
                                disabled={templatesDisabled}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Ichki
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  openFssRegionPicker('Tashqi');
                                  setSertifikatlarDropdownOpen(false);
                                }}
                                disabled={templatesDisabled}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Tashqi
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  generateST1Excel();
                                  setSertifikatlarDropdownOpen(false);
                                }}
                                disabled={templatesDisabled}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ST-1
                              </button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            {invoysStageReady && (
              <div className="relative" ref={invoysDropdownRef}>
                <button
                  type="button"
                  onClick={() => setInvoysDropdownOpen((prev) => !prev)}
                  disabled={templatesDisabled}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Invoysni Excel yoki PDF formatida yuklab olish"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 1.5V7h3.5L12 3.5z"
                    />
                  </svg>
                  Invoys
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 ml-0.5" aria-hidden="true">
                    <path fill="currentColor" d="M10 12 5 7h10l-5 5z" />
                  </svg>
                </button>
                {invoysDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-52 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      type="button"
                      onClick={() => {
                        generateInvoiceExcel();
                        setInvoysDropdownOpen(false);
                      }}
                      disabled={templatesDisabled}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Invoys Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        generatePdf(false);
                        setInvoysDropdownOpen(false);
                      }}
                      disabled={templatesDisabled}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pechatsiz PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        generatePdf(true);
                        setInvoysDropdownOpen(false);
                      }}
                      disabled={templatesDisabled}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pechatli PDF
                    </button>
                  </div>
                )}
              </div>
            )}
            {invoysStageReady && viewTab === 'invoice' && (
              (() => {
                const branchName = task?.branch?.name?.toLowerCase() || '';
                const isOltiariqBranch = branchName.includes('oltiariq');
                const hasRegionSelected =
                  Boolean(form.fssRegionInternalCode) || Boolean(form.fssRegionName);
                if (!isOltiariqBranch && !hasRegionSelected) return null;
                return (
                  <button
                    type="button"
                    onClick={generateCommodityEkExcel}
                    disabled={templatesDisabled}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-300"
                    title="Deklaratsiya (CommodityEk) shabloniga invoys ma'lumotlarini yozib Excel yuklab olish"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <path fill="currentColor" d="M10 2a1 1 0 0 1 1 1v7.59l2.3-2.3 1.4 1.42-4.7 4.7-4.7-4.7 1.4-1.42 2.3 2.3V3a1 1 0 0 1 1-1z" />
                      <path fill="currentColor" d="M4 16a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z" />
                    </svg>
                    Deklaratsiya
                  </button>
                );
              })()
            )}
            {invoysStageReady && viewTab === 'invoice' && (
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path fill="currentColor" d="M12.5 4.5 7 10l5.5 5.5-1.4 1.4L4.2 10l6.9-6.9z" />
                </svg>
                Orqaga
              </button>
            )}
          </div>

        </div>



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
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-sm font-semibold text-amber-900 mb-3">O&apos;zgarishlar hisoboti</h3>
              <ul className="space-y-2 text-sm">
                {(invoice.additionalInfo as any).changeLog
                  .filter((entry: ChangeLogEntry) => {
                    if (entry.fieldLabel === "Tovarlar ro'yxati" || entry.fieldLabel === 'Tovarlar') return false;
                    if (/^\d+ ta qator, jami /.test(entry.oldValue) || /^\d+ ta qator, jami /.test(entry.newValue)) return false;
                    return true;
                  })
                  .map((entry: ChangeLogEntry, idx: number) => (
                  <li key={idx} className="text-gray-700 flex flex-wrap items-baseline gap-x-2">
                    <span>
                      <span className="font-medium text-amber-800">{entry.fieldLabel}:</span>{' '}
                      Oldin <span className="text-gray-600">{entry.oldValue}</span>, hozir <span className="font-medium text-gray-900">{entry.newValue}</span>
                    </span>
                    {entry.changedAt && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">— {entry.changedAt}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sertifikatStageCompleted && canEdit && !taskHasErrors && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-amber-900">
                Sertifikatlar tayyor bo&apos;lgani sababli, invoysga o&apos;zgartirish kiritishdan oldin, iltimos, aniqlangan xatoliklar haqida to&apos;liq ma&apos;lumotlarni kiriting.
              </p>
              <button
                type="button"
                onClick={() => navigate('/invoices', { state: { openErrorModalForTaskId: task?.id } })}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                Xatolik qo&apos;shish
              </button>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { id: 'invoice' as const, label: 'Invoys' },
              { id: 'spec' as const, label: 'Spetsifikatsiya' },
              { id: 'packing' as const, label: 'Upakovochniy list' },
            ].map((tab) => {
              const isActive = viewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            ref={invoiceRef}
            className={`flex flex-col bg-white rounded-lg shadow-lg p-8${isPdfMode ? ' pdf-mode' : ''}`}
          >

            {/* Invoice Header */}

            <div className="grid grid-cols-2 gap-8 mb-0 invoice-header">

              {/* Left: Invoice raqami va sana */}

              <div>

                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-1">
                    {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
                      <div className="space-y-1">
                        <span className="text-base font-semibold text-gray-900">
                          {viewTab === 'spec' ? 'Спецификация №:' : viewTab === 'packing' ? 'Упаковочный лист №:' : 'Инвойс №:'} {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                        </span>
                        {(viewTab === 'spec' || viewTab === 'packing') && (
                          <div className="text-base font-semibold text-gray-900">
                            Инвойс №: {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <span className="text-base font-bold text-gray-700 whitespace-nowrap shrink-0">Инвойс №:</span>
                        <div className="flex flex-col">
                          <input
                            type="text"
                            value={form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')}
                            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                            className={`w-24 px-2 py-1 border rounded text-base font-semibold ${invoiceNumberWarning ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Avtomatik"
                          />
                          {invoiceNumberWarning && (
                            <span className="text-xs text-red-500 mt-0.5">{invoiceNumberWarning}</span>
                          )}
                        </div>

                        <span className="text-base text-gray-700">от</span>
                        <DateInput
                          value={form.date}
                          onChange={(value) => setForm({ ...form, date: value })}
                          className="px-2 py-1 border border-gray-300 rounded text-base font-semibold"
                          required
                        />

                        <span className="text-base text-gray-700">г.</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-700">Контракт №:</span>
                  {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
                    <span className="px-2 py-1 text-base font-semibold text-gray-900">
                      {selectedContract
                        ? `${selectedContract.contractNumber} от ${formatDate(selectedContract.contractDate)}`
                        : ''}
                    </span>
                  ) : (
                    <select
                      value={selectedContractId}
                      onChange={(e) => handleContractSelect(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-base font-semibold"
                    >
                      <option value="">Shartnoma tanlang...</option>
                      {contracts.map(contract => (
                        <option key={contract.id} value={contract.id}>
                          {contract.contractNumber} от {formatDate(contract.contractDate)}
                        </option>
                      ))}
                    </select>
                  )}

                  </div>
                </div>

              </div>



              {/* Right: Invoice Info */}

              <div className="text-right">

                <h1 className="text-5xl font-bold text-gray-800 mb-6">
                  {viewTab === 'invoice'
                    ? 'INVOICE'
                    : viewTab === 'spec'
                      ? 'Спецификaция'
                      : 'Упаковочный лист'}
                </h1>

              </div>

            </div>


            {/* Ajratuvchi chiziq */}
            <div className="border-t border-gray-300 mb-8"></div>


            {/* Sotuvchi va Sotib oluvchi Info */}

            <div className="mb-2.5 grid grid-cols-2 gap-8">

              <div>

                <h3 className="font-semibold text-gray-800 mb-2">
                  {isSellerShipper ? 'Продавец/Грузоотправитель' : 'Sotuvchi'}
                </h3>

                <div className="text-[15px] text-black space-y-1">

                  {selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) ? (

                    <>

                      <div className="text-base font-bold text-black">

                        {contracts.find(c => c.id.toString() === selectedContractId)?.sellerName}

                      </div>

                      {contracts.find(c => c.id.toString() === selectedContractId)?.sellerLegalAddress && (

                        <div>{contracts.find(c => c.id.toString() === selectedContractId)?.sellerLegalAddress}</div>

                      )}

                      {(contracts.find(c => c.id.toString() === selectedContractId)?.sellerInn || task?.client?.inn) && (
                        <div>
                          INN: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerInn || task?.client?.inn}
                          {!contracts.find(c => c.id.toString() === selectedContractId)?.sellerInn && task?.client?.inn && (
                            <span className="text-gray-500 text-sm"> (mijoz INN, Deklaratsiya Excel da ishlatiladi)</span>
                          )}
                        </div>
                      )}

                      {contracts.find(c => c.id.toString() === selectedContractId)?.sellerOgrn && (

                        <div>OGRN: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerOgrn}</div>

                      )}

                      {contracts.find(c => c.id.toString() === selectedContractId)?.sellerDetails ? (
                        <div className="mt-2">
                          <div className="whitespace-pre-line text-black">{contracts.find(c => c.id.toString() === selectedContractId)?.sellerDetails}</div>
                        </div>
                      ) : contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankName && (
                        <div className="mt-2">

                          <div className="text-base font-bold text-black">Bank ma'lumotlari:</div>

                          <div>
                            Bank: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankName}
                            {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankSwift && (
                              <span>, SWIFT: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankSwift}</span>
                            )}
                          </div>
                          {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankAddress && (

                            <div>Manzil: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankAddress}</div>

                          )}

                          {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankAccount && (

                            <div>Hisob raqami: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankAccount}</div>

                          )}

                          {contracts.find(c => c.id.toString() === selectedContractId)?.sellerCorrespondentBank && (

                            <div className="mt-1">

                              <div>
                                Korrespondent bank: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerCorrespondentBank}
                                {contracts.find(c => c.id.toString() === selectedContractId)?.sellerCorrespondentBankSwift && (
                                  <span>, SWIFT: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerCorrespondentBankSwift}</span>
                                )}
                              </div>
                              {contracts.find(c => c.id.toString() === selectedContractId)?.sellerCorrespondentBankAccount && (

                                <div>Kor. hisob: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerCorrespondentBankAccount}</div>

                              )}

                            </div>

                          )}

                        </div>

                      )}

                    </>

                  ) : (

                    <>

                      <div className="text-base font-bold text-black">{task?.client?.name || 'Mijoz tanlanmagan'}</div>

                      {task?.client?.address && <div>{task.client.address}</div>}

                      {task?.client?.inn && <div>INN: {task.client.inn}</div>}

                      {task?.client?.phone && <div>Tel: {task.client.phone}</div>}

                      {task?.client?.email && <div>Email: {task.client.email}</div>}

                      {task?.client?.bankName && (

                        <div className="mt-2">

                          <div className="text-base font-bold text-black">Bank ma'lumotlari:</div>

                          <div>
                            Bank: {task.client.bankName}
                            {task.client.bankSwift && <span>, SWIFT: {task.client.bankSwift}</span>}
                          </div>
                          {task.client.bankAddress && <div>Manzil: {task.client.bankAddress}</div>}

                          {task.client.bankAccount && <div>Hisob raqami: {task.client.bankAccount}</div>}

                        </div>

                      )}

                    </>

                  )}

                </div>

              </div>

              <div>

                <h3 className="font-semibold text-gray-800 mb-2">
                  {isBuyerConsignee ? 'Покупатель/Грузополучатель' : 'Покупатель'}
                </h3>

                <div className="text-[15px] text-black space-y-1">

                  {selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) ? (

                    <>

                      <div className="text-base font-bold text-black">

                        {contracts.find(c => c.id.toString() === selectedContractId)?.buyerName}

                      </div>

                      {contracts.find(c => c.id.toString() === selectedContractId)?.buyerAddress && (

                        <div>{contracts.find(c => c.id.toString() === selectedContractId)?.buyerAddress}</div>

                      )}

                      {contracts.find(c => c.id.toString() === selectedContractId)?.buyerInn && (

                        <div>INN: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerInn}</div>

                      )}

                      {contracts.find(c => c.id.toString() === selectedContractId)?.buyerOgrn && (

                        <div>OGRN: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerOgrn}</div>

                      )}

                      {contracts.find(c => c.id.toString() === selectedContractId)?.buyerDetails ? (
                        <div className="mt-2">
                          <div className="whitespace-pre-line text-black">{contracts.find(c => c.id.toString() === selectedContractId)?.buyerDetails}</div>
                        </div>
                      ) : contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankName && (
                        <div className="mt-2">

                          <div className="text-base font-bold text-black">Bank ma'lumotlari:</div>

                          <div>
                            Bank: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankName}
                            {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankSwift && (
                              <span>, SWIFT: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankSwift}</span>
                            )}
                          </div>
                          {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankAddress && (

                            <div>Manzil: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankAddress}</div>

                          )}

                          {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankAccount && (

                            <div>Hisob raqami: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankAccount}</div>

                          )}

                          {contracts.find(c => c.id.toString() === selectedContractId)?.buyerCorrespondentBank && (

                            <div className="mt-1">

                              <div>
                                Korrespondent bank: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerCorrespondentBank}
                                {contracts.find(c => c.id.toString() === selectedContractId)?.buyerCorrespondentBankSwift && (
                                  <span>, SWIFT: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerCorrespondentBankSwift}</span>
                                )}
                              </div>
                              {contracts.find(c => c.id.toString() === selectedContractId)?.buyerCorrespondentBankAccount && (

                                <div>Kor. hisob: {contracts.find(c => c.id.toString() === selectedContractId)?.buyerCorrespondentBankAccount}</div>

                              )}

                            </div>

                          )}

                        </div>

                      )}

                    </>

                  ) : (

                    task?.client?.name || 'Mijoz tanlanmagan'

                  )}

                </div>

                {/* Грузополучатель — sotib oluvchi va yukni qabul qiluvchi boshqa bo'lsa */}
                {!isBuyerConsignee && selectedContract?.consigneeName && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Грузополучатель</h3>
                    <div className="text-[15px] text-black space-y-1">
                      <div className="text-base font-bold text-black">{selectedContract.consigneeName}</div>
                      {selectedContract.consigneeAddress && <div>{selectedContract.consigneeAddress}</div>}
                      {selectedContract.consigneeInn && <div>ИНН: {selectedContract.consigneeInn}</div>}
                      {selectedContract.consigneeOgrn && <div>ОГРН: {selectedContract.consigneeOgrn}</div>}
                      {selectedContract.consigneeDetails ? (
                        <div className="mt-2">
                          <div className="whitespace-pre-line text-black">{selectedContract.consigneeDetails}</div>
                        </div>
                      ) : (selectedContract.consigneeBankName && (
                        <div className="mt-2">
                          <div className="text-base font-bold text-black">Платежные реквизиты:</div>
                          <div>
                            Банк: {selectedContract.consigneeBankName}
                            {selectedContract.consigneeBankSwift && <span>, SWIFT: {selectedContract.consigneeBankSwift}</span>}
                          </div>
                          {selectedContract.consigneeBankAddress && <div>Адрес: {selectedContract.consigneeBankAddress}</div>}
                          {selectedContract.consigneeBankAccount && <div>Расчётный счёт: {selectedContract.consigneeBankAccount}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>


            {/* Дополнительная информация */}
            <div className="mb-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Дополнительная информация</h3>
                <div className="flex items-center gap-2">
                  {!isBuyerConsignee && selectedContract?.consigneeName && (
                    <button
                      type="button"
                      onClick={async () => {
                        const parts: string[] = [];
                        if (selectedContract) {
                          const gruzManzil = (selectedContract.consigneeAddress ?? '').trim().replace(/\n/g, ' ');
                          if (gruzManzil) parts.push(gruzManzil);
                          parts.push('п/п.');
                          const buyerName = (selectedContract.buyerName ?? '').trim();
                          if (buyerName) parts.push(buyerName);
                          const buyerAddr = (selectedContract.buyerAddress ?? '').trim();
                          if (buyerAddr) parts.push(buyerAddr);
                        }
                        const text = parts.join(' ');
                        if (text) {
                          try {
                            await navigator.clipboard.writeText(text);
                            setAddressCopySuccess(true);
                            window.setTimeout(() => setAddressCopySuccess(false), 2000);
                          } catch {
                            alert('Nusxalashda xatolik');
                          }
                        } else {
                          alert('Nusxalash uchun ma\'lumot yo\'q');
                        }
                      }}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 text-sm ${
                        addressCopySuccess
                          ? 'bg-green-500 text-white scale-110 shadow-lg shadow-green-500/40'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                      title="Грузополучатель manzili + п/п. + Покупатель nomi + Покупатель manzili"
                    >
                      {addressCopySuccess ? (
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <Icon icon="lucide:copy" className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAdditionalInfoModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Tahrirlash
                  </button>
                </div>
              </div>
              <div
                className="p-4 pt-0 rounded-lg text-base text-black space-y-1"
                style={{ backgroundColor: 'var(--tw-ring-offset-color)', background: 'unset' }}
              >
                {form.deliveryTerms && <div><strong>Условия поставки:</strong> {form.deliveryTerms}</div>}
                {viewTab === 'spec' ? (
                  specCustomFields.map((field) => (
                    field.value ? (
                      <div key={field.id}><strong>{field.label}:</strong> {field.value}</div>
                    ) : null
                  ))
                ) : (
                  <>
                    {form.vehicleNumber && <div><strong>Номер автотранспорта:</strong> {form.vehicleNumber}</div>}
                    {form.shipmentPlace && <div><strong>Место отгрузки груза:</strong> {form.shipmentPlace}</div>}
                    {form.customsAddress && <div><strong>Место там. очистки:</strong> {form.customsAddress}</div>}
                    <div><strong>Происхождение товара:</strong> {form.origin || 'Республика Узбекистан'}</div>
                    {form.manufacturer && <div><strong>Производитель:</strong> {form.manufacturer}</div>}
                    {form.orderNumber && <div><strong>Номер заказа:</strong> {form.orderNumber}</div>}
                    {form.gln && <div><strong>Глобальный идентификационный номер GS1 (GLN):</strong> {form.gln}</div>}
                    {form.harvestYear && <div><strong>Урожай:</strong> {form.harvestYear} года</div>}
                    {customFields.map((field) => (
                      field.value ? (
                        <div key={field.id}><strong>{field.label}:</strong> {field.value}</div>
                      ) : null
                    ))}
                  </>
                )}
              </div>
            </div>


            {/* Items Table */}

            <div className="mb-8">

              <div className="flex items-center justify-between mb-4">

                <h3 className="font-semibold text-gray-800">Товары</h3>

                {(viewTab === 'invoice' && canEditEffective) && (
                <div className="flex items-center gap-2">
                  <details
                    ref={columnsDropdownRef}
                    open={columnsDropdownOpen}
                    className="relative"
                  >
                    <summary
                      className="list-none cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      onClick={(e) => {
                        e.preventDefault();
                        setColumnsDropdownOpen((prev) => !prev);
                      }}
                    >
                      Ustunlar
                    </summary>
                    <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                        {(['index', 'tnved', 'plu', 'name', 'unit', 'package', 'quantity', 'packagesCount', 'gross', 'net', 'unitPrice', 'total', 'actions'] as ColumnLabelKey[]).map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={visibleColumns[key]}
                              onChange={() => setVisibleColumnsAndPersist((prev) => ({ ...prev, [key]: !prev[key] }))}
                              className="shrink-0"
                            />
                            <input
                              type="text"
                              value={columnLabels[key]}
                              onChange={(e) => setColumnLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder={defaultColumnLabels[key]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                  <button

                  type="button"

                  onClick={addItem}

                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"

                >

                  Qator qo'shish

                </button>
                </div>
                )}

              </div>

              

              <>
                {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
                <>
                <div className="overflow-x-auto border border-black rounded-lg invoice-table-wrap flex flex-wrap justify-start items-start">
                <table className="w-full text-sm items-table-compact border-0">
                    <thead className="text-left">
                      <tr className="bg-white text-gray-900 font-semibold border-b-2 border-gray-800">
                        {effectiveColumns.index && (
                          <th className="px-2 py-2 text-center text-xs font-semibold w-12" style={{ verticalAlign: 'top' }}>
                            {columnLabels.index}
                          </th>
                        )}
                        {effectiveColumns.tnved && (
                          <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.tnved}
                          </th>
                        )}
                        {effectiveColumns.plu && (
                          <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.plu}
                          </th>
                        )}
                        {effectiveColumns.name && (
                          <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.name}
                          </th>
                        )}
                        {effectiveColumns.unit && (
                          <th className="px-2 py-2 text-center text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.unit}
                          </th>
                        )}
                        {effectiveColumns.package && (
                          <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.package}
                          </th>
                        )}
                        {effectiveColumns.quantity && (
                          <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.quantity}
                          </th>
                        )}
                        {effectiveColumns.packagesCount && (
                          <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.packagesCount}
                          </th>
                        )}
                        {effectiveColumns.gross && (
                          <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.gross}
                          </th>
                        )}
                        {effectiveColumns.net && (
                          <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.net}
                          </th>
                        )}
                        {effectiveColumns.unitPrice && (
                          <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.unitPrice}
                          </th>
                        )}
                        {effectiveColumns.total && (
                          <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {totalColumnLabel}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          {effectiveColumns.index && (
                            <td className="px-2 py-2 text-center">{index + 1}</td>
                          )}
                          {effectiveColumns.tnved && (
                            <td className="px-2 py-2">{item.tnvedCode || ''}</td>
                          )}
                          {effectiveColumns.plu && (
                            <td className="px-2 py-2">{item.pluCode || ''}</td>
                          )}
                          {effectiveColumns.name && (
                            <td className="px-2 py-2">{item.name || ''}</td>
                          )}
                          {effectiveColumns.unit && (
                            <td className="px-2 py-2 text-center">{item.unit || ''}</td>
                          )}
                          {effectiveColumns.package && (
                            <td className="px-2 py-2">{item.packageType || ''}</td>
                          )}
                          {effectiveColumns.quantity && (
                            <td className="px-2 py-2 text-right">{formatNumber(item.quantity)}</td>
                          )}
                          {effectiveColumns.packagesCount && (
                            <td className="px-2 py-2 text-right">{formatNumber(item.packagesCount ?? 0)}</td>
                          )}
                          {effectiveColumns.gross && (
                            <td className="px-2 py-2 text-right">{formatNumber(item.grossWeight || 0)}</td>
                          )}
                          {effectiveColumns.net && (
                            <td className="px-2 py-2 text-right">{formatNumber(item.netWeight || 0)}</td>
                          )}
                          {effectiveColumns.unitPrice && (
                            <td className="px-2 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                          )}
                          {effectiveColumns.total && (
                            <td className="px-2 py-2 text-right font-semibold">
                              {item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white font-semibold border-t-2 border-gray-400 h-[35px]">
                        {leadingColumnsCount > 0 && (
                          <td className="px-2 pt-1.5 pb-2.5 text-center" colSpan={leadingColumnsCount} style={{ verticalAlign: 'top' }}>
                            Всего:
                          </td>
                        )}
                        {effectiveColumns.quantity && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
                          </td>
                        )}
                        {effectiveColumns.packagesCount && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + (item.packagesCount ?? 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.gross && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + (item.grossWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.net && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + (item.netWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.unitPrice && <td className="px-2 pt-1.5 pb-3" style={{ verticalAlign: 'top' }}></td>}
                        {effectiveColumns.total && (
                          <td className="px-2 pt-1.5 pb-3 text-right font-bold" style={{ verticalAlign: 'top' }}>
                            {formatNumberFixed(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                  {effectiveColumns.total && (
                    <div className="mt-0 px-2 py-1.5 text-left text-sm bg-white invoice-sum-words">
                      Сумма прописью: {numberToWordsRu(items.reduce((sum, item) => sum + item.totalPrice, 0), invoiceCurrency)}
                    </div>
                  )}
                </>
                ) : (
                <>
                  <div className="overflow-x-auto border border-black rounded-lg invoice-table-wrap flex flex-wrap justify-start items-start">
                  <table className="w-full text-sm items-table-compact border-0">
                    <thead className="text-left">
                      <tr className="bg-white text-gray-900 font-semibold border-b-2 border-gray-800">
                        {effectiveColumns.index && (
                          <th className="px-2 py-3 text-center text-xs font-semibold w-12" style={{ verticalAlign: 'top' }}>
                            {columnLabels.index}
                          </th>
                        )}
                        {effectiveColumns.tnved && (
                          <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.tnved}
                          </th>
                        )}
                        {effectiveColumns.plu && (
                          <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.plu}
                          </th>
                        )}
                        {effectiveColumns.name && (
                          <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.name}
                          </th>
                        )}
                        {effectiveColumns.unit && (
                          <th className="px-2 py-3 text-center text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.unit}
                          </th>
                        )}
                        {effectiveColumns.package && (
                          <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.package}
                          </th>
                        )}
                        {effectiveColumns.quantity && (
                          <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.quantity}
                          </th>
                        )}
                        {effectiveColumns.packagesCount && (
                          <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.packagesCount}
                          </th>
                        )}
                        {effectiveColumns.gross && (
                          <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.gross}
                          </th>
                        )}
                        {effectiveColumns.net && (
                          <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.net}
                          </th>
                        )}
                        {effectiveColumns.unitPrice && (
                          <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.unitPrice}
                          </th>
                        )}
                        {effectiveColumns.total && (
                          <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {totalColumnLabel}
                          </th>
                        )}
                        {effectiveColumns.actions && (
                          <th className="px-2 py-3 text-center text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                            {columnLabels.actions}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          {effectiveColumns.index && (
                            <td className="px-2 py-2 text-center">{index + 1}</td>
                          )}
                          {effectiveColumns.tnved && (
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.tnvedCode || ''}
                                onChange={(e) => handleItemChange(index, 'tnvedCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="0810700001"
                              />
                            </td>
                          )}
                          {effectiveColumns.plu && (
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.pluCode || ''}
                                onChange={(e) => handleItemChange(index, 'pluCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="4309371"
                              />
                            </td>
                          )}
                          {effectiveColumns.name && (
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleNameChange(index, e.target.value)}
                                list="invoice-tnved-products"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="Наименование товара"
                                required
                              />
                            </td>
                          )}
                          {effectiveColumns.unit && (
                            <td className="px-2 py-2">
                              <select
                                value={item.unit || 'кг'}
                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center bg-white"
                                required
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          {effectiveColumns.package && (
                            <td className="px-2 py-2">
                              <select
                                value={item.packageType || ''}
                                onChange={(e) => handleItemChange(index, 'packageType', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                              >
                                <option value="">— Вид упаковки —</option>
                                {packagingTypes.map((p) => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          {effectiveColumns.quantity && (
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.quantity ?? 0}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  handleItemChange(index, 'quantity', v === '' ? 0 : (parseFloat(v) || 0));
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                required
                                placeholder="0"
                              />
                            </td>
                          )}
                          {effectiveColumns.packagesCount && (
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.packagesCount === undefined || item.packagesCount === null ? '' : item.packagesCount}
                                onChange={(e) => handleItemChange(index, 'packagesCount', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                placeholder=""
                              />
                            </td>
                          )}
                          {effectiveColumns.gross && (
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getGrossWeightDisplayValue(index, item)}
                                onChange={(e) => handleGrossWeightChange(index, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    applyGrossWeightFormula(index);
                                  }
                                }}
                                onBlur={() => applyGrossWeightFormula(index)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                placeholder="7802 yoki *8 (Enter)"
                                title="Raqam yoki *8.5 — Enter bosganda Кол-во упаковки ga ko'paytiriladi, natija butun son"
                              />
                            </td>
                          )}
                          {effectiveColumns.net && (
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getNetWeightDisplayValue(index, item)}
                                onChange={(e) => handleNetWeightChange(index, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    applyNetWeightFormula(index);
                                  }
                                }}
                                onBlur={() => applyNetWeightFormula(index)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                placeholder="7150 yoki *1.2 (Enter)"
                                title="Raqam yoki *1.2 — Enter: Brutto − (1.2 × Кол-во упаковки), natija butun son"
                              />
                            </td>
                          )}
                          {effectiveColumns.unitPrice && (
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                required
                                placeholder=""
                              />
                            </td>
                          )}
                          {effectiveColumns.total && (
                            <td className="px-2 py-2">
                              <div className="text-right font-semibold text-xs">
                                {item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}
                              </div>
                            </td>
                          )}
                          {effectiveColumns.actions && (
                            <td className="px-2 py-2 text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white font-semibold border-t-2 border-gray-400 h-[35px]">
                        {leadingColumnsCount > 0 && (
                          <td className="px-2 pt-1.5 pb-2.5 text-center" colSpan={leadingColumnsCount} style={{ verticalAlign: 'top' }}>
                            Всего:
                          </td>
                        )}
                        {effectiveColumns.quantity && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
                          </td>
                        )}
                        {effectiveColumns.packagesCount && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + (item.packagesCount ?? 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.gross && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + (item.grossWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.net && (
                          <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                            {formatNumber(items.reduce((sum, item) => sum + (item.netWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.unitPrice && <td className="px-2 pt-1.5 pb-3" style={{ verticalAlign: 'top' }}></td>}
                        {effectiveColumns.total && (
                          <td className="px-2 pt-1.5 pb-3 text-right font-bold" style={{ verticalAlign: 'top' }}>
                            {formatNumberFixed(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                          </td>
                        )}
                        {effectiveColumns.actions && <td className="px-2 pt-1.5 pb-3" style={{ verticalAlign: 'top' }}></td>}
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                  {effectiveColumns.total && (
                    <div className="mt-0 px-2 py-1.5 text-left text-sm bg-white invoice-sum-words">
                      Сумма прописью: {numberToWordsRu(items.reduce((sum, item) => sum + item.totalPrice, 0), invoiceCurrency)}
                    </div>
                  )}
                </>
                )}
              </>

              {/* Maksimal og'irlik va Tekshiruv yonma-yon (PDF da va Spetsifikatsiya tabida ko'rinmas) */}
              {!isPdfMode && viewTab !== 'spec' && (() => {
                const goodsGross = items.reduce((sum, item) => sum + (item.grossWeight || 0), 0);
                const loader = Number(form.loaderWeight) || 0;
                const trailer = Number(form.trailerWeight) || 0;
                const pallet = Number(form.palletWeight) || 0;
                const totalGross = goodsGross + loader + trailer + pallet;
                const maxWeight = 39950 - loader - trailer - pallet;
                const difference = maxWeight - goodsGross;
                return (
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-200 text-sm shrink-0">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>
                          <strong>Maks. og'irlik (кг):</strong> {formatNumber(maxWeight)}
                        </span>
                        <span className={difference >= 0 ? 'text-green-700' : 'text-red-700'}>
                          <strong>Farq (кг):</strong> {difference >= 0 ? '+' : ''}{formatNumber(difference)}
                        </span>
                        <span className={totalGross > 40000 ? 'w-full text-red-700' : 'w-full'}>
                          <strong>Umumiy og'irlik (кг):</strong> {formatNumber(totalGross)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-200 text-sm flex-1 min-w-0">
                      <ul className="space-y-1 list-none">
                        {items.map((item, index) => {
                          const qty = (item.packagesCount ?? item.quantity) ?? 0;
                          const gross = item.grossWeight ?? 0;
                          const net = item.netWeight ?? 0;
                          if (!qty) return null;
                          const grossPerPkg = gross / qty;
                          const netPerPkg = net / qty;
                          const tarePerPkg = grossPerPkg - netPerPkg;
                          const tareOutOfRange = !isTareInRange(tarePerPkg, item.packageType || '');
                          return (
                            <li key={index} className={tareOutOfRange ? 'text-red-600 font-medium' : undefined}>
                              {item.name || '—'} - {formatNumber(grossPerPkg)} -- {formatNumber(netPerPkg)} -- {formatNumber(tarePerPkg)}{item.packageType ? ` (${item.packageType})` : ''}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })()}

            </div>



            {/* Notes (Spetsifikatsiya tabida ko'rinmas) */}

            {viewTab !== 'spec' && (
            <div className="mb-8">

              <label className="block text-sm font-semibold text-gray-700 mb-2">Особые примечания</label>

              {(isPdfMode || viewTab === 'packing') ? (
                <div className="w-full min-h-[48px] px-4 py-3 flex items-center text-left text-sm text-gray-900 whitespace-pre-wrap border border-gray-300 rounded-lg">
                  {form.notes || ''}
                </div>
              ) : (
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-base"
                  rows={3}
                  placeholder="Qo'shimcha eslatmalar..."
                />
              )}

            </div>
            )}



            {/* Руководитель Поставщика va Товар отпустил */}
            {viewTab !== 'spec' && selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) && (
              <div className="mb-8 space-y-3">
                {(() => {
                  const contract = contracts.find(c => c.id.toString() === selectedContractId);
                  return (
                    <>
                      {contract?.supplierDirector && (
                        <div className="flex flex-row flex-wrap gap-4 items-start">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-base font-semibold text-gray-700">Руководитель Поставщика:</div>
                              <div className="text-base text-gray-800">{contract.supplierDirector}</div>
                            </div>
                            {contract.goodsReleasedBy && (
                              <div className="space-y-1">
                                <div className="text-base font-semibold text-gray-700">Товар отпустил:</div>
                                <div className="text-base text-gray-800">{contract.goodsReleasedBy}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-row items-center justify-center gap-3">
                            {(contract.sellerSignatureUrl || contract.signatureUrl) && (!isPdfMode || pdfIncludeSeal) && (
                              <div>
                                <img
                                  src={resolveUploadUrl(contract.sellerSignatureUrl || contract.signatureUrl)}
                                  alt="Imzo"
                                  className="h-[90px] w-auto object-contain"
                                />
                              </div>
                            )}
                            {(contract.sellerSealUrl || contract.sealUrl) && (!isPdfMode || pdfIncludeSeal) && (
                              <div>
                                <img
                                  src={resolveUploadUrl(contract.sellerSealUrl || contract.sealUrl)}
                                  alt="Muhr"
                                  className="h-[215px] w-auto object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {viewTab === 'spec' && selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) && (
              <div className="mb-8 w-full">
                {(() => {
                  const contract = contracts.find(c => c.id.toString() === selectedContractId) as (Contract & { buyerDirector?: string; consigneeDirector?: string }) | undefined;
                  const participants = [
                    contract?.sellerName ? { label: 'Продавец', name: contract.sellerName, director: contract.supplierDirector, signatureUrl: contract.sellerSignatureUrl, sealUrl: contract.sellerSealUrl } : null,
                    contract?.buyerName ? { label: 'Покупатель', name: contract.buyerName, director: contract.buyerDirector, signatureUrl: contract.buyerSignatureUrl, sealUrl: contract.buyerSealUrl } : null,
                    contract?.shipperName ? { label: 'Грузоотправитель', name: contract.shipperName, director: undefined, signatureUrl: undefined, sealUrl: undefined } : null,
                    contract?.consigneeName ? { label: 'Грузополучатель', name: contract.consigneeName, director: contract.consigneeDirector, signatureUrl: contract.consigneeSignatureUrl, sealUrl: contract.consigneeSealUrl } : null,
                  ].filter(Boolean) as Array<{ label: string; name: string; director?: string; signatureUrl?: string; sealUrl?: string }>;
                  if (!participants.length) return null;
                  return (
                    <div className="space-y-4 w-full">
                      <div className="text-sm font-semibold text-gray-700">Подписи сторон</div>
                      <div className="grid gap-4 w-full" style={{ gridTemplateColumns: `repeat(${participants.length}, 1fr)` }}>
                        {participants.map((p) => (
                          <div key={`${p.label}-${p.name}`} className="p-3 space-y-2 min-w-0 flex flex-col">
                            <div className="text-sm font-semibold text-gray-800">{p.label}</div>
                            <div className="flex flex-col gap-3">
                              <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
                                <div className="min-h-[4rem] p-2 flex flex-col justify-center text-sm text-gray-700 min-w-0">
                                  {p.name}
                                  {p.director != null && p.director !== '' && (
                                    <div className="text-gray-600 mt-0.5">
                                      {p.label === 'Покупатель' || p.label === 'Грузополучатель' ? p.director : `Директор ${p.director}`}
                                    </div>
                                  )}
                                </div>
                                {p.signatureUrl && (
                                  <div className="h-16 flex items-start justify-start overflow-hidden">
                                    <img src={resolveUploadUrl(p.signatureUrl)} alt="" className="h-full w-auto max-w-full object-contain" />
                                  </div>
                                )}
                              </div>
                              {p.sealUrl && (
                                <div className="h-[215px] flex flex-col items-start justify-start overflow-hidden">
                                  <img src={resolveUploadUrl(p.sealUrl)} alt="" className="h-full w-auto max-w-full object-contain" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t pdf-hide-border">
              {additionalInfoError && (
                <div className="w-full text-sm text-red-600 text-right">
                  {additionalInfoError}
                </div>
              )}
              {canEditEffective && !invoysStageReady && (
                <button
                  type="button"
                  onClick={handleMarkInvoysReady}
                  disabled={markingReady || !taskId}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:opacity-50"
                  title="Invoys jarayonini tayyor qilish"
                >
                  {markingReady ? 'Jarayon...' : 'Tayyor'}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Bekor qilish
              </button>
              {canEditEffective && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              )}
            </div>

          </div>
        </form>

                </div>



      {/* Дополнительная информация Modal */}
      {showAdditionalInfoModal && (
        <div className="invoice-additional-info-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto${!canEditEffective ? ' invoice-additional-info-modal-readonly' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Дополнительная информация</h2>
                    <button

                onClick={() => setShowAdditionalInfoModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                    >

                ×
                    </button>

            </div>

            <div className="space-y-4">
              {/* Majburiy maydonlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Условия поставки:<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="space-y-2">
                  {contractDeliveryTerms.length > 1 ? (
                    <>
                      <select
                        value={contractDeliveryTerms.includes(form.deliveryTerms) ? form.deliveryTerms : '__other__'}
                        onChange={(e) => {
                          const value = e.target.value;
                          const newDeliveryTerms = value === '__other__' ? '' : value;
                          let newCustomsAddress = '';
                          if (selectedContract && newDeliveryTerms) {
                            const dtArr = (selectedContract.deliveryTerms || '').split('\n').map((s: string) => s.trim());
                            const caArr = (selectedContract.customsAddress || '').split('\n').map((s: string) => s.trim());
                            const maxLen = Math.max(dtArr.length, caArr.length);
                            while (dtArr.length < maxLen) dtArr.push('');
                            while (caArr.length < maxLen) caArr.push('');
                            const idx = dtArr.indexOf(newDeliveryTerms);
                            if (idx >= 0 && caArr[idx]?.trim()) {
                              newCustomsAddress = caArr[idx].trim();
                            }
                          }
                          setForm({ ...form, deliveryTerms: newDeliveryTerms, customsAddress: newCustomsAddress });
                          if (additionalInfoError && newDeliveryTerms.trim() && form.vehicleNumber.trim()) {
                            setAdditionalInfoError(null);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Shartnomadan tanlang...</option>
                        {contractDeliveryTerms.map((term) => (
                          <option key={term} value={term}>{term}</option>
                        ))}
                        <option value="__other__">Boshqa (qo&apos;lda kiriting)</option>
                      </select>
                      {(!form.deliveryTerms || !contractDeliveryTerms.includes(form.deliveryTerms)) && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={form.deliveryTerms}
                            onChange={(e) => {
                              const value = e.target.value;
                              setForm({ ...form, deliveryTerms: value });
                              if (additionalInfoError && value.trim() && form.vehicleNumber.trim()) {
                                setAdditionalInfoError(null);
                              }
                            }}
                            placeholder="Yangi Условия поставки kiriting"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = form.deliveryTerms.trim();
                              if (!trimmed) return;
                              addDeliveryTermOption(trimmed);
                              setForm({ ...form, deliveryTerms: trimmed });
                            }}
                            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                          >
                            Shartnomaga qo&apos;shish
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={form.deliveryTerms}
                      onChange={(e) => {
                        const value = e.target.value;
                        let newCustomsAddress = '';
                        if (selectedContract && value.trim()) {
                          const dtArr = (selectedContract.deliveryTerms || '').split('\n').map((s: string) => s.trim());
                          const caArr = (selectedContract.customsAddress || '').split('\n').map((s: string) => s.trim());
                          const maxLen = Math.max(dtArr.length, caArr.length);
                          while (dtArr.length < maxLen) dtArr.push('');
                          while (caArr.length < maxLen) caArr.push('');
                          const idx = dtArr.indexOf(value.trim());
                          if (idx >= 0 && caArr[idx]?.trim()) {
                            newCustomsAddress = caArr[idx].trim();
                          }
                        }
                        setForm({ ...form, deliveryTerms: value, customsAddress: newCustomsAddress });
                        if (additionalInfoError && value.trim() && form.vehicleNumber.trim()) {
                          setAdditionalInfoError(null);
                        }
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Shartnomadan olinadi"
                    />
                  )}
                </div>
              </div>

              {viewTab === 'spec' ? (
                <>
                  {specCustomFields.map((field) => (
                    <div key={field.id}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">{field.label}:</label>
                        <button
                          type="button"
                          onClick={() => setSpecCustomFields(specCustomFields.filter(f => f.id !== field.id))}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="O'chirish"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => setSpecCustomFields(specCustomFields.map(f =>
                          f.id === field.id ? { ...f, value: e.target.value } : f
                        ))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                  {canEditEffective && (
                    <div className="pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setShowAddFieldModal(true)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <span>+</span>
                        <span>Yangi maydon qo'shish</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
              <>
              {/* Место там. очистки — juft Растаможка avto-to'ldiriladi yoki Адрес растаможки dan tanlash */}
              {selectedContract && (() => {
                const customsStr = selectedContract.customsAddress || '';
                const options = [...new Set(
                  customsStr.split('\n').map((s: string) => s.trim()).filter(Boolean)
                )];
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Место там. очистки:
                    </label>
                    {options.length > 0 ? (
                      <select
                        value={form.customsAddress ?? ''}
                        onChange={(e) => setForm({ ...form, customsAddress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Shartnomadan tanlang...</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.customsAddress ?? ''}
                        onChange={(e) => setForm({ ...form, customsAddress: e.target.value })}
                        placeholder="Место там. очистки"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер автотранспорта:<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, vehicleNumber: value });
                      if (additionalInfoError && form.deliveryTerms.trim() && value.trim()) {
                        setAdditionalInfoError(null);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-1 w-[110px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Yuk tortuvchi
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.loaderWeight}
                    onChange={(e) => setForm({ ...form, loaderWeight: e.target.value })}
                    className="w-full h-[38px] px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right"
                    placeholder="кг"
                  />
                </div>
                <div className="md:col-span-1 w-[110px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Pritsep
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.trailerWeight}
                    onChange={(e) => setForm({ ...form, trailerWeight: e.target.value })}
                    className="w-full h-[38px] px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right"
                    placeholder="кг"
                  />
                </div>
                <div className="md:col-span-1 w-[110px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Poddon
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.palletWeight}
                    onChange={(e) => {
                      const weight = e.target.value;
                      setForm({
                        ...form,
                        palletWeight: weight,
                        notes: weight.trim()
                          ? `Товары уложены на деревянных паллетах которые не являются товаром весом ${weight} кг.`
                          : form.notes,
                      });
                    }}
                    className="w-full h-[38px] px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right"
                    placeholder="кг"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TIR №:
                  </label>
                  <input
                    type="text"
                    value={form.tirNumber}
                    onChange={(e) => setForm({ ...form, tirNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMR №:
                  </label>
                  <input
                    type="text"
                    value={form.smrNumber}
                    onChange={(e) => setForm({ ...form, smrNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Ixtiyoriy maydonlar - o'chirish imkoniyati bilan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Место отгрузки груза:
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, shipmentPlace: '' })}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={form.shipmentPlace}
                  onChange={(e) => setForm({ ...form, shipmentPlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                  </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Место назначения:
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, destination: '' })}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                    <input

                  type="text"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />

                  </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Происхождение товара:
                  </label>
                </div>
                <input
                  type="text"
                  value={form.origin || 'Республика Узбекистан'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                />
                  </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Производитель:
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, manufacturer: '' })}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Номер заказа:
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, orderNumber: '' })}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={form.orderNumber}
                  onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Глобальный идентификационный номер GS1 (GLN):
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gln: '' })}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={form.gln}
                  onChange={(e) => setForm({ ...form, gln: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Shartnomadan olinadi yoki qo'lda yoziladi"
                />
            </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Урожай:
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, harvestYear: new Date().getFullYear().toString() })}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={form.harvestYear}
                  onChange={(e) => setForm({ ...form, harvestYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-500 ml-2">года</span>
              </div>

              {/* Dinamik maydonlar */}
              {customFields.map((field) => (
                <div key={field.id}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}:
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="O'chirish"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => {
                      setCustomFields(customFields.map(f => 
                        f.id === field.id ? { ...f, value: e.target.value } : f
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}

              {/* Yangi maydon qo'shish tugmasi */}
              {canEditEffective && (
                <div className="pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddFieldModal(true)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <span>+</span>
                    <span>Yangi maydon qo'shish</span>
                  </button>
                </div>
              )}
            </>
              )}

            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowAdditionalInfoModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Yopish
              </button>
              {canEditEffective && (
                <button
                  type="button"
                  onClick={() => setShowAdditionalInfoModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Saqlash
                </button>
              )}
            </div>

          </div>

      </div>

      )}

      {/* FSS Hudud tanlash modal */}
      {showFssRegionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Hudud kodini tanlang</h2>
              <button
                onClick={() => setShowFssRegionModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qidirish
                </label>
                <input
                  type="text"
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                  placeholder="Hudud nomi yoki kod bo'yicha qidiring"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="text-sm text-gray-600">
                Tanlangan: {form.fssRegionName || '—'}
                {form.fssRegionInternalCode ? ` (${form.fssRegionInternalCode})` : ''}
              </div>

              <div className="border border-gray-200 rounded-lg max-h-[45vh] overflow-y-auto">
                {regionCodesLoading ? (
                  <div className="p-4 text-sm text-gray-500">Yuklanmoqda...</div>
                ) : filteredRegionCodes.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Natija topilmadi</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredRegionCodes.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            fssRegionInternalCode: region.internalCode,
                            fssRegionName: region.name,
                            fssRegionExternalCode: region.externalCode,
                          }));
                          setShowFssRegionModal(false);
                          setRegionSearch('');
                          if (fssAutoDownload) {
                            generateFssExcel({
                              internalCode: region.internalCode,
                              name: region.name,
                              externalCode: region.externalCode,
                              filePrefix: fssFilePrefix,
                              templateType: fssFilePrefix === 'Ichki' ? 'ichki' : 'tashqi',
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-medium text-gray-800">{region.name}</div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {region.internalCode} / {region.externalCode}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={loadRegionCodes}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Qayta yuklash
                </button>
                <button
                  type="button"
                  onClick={() => setShowFssRegionModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yangi maydon qo'shish modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Yangi maydon qo'shish</h2>
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldLabel('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maydon nomi:
                </label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Masalan: Номер контейнера"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newFieldLabel.trim()) {
                      const newField = {
                        id: Date.now().toString(),
                        label: newFieldLabel.trim(),
                        value: '',
                      };
                      if (viewTab === 'spec') {
                        setSpecCustomFields([...specCustomFields, newField]);
                      } else {
                        setCustomFields([...customFields, newField]);
                      }
                      setNewFieldLabel('');
                      setShowAddFieldModal(false);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldLabel('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newFieldLabel.trim()) {
                    const newField = {
                      id: Date.now().toString(),
                      label: newFieldLabel.trim(),
                      value: '',
                    };
                    if (viewTab === 'spec') {
                      setSpecCustomFields([...specCustomFields, newField]);
                    } else {
                      setCustomFields([...customFields, newField]);
                    }
                    setNewFieldLabel('');
                    setShowAddFieldModal(false);
                  }
                }}
                disabled={!newFieldLabel.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );

};



export default Invoice;

