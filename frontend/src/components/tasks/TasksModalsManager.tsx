import React from 'react';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailPanel from './TaskDetailPanel';
import BXMModal from './BxmModal';
import FileUploadModal from './FileUploadModal';
import SendEmailModal from './SendEmailModal';
import EditTaskModal from './EditTaskModal';
import DocumentUploadModal from './DocumentUploadModal';
import PreviewModal from './PreviewModal';
import ErrorModal from './ErrorModal';

interface TasksModalsManagerProps {
  modals: any; // Result from useTaskModals
  taskActions: any; // Result from useTaskActions
  form: any;
  setForm: any;
  editForm: any;
  setEditForm: any;
  errorForm: any;
  setErrorForm: any;
  clients: any;
  branches: any;
  workers: any;
  isMobile: boolean;
  isNewTaskRoute: boolean;
  isArchiveRoute: boolean;
  editTaskId: number | null;
  selectedTask: any;
  setSelectedTask: any;
  taskDocuments: any;
  taskVersions: any;
  aiChecks: any;
  expandedDocuments: any;
  documentExtractedTexts: any;
  loadingVersions: boolean;
  loadingDocuments: boolean;
  loadingTask: boolean;
  loadingAiChecks: boolean;
  loadingExtractedTexts: boolean;
  user: any;
  isModalMode: boolean;
  onCloseModal?: () => void;
  loadTaskVersions: any;
  loadAiChecks: any;
  loadTasks: any;
  loadTaskDocuments: any;
  showArchive: boolean;
  filters: any;
  formatInvoiceExtractedText: any;
  formatBxmAmountInSum: any;
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
  taskVersions,
  aiChecks,
  expandedDocuments,
  documentExtractedTexts,
  loadingVersions,
  loadingDocuments,
  loadingTask,
  loadingAiChecks,
  loadingExtractedTexts,
  user,
  isModalMode,
  onCloseModal,
  loadTaskVersions,
  loadAiChecks,
  loadTasks,
  loadTaskDocuments,
  showArchive,
  filters,
  formatInvoiceExtractedText,
  formatBxmAmountInSum,
}) => {
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
        onSubmit={taskActions.handleSubmit}
      />

      {modals.showTaskModal && selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          showFinancialReport={modals.showFinancialReport}
          setShowFinancialReport={modals.setShowFinancialReport}
          afterHoursDeclaration={modals.afterHoursDeclaration}
          taskDocuments={taskDocuments}
          taskVersions={taskVersions}
          showVersions={modals.showVersions}
          setShowVersions={modals.setShowVersions}
          loadingVersions={loadingVersions}
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
                taskActions.navigate(`/tasks/${selectedTask.id}/edit`);
              } else {
                setEditForm({
                  title: selectedTask.title,
                  clientId: selectedTask.client.id.toString(),
                  branchId: selectedTask.branch.id.toString(),
                  comments: selectedTask.comments || '',
                  hasPsr: selectedTask.hasPsr || false,
                  afterHoursPayer: selectedTask.afterHoursPayer || 'CLIENT',
                  driverPhone: selectedTask.driverPhone || '',
                });
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
          onDeleteTask={async () => {
            if (confirm('Bu taskni o\'chirishni xohlaysizmi?')) {
              try {
                // API call is handled here directly instead of hook, for simplicity
                const apiClient = (await import('../../lib/api')).default;
                await apiClient.delete(`/tasks/${selectedTask.id}`);
                modals.setShowTaskModal(false);
                setSelectedTask(null);
                await loadTasks(showArchive, filters as any);
              } catch (error: any) {
                const toast = (await import('react-hot-toast')).default;
                toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
              }
            }
          }}
          onStageClick={taskActions.handleStageClick}
          onDeleteDocument={taskActions.handleDeleteDocument}
          onDownloadDocument={taskActions.downloadDocument}
          onDownloadSticker={taskActions.downloadStickerPng}
          onOpenSendEmail={taskActions.handleOpenSendEmailModal}
          onTelegramClick={taskActions.handleTelegramClick}
          onAfterHoursChange={taskActions.handleAfterHoursDeclarationChange}
          onBXMEdit={taskActions.handleBXMEdit}
          onOpenPreview={taskActions.openPreview}
          onLoadVersions={loadTaskVersions}
          onLoadAiChecks={loadAiChecks}
          onRefreshTasks={() => loadTasks(showArchive, filters as any)}
          onDropFiles={async (files: File[]) => {
            if (!selectedTask) return;
            try {
              const formData = new FormData();
              files.forEach((f) => formData.append('files', f));
              formData.append('names', JSON.stringify(files.map((f) => f.name)));
              formData.append('descriptions', JSON.stringify(files.map(() => '')));
              const apiClient = (await import('../../lib/api')).default;
              await apiClient.post(`/documents/task/${selectedTask.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              const toast = (await import('react-hot-toast')).default;
              toast.success(`${files.length} ta hujjat yuklandi`);
              await loadTaskDocuments(selectedTask.id);
            } catch (error: any) {
              const toast = (await import('react-hot-toast')).default;
              toast.error(error.response?.data?.error || 'Hujjat yuklashda xatolik');
            }
          }}
          formatInvoiceExtractedText={formatInvoiceExtractedText}
          formatBxmAmountInSum={formatBxmAmountInSum}
        />
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
        isMobile={isMobile}
        editTaskId={editTaskId}
        isArchiveRoute={isArchiveRoute}
        onClose={() => modals.setShowEditModal(false)}
        onSubmit={taskActions.handleEditSubmit}
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
        onSuccess={() => loadTasks(showArchive, filters as any)}
        setSelectedTask={setSelectedTask}
      />
    </>
  );
};
