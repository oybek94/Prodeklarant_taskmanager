import { useCallback } from 'react';
import axios from 'axios';
import apiClient from '../../../lib/api';
import type { InvoiceItem, Task, ChangeLogEntry } from '../types';
import { normalizeItem, buildTaskTitle } from '../invoiceUtils';

/* ─── constants ──────────────────────────────────────────────────── */

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

function formatChangeLogDateTime(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${h}:${min}`;
}

/* ─── hook ───────────────────────────────────────────────────────── */

interface UseInvoiceSaveParams {
  form: any;
  setForm: (updater: (prev: any) => any) => void;
  items: InvoiceItem[];
  setItems: (updater: InvoiceItem[] | ((prev: InvoiceItem[]) => InvoiceItem[])) => void;
  invoice: any;
  setInvoice: (inv: any) => void;
  task: Task | null;
  setTask: (t: Task | null) => void;
  taskId: string | undefined;
  clientId: string | undefined;
  selectedContractId: string;
  setSelectedContractId: (id: string) => void;
  customFields: { id: string; label: string; value: string }[];
  specCustomFields: { id: string; label: string; value: string }[];
  additionalInfoVisible: Record<string, boolean>;
  visibleColumns: Record<string, boolean>;
  columnLabels: Record<string, string>;
  packagingTypes: { name: string; code?: string }[];
  canEditEffective: boolean;
  invoiceNumberWarning: string | null;
  setInvoiceNumberWarning: (w: string) => void;
  additionalInfoError: string | null;
  setAdditionalInfoError: (e: string | null) => void;
  setShowAdditionalInfoModal: (show: boolean) => void;
  saving: boolean;
  setSaving: (s: boolean) => void;
  setMarkSnapshotAfterSave: (m: boolean) => void;
  initialForChangeLogRef: React.MutableRefObject<{ form: Record<string, unknown>; items: InvoiceItem[] } | null>;
  navigate: (to: any, options?: any) => void;
  newInvoiceTaskForm?: { branchId: string; hasPsr: boolean; driverPhone?: string; comments?: string; contractNumber?: string } | null;
}

export function useInvoiceSave({
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
  saving: _saving,
  setSaving,
  setMarkSnapshotAfterSave,
  initialForChangeLogRef,
  navigate,
  newInvoiceTaskForm,
}: UseInvoiceSaveParams) {

  const buildChangeLog = useCallback((): ChangeLogEntry[] => {
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
    const maxRows = Math.max(initial.items.length, items.length);
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      const oldRow = initial.items[rowIdx];
      const newRow = items[rowIdx];
      const rowNum = rowIdx + 1;
      if (!oldRow && newRow) {
        entries.push({ fieldLabel: `Tovar ${rowNum}`, oldValue: '—', newValue: 'Qo\'shilgan', changedAt });
        continue;
      }
      if (oldRow && !newRow) {
        entries.push({ fieldLabel: `Tovar ${rowNum}`, oldValue: 'O\'chirilgan', newValue: '—', changedAt });
        continue;
      }
      if (!oldRow || !newRow) continue;
      for (const [key, label] of Object.entries(ITEM_FIELD_LABELS)) {
        const oldV = oldRow[key as keyof InvoiceItem];
        const newV = newRow[key as keyof InvoiceItem];
        const oldStr = oldV != null ? String(oldV) : '';
        const newStr = newV != null ? String(newV) : '';
        if (oldStr !== newStr) {
          entries.push({ fieldLabel: `Tovar ${rowNum} — ${label}`, oldValue: oldStr || '—', newValue: newStr || '—', changedAt });
        }
      }
    }
    return entries;
  }, [form, items, initialForChangeLogRef]);

  const handleSubmit = useCallback(async (e?: React.FormEvent, overrideForm?: typeof form, silent: boolean = false) => {
    if (e) e.preventDefault();
    if (!canEditEffective) return;

    const currentForm = overrideForm || form;
    if (!currentForm.deliveryTerms.trim() || !currentForm.vehicleNumber.trim()) {
      setAdditionalInfoError('Iltimos, "Условия поставки" va "Номер avtotransport" maydonlarini to\'ldiring');
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
        const taskTitle = `Invoice - ${newInvoiceTaskForm.contractNumber || currentForm.contractNumber || 'yangi'}`;
        const taskResponse = await apiClient.post('/tasks', {
          clientId: Number(clientId),
          branchId: Number(newInvoiceTaskForm.branchId),
          title: taskTitle,
          comments: newInvoiceTaskForm.comments || `Invoice yaratish. Shartnoma: ${currentForm.contractNumber}`,
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

      const normalizedItems = items.map((item, index) => {
        const normalized = normalizeItem(item);
        const qty = normalized.quantity != null ? Number(normalized.quantity) : 0;
        const pkgCount = normalized.packagesCount != null ? Number(normalized.packagesCount) : undefined;
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
        invoiceNumber: currentForm.invoiceNumber && currentForm.invoiceNumber.trim() !== '' ? currentForm.invoiceNumber.trim() : undefined,
        date: currentForm.date,
        currency: currentForm.currency,
        contractNumber: currentForm.contractNumber,
        contractId: selectedContractId ? Number(selectedContractId) : undefined,
        items: normalizedItems,
        totalAmount: normalizedItems.reduce((sum: number, item: { totalPrice: number }) => sum + item.totalPrice, 0),
        notes: currentForm.notes,
        additionalInfo: (() => {
          const base: Record<string, unknown> = {
            paymentTerms: currentForm.paymentTerms,
            dueDate: currentForm.dueDate,
            poNumber: currentForm.poNumber,
            terms: currentForm.terms,
            tax: currentForm.tax,
            discount: currentForm.discount,
            shipping: currentForm.shipping,
            amountPaid: currentForm.amountPaid,
            paymentMethod: currentForm.additionalInfo?.paymentMethod,
            deliveryTerms: currentForm.deliveryTerms,
            vehicleNumber: currentForm.vehicleNumber,
            fssRegionInternalCode: currentForm.fssRegionInternalCode,
            fssRegionName: currentForm.fssRegionName,
            fssRegionExternalCode: currentForm.fssRegionExternalCode,
            packagingTypeCodes: packagingTypes.map((entry) => ({
              name: entry.name,
              code: entry.code || '',
            })),
            loaderWeight: currentForm.loaderWeight,
            trailerWeight: currentForm.trailerWeight,
            palletWeight: currentForm.palletWeight,
            trailerNumber: currentForm.trailerNumber,
            smrNumber: currentForm.smrNumber,
            shipmentPlace: currentForm.shipmentPlace,
            customsAddress: currentForm.customsAddress ?? undefined,
            destination: currentForm.destination,
            origin: currentForm.origin || 'Республика Узбекистан',
            manufacturer: currentForm.manufacturer,
            orderNumber: currentForm.orderNumber,
            gln: currentForm.gln,
            harvestYear: currentForm.harvestYear,
            documents: currentForm.documents,
            carrier: currentForm.carrier,
            tirNumber: currentForm.tirNumber,
            customFields: customFields,
            specCustomFields: specCustomFields,
            visibleColumns,
            columnLabels,
            visibleAdditionalInfoFields: additionalInfoVisible,
          };
          if (invoice) {
            const taskErrorsCount = ((invoice as unknown as Record<string, unknown>).task as { _count?: { errors?: number } } | undefined)?._count?.errors ?? 0;
            const onlyLogAfterError = taskErrorsCount > 0;
            const newEntries = onlyLogAfterError ? buildChangeLog() : [];
            const ai = invoice.additionalInfo && typeof invoice.additionalInfo === 'object' ? invoice.additionalInfo as Record<string, unknown> : null;
            const existingLog = (ai && Array.isArray(ai.changeLog)) ? ai.changeLog : [];
            if (newEntries.length > 0) {
              base.changeLog = [...existingLog, ...newEntries];
            } else if (existingLog.length > 0) {
              base.changeLog = existingLog;
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
        savedInvoice?.invoiceNumber || currentForm.invoiceNumber,
        currentForm.vehicleNumber
      );
      if (currentTaskId && nextTaskTitle && currentTask?.title !== nextTaskTitle) {
        try {
          await apiClient.patch(`/tasks/${currentTaskId}`, { title: nextTaskTitle });
        } catch (error) {
          console.error('Error updating task title:', error);
          alert(axios.isAxiosError(error) && error.response?.data?.error ? error.response.data.error : 'Task nomini yangilashda xatolik yuz berdi');
        }
      }

      setMarkSnapshotAfterSave(true);
      if (!silent) {
        alert(invoice ? 'Invoice muvaffaqiyatli yangilandi' : 'Invoice muvaffaqiyatli yaratildi');
      }

      // Yangi task yaratilgan bo'lsa, URL ni /invoices/task/:taskId ga o'zgartirish
      if (!taskId && currentTaskId) {
        navigate(`/invoices/task/${currentTaskId}${selectedContractId ? `?contractId=${selectedContractId}` : ''}`, { replace: true });
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      const errMsg = (axios.isAxiosError(error) && error.response?.data?.error) ? error.response.data.error : 'Invoice saqlashda xatolik yuz berdi';
      if (typeof errMsg === 'string' && errMsg.includes('invoice raqami allaqachon mavjud')) {
        setInvoiceNumberWarning('Bu raqam allaqachon mavjud. Ozgartirish kerak');
      }
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  }, [form, items, invoice, task, taskId, clientId, selectedContractId, canEditEffective, invoiceNumberWarning, additionalInfoError, customFields, specCustomFields, additionalInfoVisible, visibleColumns, columnLabels, packagingTypes, newInvoiceTaskForm, buildChangeLog, setForm, setItems, setInvoice, setTask, setSelectedContractId, setAdditionalInfoError, setShowAdditionalInfoModal, setSaving, setMarkSnapshotAfterSave, setInvoiceNumberWarning, navigate]);

  return { handleSubmit, buildChangeLog };
}
