import { useCallback } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { useFileHelpers } from './useFileHelpers';
import { getClientCurrency, formatMoney } from './taskHelpers';
import type { TaskStage, TaskDetail } from './types';
import type { TaskModalsReturn } from './useTaskModals';

interface UseTaskActionsParams {
  modals: TaskModalsReturn;
  selectedTask: TaskDetail | null;
  setSelectedTask: (task: TaskDetail | null) => void;
  showArchive: boolean;
  filters: { status: string; clientId: string; branchId: string };
  loadTaskDetail: (taskId: number, callbacks?: { onLoaded?: (data: TaskDetail) => void }) => Promise<void>;
  loadTaskDocuments: (taskId: number) => Promise<void>;
  loadTasks: (showArchive: boolean, filters: any) => Promise<void>;
  user: { id: number; name: string; role: string; branchId?: number | null } | null;
  branches: { id: number; name: string }[];
  isMobile: boolean;
  isNewTaskRoute: boolean;
  isArchiveRoute: boolean;
  editTaskId: number | null;
  navigate: (path: string) => void;
}

/**
 * useTaskActions — Tasks sahifasidagi barcha amallarni (handler) boshqaradi.
 *
 * Stage update, BXM confirm, file upload, document upload,
 * email send, task create/edit/delete, sticker download, va boshqalar.
 */
