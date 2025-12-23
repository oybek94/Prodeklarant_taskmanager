import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  branch: { id: number; name: string };
}

interface Transaction {
  id: number;
  amount: number | string;
  currency: string;
  date: string;
  comment?: string;
}

interface Contract {
  id: number;
  contractNumber: string;
  contractDate: string;
  sellerName: string;
  buyerName: string;
  deliveryTerms?: string;
  paymentMethod?: string;
}

interface Client {
  id: number;
  name: string;
  dealAmount?: number;
  phone?: string;
  tasks: Task[];
  transactions: Transaction[];
  stats: {
    dealAmount: number | string;
    totalDealAmount?: number | string; // Jami shartnoma summasi (PSR hisobga olingan)
    totalIncome: number | string;
    balance: number | string;
    tasksByBranch: Record<string, number>;
    totalTasks: number;
    tasksWithPsr?: number; // PSR bor bo'lgan tasklar soni
  };
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    contractDate: new Date().toISOString().split('T')[0],
    // Sotuvchi - alohida maydonlar
    sellerName: '',
    sellerLegalAddress: '',
    sellerDetails: '', // Qolgan rekvizitlar
    // Sotib oluvchi - alohida maydonlar
    buyerName: '',
    buyerAddress: '',
    buyerDetails: '', // Qolgan rekvizitlar
    // Yuk jo'natuvchi - alohida maydonlar (ixtiyoriy)
    shipperName: '',
    shipperAddress: '',
    shipperDetails: '', // Qolgan rekvizitlar
    // Yuk qabul qiluvchi - alohida maydonlar (ixtiyoriy)
    consigneeName: '',
    consigneeAddress: '',
    consigneeDetails: '', // Qolgan rekvizitlar
    // Eski maydonlar (backend bilan moslashish uchun saqlanadi)
    sellerInn: '',
    sellerOgrn: '',
    sellerBankName: '',
    sellerBankAddress: '',
    sellerBankAccount: '',
    sellerBankSwift: '',
    sellerCorrespondentBank: '',
    sellerCorrespondentBankAccount: '',
    sellerCorrespondentBankSwift: '',
    buyerInn: '',
    buyerOgrn: '',
    buyerBankName: '',
    buyerBankAddress: '',
    buyerBankAccount: '',
    buyerBankSwift: '',
    buyerCorrespondentBank: '',
    buyerCorrespondentBankAccount: '',
    buyerCorrespondentBankSwift: '',
    shipperInn: '',
    shipperOgrn: '',
    shipperBankName: '',
    shipperBankAddress: '',
    shipperBankAccount: '',
    shipperBankSwift: '',
    consigneeInn: '',
    consigneeOgrn: '',
    consigneeBankName: '',
    consigneeBankAddress: '',
    consigneeBankAccount: '',
    consigneeBankSwift: '',
    deliveryTerms: '',
    paymentMethod: '',
    gln: '', // Глобальный идентификационный номер GS1 (GLN)
    supplierDirector: '', // Руководитель Поставщика
    goodsReleasedBy: '', // Товар отпустил
  });

  useEffect(() => {
    if (id) {
      loadClient();
      loadContracts();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/clients/${id}`);
      setClient(response.data);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      setLoadingContracts(true);
      const response = await apiClient.get(`/contracts/client/${id}`);
      setContracts(response.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoadingContracts(false);
    }
  };

  // Helper function to parse details textarea
  const parseDetails = (detailsText: string) => {
    if (!detailsText || !detailsText.trim()) return {};
    
    const lines = detailsText.split('\n').map(line => line.trim()).filter(line => line);
    const result: any = {};
    let currentSection = '';
    
    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      const originalLine = line;
      
      // INN/ИНН - format: "INN: 123456" yoki "ИНН: 123456" yoki "INN 123456"
      if (lowerLine.includes('inn') || lowerLine.includes('инн')) {
        const match = originalLine.match(/(?:inn|инн)[:\s]*([^\n]+)/i);
        if (match) {
          result.inn = match[1].trim();
        }
      } else if (/^\d{9,12}$/.test(originalLine.trim()) && !result.inn && !result.ogrn) {
        // Agar faqat raqamlar bo'lsa va INN/OGRN bo'lmagan bo'lsa
        result.inn = originalLine.trim();
      }
      
      // OGRN/ОГРН - format: "OGRN: 123456" yoki "ОГРН: 123456"
      if (lowerLine.includes('ogrn') || lowerLine.includes('огрн')) {
        const match = originalLine.match(/(?:ogrn|огрн)[:\s]*([^\n]+)/i);
        if (match) {
          result.ogrn = match[1].trim();
        }
      } else if (/^\d{13,15}$/.test(originalLine.trim()) && !result.ogrn && !result.inn) {
        // Agar 13-15 raqam bo'lsa va OGRN bo'lmagan bo'lsa
        result.ogrn = originalLine.trim();
      }
      
      // Bank nomi - format: "Bank: Nomi" yoki "Банк: Nomi" yoki "Банковские реквизиты:" dan keyin
      if (lowerLine.includes('банковские') || lowerLine.includes('реквизиты')) {
        currentSection = 'bank';
      } else if ((lowerLine.includes('bank') || lowerLine.includes('банк')) && 
                 !lowerLine.includes('manzil') && !lowerLine.includes('address') && 
                 !lowerLine.includes('адрес') && !lowerLine.includes('расчетный') && 
                 !lowerLine.includes('валютный') && !lowerLine.includes('счет') &&
                 !lowerLine.includes('korrespondent') && !lowerLine.includes('kor.') &&
                 !lowerLine.includes('корреспондент')) {
        const match = originalLine.match(/(?:bank|банк)[:\s]+(.+)/i);
        if (match && !result.bankName) {
          const bankName = match[1].trim();
          // Agar "Bank manzili" yoki "Bank address" bo'lmasa
          if (!bankName.toLowerCase().includes('manzil') && 
              !bankName.toLowerCase().includes('address') &&
              !bankName.toLowerCase().includes('адрес') &&
              !bankName.toLowerCase().includes('реквизиты')) {
            result.bankName = bankName;
          }
        }
      }
      
      // Bank manzili - format: "Bank manzili: ..." yoki "Bank address: ..."
      if (lowerLine.includes('manzil') || lowerLine.includes('address') || lowerLine.includes('адрес')) {
        if (lowerLine.includes('bank') || lowerLine.includes('банк')) {
          const match = originalLine.match(/(?:bank|банк)\s+(?:manzil|address|адрес)[:\s]*([^\n]+)/i);
          if (match) {
            result.bankAddress = match[1].trim();
          }
        } else {
          const match = originalLine.match(/(?:manzil|address|адрес)[:\s]*([^\n]+)/i);
          if (match) {
            result.bankAddress = match[1].trim();
          }
        }
      }
      
      // Hisob raqami - format: "Hisob: 123456" yoki "Расчетный счет: 123456" yoki "Валютный счет: 123456"
      if (lowerLine.includes('hisob') || lowerLine.includes('account') || 
          lowerLine.includes('расчетный') || lowerLine.includes('валютный') || 
          lowerLine.includes('счет')) {
        // Расчетный счет (UZS)
        if (lowerLine.includes('расчетный') || (lowerLine.includes('счет') && lowerLine.includes('uzs'))) {
          const match = originalLine.match(/расчетный\s+счет[^:]*[:\s]*([^\n]+)/i);
          if (match) {
            result.bankAccount = match[1].trim();
          }
        }
        // Валютный счет (USD)
        else if (lowerLine.includes('валютный') && lowerLine.includes('usd')) {
          const match = originalLine.match(/валютный\s+счет[^:]*[:\s]*([^\n]+)/i);
          if (match) {
            // Agar allaqachon hisob raqami bo'lsa, uni saqlash (USD hisob)
            if (!result.bankAccount) {
              result.bankAccount = match[1].trim();
            }
          }
        }
        // Umumiy hisob raqami
        else {
          const match = originalLine.match(/(?:hisob|account|счет)(?:\s+raqami)?[:\s]*([^\n]+)/i);
          if (match && !result.bankAccount) {
            result.bankAccount = match[1].trim();
          }
        }
      } else if (/^[A-Z0-9]{15,30}$/i.test(originalLine.trim()) && !result.bankAccount && !result.inn && !result.ogrn && !result.bankSwift) {
        // Agar uzun raqamlar bo'lsa va hisob raqami bo'lmagan bo'lsa
        result.bankAccount = originalLine.trim();
      }
      
      // МФО - format: "МФО: 123456"
      if (lowerLine.includes('мфо') || lowerLine.includes('mfo')) {
        const match = originalLine.match(/(?:мфо|mfo)[:\s]*([^\n]+)/i);
        if (match) {
          // МФО ni bankAddress ga qo'shish yoki alohida saqlash
          if (!result.bankAddress) {
            result.bankAddress = `МФО: ${match[1].trim()}`;
          } else {
            result.bankAddress += `, МФО: ${match[1].trim()}`;
          }
        }
      }
      
      // SWIFT - format: "SWIFT: ABCD" yoki "SWIFT ABCD"
      if (lowerLine.includes('swift') && !lowerLine.includes('korrespondent') && !lowerLine.includes('kor.') && !lowerLine.includes('корреспондент')) {
        const match = originalLine.match(/swift[:\s]*([^\n]+)/i);
        if (match) {
          result.bankSwift = match[1].trim().toUpperCase();
        }
      } else if (/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{0,3}$/i.test(originalLine.trim()) && !result.bankSwift && !result.bankAccount) {
        // Agar SWIFT formatida bo'lsa (8-11 belgi)
        result.bankSwift = originalLine.trim().toUpperCase();
      }
      
      // Korrespondent bank - format: "Kor. bank: ..." yoki "Корреспондент банк: ..."
      if (lowerLine.includes('korrespondent') || lowerLine.includes('kor.') || lowerLine.includes('kor ') || lowerLine.includes('корреспондент')) {
        if (lowerLine.includes('bank') || lowerLine.includes('банк')) {
          if (!lowerLine.includes('hisob') && !lowerLine.includes('account') && !lowerLine.includes('счет') && !lowerLine.includes('swift')) {
            const match = originalLine.match(/(?:korrespondent|kor\.?|корреспондент)\s*(?:bank|банк)[:\s]*([^\n]+)/i);
            if (match) {
              result.correspondentBank = match[1].trim();
            }
          }
        }
        if (lowerLine.includes('hisob') || lowerLine.includes('account') || lowerLine.includes('счет')) {
          const match = originalLine.match(/(?:korrespondent|kor\.?|корреспондент)\s*(?:hisob|account|счет)(?:\s+raqami)?[:\s]*([^\n]+)/i);
          if (match) {
            result.correspondentBankAccount = match[1].trim();
          }
        }
        if (lowerLine.includes('swift')) {
          const match = originalLine.match(/(?:korrespondent|kor\.?|корреспондент)\s*swift[:\s]*([^\n]+)/i);
          if (match) {
            result.correspondentBankSwift = match[1].trim().toUpperCase();
          }
        }
      }
    });
    
    return result;
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // To'g'ridan-to'g'ri textarea ma'lumotlarini saqlash (parse qilmasdan)
      const data = {
        clientId: Number(id),
        contractNumber: contractForm.contractNumber,
        contractDate: contractForm.contractDate,
        // Sotuvchi
        sellerName: contractForm.sellerName,
        sellerLegalAddress: contractForm.sellerLegalAddress,
        sellerDetails: contractForm.sellerDetails || undefined, // To'g'ridan-to'g'ri textarea ma'lumotlari
        // Sotib oluvchi
        buyerName: contractForm.buyerName,
        buyerAddress: contractForm.buyerAddress,
        buyerDetails: contractForm.buyerDetails || undefined, // To'g'ridan-to'g'ri textarea ma'lumotlari
        // Yuk jo'natuvchi
        shipperName: contractForm.shipperName || undefined,
        shipperAddress: contractForm.shipperAddress || undefined,
        shipperDetails: contractForm.shipperDetails || undefined, // To'g'ridan-to'g'ri textarea ma'lumotlari
        // Yuk qabul qiluvchi
        consigneeName: contractForm.consigneeName || undefined,
        consigneeAddress: contractForm.consigneeAddress || undefined,
        consigneeDetails: contractForm.consigneeDetails || undefined, // To'g'ridan-to'g'ri textarea ma'lumotlari
        deliveryTerms: contractForm.deliveryTerms || undefined,
        paymentMethod: contractForm.paymentMethod || undefined,
        gln: contractForm.gln || undefined, // Глобальный идентификационный номер GS1 (GLN)
        supplierDirector: contractForm.supplierDirector || undefined, // Руководитель Поставщика
        goodsReleasedBy: contractForm.goodsReleasedBy || undefined, // Товар отпустил
      };

      if (editingContract) {
        await apiClient.put(`/contracts/${editingContract.id}`, data);
        alert('Shartnoma muvaffaqiyatli yangilandi');
      } else {
        await apiClient.post('/contracts', data);
        alert('Shartnoma muvaffaqiyatli yaratildi');
      }

      setShowContractForm(false);
      setEditingContract(null);
      setContractForm({
        contractNumber: '',
        contractDate: new Date().toISOString().split('T')[0],
        sellerDetails: '',
        buyerDetails: '',
        shipperDetails: '',
        consigneeDetails: '',
        sellerName: '',
        sellerLegalAddress: '',
        sellerInn: '',
        sellerOgrn: '',
        sellerBankName: '',
        sellerBankAddress: '',
        sellerBankAccount: '',
        sellerBankSwift: '',
        sellerCorrespondentBank: '',
        sellerCorrespondentBankAccount: '',
        sellerCorrespondentBankSwift: '',
        buyerName: '',
        buyerAddress: '',
        buyerInn: '',
        buyerOgrn: '',
        buyerBankName: '',
        buyerBankAddress: '',
        buyerBankAccount: '',
        buyerBankSwift: '',
        buyerCorrespondentBank: '',
        buyerCorrespondentBankAccount: '',
        buyerCorrespondentBankSwift: '',
        shipperName: '',
        shipperAddress: '',
        shipperInn: '',
        shipperOgrn: '',
        shipperBankName: '',
        shipperBankAddress: '',
        shipperBankAccount: '',
        shipperBankSwift: '',
        consigneeName: '',
        consigneeAddress: '',
        consigneeInn: '',
        consigneeOgrn: '',
        consigneeBankName: '',
        consigneeBankAddress: '',
        consigneeBankAccount: '',
        consigneeBankSwift: '',
        deliveryTerms: '',
        paymentMethod: '',
        gln: '',
        supplierDirector: '',
        goodsReleasedBy: '',
      });
      await loadContracts();
    } catch (error: any) {
      console.error('Error saving contract:', error);
      alert(error.response?.data?.error || 'Shartnoma saqlashda xatolik yuz berdi');
    }
  };

  const handleEditContract = (contract: Contract) => {
    apiClient.get(`/contracts/${contract.id}`)
      .then(response => {
        const contractData = response.data;
        
        // Agar to'g'ridan-to'g'ri saqlangan ma'lumotlar bo'lsa, ularni ishlatish, aks holda eski maydonlardan birlashtirish
        const sellerDetails = contractData.sellerDetails || [
          contractData.sellerInn ? `INN: ${contractData.sellerInn}` : '',
          contractData.sellerOgrn ? `OGRN: ${contractData.sellerOgrn}` : '',
          contractData.sellerBankName ? `Bank: ${contractData.sellerBankName}` : '',
          contractData.sellerBankAddress ? `Bank manzili: ${contractData.sellerBankAddress}` : '',
          contractData.sellerBankAccount ? `Hisob: ${contractData.sellerBankAccount}` : '',
          contractData.sellerBankSwift ? `SWIFT: ${contractData.sellerBankSwift}` : '',
          contractData.sellerCorrespondentBank ? `Kor. bank: ${contractData.sellerCorrespondentBank}` : '',
          contractData.sellerCorrespondentBankAccount ? `Kor. hisob: ${contractData.sellerCorrespondentBankAccount}` : '',
          contractData.sellerCorrespondentBankSwift ? `Kor. SWIFT: ${contractData.sellerCorrespondentBankSwift}` : '',
        ].filter(line => line.trim()).join('\n');
        
        const buyerDetails = contractData.buyerDetails || [
          contractData.buyerInn ? `INN: ${contractData.buyerInn}` : '',
          contractData.buyerOgrn ? `OGRN: ${contractData.buyerOgrn}` : '',
          contractData.buyerBankName ? `Bank: ${contractData.buyerBankName}` : '',
          contractData.buyerBankAddress ? `Bank manzili: ${contractData.buyerBankAddress}` : '',
          contractData.buyerBankAccount ? `Hisob: ${contractData.buyerBankAccount}` : '',
          contractData.buyerBankSwift ? `SWIFT: ${contractData.buyerBankSwift}` : '',
          contractData.buyerCorrespondentBank ? `Kor. bank: ${contractData.buyerCorrespondentBank}` : '',
          contractData.buyerCorrespondentBankAccount ? `Kor. hisob: ${contractData.buyerCorrespondentBankAccount}` : '',
          contractData.buyerCorrespondentBankSwift ? `Kor. SWIFT: ${contractData.buyerCorrespondentBankSwift}` : '',
        ].filter(line => line.trim()).join('\n');
        
        const shipperDetails = contractData.shipperDetails || [
          contractData.shipperInn ? `INN: ${contractData.shipperInn}` : '',
          contractData.shipperOgrn ? `OGRN: ${contractData.shipperOgrn}` : '',
          contractData.shipperBankName ? `Bank: ${contractData.shipperBankName}` : '',
          contractData.shipperBankAddress ? `Bank manzili: ${contractData.shipperBankAddress}` : '',
          contractData.shipperBankAccount ? `Hisob: ${contractData.shipperBankAccount}` : '',
          contractData.shipperBankSwift ? `SWIFT: ${contractData.shipperBankSwift}` : '',
        ].filter(line => line.trim()).join('\n');
        
        const consigneeDetails = contractData.consigneeDetails || [
          contractData.consigneeInn ? `INN: ${contractData.consigneeInn}` : '',
          contractData.consigneeOgrn ? `OGRN: ${contractData.consigneeOgrn}` : '',
          contractData.consigneeBankName ? `Bank: ${contractData.consigneeBankName}` : '',
          contractData.consigneeBankAddress ? `Bank manzili: ${contractData.consigneeBankAddress}` : '',
          contractData.consigneeBankAccount ? `Hisob: ${contractData.consigneeBankAccount}` : '',
          contractData.consigneeBankSwift ? `SWIFT: ${contractData.consigneeBankSwift}` : '',
        ].filter(line => line.trim()).join('\n');
        
        setContractForm({
          contractNumber: contractData.contractNumber || '',
          contractDate: contractData.contractDate ? contractData.contractDate.split('T')[0] : new Date().toISOString().split('T')[0],
          // Sotuvchi
          sellerName: contractData.sellerName || '',
          sellerLegalAddress: contractData.sellerLegalAddress || '',
          sellerDetails,
          // Sotib oluvchi
          buyerName: contractData.buyerName || '',
          buyerAddress: contractData.buyerAddress || '',
          buyerDetails,
          // Yuk jo'natuvchi
          shipperName: contractData.shipperName || '',
          shipperAddress: contractData.shipperAddress || '',
          shipperDetails,
          // Yuk qabul qiluvchi
          consigneeName: contractData.consigneeName || '',
          consigneeAddress: contractData.consigneeAddress || '',
          consigneeDetails,
          // Eski maydonlar (backend bilan moslashish uchun saqlanadi)
          sellerInn: contractData.sellerInn || '',
          sellerOgrn: contractData.sellerOgrn || '',
          sellerBankName: contractData.sellerBankName || '',
          sellerBankAddress: contractData.sellerBankAddress || '',
          sellerBankAccount: contractData.sellerBankAccount || '',
          sellerBankSwift: contractData.sellerBankSwift || '',
          sellerCorrespondentBank: contractData.sellerCorrespondentBank || '',
          sellerCorrespondentBankAccount: contractData.sellerCorrespondentBankAccount || '',
          sellerCorrespondentBankSwift: contractData.sellerCorrespondentBankSwift || '',
          buyerInn: contractData.buyerInn || '',
          buyerOgrn: contractData.buyerOgrn || '',
          buyerBankName: contractData.buyerBankName || '',
          buyerBankAddress: contractData.buyerBankAddress || '',
          buyerBankAccount: contractData.buyerBankAccount || '',
          buyerBankSwift: contractData.buyerBankSwift || '',
          buyerCorrespondentBank: contractData.buyerCorrespondentBank || '',
          buyerCorrespondentBankAccount: contractData.buyerCorrespondentBankAccount || '',
          buyerCorrespondentBankSwift: contractData.buyerCorrespondentBankSwift || '',
          shipperInn: contractData.shipperInn || '',
          shipperOgrn: contractData.shipperOgrn || '',
          shipperBankName: contractData.shipperBankName || '',
          shipperBankAddress: contractData.shipperBankAddress || '',
          shipperBankAccount: contractData.shipperBankAccount || '',
          shipperBankSwift: contractData.shipperBankSwift || '',
          consigneeInn: contractData.consigneeInn || '',
          consigneeOgrn: contractData.consigneeOgrn || '',
          consigneeBankName: contractData.consigneeBankName || '',
          consigneeBankAddress: contractData.consigneeBankAddress || '',
          consigneeBankAccount: contractData.consigneeBankAccount || '',
          consigneeBankSwift: contractData.consigneeBankSwift || '',
          deliveryTerms: contractData.deliveryTerms || '',
          paymentMethod: contractData.paymentMethod || '',
          gln: contractData.gln || '',
          supplierDirector: contractData.supplierDirector || '',
          goodsReleasedBy: contractData.goodsReleasedBy || '',
        });
        setEditingContract(contract);
        setShowContractForm(true);
      })
      .catch(error => {
        console.error('Error loading contract:', error);
        alert('Shartnoma ma\'lumotlarini yuklashda xatolik yuz berdi');
      });
  };

  const handleDeleteContract = async (contractId: number) => {
    if (!confirm('Bu shartnomani o\'chirishni xohlaysizmi?')) return;
    
    try {
      await apiClient.delete(`/contracts/${contractId}`);
      alert('Shartnoma muvaffaqiyatli o\'chirildi');
      await loadContracts();
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      alert(error.response?.data?.error || 'Shartnoma o\'chirishda xatolik yuz berdi');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>;
  }

  if (!client) {
    return <div className="text-center py-8 text-gray-500">Client topilmadi</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/clients')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Orqaga
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Telefon</div>
            <div className="font-medium">{client.phone || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Kelishuv summasi (bitta task)</div>
            <div className="font-medium">${Number(client.stats.dealAmount).toFixed(2)}</div>
            {client.stats.totalDealAmount !== undefined && (
              <>
                <div className="text-xs text-gray-400 mt-1">Jami (PSR hisobga olingan)</div>
                <div className="font-medium text-blue-600">${Number(client.stats.totalDealAmount).toFixed(2)}</div>
                {client.stats.tasksWithPsr !== undefined && client.stats.tasksWithPsr > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    (+${(client.stats.tasksWithPsr * 10).toFixed(2)} PSR uchun)
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">Jami tushgan</div>
            <div className="font-medium">${Number(client.stats.totalIncome).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Balans</div>
            <div
              className={`font-medium ${
                Number(client.stats.balance) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${Number(client.stats.balance).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Section - Shartnomalar bo'limi */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-t-4 border-green-500">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Shartnomalar ({contracts.length})</h2>
          <button
            type="button"
            onClick={() => {
              setEditingContract(null);
              setContractForm({
                contractNumber: '',
                contractDate: new Date().toISOString().split('T')[0],
                sellerDetails: '',
                buyerDetails: '',
                shipperDetails: '',
                consigneeDetails: '',
                sellerName: '',
                sellerLegalAddress: '',
                sellerInn: '',
                sellerOgrn: '',
                sellerBankName: '',
                sellerBankAddress: '',
                sellerBankAccount: '',
                sellerBankSwift: '',
                sellerCorrespondentBank: '',
                sellerCorrespondentBankAccount: '',
                sellerCorrespondentBankSwift: '',
                buyerName: '',
                buyerAddress: '',
                buyerInn: '',
                buyerOgrn: '',
                buyerBankName: '',
                buyerBankAddress: '',
                buyerBankAccount: '',
                buyerBankSwift: '',
                buyerCorrespondentBank: '',
                buyerCorrespondentBankAccount: '',
                buyerCorrespondentBankSwift: '',
                shipperName: '',
                shipperAddress: '',
                shipperInn: '',
                shipperOgrn: '',
                shipperBankName: '',
                shipperBankAddress: '',
                shipperBankAccount: '',
                shipperBankSwift: '',
                consigneeName: '',
                consigneeAddress: '',
                consigneeInn: '',
                consigneeOgrn: '',
                consigneeBankName: '',
                consigneeBankAddress: '',
                consigneeBankAccount: '',
                consigneeBankSwift: '',
                deliveryTerms: '',
                paymentMethod: '',
                gln: '',
              });
              setShowContractForm(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md"
          >
            + Yangi shartnoma
          </button>
        </div>
        {loadingContracts ? (
          <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Shartnomalar yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shartnoma raqami</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sotuvchi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sotib oluvchi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.contractNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(contract.contractDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{contract.sellerName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{contract.buyerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditContract(contract)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats by Branch */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filial bo'yicha statistika</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(client.stats.tasksByBranch).map(([branch, count]) => (
            <div key={branch} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{count}</div>
              <div className="text-sm text-gray-500">{branch}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Buyurtmalar ({client.tasks.length})</h2>
        {client.tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Buyurtmalar yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'TAYYOR'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'JARAYONDA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {task.status === 'TAYYOR'
                          ? 'Completed'
                          : task.status === 'JARAYONDA'
                          ? 'In Progress'
                          : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/invoices/task/${task.id}`)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">To'lovlar ({client.transactions.length})</h2>
        {client.transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">To'lovlar yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Summa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Comment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${Number(t.amount).toFixed(2)} {t.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Form Modal */}
      {showContractForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] backdrop-blur-sm overflow-y-auto py-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowContractForm(false);
              setEditingContract(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingContract ? 'Shartnoma tahrirlash' : 'Yangi shartnoma'}
              </h3>
              <button
                onClick={() => {
                  setShowContractForm(false);
                  setEditingContract(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleContractSubmit} className="space-y-6">
              {/* Shartnoma asosiy ma'lumotlari */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-gray-700 mb-3">Shartnoma ma'lumotlari</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shartnoma raqami *</label>
                    <input
                      type="text"
                      value={contractForm.contractNumber}
                      onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shartnoma sanasi *</label>
                    <input
                      type="date"
                      value={contractForm.contractDate}
                      onChange={(e) => setContractForm({ ...contractForm, contractDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sotuvchi ma'lumotlari */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-gray-700 mb-3">Sotuvchi ma'lumotlari *</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                    <input
                      type="text"
                      value={contractForm.sellerName}
                      onChange={(e) => setContractForm({ ...contractForm, sellerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yuridik manzil *</label>
                    <textarea
                      value={contractForm.sellerLegalAddress}
                      onChange={(e) => setContractForm({ ...contractForm, sellerLegalAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qolgan rekvizitlar</label>
                    <textarea
                      value={contractForm.sellerDetails}
                      onChange={(e) => setContractForm({ ...contractForm, sellerDetails: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y min-h-[120px]"
                      rows={8}
                      style={{ minHeight: '120px' }}
                      placeholder="INN: 123456789&#10;OGRN: 1234567890123&#10;Bank: Bank nomi&#10;Bank manzili: Manzil&#10;Hisob: 12345678901234567890&#10;SWIFT: ABCDUS33&#10;Kor. bank: Korrespondent bank nomi&#10;Kor. hisob: 12345678901234567890&#10;Kor. SWIFT: ABCDUS33"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Har bir qatorga alohida ma'lumot kiriting. Format: "Maydon nomi: Qiymat" (masalan: "INN: 123456789")
                    </p>
                  </div>
                </div>
              </div>

              {/* Sotib oluvchi ma'lumotlari */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-gray-700 mb-3">Sotib oluvchi ma'lumotlari *</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                    <input
                      type="text"
                      value={contractForm.buyerName}
                      onChange={(e) => setContractForm({ ...contractForm, buyerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzil *</label>
                    <textarea
                      value={contractForm.buyerAddress}
                      onChange={(e) => setContractForm({ ...contractForm, buyerAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qolgan rekvizitlar</label>
                    <textarea
                      value={contractForm.buyerDetails}
                      onChange={(e) => setContractForm({ ...contractForm, buyerDetails: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y min-h-[120px]"
                      rows={8}
                      style={{ minHeight: '120px' }}
                      placeholder="INN: 123456789&#10;OGRN: 1234567890123&#10;Bank: Bank nomi&#10;Bank manzili: Manzil&#10;Hisob: 12345678901234567890&#10;SWIFT: ABCDUS33&#10;Kor. bank: Korrespondent bank nomi&#10;Kor. hisob: 12345678901234567890&#10;Kor. SWIFT: ABCDUS33"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Har bir qatorga alohida ma'lumot kiriting. Format: "Maydon nomi: Qiymat" (masalan: "INN: 123456789")
                    </p>
                  </div>
                </div>
              </div>

              {/* Yuk jo'natuvchi ma'lumotlari (ixtiyoriy) */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-gray-700 mb-3">Yuk jo'natuvchi ma'lumotlari (ixtiyoriy)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
                    <input
                      type="text"
                      value={contractForm.shipperName}
                      onChange={(e) => setContractForm({ ...contractForm, shipperName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                    <textarea
                      value={contractForm.shipperAddress}
                      onChange={(e) => setContractForm({ ...contractForm, shipperAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qolgan rekvizitlar</label>
                    <textarea
                      value={contractForm.shipperDetails}
                      onChange={(e) => setContractForm({ ...contractForm, shipperDetails: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y min-h-[100px]"
                      rows={6}
                      style={{ minHeight: '100px' }}
                      placeholder="INN: 123456789&#10;OGRN: 1234567890123&#10;Bank: Bank nomi&#10;Bank manzili: Manzil&#10;Hisob: 12345678901234567890&#10;SWIFT: ABCDUS33"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Har bir qatorga alohida ma'lumot kiriting. Format: "Maydon nomi: Qiymat"
                    </p>
                  </div>
                </div>
              </div>

              {/* Yuk qabul qiluvchi ma'lumotlari (ixtiyoriy) */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-gray-700 mb-3">Yuk qabul qiluvchi ma'lumotlari (ixtiyoriy)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
                    <input
                      type="text"
                      value={contractForm.consigneeName}
                      onChange={(e) => setContractForm({ ...contractForm, consigneeName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                    <textarea
                      value={contractForm.consigneeAddress}
                      onChange={(e) => setContractForm({ ...contractForm, consigneeAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qolgan rekvizitlar</label>
                    <textarea
                      value={contractForm.consigneeDetails}
                      onChange={(e) => setContractForm({ ...contractForm, consigneeDetails: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y min-h-[100px]"
                      rows={6}
                      style={{ minHeight: '100px' }}
                      placeholder="INN: 123456789&#10;OGRN: 1234567890123&#10;Bank: Bank nomi&#10;Bank manzili: Manzil&#10;Hisob: 12345678901234567890&#10;SWIFT: ABCDUS33"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Har bir qatorga alohida ma'lumot kiriting. Format: "Maydon nomi: Qiymat"
                    </p>
                  </div>
                </div>
              </div>

              {/* Qo'shimcha ma'lumotlar */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Qo'shimcha ma'lumotlar</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yetkazib berish sharti</label>
                    <input
                      type="text"
                      value={contractForm.deliveryTerms}
                      onChange={(e) => setContractForm({ ...contractForm, deliveryTerms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="DAP - г. Москва"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
                    <input
                      type="text"
                      value={contractForm.paymentMethod}
                      onChange={(e) => setContractForm({ ...contractForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Глобальный идентификационный номер GS1 (GLN)
                    </label>
                    <input
                      type="text"
                      value={contractForm.gln}
                      onChange={(e) => setContractForm({ ...contractForm, gln: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="GLN raqami"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Руководитель Поставщика
                    </label>
                    <input
                      type="text"
                      value={contractForm.supplierDirector}
                      onChange={(e) => setContractForm({ ...contractForm, supplierDirector: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="ФИО руководителя"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Товар отпустил
                    </label>
                    <input
                      type="text"
                      value={contractForm.goodsReleasedBy}
                      onChange={(e) => setContractForm({ ...contractForm, goodsReleasedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="ФИО лица, отпустившего товар"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingContract ? 'Yangilash' : 'Yaratish'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowContractForm(false);
                    setEditingContract(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;

