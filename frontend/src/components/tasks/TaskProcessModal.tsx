import React, { Suspense, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../utils/useIsMobile';
import BXMModal from './BxmModal';
import FileUploadModal from './FileUploadModal';
import SendEmailModal from './SendEmailModal';
import EditTaskModal, { taskToEditForm, type EditForm } from './EditTaskModal';
import DocumentUploadModal from './DocumentUploadModal';
import PreviewModal from './PreviewModal';
import ErrorModal from './ErrorModal';
import { TaskDetailSkeleton } from './Skeletons';
import { useTaskData } from './useTaskData';
import { useTaskModals } from './useTaskModals';
import { useTaskActions } from './useTaskActions';
import {
  handleTelegramClick as handleTelegramClickHelper,
  formatInvoiceExtractedText,
  formatBxmAmountInSum as formatBxmAmountInSumHelper,
} from './taskBusinessHelpers';
import { LazyTaskDetailPanel as TaskDetailPanel } from './taskDetailPanelLoader';

interface TaskProcessModalProps {
  taskId: number;
  onClose: () => void;
}

const EMPTY_EDIT_FORM: EditForm = {
  title: '', clientId: '', branchId: '', comments: '', hasPsr: false, afterHoursPayer: 'CLIENT', driverPhone: '', contractId: '',
};

/**
 * Jarayonlar oynasi — vazifa kartochkasi (bosqichlar, hujjatlar, xatolar, tahrirlash)
 * va unga tegishli barcha kichik oynalar. Invoyslar, invoys va mijozlar sahifalaridan ochiladi.
 */
const TaskProcessModal: React.FC<TaskProcessModalProps> = ({ taskId, onClose }) => {
  const modals = useTaskModals();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    clients, branches, workers,
    selectedTask, setSelectedTask, loadingTask,
    taskDocuments, loadingDocuments,
    aiChecks, loadingAiChecks,
    expandedDocuments, documentExtractedTexts, loadingExtractedTexts,
    loadClients, loadBranches, loadWorkers,
    loadTaskDetail, loadTaskDocuments, loadAiChecks,
  } = useTaskData(user?.role);

  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);

  const taskActions = useTaskActions({
    modals,
    selectedTask, setSelectedTask,
    loadTaskDetail, loadTaskDocuments,
    user,
  });

  // Filiallar (Telegram xabari, tahrirlash) va xodimlar (xato qo'shish) oyna ochilganda kerak
  useEffect(() => {
    loadBranches(); loadWorkers();
  }, [loadBranches, loadWorkers]);

  const loadedTaskIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (loadedTaskIdRef.current === taskId) return;
    loadedTaskIdRef.current = taskId;
    const { setAfterHoursDeclaration, setShowTaskModal } = modals;
    loadTaskDetail(taskId, {
      onLoaded: (taskData) => {
        setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
        setShowTaskModal(true);
      }
    });
  }, [taskId, loadTaskDetail, modals.setAfterHoursDeclaration, modals.setShowTaskModal]);

  // Kartochka ichkaridan yopilsa (vazifa o'chirildi, email yuborildi) — ota komponentga xabar berish
  const modalWasOpenRef = useRef(false);
  useEffect(() => {
    if (modals.showTaskModal) {
      modalWasOpenRef.current = true;
    } else if (modalWasOpenRef.current) {
      modalWasOpenRef.current = false;
      onClose();
    }
  }, [modals.showTaskModal, onClose]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (modals.showEditModal) modals.setShowEditModal(false);
      else if (modals.showTaskModal) onClose();
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [modals, onClose]);

  const handleTelegramClick = async () => {
    if (!selectedTask) return;
    await handleTelegramClickHelper(selectedTask, setSelectedTask, branches);
  };

  const formatBxmAmountInSum = (multiplier: number) =>
    formatBxmAmountInSumHelper(multiplier, modals.currentBxmUzs);

  if (!modals.showTaskModal) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
          <TaskDetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <>
      {selectedTask && (
        <Suspense fallback={<TaskDetailPanelFallback />}>
        <TaskDetailPanel
          task={selectedTask}
          showFinancialReport={modals.showFinancialReport}
          setShowFinancialReport={modals.setShowFinancialReport}
          afterHoursDeclaration={modals.afterHoursDeclaration}
          taskDocuments={taskDocuments}
          loadingDocuments={loadingDocuments}
          loadingTask={loadingTask}
          workers={workers}
          user={user}
          isMobile={isMobile}
          aiChecks={aiChecks}
          loadingAiChecks={loadingAiChecks}
          expandedDocuments={expandedDocuments}
          documentExtractedTexts={documentExtractedTexts}
          loadingExtractedTexts={loadingExtractedTexts}
          updatingStage={modals.updatingStage}
          onClose={onClose}
          onEdit={() => {
            if (clients.length === 0) loadClients();
            setEditForm(taskToEditForm(selectedTask));
            modals.setShowEditModal(true);
          }}
          onOpenErrorModal={() => {
            modals.setErrorForm({
              workerId: '',
              stageName: '',
              amount: '',
              comment: '',
              date: new Date().toISOString().split('T')[0],
            });
            modals.setEditingErrorId(null);
            modals.setShowErrorModal(true);
          }}
          onOpenDocumentUpload={() => {
            modals.setShowDocumentUpload(true);
            modals.setUploadFiles([]);
            modals.setDocumentNames([]);
            modals.setDocumentDescriptions([]);
          }}
          onDeleteTask={taskActions.handleDeleteTask}
          onStageClick={taskActions.handleStageClick}
          onDeleteDocument={taskActions.handleDeleteDocument}
          onDownloadDocument={taskActions.downloadDocument}
          onDownloadSticker={taskActions.downloadStickerPng}
          onOpenSendEmail={taskActions.handleOpenSendEmailModal}
          onTelegramClick={handleTelegramClick}
          onAfterHoursChange={taskActions.handleAfterHoursDeclarationChange}
          onBXMEdit={taskActions.handleBXMEdit}
          onOpenPreview={taskActions.openPreview}
          onLoadAiChecks={loadAiChecks}
          onDropFiles={async (files: File[]) => {
            try {
              const formData = new FormData();
              files.forEach((f) => formData.append('files', f));
              formData.append('names', JSON.stringify(files.map((f) => f.name)));
              formData.append('descriptions', JSON.stringify(files.map(() => '')));
              await apiClient.post(`/documents/task/${selectedTask.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              toast.success(`${files.length} ta hujjat yuklandi`);
              await loadTaskDocuments(selectedTask.id);
            } catch (error: any) {
              toast.error(error.response?.data?.error || 'Hujjat yuklashda xatolik');
            }
          }}
          formatInvoiceExtractedText={formatInvoiceExtractedText}
          formatBxmAmountInSum={formatBxmAmountInSum}
        />
        </Suspense>
      )}

      <BXMModal
        show={modals.showBXMModal && !!modals.selectedStageForReminder}
        bxmMultiplier={modals.bxmMultiplier}
        setBxmMultiplier={modals.setBxmMultiplier}
        afterHoursDeclaration={modals.afterHoursDeclaration}
        setAfterHoursDeclaration={modals.setAfterHoursDeclaration}
        formatBxmAmountInSum={formatBxmAmountInSum}
        onConfirm={taskActions.handleBXMConfirm}
        onClose={() => {
          modals.setShowBXMModal(false);
          modals.setAfterHoursDeclaration(false);
          modals.setSelectedStageForReminder(null);
        }}
      />

      <FileUploadModal
        show={modals.showFileUploadModal && !!selectedTask}
        stageName={modals.fileUploadStageName}
        fileName={modals.fileUploadName}
        file={modals.fileUploadFile}
        uploading={modals.uploadingFile}
        uploadProgress={modals.uploadProgress}
        selectedStageForReminder={modals.selectedStageForReminder}
        onFileNameChange={modals.setFileUploadName}
        onFileChange={modals.setFileUploadFile}
        onUpload={taskActions.handleFileUpload}
        onSkipValidation={async () => {
          try {
            if (modals.selectedStageForReminder) {
              await taskActions.updateStageToReady(modals.selectedStageForReminder, undefined, true);
            }
            modals.setShowFileUploadModal(false);
            modals.setFileUploadFile(null);
            modals.setFileUploadName('');
            modals.setFileUploadStageName('');
          } catch (error) {
            console.error('Error skipping validation:', error);
          }
        }}
        onClose={() => {
          modals.setShowFileUploadModal(false);
          modals.setFileUploadFile(null);
          modals.setFileUploadName('');
          modals.setFileUploadStageName('');
          modals.setSelectedStageForReminder(null);
        }}
      />

      <SendEmailModal
        show={modals.showSendEmailModal}
        selectedTask={selectedTask}
        sendEmailForm={modals.sendEmailForm}
        setSendEmailForm={modals.setSendEmailForm}
        sendingEmail={modals.sendingEmail}
        sendEmailError={modals.sendEmailError}
        setSendEmailError={modals.setSendEmailError}
        taskDocuments={taskDocuments}
        onClose={() => modals.setShowSendEmailModal(false)}
        onSubmit={taskActions.handleSendTaskEmail}
      />

      <EditTaskModal
        show={modals.showEditModal && !!selectedTask}
        editForm={editForm}
        setEditForm={setEditForm}
        clients={clients}
        branches={branches}
        hasInvoice={!!selectedTask?.invoice}
        initialClientId={selectedTask?.client?.id != null ? String(selectedTask.client.id) : ''}
        isMobile={isMobile}
        onClose={() => modals.setShowEditModal(false)}
        onSubmit={(e: React.FormEvent) => taskActions.handleEditSubmit(e, editForm)}
      />

      <DocumentUploadModal
        show={modals.showDocumentUpload && !!selectedTask}
        uploadFiles={modals.uploadFiles}
        setUploadFiles={modals.setUploadFiles}
        documentNames={modals.documentNames}
        setDocumentNames={modals.setDocumentNames}
        documentDescriptions={modals.documentDescriptions}
        setDocumentDescriptions={modals.setDocumentDescriptions}
        selectedStageForReminder={modals.selectedStageForReminder}
        setSelectedStageForReminder={modals.setSelectedStageForReminder}
        onClose={() => modals.setShowDocumentUpload(false)}
        onFileSelect={taskActions.handleFileSelect}
        onUpload={taskActions.handleDocumentUpload}
        uploading={modals.uploadingFile}
        uploadProgress={modals.uploadProgress}
      />

      <PreviewModal
        previewDocument={modals.previewDocument}
        onClose={() => modals.setPreviewDocument(null)}
      />

      <ErrorModal
        show={modals.showErrorModal}
        selectedTask={selectedTask}
        workers={workers}
        user={user}
        errorForm={modals.errorForm}
        setErrorForm={modals.setErrorForm}
        editingErrorId={modals.editingErrorId}
        setEditingErrorId={modals.setEditingErrorId}
        onClose={() => { modals.setEditingErrorId(null); modals.setShowErrorModal(false); }}
        setSelectedTask={setSelectedTask}
      />
    </>
  );
};

/** Kartochka chunk'i yuklanayotganda (odatda detail so'rovi bilan birga tugaydi) */
const TaskDetailPanelFallback: React.FC = () => (
  <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] backdrop-blur-md p-4">
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <TaskDetailSkeleton />
    </div>
  </div>
);

export default TaskProcessModal;