export function useTaskActions(params: UseTaskActionsParams) {
  const {
    modals, selectedTask, setSelectedTask,
    showArchive, filters,
    loadTaskDetail, loadTaskDocuments, loadTasks,
    user, branches, isMobile, isNewTaskRoute, isArchiveRoute, editTaskId, navigate,
  } = params;

  const { downloadFile, downloadBlob, getPreviewBlobUrl } = useFileHelpers();

  // ==================================================================
  // Stage Handlerlari
  // ==================================================================

  const updateStageToReady = useCallback(async (
    stage: TaskStage,
    customsPaymentMultiplier?: number,
    skipValidation?: boolean,
    afterHoursDeclarationValue?: boolean,
  ) => {
    if (!stage || !selectedTask) return;

    try {
      modals.setUpdatingStage(stage.id);
      const response = await apiClient.patch(`/tasks/${selectedTask.id}/stages/${stage.id}`, {
        status: 'TAYYOR',
        ...(customsPaymentMultiplier && { customsPaymentMultiplier }),
        ...(afterHoursDeclarationValue !== undefined && { afterHoursDeclaration: afterHoursDeclarationValue }),
        ...((customsPaymentMultiplier || afterHoursDeclarationValue) && { afterHoursPayer: selectedTask.afterHoursPayer || 'CLIENT' }),
        ...(skipValidation && { skipValidation: true }),
      });

      if (response.status >= 400) {
        toast.error(response.data?.error || 'Xatolik yuz berdi');
        modals.setUpdatingStage(null);
        return;
      }

      await loadTaskDetail(selectedTask.id);
      await loadTasks(showArchive, filters as any);
      modals.setShowBXMModal(false);
      modals.setAfterHoursDeclaration(false);
      modals.resetFileUpload();
      modals.setSelectedStageForReminder(null);
    } catch (error: any) {
      console.error('Error updating stage:', error);
      if (error.response) {
        toast.error(error.response.data?.error || error.message || 'Xatolik yuz berdi');
      } else if (error.request) {
        toast.error('Serverga javob kelmadi. Iltimos, qayta urinib ko\'ring.');
      } else {
        toast.error(error.message || 'Xatolik yuz berdi');
      }
    } finally {
      modals.setUpdatingStage(null);
    }
  }, [selectedTask, showArchive, filters, loadTaskDetail, loadTasks, modals]);

  const handleStageClick = useCallback(async (stage: TaskStage) => {
    if (!user) {
      toast.error('Login qiling');
      return;
    }
    if (stage.status === 'BOSHLANMAGAN') {
      modals.setSelectedStageForReminder(stage);
      if (stage.name === 'Pochta') {
        await updateStageToReady(stage);
      } else if (stage.name === 'Deklaratsiya') {
        try {
          const bxmResponse = await apiClient.get('/bxm/current');
          modals.setCurrentBxmUsd(Number(bxmResponse.data.amountUsd ?? bxmResponse.data.amount ?? 34.4));
          modals.setCurrentBxmUzs(Number(bxmResponse.data.amountUzs ?? 412000));
          modals.setBxmMultiplier('1.5');
          modals.setAfterHoursDeclaration(false);
          modals.setShowBXMModal(true);
        } catch {
          modals.setCurrentBxmUsd(34.4);
          modals.setCurrentBxmUzs(412000);
          modals.setBxmMultiplier('1.5');
          modals.setAfterHoursDeclaration(false);
          modals.setShowBXMModal(true);
        }
      } else {
        await updateStageToReady(stage);
      }
    } else {
      handleStageToggle(stage.id, stage.status);
    }
  }, [user, modals, updateStageToReady]);

  const handleStageToggle = useCallback(async (stageId: number, currentStatus: string) => {
    if (!selectedTask || !user) {
      toast.error('Login qiling');
      return;
    }
    try {
      modals.setUpdatingStage(stageId);
      const newStatus = currentStatus === 'BOSHLANMAGAN' ? 'TAYYOR' : 'BOSHLANMAGAN';
      const response = await apiClient.patch(`/tasks/${selectedTask.id}/stages/${stageId}`, {
        status: newStatus,
      });

      if (response.status >= 400) {
        toast.error(response.data?.error || 'Xatolik yuz berdi');
        modals.setUpdatingStage(null);
        return;
      }

      await loadTaskDetail(selectedTask.id);
      await loadTasks(showArchive, filters as any);
    } catch (error: any) {
      console.error('Error updating stage:', error);
      if (error.response) {
        toast.error(error.response.data?.error || error.message || 'Xatolik yuz berdi');
      } else if (error.request) {
        toast.error('Serverga javob kelmadi. Iltimos, qayta urinib ko\'ring.');
      } else {
        toast.error(error.message || 'Xatolik yuz berdi');
      }
    } finally {
      modals.setUpdatingStage(null);
    }
  }, [selectedTask, user, showArchive, filters, loadTaskDetail, loadTasks, modals]);

  // ==================================================================
  // BXM Handlerlari
  // ==================================================================

  const handleBXMEdit = useCallback(async (stage: TaskStage) => {
    try {
      const bxmResponse = await apiClient.get('/bxm/current');
      modals.setCurrentBxmUsd(Number(bxmResponse.data.amountUsd ?? bxmResponse.data.amount ?? 34.4));
      modals.setCurrentBxmUzs(Number(bxmResponse.data.amountUzs ?? 412000));
    } catch {
      modals.setCurrentBxmUsd(34.4);
      modals.setCurrentBxmUzs(412000);
    }
    const current = selectedTask?.customsPaymentMultiplier;
    modals.setBxmMultiplier(current != null ? String(current) : '1.5');
    modals.setAfterHoursDeclaration(Boolean(selectedTask?.afterHoursDeclaration));
    modals.setSelectedStageForReminder(stage);
    modals.setShowBXMModal(true);
  }, [selectedTask, modals]);

  const handleBXMConfirm = useCallback(async () => {
    const multiplier = parseFloat(modals.bxmMultiplier);
    if (isNaN(multiplier) || multiplier < 0.5 || multiplier > 4) {
      toast.error('Multiplier 0.5 dan 4 gacha bo\'lishi kerak');
      return;
    }

    if (multiplier > 1 && selectedTask) {
      try {
        const clientCurrency = getClientCurrency(selectedTask.client);
        let additionalPayment: number;
        let formattedAdditional: string;

        if (clientCurrency === 'USD') {
          additionalPayment = (multiplier - 1) * modals.currentBxmUsd;
          formattedAdditional = new Intl.NumberFormat('uz-UZ', {
            style: 'currency', currency: 'USD', minimumFractionDigits: 2,
          }).format(additionalPayment).replace(/,/g, ' ');
        } else {
          additionalPayment = (multiplier - 1) * modals.currentBxmUzs;
          formattedAdditional = new Intl.NumberFormat('uz-UZ', {
            style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0,
          }).format(additionalPayment).replace(/,/g, ' ');
        }

        const payerLabel = (selectedTask.afterHoursPayer || 'CLIENT') === 'CLIENT' ? 'mijoz' : 'kompaniya';
        const confirmMessage = `Deklaratsiya to'lovi BXMning 1 barobaridan oshib ketdi.\n\n` +
          `Qo'shimcha to'lov: ${formattedAdditional}\n\n` +
          `Bu summa ${payerLabel} hisobiga yoziladi.\n\n` +
          `Davom etasizmi?`;

        if (!confirm(confirmMessage)) return;
      } catch (err) {
        console.warn('BXM warning error:', err);
        if (!confirm(`BXM ${multiplier} barobari tanlandi. Davom etasizmi?`)) return;
      }
    }

    if (modals.selectedStageForReminder) {
      await updateStageToReady(modals.selectedStageForReminder, multiplier, false, modals.afterHoursDeclaration);
    }
  }, [modals, selectedTask, updateStageToReady]);

  // ==================================================================
  // File / Document Upload Handlerlari
  // ==================================================================

  const handleFileUpload = useCallback(async () => {
    if (!selectedTask || !modals.fileUploadFile || !modals.fileUploadStageName) {
      toast.error('Faylni tanlang');
      return;
    }

    try {
      modals.setUploadingFile(true);
      modals.setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', modals.fileUploadFile);
      formData.append('name', modals.fileUploadName);

      let documentType = 'OTHER';
      if (modals.fileUploadStageName === 'Invoys') {
        documentType = 'INVOICE';
      } else if (modals.fileUploadStageName === 'Sertifikat olib chiqish') {
        documentType = modals.fileUploadName === 'Fito' ? 'FITO' : 'ST';
      } else if (modals.fileUploadStageName === 'ST') {
        documentType = 'ST';
      } else if (modals.fileUploadStageName === 'Fito' || modals.fileUploadStageName === 'FITO') {
        documentType = 'FITO';
      }
      formData.append('documentType', documentType);

      await apiClient.post(`/tasks/${selectedTask.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            modals.setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      modals.resetFileUpload();

      if (modals.selectedStageForReminder) {
        await updateStageToReady(modals.selectedStageForReminder);
      } else {
        await loadTaskDetail(selectedTask.id);
        await loadTaskDocuments(selectedTask.id);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.error || `${modals.fileUploadStageName || 'Fayl'} yuklashda xatolik yuz berdi`);
    } finally {
      modals.setUploadingFile(false);
      modals.setUploadProgress(0);
    }
  }, [selectedTask, modals, updateStageToReady, loadTaskDetail, loadTaskDocuments]);

  const handleDocumentUpload = useCallback(async () => {
    if (!selectedTask || modals.uploadFiles.length === 0) {
      toast.error('Kamida bitta faylni tanlang');
      return;
    }

    try {
      modals.setUploadingFile(true);
      modals.setUploadProgress(0);
      const formData = new FormData();
      modals.uploadFiles.forEach((file) => formData.append('files', file));
      formData.append('names', JSON.stringify(modals.documentNames));
      formData.append('descriptions', JSON.stringify(modals.documentDescriptions));

      await apiClient.post(`/documents/task/${selectedTask.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            modals.setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (modals.selectedStageForReminder?.name === 'Pochta' && modals.selectedStageForReminder.status === 'BOSHLANMAGAN') {
        await updateStageToReady(modals.selectedStageForReminder);
      }

      modals.resetDocumentUpload();
      await loadTaskDocuments(selectedTask.id);
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast.error(error.response?.data?.error || 'Hujjat yuklashda xatolik');
    } finally {
      modals.setUploadingFile(false);
      modals.setUploadProgress(0);
    }
  }, [selectedTask, modals, updateStageToReady, loadTaskDocuments]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    modals.setUploadFiles(prev => [...prev, ...newFiles]);
    modals.setDocumentNames(prev => [...prev, ...newFiles.map(f => f.name)]);
    modals.setDocumentDescriptions(prev => [...prev, ...newFiles.map(() => '')]);
    e.target.value = '';
  }, [modals]);

  // ==================================================================
  // Document Preview / Delete / Download
  // ==================================================================

  const openPreview = useCallback(async (fileUrl: string, fileType: string, fileName: string) => {
    const blobUrl = await getPreviewBlobUrl(fileUrl);
    if (blobUrl) {
      modals.setPreviewDocument({ url: blobUrl, type: fileType, name: fileName });
    } else {
      toast.error('Faylni ko\'rishda xatolik yuz berdi');
    }
  }, [getPreviewBlobUrl, modals]);

  const handleDeleteDocument = useCallback(async (documentId: number) => {
    if (!confirm('Bu hujjatni o\'chirishni xohlaysizmi?')) return;
    try {
      await apiClient.delete(`/documents/${documentId}`);
      if (selectedTask) await loadTaskDocuments(selectedTask.id);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.response?.data?.error || 'Hujjatni o\'chirishda xatolik');
    }
  }, [selectedTask, loadTaskDocuments]);

  const downloadDocument = useCallback(async (fileUrl: string, originalName?: string) => {
    await downloadFile(fileUrl, originalName);
  }, [downloadFile]);

  // ==================================================================
  // Sticker Download
  // ==================================================================

  const downloadStickerPng = useCallback(async (taskId: number) => {
    try {
      const response = await apiClient.get(`/sticker/${taskId}/image`, { responseType: 'blob' });

      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || errorData.message || 'Stiker yuklab olishda xatolik yuz berdi');
      }

      const blobType = response.data.type || 'image/png';
      const blob = new Blob([response.data], { type: blobType.includes('image') ? blobType : 'image/png' });
      downloadBlob(blob, `sticker-${taskId}.png`);
    } catch (error: any) {
      console.error('Error downloading sticker:', error);
      let errorMessage = 'Stiker yuklab olishda xatolik yuz berdi';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  }, [downloadBlob]);

  // ==================================================================
  // After Hours Declaration
  // ==================================================================

  const handleAfterHoursDeclarationChange = useCallback(async (checked: boolean) => {
    if (!selectedTask) return;
    const previous = modals.afterHoursDeclaration;
    modals.setAfterHoursDeclaration(checked);
    try {
      await apiClient.patch(`/tasks/${selectedTask.id}`, { afterHoursDeclaration: checked });
      await loadTaskDetail(selectedTask.id);
      await loadTasks(showArchive, filters as any);
    } catch (error: any) {
      modals.setAfterHoursDeclaration(previous);
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [selectedTask, modals, showArchive, filters, loadTaskDetail, loadTasks]);

  // ==================================================================
  // Task CRUD
  // ==================================================================

  const handleSubmit = useCallback(async (
    e: React.FormEvent,
    form: { title: string; clientId: string; branchId: string; comments: string; hasPsr: boolean; afterHoursPayer: 'CLIENT' | 'COMPANY'; driverPhone: string },
    resetForm: () => void,
  ) => {
    e.preventDefault();
    if (!form.branchId) {
      toast.error('Filialni tanlang');
      return;
    }
    try {
      await apiClient.post('/tasks', {
        title: form.title,
        clientId: parseInt(form.clientId),
        branchId: parseInt(form.branchId),
        comments: form.comments || undefined,
        hasPsr: form.hasPsr,
        afterHoursPayer: form.afterHoursPayer,
        driverPhone: form.driverPhone || undefined,
      });
      if (isMobile && isNewTaskRoute) {
        navigate('/tasks');
      } else {
        modals.setShowForm(false);
      }
      resetForm();
      await loadTasks(showArchive, filters as any);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [isMobile, isNewTaskRoute, navigate, modals, showArchive, filters, loadTasks]);

  const handleEditSubmit = useCallback(async (
    e: React.FormEvent,
    editForm: { title: string; clientId: string; branchId: string; comments: string; hasPsr: boolean; afterHoursPayer: 'CLIENT' | 'COMPANY'; driverPhone: string },
  ) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!editForm.branchId) {
      toast.error('Filialni tanlang');
      return;
    }
    try {
      await apiClient.patch(`/tasks/${selectedTask.id}`, {
        title: editForm.title,
        clientId: parseInt(editForm.clientId),
        branchId: parseInt(editForm.branchId),
        comments: editForm.comments || undefined,
        hasPsr: editForm.hasPsr,
        afterHoursPayer: editForm.afterHoursPayer,
        driverPhone: editForm.driverPhone || undefined,
      });
      if (isMobile && editTaskId) {
        navigate(isArchiveRoute ? '/tasks/archive' : '/tasks');
      } else {
        modals.setShowEditModal(false);
      }
      await loadTaskDetail(selectedTask.id);
      await loadTasks(showArchive, filters as any);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [selectedTask, isMobile, editTaskId, isArchiveRoute, navigate, modals, showArchive, filters, loadTaskDetail, loadTasks]);

  // ==================================================================
  // Email
  // ==================================================================

  const parseEmailList = (s: string): string[] =>
    s.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);

  const sendTaskEmailErrorToMessage = (data: { errorCode?: string; error?: string } | undefined, fallback: string): string => {
    const code = data?.errorCode;
    const en = data?.error;
    const uz: Record<string, string> = {
      TASK_NOT_COMPLETED: "Email jonatib bo'lmadi. Faqat tugallangan ishlar (YAKUNLANDI) email orqali yuboriladi.",
      NO_VALID_RECIPIENTS: "Email jonatib bo'lmadi. Kamida bitta to'g'ri email manzil kiritilishi shart.",
      VALIDATION_FAILED: en || "Email jonatib bo'lmadi. Mavzu va kamida bitta qabul qiluvchi kerak.",
      INVALID_DOCUMENT_PATH: en ? `Hujjat fayli yo'li noto'g'ri. ${en}` : "Hujjat fayli yo'li noto'g'ri.",
      DOCUMENT_FILE_NOT_FOUND: en ? `Hujjat faylini o'qib bo'lmadi. ${en}` : "Hujjat faylini o'qib bo'lmadi.",
      SEND_FAILED: en ? `Email yuborish xatosi. ${en}` : "Email jonatib bo'lmadi.",
    };
    if (code && uz[code]) return uz[code];
    if (en && en.length > 0 && en.length < 200) return en;
    return fallback;
  };

  const handleOpenSendEmailModal = useCallback(() => {
    modals.setSendEmailError(null);
    const contractEmails = selectedTask?.invoice?.contract?.emails?.trim() || '';
    const clientEmail = (selectedTask?.client as { email?: string })?.email?.trim() || '';
    const defaultRecipients = [clientEmail, contractEmails].filter(Boolean).join(', ');
    modals.setSendEmailForm({
      subject: selectedTask?.title ?? '',
      body: 'КОМАНДА PRODEKLARANT | Ваш надёжный представитель на таможне',
      recipients: defaultRecipients,
      cc: 'arxiv.prodeklarant@mail.ru',
      bcc: '',
    });
    modals.setShowSendEmailModal(true);
  }, [selectedTask, modals]);

  const handleSendTaskEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    const recipients = parseEmailList(modals.sendEmailForm.recipients);
    if (!recipients.length) {
      modals.setSendEmailError('At least one recipient is required');
      return;
    }
    if (!modals.sendEmailForm.subject.trim()) {
      modals.setSendEmailError('Subject is required');
      return;
    }
    modals.setSendingEmail(true);
    modals.setSendEmailError(null);
    try {
      const response = await apiClient.post('/send-task-email', {
        task_id: selectedTask.id,
        subject: modals.sendEmailForm.subject.trim(),
        body: modals.sendEmailForm.body.trim() || undefined,
        recipients,
        cc: parseEmailList(modals.sendEmailForm.cc).length ? parseEmailList(modals.sendEmailForm.cc) : undefined,
        bcc: parseEmailList(modals.sendEmailForm.bcc).length ? parseEmailList(modals.sendEmailForm.bcc) : undefined,
      });
      if (response.status < 200 || response.status >= 300) {
        modals.setSendEmailError(sendTaskEmailErrorToMessage(response.data, response.data?.error || `So'rov muvaffaqiyatsiz (${response.status}).`));
        return;
      }
      // Auto-complete Pochta stage
      const pochtStage = selectedTask.stages?.find((s: TaskStage) => s.name === 'Pochta');
      if (pochtStage && pochtStage.status === 'BOSHLANMAGAN') {
        try {
          await apiClient.patch(`/tasks/${selectedTask.id}/stages/${pochtStage.id}`, { status: 'TAYYOR' });
          await loadTaskDetail(selectedTask.id);
        } catch { /* ignore */ }
      }
      modals.setShowSendEmailModal(false);
      modals.setShowTaskModal(false);
      setSelectedTask(null);
      await loadTasks(showArchive, filters as any);
      toast.success('Email muvaffaqiyatli yuborildi');
    } catch (err: any) {
      modals.setSendEmailError(sendTaskEmailErrorToMessage(err.response?.data, err.response?.data?.error || err.message || "Email jonatib bo'lmadi."));
    } finally {
      modals.setSendingEmail(false);
    }
  }, [selectedTask, modals, setSelectedTask, showArchive, filters, loadTaskDetail, loadTasks]);

  return {
    // Stage
    handleStageClick,
    handleStageToggle,
    updateStageToReady,
    // BXM
    handleBXMEdit,
    handleBXMConfirm,
    // File/Document
    handleFileUpload,
    handleDocumentUpload,
    handleFileSelect,
    // Document preview/delete/download
    openPreview,
    handleDeleteDocument,
    downloadDocument,
    // Sticker
    downloadStickerPng,
    // After hours
    handleAfterHoursDeclarationChange,
    // Task CRUD
    handleSubmit,
    handleEditSubmit,
    // Email
    handleOpenSendEmailModal,
    handleSendTaskEmail,
  };
}
