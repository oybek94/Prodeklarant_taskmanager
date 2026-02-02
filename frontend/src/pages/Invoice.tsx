import { useState, useEffect, useRef } from 'react';

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import apiClient from '../lib/api';
import DateInput from '../components/DateInput';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getTnvedProducts } from '../utils/tnvedProducts';
import { getPackagingTypes } from '../utils/packagingTypes';



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

  supplierDirector?: string; // Руководитель Поставщика
  goodsReleasedBy?: string; // Товар отпустил
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

}



const Invoice = () => {

  const { taskId, clientId, contractId } = useParams<{ taskId?: string; clientId?: string; contractId?: string }>();

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
  const [invoysStageReady, setInvoysStageReady] = useState(false);

  const [task, setTask] = useState<Task | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);

  const [selectedContractId, setSelectedContractId] = useState<string>('');
  type SpecRow = { productName?: string; quantity?: number; unit?: string; unitPrice?: number; totalPrice?: number };
  const [selectedContractSpec, setSelectedContractSpec] = useState<SpecRow[]>([]);

  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);

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
  const getVisibleColumnsKey = (contractKey: string) => `invoice_visible_columns_${contractKey}`;
  const loadVisibleColumns = (contractKey: string): typeof defaultVisibleColumns => {
    try {
      const raw = localStorage.getItem(getVisibleColumnsKey(contractKey));
      if (!raw) return defaultVisibleColumns;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return { ...defaultVisibleColumns, ...parsed };
    } catch {
      return defaultVisibleColumns;
    }
  };
  const [visibleColumns, setVisibleColumns] = useState(() => loadVisibleColumns('default'));
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const columnsDropdownRef = useRef<HTMLDetailsElement>(null);
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
    const key = String(selectedContractId || 'default');
    localStorage.setItem(getVisibleColumnsKey(key), JSON.stringify(visibleColumns));
  }, [visibleColumns, selectedContractId]);
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
    setVisibleColumns(loadVisibleColumns(key));
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
  const [additionalInfoError, setAdditionalInfoError] = useState<string | null>(null);
  const [invoiceNumberWarning, setInvoiceNumberWarning] = useState<string | null>(null);
  const invoiceNumberCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [tnvedProducts, setTnvedProducts] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [packagingTypes, setPackagingTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [editingGrossWeight, setEditingGrossWeight] = useState<{ index: number; value: string } | null>(null);
  const [editingNetWeight, setEditingNetWeight] = useState<{ index: number; value: string } | null>(null);


  useEffect(() => {

    loadData();

  }, [taskId, clientId, contractIdFromQuery]);

  useEffect(() => {
    const stages = (task as { stages?: Array<{ name: string; status: string }> })?.stages;
    if (stages && Array.isArray(stages)) {
      const invoys = stages.find((s) => s.name === 'Invoys');
      setInvoysStageReady(!!invoys && invoys.status === 'TAYYOR');
    } else {
      setInvoysStageReady(false);
    }
  }, [task]);

  useEffect(() => {
    setTnvedProducts(getTnvedProducts());
    setPackagingTypes(getPackagingTypes());
  }, []);

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
            setItems((inv.items || []).map(normalizeItem));
            setCustomFields(inv.additionalInfo?.customFields || []);

            if (inv.contractId) {
              setSelectedContractId(inv.contractId.toString());
              try {
                const contractResponse = await apiClient.get(`/contracts/${inv.contractId}`);
                const contract = contractResponse.data;
                let spec: SpecRow[] = [];
                if (contract.specification) {
                  if (Array.isArray(contract.specification)) spec = contract.specification;
                  else if (typeof contract.specification === 'string') {
                    try { spec = JSON.parse(contract.specification); } catch { spec = []; }
                  }
                }
                setSelectedContractSpec(spec);
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
    const match = tnvedProducts.find((p) => p.name === value.trim());
    if (match) {
      newItems[index].tnvedCode = match.code;
    }
    const nameTrim = value.trim();
    if (nameTrim && selectedContractSpec.length > 0) {
      const specRow = selectedContractSpec.find(
        (r) => (r.productName || '').trim().toLowerCase() === nameTrim.toLowerCase()
      );
      if (specRow) {
        const up = specRow.unitPrice != null ? Number(specRow.unitPrice) : 0;
        const tp = specRow.totalPrice != null ? Number(specRow.totalPrice) : up * (newItems[index].netWeight || 0);
        newItems[index].unitPrice = up;
        newItems[index].totalPrice = tp;
      } else {
        newItems[index].unitPrice = 0;
        newItems[index].totalPrice = 0;
      }
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

  const generatePdf = async () => {
    if (!invoiceRef.current) {
      alert("Invoice ko'rinishi topilmadi");
      return;
    }

    setIsPdfMode(true);
    await waitForPaint();

    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const taskTitle = buildTaskTitle(
      invoice?.invoiceNumber || form.invoiceNumber,
      form.vehicleNumber
    );
    const fileBase = taskTitle || invoice?.invoiceNumber || form.invoiceNumber || 'invoice';
    pdf.save(`${fileBase}.pdf`);

    setIsPdfMode(false);
  };

  const generateSmrExcel = async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/cmr`, {
        responseType: 'blob',
      });
      const fileName = `CMR_${invoice.invoiceNumber || form.invoiceNumber || 'Invoice'}.xlsx`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CMR:', error);
      alert('CMR yuklab olishda xatolik yuz berdi');
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
      const fileName = `TIR_${invoice.invoiceNumber || form.invoiceNumber || 'Invoice'}.xlsx`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading TIR:', error);
      alert('TIR yuklab olishda xatolik yuz berdi');
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

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

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

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      

      const normalizedItems = items.map((item, index) => {
        const normalized = normalizeItem(item);
        const qty = Number(normalized.quantity) || 0;
        const pkgCount = normalized.packagesCount != null ? Number(normalized.packagesCount) : undefined;
        const quantityForBackend = qty > 0 ? qty : (pkgCount ?? 0);
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

        taskId: taskId ? Number(taskId) : undefined, // taskId ixtiyoriy bo'lishi mumkin

        clientId: clientId ? Number(clientId) : (task?.client?.id || undefined),

        invoiceNumber: form.invoiceNumber && form.invoiceNumber.trim() !== '' ? form.invoiceNumber.trim() : undefined, // Agar bo'sh bo'lsa, backend avtomatik yaratadi

        date: form.date,

        currency: form.currency,

        contractNumber: form.contractNumber,

        contractId: selectedContractId ? Number(selectedContractId) : undefined,

        items: normalizedItems,
        totalAmount: normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0),

        notes: form.notes,

        additionalInfo: {

          paymentTerms: form.paymentTerms,

          dueDate: form.dueDate,

          poNumber: form.poNumber,

          terms: form.terms,

          tax: form.tax,

          discount: form.discount,

          shipping: form.shipping,

          amountPaid: form.amountPaid,

          paymentMethod: form.additionalInfo?.paymentMethod,

          // Дополнительная информация
          deliveryTerms: form.deliveryTerms,
          vehicleNumber: form.vehicleNumber,
          loaderWeight: form.loaderWeight,
          trailerWeight: form.trailerWeight,
          palletWeight: form.palletWeight,
          trailerNumber: form.trailerNumber,
          smrNumber: form.smrNumber,
          shipmentPlace: form.shipmentPlace,
          customsAddress: form.customsAddress ?? undefined,
          destination: form.destination,
          origin: form.origin,
          manufacturer: form.manufacturer,
          orderNumber: form.orderNumber,
          gln: form.gln,
          harvestYear: form.harvestYear,
          documents: form.documents,
          carrier: form.carrier,
          tirNumber: form.tirNumber,
          customFields: customFields,
        },

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
      if (taskId && nextTaskTitle && task?.title !== nextTaskTitle) {
        try {
          await apiClient.patch(`/tasks/${taskId}`, { title: nextTaskTitle });
        } catch (error: any) {
          console.error('Error updating task title:', error);
          alert(error.response?.data?.error || 'Task nomini yangilashda xatolik yuz berdi');
        }
      }

      alert(invoice ? 'Invoice muvaffaqiyatli yangilandi' : 'Invoice muvaffaqiyatli yaratildi');

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



  



  if (loading) {

    return (

      <div className="flex items-center justify-center min-h-screen">

        <div className="text-gray-600">Yuklanmoqda...</div>

      </div>

    );

  }



  if (!task) {

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
  const effectiveColumns = isPdfMode
    ? { ...visibleColumns, actions: false }
    : visibleColumns;
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
    return tareKg >= range.min && tareKg <= range.max;
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
    if (num === 0) return currency === 'USD' ? 'ноль долларов США' : 'ноль сумов';
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
    } else {
      if (whole === 1) result += ' сум';
      else if (whole < 5) result += ' сума';
      else result += ' сумов';
    }
    if (dec > 0) result += ` ${dec} ${currency === 'USD' ? 'центов' : 'тиин'}`;
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

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
              .pdf-mode .pdf-hide-border {
                border-top: none !important;
              }
              .pdf-mode button,
              .pdf-mode summary,
              .pdf-mode details {
                display: none !important;
              }
            `}
          </style>
        )}

        {/* Header */}

        <div className="mb-6 flex items-center justify-between">

          <h1 className="text-2xl font-bold text-gray-800">Invoice</h1>

          <div className="flex gap-2">
            {!invoysStageReady && (
              <button
                type="button"
                onClick={handleMarkInvoysReady}
                disabled={markingReady || !taskId}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:opacity-50"
                title="Invoys jarayonini tayyor qilish"
              >
                {markingReady ? 'Jarayon...' : 'Tayyor'}
              </button>
            )}
            {invoysStageReady && (
              <button
                type="button"
                onClick={generateSmrExcel}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                title="SMR blankasini Excel formatida yuklab olish"
              >
                SMR
              </button>
            )}
            {invoysStageReady && (
              <button
                type="button"
                onClick={generateTirExcel}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                title="TIR blankasini Excel formatida yuklab olish"
              >
                TIR
              </button>
            )}
            <button
              type="button"
              onClick={generatePdf}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300"
            >
              Invoys PDF
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Orqaga
            </button>
          </div>

        </div>



        <form onSubmit={handleSubmit} className="invoice-form">

          <datalist id="invoice-tnved-products">
            {tnvedProducts.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <datalist id="invoice-packaging-types">
            {packagingTypes.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>

          <div
            ref={invoiceRef}
            className={`bg-white rounded-lg shadow-lg p-8${isPdfMode ? ' pdf-mode' : ''}`}
          >

            {/* Invoice Header */}

            <div className="grid grid-cols-2 gap-8 mb-0">

              {/* Left: Invoice raqami va sana */}

              <div>

                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-1">
                    {isPdfMode ? (
                      <span className="text-base font-semibold text-gray-900">
                        Инвойс №: {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                      </span>
                    ) : (
                      <>
                        <span className="text-base font-bold text-gray-700">Инвойс №:</span>
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
                  {isPdfMode ? (
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

                <h1 className="text-5xl font-bold text-gray-800 mb-6">INVOICE</h1>

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

                      {contracts.find(c => c.id.toString() === selectedContractId)?.sellerInn && (

                        <div>INN: {contracts.find(c => c.id.toString() === selectedContractId)?.sellerInn}</div>

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
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Дополнительная информация</h3>
                <button
                  type="button"
                  onClick={() => setShowAdditionalInfoModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Tahrirlash
                </button>
              </div>
              <div
                className="p-4 rounded-lg text-base text-black space-y-1"
                style={{ backgroundColor: 'var(--tw-ring-offset-color)', background: 'unset' }}
              >
                {form.deliveryTerms && <div><strong>Условия поставки:</strong> {form.deliveryTerms}</div>}
                {form.vehicleNumber && <div><strong>Номер автотранспорта:</strong> {form.vehicleNumber}</div>}
                {form.shipmentPlace && <div><strong>Место отгрузки груза:</strong> {form.shipmentPlace}</div>}
                {form.customsAddress && <div><strong>Место там. очистки:</strong> {form.customsAddress}</div>}
                <div><strong>Происхождение товара:</strong> {form.origin}</div>
                {form.manufacturer && <div><strong>Производитель:</strong> {form.manufacturer}</div>}
                {form.orderNumber && <div><strong>Номер заказа:</strong> {form.orderNumber}</div>}
                {form.gln && <div><strong>Глобальный идентификационный номер GS1 (GLN):</strong> {form.gln}</div>}
                {form.harvestYear && <div><strong>Урожай:</strong> {form.harvestYear} года</div>}
                {customFields.map((field) => (
                  field.value && (
                    <div key={field.id}>
                      <strong>{field.label}:</strong> {field.value}
                    </div>
                  )
                ))}
              </div>
            </div>


            {/* Items Table */}

            <div className="mb-8">

              <div className="flex items-center justify-between mb-4">

                <h3 className="font-semibold text-gray-800">Товары</h3>

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
                              onChange={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
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

                  + Line Item

                  </button>
                </div>

              </div>

              

              <div className="overflow-x-auto">
                {isPdfMode ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        {effectiveColumns.index && (
                          <th className="px-2 py-3 text-center text-xs font-semibold w-12">{columnLabels.index}</th>
                        )}
                        {effectiveColumns.tnved && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.tnved}</th>
                        )}
                        {effectiveColumns.plu && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.plu}</th>
                        )}
                        {effectiveColumns.name && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.name}</th>
                        )}
                        {effectiveColumns.unit && (
                          <th className="px-2 py-3 text-center text-xs font-semibold">{columnLabels.unit}</th>
                        )}
                        {effectiveColumns.package && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.package}</th>
                        )}
                        {effectiveColumns.quantity && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.quantity}</th>
                        )}
                        {effectiveColumns.packagesCount && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.packagesCount}</th>
                        )}
                        {effectiveColumns.gross && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.gross}</th>
                        )}
                        {effectiveColumns.net && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.net}</th>
                        )}
                        {effectiveColumns.unitPrice && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.unitPrice}</th>
                        )}
                        {effectiveColumns.total && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.total}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          {effectiveColumns.index && (
                            <td className="px-2 py-3 text-center">{index + 1}</td>
                          )}
                          {effectiveColumns.tnved && (
                            <td className="px-2 py-3">{item.tnvedCode || ''}</td>
                          )}
                          {effectiveColumns.plu && (
                            <td className="px-2 py-3">{item.pluCode || ''}</td>
                          )}
                          {effectiveColumns.name && (
                            <td className="px-2 py-3">{item.name || ''}</td>
                          )}
                          {effectiveColumns.unit && (
                            <td className="px-2 py-3 text-center">{item.unit || ''}</td>
                          )}
                          {effectiveColumns.package && (
                            <td className="px-2 py-3">{item.packageType || ''}</td>
                          )}
                          {effectiveColumns.quantity && (
                            <td className="px-2 py-3 text-right">{formatNumber(item.quantity)}</td>
                          )}
                          {effectiveColumns.packagesCount && (
                            <td className="px-2 py-3 text-right">{formatNumber(item.packagesCount ?? 0)}</td>
                          )}
                          {effectiveColumns.gross && (
                            <td className="px-2 py-3 text-right">{formatNumber(item.grossWeight || 0)}</td>
                          )}
                          {effectiveColumns.net && (
                            <td className="px-2 py-3 text-right">{formatNumber(item.netWeight || 0)}</td>
                          )}
                          {effectiveColumns.unitPrice && (
                            <td className="px-2 py-3 text-right">{formatNumber(item.unitPrice)}</td>
                          )}
                          {effectiveColumns.total && (
                            <td className="px-2 py-3 text-right font-semibold">
                              {item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                        {leadingColumnsCount > 0 && (
                          <td className="px-2 py-3 text-center" colSpan={leadingColumnsCount}>Всего:</td>
                        )}
                        {effectiveColumns.quantity && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
                          </td>
                        )}
                        {effectiveColumns.packagesCount && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + (item.packagesCount ?? 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.gross && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + (item.grossWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.net && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + (item.netWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.unitPrice && <td className="px-2 py-3"></td>}
                        {effectiveColumns.total && (
                          <td className="px-2 py-3 text-right font-bold">
                            {formatNumberFixed(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                          </td>
                        )}
                      </tr>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-2 py-3 text-left text-sm" colSpan={15}>
                          Сумма прописью: {numberToWordsRu(items.reduce((sum, item) => sum + item.totalPrice, 0), form.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        {effectiveColumns.index && (
                          <th className="px-2 py-3 text-center text-xs font-semibold w-12">{columnLabels.index}</th>
                        )}
                        {effectiveColumns.tnved && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.tnved}</th>
                        )}
                        {effectiveColumns.plu && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.plu}</th>
                        )}
                        {effectiveColumns.name && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.name}</th>
                        )}
                        {effectiveColumns.unit && (
                          <th className="px-2 py-3 text-center text-xs font-semibold">{columnLabels.unit}</th>
                        )}
                        {effectiveColumns.package && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">{columnLabels.package}</th>
                        )}
                        {effectiveColumns.quantity && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.quantity}</th>
                        )}
                        {effectiveColumns.packagesCount && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.packagesCount}</th>
                        )}
                        {effectiveColumns.gross && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.gross}</th>
                        )}
                        {effectiveColumns.net && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.net}</th>
                        )}
                        {effectiveColumns.unitPrice && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.unitPrice}</th>
                        )}
                        {effectiveColumns.total && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">{columnLabels.total}</th>
                        )}
                        {effectiveColumns.actions && (
                          <th className="px-2 py-3 text-center text-xs font-semibold">{columnLabels.actions}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          {effectiveColumns.index && (
                            <td className="px-2 py-3 text-center">{index + 1}</td>
                          )}
                          {effectiveColumns.tnved && (
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center"
                                placeholder="кг"
                                required
                              />
                            </td>
                          )}
                          {effectiveColumns.package && (
                            <td className="px-2 py-3">
                              <input
                                type="text"
                                value={item.packageType || ''}
                                onChange={(e) => handleItemChange(index, 'packageType', e.target.value)}
                                list="invoice-packaging-types"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="пласт. ящик."
                              />
                            </td>
                          )}
                          {effectiveColumns.quantity && (
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                required
                                placeholder=""
                              />
                            </td>
                          )}
                          {effectiveColumns.packagesCount && (
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
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
                            <td className="px-2 py-3">
                              <div className="text-right font-semibold text-xs">
                                {item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}
                              </div>
                            </td>
                          )}
                          {effectiveColumns.actions && (
                            <td className="px-2 py-3 text-center">
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
                      <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                        {leadingColumnsCount > 0 && (
                          <td className="px-2 py-3 text-center" colSpan={leadingColumnsCount}>Всего:</td>
                        )}
                        {effectiveColumns.quantity && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
                          </td>
                        )}
                        {effectiveColumns.packagesCount && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + (item.packagesCount ?? 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.gross && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + (item.grossWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.net && (
                          <td className="px-2 py-3 text-right">
                            {formatNumber(items.reduce((sum, item) => sum + (item.netWeight || 0), 0))}
                          </td>
                        )}
                        {effectiveColumns.unitPrice && <td className="px-2 py-3"></td>}
                        {effectiveColumns.total && (
                          <td className="px-2 py-3 text-right font-bold">
                            {formatNumberFixed(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                          </td>
                        )}
                        {effectiveColumns.actions && <td className="px-2 py-3"></td>}
                      </tr>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-2 py-3 text-left text-sm" colSpan={15}>
                          Сумма прописью: {numberToWordsRu(items.reduce((sum, item) => sum + item.totalPrice, 0), form.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Maksimal og'irlik va Tekshiruv yonma-yon (PDF da ko'rinmas) */}
              {!isPdfMode && (() => {
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



            {/* Notes */}

            <div className="mb-8">

              <label className="block text-sm font-semibold text-gray-700 mb-2">Особые примечания</label>

              {isPdfMode ? (
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



            {/* Руководитель Поставщика va Товар отпустил */}
            {selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) && (
              <div className="mb-8 space-y-3">
                {(() => {
                  const contract = contracts.find(c => c.id.toString() === selectedContractId);
                  return (
                    <>
                      {contract?.supplierDirector && (
                        <div className="flex items-baseline gap-2">
                          <label className="text-base font-semibold text-gray-700 shrink-0">
                            Руководитель Поставщика:
                          </label>
                          <span className="text-base text-gray-800">{contract.supplierDirector}</span>
                        </div>
                      )}
                      {contract?.goodsReleasedBy && (
                        <div className="flex items-baseline gap-2">
                          <label className="text-base font-semibold text-gray-700 shrink-0">
                            Товар отпустил:
                          </label>
                          <span className="text-base text-gray-800">{contract.goodsReleasedBy}</span>
                        </div>
                      )}
                    </>
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
              {!invoysStageReady && (
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
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>

          </div>
        </form>

                </div>



      {/* Дополнительная информация Modal */}
      {showAdditionalInfoModal && (
        <div className="invoice-additional-info-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                  value={form.origin}
                  disabled
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
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button

                type="button"

                onClick={() => setShowAdditionalInfoModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >

                Yopish
              </button>

              <button

                type="button"
                onClick={() => setShowAdditionalInfoModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >

                Saqlash
              </button>

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
                      setCustomFields([...customFields, newField]);
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
                    setCustomFields([...customFields, newField]);
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

