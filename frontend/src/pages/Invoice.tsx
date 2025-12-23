import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../lib/api';

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
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      name: '',
      unit: 'кг',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
    }
  ]);

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

  useEffect(() => {
    loadData();
  }, [taskId, clientId, contractIdFromQuery]);

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
          setItems(inv.items || []);
          
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
        // GLN shartnomada bo'lsa, u yoziladi (hozircha shartnomada GLN maydoni yo'q, lekin kelajakda qo'shilishi mumkin)
        // gln: contract.gln || prev.gln,
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
    
    if (items.length === 0 || items.some(item => !item.name || item.quantity <= 0 || item.unitPrice <= 0)) {
      alert('Iltimos, barcha tovarlarni to\'liq to\'ldiring');
      return;
    }

    try {
      setSaving(true);
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      const invoiceData = {
        taskId: taskId ? Number(taskId) : undefined, // taskId ixtiyoriy bo'lishi mumkin
        clientId: clientId ? Number(clientId) : (task?.clientId || undefined),
        invoiceNumber: form.invoiceNumber && form.invoiceNumber.trim() !== '' ? form.invoiceNumber.trim() : undefined, // Agar bo'sh bo'lsa, backend avtomatik yaratadi
        date: form.date,
        currency: form.currency,
        contractNumber: form.contractNumber,
        contractId: selectedContractId ? Number(selectedContractId) : undefined,
        items: items.map((item, index) => ({
          ...item,
          orderIndex: index,
        })),
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
        },
      };

      if (invoice) {
        await apiClient.post(`/invoices`, { ...invoiceData, id: invoice.id });
        alert('Invoice muvaffaqiyatli yangilandi');
      } else {
        await apiClient.post('/invoices', invoiceData);
        alert('Invoice muvaffaqiyatli yaratildi');
      }
      
      await loadData();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      alert(error.response?.data?.error || 'Invoice saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) {
      alert('Avval invoice\'ni saqlang');
      return;
    }
    
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/pdf`, {
        responseType: 'blob',
      });
      
      // Blob'ni tekshirish - agar xatolik bo'lsa, JSON bo'lishi mumkin
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || errorData.message || 'PDF yuklab olishda xatolik yuz berdi');
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      let errorMessage = 'PDF yuklab olishda xatolik yuz berdi';
      
      // Blob response'da xatolik bo'lsa, uni JSON sifatida parse qilish
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Parse qilish mumkin bo'lmasa, default xabar
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || errorMessage;
      }
      
      alert(errorMessage);
      
      // Agar CompanySettings yo'q bo'lsa, Settings sahifasiga yo'naltirish
      if (errorMessage.includes('Kompaniya sozlamalari') || errorMessage.includes('company settings') || errorMessage.includes('topilmadi')) {
        if (confirm('Kompaniya ma\'lumotlari kiritilmagan. Sozlamalar sahifasiga o\'tishni xohlaysizmi?')) {
          navigate('/settings');
        }
      }
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Invoice</h1>
          <div className="flex gap-2">
            {invoice && (
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                PDF yuklab olish
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Orqaga
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Left: Invoice raqami va sana */}
              <div>
                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Инвойс №:</span>
                    <input
                      type="text"
                      value={form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')}
                      onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
                      placeholder="Avtomatik"
                    />
                    <span className="text-sm text-gray-700">от</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      required
                    />
                    <span className="text-sm text-gray-700">г.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Контракт №:</span>
                    <select
                      value={selectedContractId}
                      onChange={(e) => handleContractSelect(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Shartnoma tanlang...</option>
                      {contracts.map(contract => (
                        <option key={contract.id} value={contract.id}>
                          {contract.contractNumber} от {formatDate(contract.contractDate)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right: Invoice Info */}
              <div className="text-right">
                <h1 className="text-4xl font-bold text-gray-800 mb-6">INVOICE</h1>
              </div>
            </div>

            {/* Ajratuvchi chiziq */}
            <div className="border-t border-gray-300 mb-8"></div>

            {/* Sotuvchi va Sotib oluvchi Info */}
            <div className="mb-8 grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Sotuvchi</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) ? (
                    <>
                      <div className="font-medium">
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
                          <div className="whitespace-pre-line">{contracts.find(c => c.id.toString() === selectedContractId)?.sellerDetails}</div>
                        </div>
                      ) : contracts.find(c => c.id.toString() === selectedContractId)?.sellerBankName && (
                        <div className="mt-2">
                          <div className="font-medium">Bank ma'lumotlari:</div>
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
                      <div className="font-medium">{task?.client?.name || 'Mijoz tanlanmagan'}</div>
                      {task?.client?.address && <div>{task.client.address}</div>}
                      {task?.client?.inn && <div>INN: {task.client.inn}</div>}
                      {task?.client?.phone && <div>Tel: {task.client.phone}</div>}
                      {task?.client?.email && <div>Email: {task.client.email}</div>}
                      {task?.client?.bankName && (
                        <div className="mt-2">
                          <div className="font-medium">Bank ma'lumotlari:</div>
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
                <h3 className="font-semibold text-gray-800 mb-2">Sotib oluvchi</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedContractId && contracts.find(c => c.id.toString() === selectedContractId) ? (
                    <>
                      <div className="font-medium">
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
                          <div className="whitespace-pre-line">{contracts.find(c => c.id.toString() === selectedContractId)?.buyerDetails}</div>
                        </div>
                      ) : contracts.find(c => c.id.toString() === selectedContractId)?.buyerBankName && (
                        <div className="mt-2">
                          <div className="font-medium">Bank ma'lumotlari:</div>
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
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-1">
                {form.deliveryTerms && <div><strong>Условия поставки:</strong> {form.deliveryTerms}</div>}
                {form.vehicleNumber && <div><strong>Номер автотранспорта:</strong> {form.vehicleNumber}</div>}
                {form.shipmentPlace && <div><strong>Место отгрузки груза:</strong> {form.shipmentPlace}</div>}
                {form.destination && <div><strong>Место назначения:</strong> {form.destination}</div>}
                <div><strong>Происхождение товара:</strong> {form.origin}</div>
                {form.manufacturer && <div><strong>Производитель:</strong> {form.manufacturer}</div>}
                {form.orderNumber && <div><strong>Номер заказа:</strong> {form.orderNumber}</div>}
                {form.gln && <div><strong>Глобальный идентификационный номер GS1 (GLN):</strong> {form.gln}</div>}
                {form.harvestYear && <div><strong>Урожай:</strong> {form.harvestYear} года</div>}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Tovarlar</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  + Line Item
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="px-2 py-3 text-center text-xs font-semibold w-12">№</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold">Код ТН ВЭД</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold">Код PLU</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold">Наименование товара</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold">Вид упаковки</th>
                      <th className="px-2 py-3 text-center text-xs font-semibold">Ед. изм.</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold">Мест</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold">Брутто (кг)</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold">Нетто (кг)</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold">Цена за ед.изм.</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold">Сумма с НДС</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-2 py-3 text-center">{index + 1}</td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.tnvedCode || ''}
                            onChange={(e) => handleItemChange(index, 'tnvedCode', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="0810700001"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.pluCode || ''}
                            onChange={(e) => handleItemChange(index, 'pluCode', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="4309371"
                          />
                        </td>
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
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={item.packageType || ''}
                            onChange={(e) => handleItemChange(index, 'packageType', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="пласт. ящик."
                          />
                        </td>
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
                        <td className="px-2 py-3">
                          <div className="text-right font-semibold text-xs">
                            {item.totalPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                      <td className="px-2 py-3 text-center" colSpan={6}>Jami:</td>
                      <td className="px-2 py-3 text-right">
                        {items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {items.reduce((sum, item) => sum + (item.grossWeight || 0), 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {items.reduce((sum, item) => sum + (item.netWeight || 0), 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3 text-right font-bold">
                        {items.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
                placeholder="Qo'shimcha eslatmalar..."
              />
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
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Руководитель Поставщика:
                          </label>
                          <div className="text-sm text-gray-800">
                            {contract.supplierDirector}
                          </div>
                        </div>
                      )}
                      {contract?.goodsReleasedBy && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Товар отпустил:
                          </label>
                          <div className="text-sm text-gray-800">
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
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Условия поставки:
                </label>
                <input
                  type="text"
                  value={form.deliveryTerms}
                  onChange={(e) => setForm({ ...form, deliveryTerms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Shartnomadan olinadi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер автотранспорта:
                </label>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Место отгрузки груза:
                </label>
                <input
                  type="text"
                  value={form.shipmentPlace}
                  onChange={(e) => setForm({ ...form, shipmentPlace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Место назначения:
                </label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Происхождение товара:
                </label>
                <input
                  type="text"
                  value={form.origin}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Производитель:
                </label>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер заказа:
                </label>
                <input
                  type="text"
                  value={form.orderNumber}
                  onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Глобальный идентификационный номер GS1 (GLN):
                </label>
                <input
                  type="text"
                  value={form.gln}
                  onChange={(e) => setForm({ ...form, gln: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Shartnomadan olinadi yoki qo'lda yoziladi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Урожай:
                </label>
                <input
                  type="text"
                  value={form.harvestYear}
                  onChange={(e) => setForm({ ...form, harvestYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-500 ml-2">года</span>
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
    </div>
  );
};

export default Invoice;
