import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import CreateTaskModal, { type CreateForm } from './CreateTaskModal';
import BXMModal from './BxmModal';
import FileUploadModal from './FileUploadModal';
import SendEmailModal from './SendEmailModal';
import EditTaskModal, { taskToEditForm, type EditForm } from './EditTaskModal';
import DocumentUploadModal from './DocumentUploadModal';
import PreviewModal from './PreviewModal';
import ErrorModal, { type ErrorForm } from './ErrorModal';
import { TaskDetailSkeleton } from './Skeletons';
import type { TaskModalsReturn } from './useTaskModals';
import type { useTaskActions } from './useTaskActions';
import type { TaskListQuery } from './useTaskData';
import type { AiCheck, Branch, Client, TaskDetail, TaskDocument } from './types';
import { LazyTaskDetailPanel as TaskDetailPanel } from './taskDetailPanelLoader';

type TaskActions = ReturnType<typeof useTaskActions> & { handleTelegramClick: () => Promise<void> };
type Worker = { id: number; name: string; role: string };

interface TasksModalsManagerProps {
  modals: TaskModalsReturn;
  taskActions: TaskActions;
  form: CreateForm;
  setForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  errorForm: ErrorForm;
  setErrorForm: React.Dispatch<React.SetStateAction<ErrorForm>>;
  clients: Client[];
  branches: Branch[];
  workers: Worker[];
  isMobile: boolean;
  isNewTaskRoute: boolean;
  isArchiveRoute: boolean;
  editTaskId: number | null;
  selectedTask: TaskDetail | null;
  setSelectedTask: (task: TaskDetail | null) => void;
  taskDocuments: TaskDocument[];
  aiChecks: AiCheck[];
  expandedDocuments: Set<number>;
  documentExtractedTexts: Map<number, string>;
  loadingDocuments: boolean;
  loadingTask: boolean;
  loadingAiChecks: boolean;
  loadingExtractedTexts: Set<number>;
  user: { id: number; role: string; name?: string; email?: string } | null;
  isModalMode: boolean;
  onCloseModal?: () => void;
  loadAiChecks: (taskId: number) => void;
  loadTasks: (showArchive: boolean, filters: TaskListQuery) => Promise<void>;
  loadTaskDocuments: (taskId: number) => Promise<void>;
  showArchive: boolean;
  filters: TaskListQuery;
  formatInvoiceExtractedText: (text: string, documentType?: string) => string;
  formatBxmAmountInSum: (multiplier: number) => string;
}

export const TasksModalsManager: React.FC<TasksModalsManagerProps> = ({
  modals,
  taskActions,
  form,
  setForm,
  editForm,
  setEditForm,
  errorForm,
  setErrorForm,
  clients,
  branches,
  workers,
  isMobile,
  isNewTaskRoute,
  isArchiveRoute,
  editTaskId,
  selectedTask,
  setSelectedTask,
  taskDocuments,
  aiChecks,
  expandedDocuments,
  documentExtractedTexts,
  loadingDocuments,
  loadingTask,
  loadingAiChecks,
  loadingExtractedTexts,
  user,
  isModalMode,
  onCloseModal,
  loadAiChecks,
  loadTasks,
  loadTaskDocuments,
  showArchive,
  filters,
  formatInvoiceExtractedText,
  formatBxmAmountInSum,
}) => {
  const navigate = useNavigate();
  const showTaskForm = modals.showForm || (isMobile && isNewTaskRoute);
  const showEditTaskForm = modals.showEditModal || (isMobile && !!editTaskId);

  return (
    <>
      <CreateTaskModal
        show={showTaskForm}
        form={form}
        setForm={setForm}
        clients={clients}
        branches={branches}
        isMobile={isMobile}
        isNewTaskRoute={isNewTaskRoute}
        onClose={() => modals.setShowForm(false)}
        onSubmit={(e: React.FormEvent) => taskActions.handleSubmit(e, form, () => setForm({
          title: '', clientId: '', branchId: '', comments: '', hasPsr: false, afterHoursPayer: 'CLIENT', driverPhone: '',
        }))}
      />

      {modals.showTaskModal && selectedTask && (
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
          isModalMode={isModalMode}
          aiChecks={aiChecks}
          loadingAiChecks={loadingAiChecks}
          expandedDocuments={expandedDocuments}
          documentExtractedTexts={documentExtractedTexts}
          loadingExtractedTexts={loadingExtractedTexts}
          updatingStage={modals.updatingStage}
          onClose={() => {
            if (isModalMode) {
              onCloseModal?.();
            } else {
              modals.setShowTaskModal(false);
              setSelectedTask(null);
              modals.setShowFinancialReport(false);
            }
          }}
          onEdit={() => {
            if (selectedTask) {
              if (isMobile) {
                navigate(`/tasks/${selectedTask.id}/edit`);
              } else {
                setEditForm(taskToEditForm(selectedTask));
                modals.setShowEditModal(true);
              }
            }
          }}
          onOpenErrorModal={() => {
            setErrorForm({
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
          onTelegramClick={taskActions.handleTelegramClick}
          onAfterHoursChange={taskActions.handleAfterHoursDeclarationChange}
          onBXMEdit={taskActions.handleBXMEdit}
          onOpenPreview={taskActions.openPreview}
          onLoadAiChecks={loadAiChecks}
          onDropFiles={async (files: File[]) => {
            if (!selectedTask) return;
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
        show={showEditTaskForm && !!selectedTask}
        editForm={editForm}
        setEditForm={setEditForm}
        clients={clients}
        branches={branches}
        hasInvoice={!!selectedTask?.invoice}
        initialClientId={selectedTask?.client?.id != null ? String(selectedTask.client.id) : ''}
        isMobile={isMobile}
        editTaskId={editTaskId}
        isArchiveRoute={isArchiveRoute}
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
        errorForm={errorForm}
        setErrorForm={setErrorForm}
        editingErrorId={modals.editingErrorId}
        setEditingErrorId={modals.setEditingErrorId}
        onClose={() => { modals.setEditingErrorId(null); modals.setShowErrorModal(false); }}
        onSuccess={() => loadTasks(showArchive, filters)}
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
