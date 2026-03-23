import apiClient from '../../../lib/api';
import axios from 'axios';
import type { InvoiceItem, SpecRow } from '../types';
import { normalizeItem } from '../invoiceUtils';
import { getVisibleColumnsFromPayload } from '../types';

interface UseInvoiceLoaderParams {
  clientId: string | undefined;
  contractIdFromQuery: string | null | undefined;
  taskId: string | undefined;
  duplicateInvoiceId: number | null | undefined;
  setLoading: (l: boolean) => void;
  setContracts: (c: any[]) => void;
  setSelectedContractId: (id: string) => void;
  setSelectedContractSpec: (spec: SpecRow[]) => void;
  setSelectedContractCurrency: (c: string) => void;
  setForm: (updater: (prev: any) => any) => void;
  setInvoice: (inv: any) => void;
  setTask: (t: any) => void;
  setItems: (items: InvoiceItem[]) => void;
  setCustomFields: (fields: { id: string; label: string; value: string }[]) => void;
  setSpecCustomFields: (fields: { id: string; label: string; value: string }[]) => void;
  setVisibleColumns: (updater: any) => void;
  setColumnLabels: (updater: any) => void;
  setAdditionalInfoVisible: (vis: Record<string, boolean>) => void;
  setContractDeliveryTerms: (terms: string[]) => void;
  setDeliveryTermsOptions: (terms: string[]) => void;
  initialForChangeLogRef: React.MutableRefObject<{ form: Record<string, unknown>; items: InvoiceItem[] } | null>;
  handleContractSelect: (contractId: string) => Promise<void>;
  mergeDeliveryTerms: (contractTerms: string[], stored: string[]) => string[];
  loadDeliveryTerms: (key: string) => string[];
}

