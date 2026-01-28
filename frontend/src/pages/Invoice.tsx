import { useState, useEffect, useRef } from 'react';

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import apiClient from '../lib/api';
import DateInput from '../components/DateInput';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';



interface InvoiceItem {

  id?: number;

  tnvedCode?: string;

  pluCode?: string;

  name: string;

  packageType?: string;

  unit: string;

  quantity: number;

  grossWeight?: number;

  netWeight?: number;

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

  paymentMethod?: string;

  supplierDirector?: string; // Руководитель Поставщика
  goodsReleasedBy?: string; // Товар отпустил
  gln?: string; // GLN код
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

  const [task, setTask] = useState<Task | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);

  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([

    {

      name: '',

      unit: 'кг',

      quantity: 0,

      unitPrice: 0,

      totalPrice: 0,

    }

  ]);
  const [visibleColumns, setVisibleColumns] = useState({
    index: true,
    tnved: true,
    plu: true,
    name: true,
    package: true,
    unit: true,
    quantity: true,
    gross: true,
    net: true,
    unitPrice: true,
    total: true,
    actions: true,
  });



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
    shipmentPlace: 'Ферганская область, Алтыарыкский р-н.', // Место отгрузки груза
    destination: 'Россия', // Место назначения
    origin: 'Республика Узбекистан', // Происхождение товара (har doim shu)
    manufacturer: 'OOO "FERGANA EXIM AGRO"', // Производитель
    orderNumber: '', // Номер заказа
    gln: '', // Глобальный идентификационный номер GS1 (GLN)
    harvestYear: new Date().getFullYear().toString(), // Урожай года
  });

  const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);
  const [additionalInfoError, setAdditionalInfoError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');


  useEffect(() => {

    loadData();

  }, [taskId, clientId, contractIdFromQuery]);



  const normalizeItem = (item: InvoiceItem): InvoiceItem => ({
    ...item,
    tnvedCode: item.tnvedCode ?? undefined,
    pluCode: item.pluCode ?? undefined,
    packageType: item.packageType ?? undefined,
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

            // Contract ma'lumotlarini yuklash va form'ga to'ldirish

            try {

              const contractResponse = await apiClient.get(`/contracts/${contractIdFromQuery}`);

              const contract = contractResponse.data;

              setForm(prev => ({

                ...prev,

                contractNumber: contract.contractNumber,

                paymentTerms: contract.deliveryTerms || prev.paymentTerms,
                gln: contract.gln || prev.gln,

              }));

              // Shartnoma ma'lumotlarini avtomatik to'ldirish

              handleContractSelect(contractIdFromQuery);

            } catch (error) {

              console.error('Error loading contract:', error);

            }

          }

        } catch (error: any) {
          console.error('Error loading contracts:', error);

        }

        

        // Invoice ma'lumotlarini olish

        try {

          const invoiceResponse = await apiClient.get(`/invoices/task/${taskId}`);

          const inv = invoiceResponse.data;

          setInvoice(inv);

          setForm(prev => ({
            ...prev,
            invoiceNumber: inv.invoiceNumber || undefined,

            date: inv.date ? inv.date.split('T')[0] : new Date().toISOString().split('T')[0],

            currency: inv.currency || 'USD',

            contractNumber: inv.contractNumber || '',

            paymentTerms: inv.additionalInfo?.paymentTerms || '',

            dueDate: inv.additionalInfo?.dueDate || '',

            poNumber: inv.additionalInfo?.poNumber || '',

            notes: inv.notes || '',

            terms: inv.additionalInfo?.terms || '',

            tax: inv.additionalInfo?.tax || 0,

            discount: inv.additionalInfo?.discount || 0,

            shipping: inv.additionalInfo?.shipping || 0,

            amountPaid: inv.additionalInfo?.amountPaid || 0,

            // Дополнительная информация
            deliveryTerms: inv.additionalInfo?.deliveryTerms || prev.deliveryTerms,
            vehicleNumber: inv.additionalInfo?.vehicleNumber || prev.vehicleNumber,
            shipmentPlace: inv.additionalInfo?.shipmentPlace || prev.shipmentPlace,
            destination: inv.additionalInfo?.destination || prev.destination,
            manufacturer: inv.additionalInfo?.manufacturer || prev.manufacturer,
            orderNumber: inv.additionalInfo?.orderNumber || prev.orderNumber,
            gln: inv.additionalInfo?.gln || prev.gln,
            harvestYear: inv.additionalInfo?.harvestYear || prev.harvestYear,
          }));
          setItems((inv.items || []).map(normalizeItem));
          setCustomFields(inv.additionalInfo?.customFields || []);

          

          // Agar invoice'da contractId bo'lsa, uni tanlash

          if (inv.contractId) {

            setSelectedContractId(inv.contractId.toString());

            // Contract ma'lumotlarini yuklash

            try {

              const contractResponse = await apiClient.get(`/contracts/${inv.contractId}`);

              const contract = contractResponse.data;

              setForm(prev => ({

                ...prev,

                contractNumber: contract.contractNumber,

                paymentTerms: contract.deliveryTerms || prev.paymentTerms,
                gln: contract.gln || prev.gln,

              }));

            } catch (error) {

              console.error('Error loading contract:', error);

            }

          }

        } catch (error: any) {

          // Invoice topilmasa, yangi yaratish

          if (error.response?.status === 404) {

            setInvoice(null);

            // Client shartnoma ma'lumotlarini to'ldirish

            if (taskResponse.data?.client?.contractNumber) {

              setForm(prev => ({

                ...prev,

                contractNumber: taskResponse.data.client.contractNumber,

              }));

            }

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

    

    // Total price ni hisoblash: Нетто * Цена за ед.изм.
    if (field === 'netWeight' || field === 'unitPrice') {
      const netWeight = field === 'netWeight' ? (value || 0) : (newItems[index].netWeight || 0);
      const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;

      newItems[index].totalPrice = netWeight * unitPrice;
    }

    

    setItems(newItems);

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



  const addItem = () => {

    setItems([...items, {

      name: '',

      unit: 'кг',

      quantity: 0,

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

    

    if (!contractId) return;

    

    try {

      const response = await apiClient.get(`/contracts/${contractId}`);

      const contract = response.data;

      

      // Shartnoma ma'lumotlarini invoice form'ga to'ldirish

      setForm(prev => ({

        ...prev,

        contractNumber: contract.contractNumber,

        paymentTerms: contract.deliveryTerms || '',

        deliveryTerms: contract.deliveryTerms || prev.deliveryTerms,
        // GLN shartnomadan olinadi
        gln: contract.gln || prev.gln,
      }));

      

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

    

    if (items.length === 0 || items.some(item => !item.name || item.quantity <= 0 || item.unitPrice <= 0)) {

      alert('Iltimos, barcha tovarlarni to\'liq to\'ldiring');

      return;

    }



    try {

      setSaving(true);

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      

      const normalizedItems = items.map((item, index) => {
        const normalized = normalizeItem(item);
        return {
          ...normalized,
          quantity: Number(normalized.quantity) || 0,
          unitPrice: Number(normalized.unitPrice) || 0,
          totalPrice: Number(normalized.totalPrice) || 0,
          orderIndex: index,
        };
      });

      const invoiceData = {

        taskId: taskId ? Number(taskId) : undefined, // taskId ixtiyoriy bo'lishi mumkin

        clientId: clientId ? Number(clientId) : (task?.clientId || undefined),

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
          shipmentPlace: form.shipmentPlace,
          destination: form.destination,
          origin: form.origin,
          manufacturer: form.manufacturer,
          orderNumber: form.orderNumber,
          gln: form.gln,
          harvestYear: form.harvestYear,
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

      await waitForPaint();
      await generatePdf();

    } catch (error: any) {

      console.error('Error saving invoice:', error);

      alert(error.response?.data?.error || 'Invoice saqlashda xatolik yuz berdi');

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



  return (

    <div className="min-h-screen bg-gray-50 py-8">

      <div className="max-w-6xl mx-auto px-4">
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
            <button
              type="button"
              onClick={generatePdf}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300"
            >
              PDF yuklab olish
            </button>
            <button

              onClick={() => navigate(-1)}

              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"

            >

              Orqaga

            </button>

          </div>

        </div>



        <form onSubmit={handleSubmit}>

          <div
            ref={invoiceRef}
            className={`bg-white rounded-lg shadow-lg p-8${isPdfMode ? ' pdf-mode' : ''}`}
          >

            {/* Invoice Header */}

            <div className="grid grid-cols-2 gap-8 mb-8">

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
                        <input
                          type="text"
                          value={form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')}
                          onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-base font-semibold"
                          placeholder="Avtomatik"
                        />

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

            <div className="mb-8 grid grid-cols-2 gap-8">

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
                  {isBuyerConsignee ? 'Покупатель/Грузополучатель' : 'Sotib oluvchi'}
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
                {form.destination && <div><strong>Место назначения:</strong> {form.destination}</div>}
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
                  <details className="relative">
                    <summary className="list-none cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                      Ustunlar
                    </summary>
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.index}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, index: !prev.index }))}
                          />
                          №
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.tnved}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, tnved: !prev.tnved }))}
                          />
                          Код ТН ВЭД
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.plu}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, plu: !prev.plu }))}
                          />
                          Код PLU
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.name}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, name: !prev.name }))}
                          />
                          Наименование товара
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.package}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, package: !prev.package }))}
                          />
                          Вид упаковки
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.unit}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, unit: !prev.unit }))}
                          />
                          Ед. изм.
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.quantity}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, quantity: !prev.quantity }))}
                          />
                          Мест
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.gross}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, gross: !prev.gross }))}
                          />
                          Брутто (кг)
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.net}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, net: !prev.net }))}
                          />
                          Нетто (кг)
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.unitPrice}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, unitPrice: !prev.unitPrice }))}
                          />
                          Цена за ед.изм.
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.total}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, total: !prev.total }))}
                          />
                          Сумма с НДС
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visibleColumns.actions}
                            onChange={() => setVisibleColumns((prev) => ({ ...prev, actions: !prev.actions }))}
                          />
                          Amallar
                        </label>
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
                          <th className="px-2 py-3 text-center text-xs font-semibold w-12">№</th>
                        )}
                        {effectiveColumns.tnved && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Код ТН ВЭД</th>
                        )}
                        {effectiveColumns.plu && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Код PLU</th>
                        )}
                        {effectiveColumns.name && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Наименование товара</th>
                        )}
                        {effectiveColumns.package && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Вид упаковки</th>
                        )}
                        {effectiveColumns.unit && (
                          <th className="px-2 py-3 text-center text-xs font-semibold">Ед. изм.</th>
                        )}
                        {effectiveColumns.quantity && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Мест</th>
                        )}
                        {effectiveColumns.gross && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Брутто (кг)</th>
                        )}
                        {effectiveColumns.net && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Нетто (кг)</th>
                        )}
                        {effectiveColumns.unitPrice && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Цена за ед.изм.</th>
                        )}
                        {effectiveColumns.total && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Сумма с НДС</th>
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
                          {effectiveColumns.package && (
                            <td className="px-2 py-3">{item.packageType || ''}</td>
                          )}
                          {effectiveColumns.unit && (
                            <td className="px-2 py-3 text-center">{item.unit || ''}</td>
                          )}
                          {effectiveColumns.quantity && (
                            <td className="px-2 py-3 text-right">{formatNumber(item.quantity)}</td>
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
                              {formatNumberFixed(item.totalPrice)}
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
                    </tfoot>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        {effectiveColumns.index && (
                          <th className="px-2 py-3 text-center text-xs font-semibold w-12">№</th>
                        )}
                        {effectiveColumns.tnved && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Код ТН ВЭД</th>
                        )}
                        {effectiveColumns.plu && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Код PLU</th>
                        )}
                        {effectiveColumns.name && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Наименование товара</th>
                        )}
                        {effectiveColumns.package && (
                          <th className="px-2 py-3 text-left text-xs font-semibold">Вид упаковки</th>
                        )}
                        {effectiveColumns.unit && (
                          <th className="px-2 py-3 text-center text-xs font-semibold">Ед. изм.</th>
                        )}
                        {effectiveColumns.quantity && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Мест</th>
                        )}
                        {effectiveColumns.gross && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Брутто (кг)</th>
                        )}
                        {effectiveColumns.net && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Нетто (кг)</th>
                        )}
                        {effectiveColumns.unitPrice && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Цена за ед.изм.</th>
                        )}
                        {effectiveColumns.total && (
                          <th className="px-2 py-3 text-right text-xs font-semibold">Сумма с НДС</th>
                        )}
                        {effectiveColumns.actions && (
                          <th className="px-2 py-3 text-center text-xs font-semibold">Amallar</th>
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
                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="Наименование товара"
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
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="пласт. ящик."
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
                          {effectiveColumns.quantity && (
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                          )}
                          {effectiveColumns.gross && (
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                value={item.grossWeight || ''}
                                onChange={(e) => handleItemChange(index, 'grossWeight', parseFloat(e.target.value) || undefined)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                placeholder="7802"
                              />
                            </td>
                          )}
                          {effectiveColumns.net && (
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                value={item.netWeight || ''}
                                onChange={(e) => handleItemChange(index, 'netWeight', parseFloat(e.target.value) || undefined)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                placeholder="7150"
                              />
                            </td>
                          )}
                          {effectiveColumns.unitPrice && (
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                min="0"
                                step="0.01"
                                required
                                placeholder="1,12"
                              />
                            </td>
                          )}
                          {effectiveColumns.total && (
                            <td className="px-2 py-3">
                              <div className="text-right font-semibold text-xs">
                                {formatNumberFixed(item.totalPrice)}
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
                    </tfoot>
                  </table>
                )}
              </div>

            </div>



            {/* Notes */}

            <div className="mb-8">

              <label className="block text-sm font-semibold text-gray-700 mb-2">Особые примечания</label>

              {isPdfMode ? (
                <div className="w-full min-h-[90px] px-4 py-2 text-sm text-gray-900 whitespace-pre-wrap border border-gray-300 rounded-lg flex items-center text-left">
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
              <div>

                          <label className="block text-base font-semibold text-gray-700 mb-1">
                            Руководитель Поставщика:
                          </label>
                          <div className="text-base text-gray-800">
                            {contract.supplierDirector}
              </div>

                </div>

                      )}
                      {contract?.goodsReleasedBy && (
                        <div>
                          <label className="block text-base font-semibold text-gray-700 mb-1">
                            Товар отпустил:
                          </label>
                          <div className="text-base text-gray-800">
                            {contract.goodsReleasedBy}
                  </div>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Shartnomadan olinadi"
                      />

                  </div>


              <div>
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

