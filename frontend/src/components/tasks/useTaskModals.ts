import { useState } from 'react';
import type { TaskStage } from './types';

/**
 * useTaskModals — Tasks sahifasidagi barcha modal va overlay state'larini boshqaradi.
 *
 * Ajratilgan state'lar:
 * - showForm / showEditModal / showTaskModal
 * - BXM modal, File upload modal, Document upload modal
 * - Email, Error, Preview modallar
 * - Financial report panel
 */
export function useTaskModals() {
  // ---- Asosiy modalar ----
  const [showForm, setShowForm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // ---- BXM modali ----
  const [showBXMModal, setShowBXMModal] = useState(false);
  const [bxmMultiplier, setBxmMultiplier] = useState<string>('1.5');
  const [currentBxmUsd, setCurrentBxmUsd] = useState<number>(34.4);
  const [currentBxmUzs, setCurrentBxmUzs] = useState<number>(412000);
  const [afterHoursDeclaration, setAfterHoursDeclaration] = useState(false);
  const [selectedStageForReminder, setSelectedStageForReminder] = useState<TaskStage | null>(null);

  // ---- File upload modali ----
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUploadFile, setFileUploadFile] = useState<File | null>(null);
  const [fileUploadName, setFileUploadName] = useState<string>('');
  const [fileUploadStageName, setFileUploadStageName] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ---- Document upload modali ----
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [documentDescriptions, setDocumentDescriptions] = useState<string[]>([]);

  // ---- Error modali ----
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [editingErrorId, setEditingErrorId] = useState<number | null>(null);
  const [errorForm, setErrorForm] = useState({
    workerId: '',
    stageName: '',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });

  // ---- Email modali ----
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [sendEmailForm, setSendEmailForm] = useState({
    subject: '',
    body: '',
    recipients: '',
    cc: '',
    bcc: '',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);

  // ---- Preview modali ----
  const [previewDocument, setPreviewDocument] = useState<{ url: string; type: string; name: string } | null>(null);

  // ---- Financial report panel ----
  const [showFinancialReport, setShowFinancialReport] = useState(false);

  // ---- Versions panel ----
  const [showVersions, setShowVersions] = useState(false);

  // ---- Stage updating indicator ----
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);

  /** File upload modalini tozalash */
  const resetFileUpload = () => {
    setShowFileUploadModal(false);
    setFileUploadFile(null);
    setFileUploadName('');
    setFileUploadStageName('');
    setUploadingFile(false);
    setUploadProgress(0);
  };

  /** Document upload modalini tozalash */
  const resetDocumentUpload = () => {
    setUploadFiles([]);
    setDocumentNames([]);
    setDocumentDescriptions([]);
    setShowDocumentUpload(false);
    setUploadingFile(false);
    setUploadProgress(0);
  };

  /** BXM modalini tozalash */
  const resetBXMModal = () => {
    setShowBXMModal(false);
    setAfterHoursDeclaration(false);
    setSelectedStageForReminder(null);
  };

  return {
    // Asosiy modal state'lari
    showForm, setShowForm,
    showTaskModal, setShowTaskModal,
    showEditModal, setShowEditModal,

    // BXM modal
    showBXMModal, setShowBXMModal,
    bxmMultiplier, setBxmMultiplier,
    currentBxmUsd, setCurrentBxmUsd,
    currentBxmUzs, setCurrentBxmUzs,
    afterHoursDeclaration, setAfterHoursDeclaration,
    selectedStageForReminder, setSelectedStageForReminder,

    // File upload modal
    showFileUploadModal, setShowFileUploadModal,
    fileUploadFile, setFileUploadFile,
    fileUploadName, setFileUploadName,
    fileUploadStageName, setFileUploadStageName,
    uploadingFile, setUploadingFile,
    uploadProgress, setUploadProgress,

    // Document upload modal
    showDocumentUpload, setShowDocumentUpload,
    uploadFiles, setUploadFiles,
    documentNames, setDocumentNames,
    documentDescriptions, setDocumentDescriptions,

    // Error modal
    showErrorModal, setShowErrorModal,
    editingErrorId, setEditingErrorId,
    errorForm, setErrorForm,

    // Email modal
    showSendEmailModal, setShowSendEmailModal,
    sendEmailForm, setSendEmailForm,
    sendingEmail, setSendingEmail,
    sendEmailError, setSendEmailError,

    // Preview modal
    previewDocument, setPreviewDocument,

    // Financial report
    showFinancialReport, setShowFinancialReport,

    // Versions
    showVersions, setShowVersions,

    // Stage updating
    updatingStage, setUpdatingStage,

    // Reset helpers
    resetFileUpload,
    resetDocumentUpload,
    resetBXMModal,
  };
}

export type TaskModalsReturn = ReturnType<typeof useTaskModals>;