export function createLoadData({
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
}: UseInvoiceLoaderParams) {

  const loadData = async (isCancelled: () => boolean = () => false) => {
    try {
      setLoading(true);

      // Agar clientId va contractId bo'lsa, yangi invoice yaratish
      if (clientId && contractIdFromQuery) {
        try {
          const contractsResponse = await apiClient.get(`/contracts/client/${clientId}`);
          if (isCancelled()) return;
          setContracts(contractsResponse.data);
        } catch (error) {
          console.error('Error loading contracts:', error);
        }

        setSelectedContractId(contractIdFromQuery);

        try {
          const contractResponse = await apiClient.get(`/contracts/${contractIdFromQuery}`);
          if (isCancelled()) return;
          const contract = contractResponse.data;

          setForm((prev: any) => ({
            ...prev,
            contractNumber: contract.contractNumber,
            paymentTerms: contract.deliveryTerms || prev.paymentTerms,
            date: new Date().toISOString().split('T')[0],
            gln: contract.gln != null ? contract.gln : prev.gln,
          }));

          handleContractSelect(contractIdFromQuery);

          // Dublikat rejimida
          if (duplicateInvoiceId) {
            try {
              let nextInvoiceNumber: string | undefined;
              try {
                const nextRes = await apiClient.get(`/invoices/next-number?contractId=${contractIdFromQuery}`);
                nextInvoiceNumber = (nextRes.data as { nextNumber?: string })?.nextNumber;
              } catch {
                // next-number olinmasa bo'sh qoladi
              }
              const dupRes = await apiClient.get(`/invoices/${duplicateInvoiceId}`);
              if (isCancelled()) return;
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
                setForm((prev: any) => ({ ...prev, contractNumber: dup.contractNumber!.trim() }));
              }
              const dupAi = dup.additionalInfo && typeof dup.additionalInfo === 'object' ? dup.additionalInfo : null;
              const dupVisible = getVisibleColumnsFromPayload(dupAi ?? undefined);
              if (dupVisible) setVisibleColumns(dupVisible);
              if (dupAi?.columnLabels && typeof dupAi.columnLabels === 'object') {
                setColumnLabels((prev: any) => ({ ...prev, ...(dupAi.columnLabels as Record<string, string>) }));
              }
              if (dupAi?.visibleAdditionalInfoFields && typeof dupAi.visibleAdditionalInfoFields === 'object') {
                setAdditionalInfoVisible(dupAi.visibleAdditionalInfoFields as Record<string, boolean>);
              }
              const todayIso = new Date().toISOString().split('T')[0];
              setForm((prev: any) => ({
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
                shipmentPlace: String(dupAi?.shipmentPlace || ''),
                customsAddress: '',
                destination: String(dupAi?.destination || ''),
                origin: 'Республика Узбекистан',
                manufacturer: String(dupAi?.manufacturer || ''),
                orderNumber: '',
                gln: prev.gln,
                harvestYear: String(dupAi?.harvestYear || ''),
                documents: '',
                carrier: '',
                tirNumber: '',
              }));
              setItems([{ name: '', unit: 'кг', quantity: 0, packagesCount: undefined, unitPrice: 0, totalPrice: 0 }] as InvoiceItem[]);
              setCustomFields([]);
              const dupSpecFields = dupAi?.specCustomFields;
              setSpecCustomFields(
                Array.isArray(dupSpecFields)
                  ? dupSpecFields.map((f: { id?: string; label?: string; value?: string }) => ({
                    id: String(f?.id ?? ''),
                    label: String(f?.label ?? ''),
                    value: String(f?.value ?? ''),
                  }))
                  : []
              );
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
        const taskResponse = await apiClient.get(`/tasks/${taskId}`);
        if (isCancelled()) return;
        setTask(taskResponse.data);

        try {
          const contractsResponse = await apiClient.get(`/contracts/client/${taskResponse.data.clientId}`);
          if (isCancelled()) return;
          setContracts(contractsResponse.data);

          if (contractIdFromQuery) {
            setSelectedContractId(contractIdFromQuery);
            try {
              const contractResponse = await apiClient.get(`/contracts/${contractIdFromQuery}`);
              const contract = contractResponse.data;
              setForm((prev: any) => ({
                ...prev,
                contractNumber: contract.contractNumber,
                paymentTerms: contract.deliveryTerms || prev.paymentTerms,
                gln: contract.gln != null ? contract.gln : prev.gln,
              }));
            } catch (error) {
              console.error('Error loading contract:', error);
            }
          }
        } catch (error) {
          console.error('Error loading contracts:', error);
        }

        // Invoice ma'lumotlarini olish
        try {
          const invoiceResponse = await apiClient.get(`/invoices/task/${taskId}`);
          if (isCancelled()) return;
          const inv = invoiceResponse.data;

          if (!inv) {
            setInvoice(null);
            if (taskResponse.data?.client?.contractNumber) {
              setForm((prev: any) => ({
                ...prev,
                contractNumber: taskResponse.data.client.contractNumber,
              }));
            }
            if (contractIdFromQuery) {
              handleContractSelect(contractIdFromQuery);
            }
          } else {
            setInvoice(inv);
            setForm((prev: any) => ({
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
              fssRegionInternalCode: inv.additionalInfo?.fssRegionInternalCode ?? prev.fssRegionInternalCode,
              fssRegionName: inv.additionalInfo?.fssRegionName ?? prev.fssRegionName,
              fssRegionExternalCode: inv.additionalInfo?.fssRegionExternalCode ?? prev.fssRegionExternalCode,
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
              setColumnLabels((prev: any) => ({ ...prev, ...(ai.columnLabels as Record<string, string>) }));
            }
            if (ai?.visibleAdditionalInfoFields && typeof ai.visibleAdditionalInfoFields === 'object') {
              setAdditionalInfoVisible(ai.visibleAdditionalInfoFields as Record<string, boolean>);
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
                if (isCancelled()) return;
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
                setForm((prev: any) => ({
                  ...prev,
                  contractNumber: contract.contractNumber,
                  gln: prev.gln ? prev.gln : (contract.gln ?? prev.gln),
                }));
                const deliveryTermsList = String(contract.deliveryTerms || '')
                  .split('\n')
                  .map((item: string) => item.trim())
                  .filter(Boolean);
                setContractDeliveryTerms(deliveryTermsList);
                const deliveryTermsKey = inv.contractId.toString();
                const merged = mergeDeliveryTerms(deliveryTermsList, loadDeliveryTerms(deliveryTermsKey));
                setDeliveryTermsOptions(merged);
              } catch (error) {
                console.error('Error loading contract:', error);
              }
            }
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            setInvoice(null);
            if (taskResponse.data?.client?.contractNumber) {
              setForm((prev: any) => ({
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

  return loadData;
}
