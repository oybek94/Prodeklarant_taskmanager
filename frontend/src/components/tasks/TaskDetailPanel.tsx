import toast from 'react-hot-toast';
import React, { useMemo, useState, useCallback, useRef } from 'react';

import apiClient from '../../lib/api';
import { useFileHelpers } from './useFileHelpers';
import { Icon } from '@iconify/react';
import {
  formatFileSize, formatMoney, getClientCurrency,
  getStatusInfo, canPreview, canShowOCR,
  calculateStageDuration, evaluateStageTime,
} from './taskHelpers';
import type { TaskDetail, TaskStage, TaskDocument, AiCheck, AiCheckDetails, AiCheckError, AiCheckFinding } from './types';
import { DocumentVerificationReport } from './DocumentVerificationReport';
import { getPsrAmount, getDealAmountDisplay, getDealAmountBaseDisplay, getBranchPaymentsDisplay } from './taskBusinessHelpers';


interface TaskDetailPanelProps {
  task: TaskDetail;
  showFinancialReport: boolean;
  setShowFinancialReport: (v: boolean) => void;
  afterHoursDeclaration: boolean;
  taskDocuments: TaskDocument[];
  loadingDocuments: boolean;
  loadingTask: boolean;
  workers: { id: number; name: string; role: string }[];
  user: { id: number; role: string; name?: string; email?: string } | null;
  isMobile: boolean;
  aiChecks: AiCheck[];
  loadingAiChecks: boolean;
  expandedDocuments: Set<number>;
  documentExtractedTexts: Map<number, string>;
  loadingExtractedTexts: Set<number>;
  updatingStage: number | null;
  onClose: () => void;
  onEdit: () => void;
  onOpenErrorModal: () => void;
  onOpenDocumentUpload: () => void;
  onStageClick: (stage: TaskStage) => void;
  onDeleteDocument: (id: number) => void;
  onDeleteTask: () => void;
  onDownloadDocument: (fileUrl: string, originalName?: string) => void;
  onDownloadSticker: (taskId: number) => void;
  onOpenSendEmail: () => void;
  onTelegramClick: () => void;
  onAfterHoursChange: (checked: boolean) => void;
  onBXMEdit: (stage: TaskStage) => void;
  onOpenPreview: (fileUrl: string, fileType: string, fileName: string) => void;
  onLoadAiChecks: (taskId: number) => void;
  onDropFiles: (files: File[]) => Promise<void>;
  formatInvoiceExtractedText: (text: string, documentType?: string) => string;
  formatBxmAmountInSum: (multiplier: number) => string;
}

// Ko'rsatish uchun kengaytmani olib tashlash ("Инвойс.PDF" → "Инвойс")
const stripExtension = (name: string) => name.replace(/\.[^./\\\s]{1,5}$/, '') || name;

// ── Dizayn yordamchilari ──
const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5d6272] dark:text-gray-400';
const CARD = 'rounded-[14px] border border-[#e6e8ef] dark:border-slate-700 p-4';
const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

const shortDuration = (minutes: number | null): string => {
  if (minutes === null || minutes < 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} s ${m} daq`;
  if (h > 0) return `${h} s`;
  return `${m} daq`;
};
const ruDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ru-RU') : '');
const ruTime = (v?: string | null) => (v ? new Date(v).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '');
const fileExt = (name: string) => (name.match(/\.([^./\\\s]{1,5})$/)?.[1] ?? 'FILE').toUpperCase();

const STATUS_CHIP: Record<string, { chip: string; dot: string }> = {
  YAKUNLANDI: { chip: 'bg-[#e8f7ee] text-[#146c36] dark:bg-emerald-500/20 dark:text-emerald-300', dot: 'bg-[#16a34a]' },
  BOSHLANMAGAN: { chip: 'bg-[#f0f1f6] text-[#3b4152] dark:bg-slate-700 dark:text-slate-300', dot: 'bg-[#9aa0b2]' },
};
const STATUS_CHIP_DEFAULT = { chip: 'bg-[#eef0ff] text-[#3730a3] dark:bg-indigo-500/20 dark:text-indigo-300', dot: 'bg-[#4f46e5]' };

const RATING_CHIP = {
  alo: { label: "A'lo", cls: 'bg-[#e8f7ee] text-[#146c36] dark:bg-emerald-500/20 dark:text-emerald-300' },
  ortacha: { label: 'Ortacha', cls: 'bg-[#fff3d6] text-[#7a4b00] dark:bg-amber-500/20 dark:text-amber-300' },
  yomon: { label: 'Yomon', cls: 'bg-[#fde8e8] text-[#9b1c1c] dark:bg-rose-500/20 dark:text-rose-300' },
} as const;

const svgProps = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const IcAlert = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...svgProps}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>;
const IcPen = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...svgProps}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
const IcTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...svgProps}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M9 7V4.5h6V7" /></svg>;
const IcDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...svgProps}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>;
const IcClose = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svgProps}><path d="M6 6l12 12M18 6 6 18" /></svg>;
const IcCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="3" {...svgProps}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const IcComment = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...svgProps}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4V16A2.5 2.5 0 0 1 4 13.5v-8Z" /></svg>;
const IcMail = () => <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.9" {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;


const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task: selectedTask,
  showFinancialReport,
  setShowFinancialReport,
  afterHoursDeclaration,
  taskDocuments,
  loadingDocuments,
  loadingTask,
  workers,
  user,
  isMobile,
  aiChecks,
  loadingAiChecks,
  expandedDocuments,
  documentExtractedTexts,
  loadingExtractedTexts,
  updatingStage,
  onClose,
  onEdit,
  onOpenErrorModal,
  onOpenDocumentUpload,
  onStageClick: handleStageClick,
  onDeleteDocument: handleDeleteDocument,
  onDeleteTask,
  onDownloadDocument: downloadDocument,
  onDownloadSticker: downloadStickerPng,
  onOpenSendEmail: handleOpenSendEmailModal,
  onTelegramClick: handleTelegramClick,
  onAfterHoursChange: handleAfterHoursDeclarationChange,
  onBXMEdit: handleBXMEdit,
  onOpenPreview: openPreview,
  onLoadAiChecks: loadAiChecks,
  onDropFiles,
  formatInvoiceExtractedText,
  formatBxmAmountInSum,
}) => {
  const { downloadBlob } = useFileHelpers();

  // ── Drag-and-drop ──
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      await onDropFiles(files);
    } finally {
      setIsUploading(false);
    }
  }, [onDropFiles]);

  // Moliyaviy hisoblashlarni bir marta bajarish (10+ IIFE ni almashtiradi)
  const financial = useMemo(() => {
    const rep = (selectedTask as any).financialReport;
    const dealAmount = rep?.dealAmount ?? getDealAmountDisplay(selectedTask, afterHoursDeclaration);
    const dealAmountBase = rep?.dealAmountBase ?? getDealAmountBaseDisplay(selectedTask, afterHoursDeclaration);
    
    // Backend hisoboti (financialReport) so'mda; u bo'lmasa zaxira hisob mijoz valyutasida
    const currency: 'USD' | 'UZS' = rep ? 'UZS' : getClientCurrency(selectedTask.client);
    const psrAmount = getPsrAmount(selectedTask, currency);
    const netProfit = rep?.netProfit ?? (dealAmount - getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration, currency));
    // Xodimga foyda yuborilmaydi (backend) — blok rangi ham foyda belgisini oshkor qilmasin
    const isPositive = user?.role !== 'ADMIN' || netProfit >= 0;
    const totalProfit = netProfit + Number(selectedTask.adminEarnedAmount || 0);

    // Rang va stil
    const containerClass = isPositive
      ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100/80 dark:border-emerald-800/50 shadow-emerald-100/30 dark:shadow-none'
      : 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-100/80 dark:border-rose-800/50 shadow-rose-100/30 dark:shadow-none';
    const iconBgClass = isPositive
      ? 'bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
      : 'bg-rose-100/80 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400';
    const icon = isPositive ? 'solar:tag-price-bold-duotone' : 'solar:graph-down-bold-duotone';
    const titleClass = isPositive ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400';
    const btnClass = isPositive
      ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/30'
      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 bg-rose-50 dark:bg-rose-900/30';
    const labelClass = isPositive ? 'text-emerald-700 dark:text-emerald-500' : 'text-rose-700 dark:text-rose-500';
    const valueClass = isPositive ? 'text-emerald-600' : 'text-rose-600';

    return {
      rep, dealAmount, dealAmountBase, psrAmount, netProfit,
      currency, isPositive, totalProfit,
      containerClass, iconBgClass, icon, titleClass, btnClass, labelClass, valueClass,
    };
  }, [selectedTask, afterHoursDeclaration, user?.role]);

  // Avtomatik yozilgan eski "Invoice yaratish uchun..." matni izoh hisoblanmaydi
  const rawComment = selectedTask?.comments?.trim() ?? '';
  const userComment = /^Invoice yaratish( uchun)?\. Shartnoma: /.test(rawComment) ? '' : rawComment;

  // Umumiy holat (progress chizig'i uchun)
  const stageList = selectedTask.stages ?? [];
  const stageTotal = stageList.length;
  const stageDone = stageList.filter((s) => s.status === 'TAYYOR').length;
  const stagePercent = stageTotal ? Math.round((stageDone / stageTotal) * 100) : 0;
  const totalDurationText = shortDuration(
    stageList
      .filter((s) => s.status === 'TAYYOR')
      .reduce((sum, s) => sum + (calculateStageDuration(s, stageList, selectedTask.createdAt) || 0), 0)
  );

  const statusChip = STATUS_CHIP[selectedTask.status] ?? STATUS_CHIP_DEFAULT;
  const canAddDocs = selectedTask.status !== 'YAKUNLANDI' || user?.role === 'ADMIN';
  const createdLine = [ruDate(selectedTask.createdAt), ruTime(selectedTask.createdAt)].filter(Boolean).join(', ');
  const afterHoursPayerCompany = String((selectedTask.client as any)?.defaultAfterHoursPayer ?? selectedTask.afterHoursPayer ?? 'CLIENT').toUpperCase() === 'COMPANY';
  const contractText = selectedTask.invoice?.contract?.contractNumber
    ? `№ ${selectedTask.invoice.contract.contractNumber}${selectedTask.invoice.contract.contractDate ? `, ${ruDate(selectedTask.invoice.contract.contractDate)}` : ''}`
    : selectedTask.invoice?.contractNumber
      ? `№ ${selectedTask.invoice.contractNumber}`
      : 'Biriktirilmagan';
  const closeBtn = 'flex items-center justify-center bg-[#f0f1f6] dark:bg-slate-800 text-[#5d6272] dark:text-gray-400 hover:bg-[#e6e8ef] dark:hover:bg-slate-700 transition-colors';
  const iconBtn = 'h-11 w-11 sm:h-10 sm:w-10 rounded-xl sm:rounded-[10px] border flex items-center justify-center cursor-pointer transition-colors';

  return (
    <div
      className={`fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] backdrop-blur-md ${isMobile ? 'p-0' : 'p-4 sm:p-6'}`}
      style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white dark:bg-slate-900 shadow-[0_24px_60px_-20px_rgba(20,22,31,0.35)] w-full overflow-y-auto custom-scrollbar relative overflow-x-hidden text-[#14161f] dark:text-gray-100 ${
          isMobile ? 'h-full rounded-none' : 'max-w-4xl max-h-[90vh] rounded-[20px]'
        } ${isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
        style={{
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          animation: isMobile ? 'none' : 'modalFadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag-and-drop overlay */}
        {(isDragOver || isUploading) && (
          <div className={`absolute inset-0 z-[200] rounded-[20px] flex flex-col items-center justify-center gap-3 pointer-events-none transition-all ${
            isUploading
              ? 'bg-indigo-50/95 dark:bg-indigo-900/80'
              : 'bg-indigo-50/90 dark:bg-indigo-900/70 border-2 border-dashed border-indigo-400'
          }`}>
            <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
              {isUploading
                ? <Icon icon="solar:refresh-bold-duotone" className="w-10 h-10 text-indigo-500 animate-spin" />
                : <Icon icon="solar:file-download-bold-duotone" className="w-10 h-10 text-indigo-500" />
              }
            </div>
            <p className="text-xl font-semibold text-indigo-700 dark:text-indigo-300">
              {isUploading ? 'Yuklanmoqda...' : 'Hujjatlarni qo\'yib yuboring'}
            </p>
            {!isUploading && (
              <p className="text-sm text-indigo-500 dark:text-indigo-400">
                Fayllar hujjatlar bo'limiga avtomatik qo'shiladi
              </p>
            )}
          </div>
        )}

        {/* Sarlavha */}
        <div className="relative z-10 px-4 pt-5 pb-4 sm:px-7 sm:pt-6 sm:pb-5 border-b border-[#e6e8ef] dark:border-slate-700 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3.5 sm:gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0">
                <h2 className="m-0 text-[22px] sm:text-2xl font-bold tracking-[-0.01em] leading-[1.2] break-words">{selectedTask.title}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-xs font-semibold shrink-0 ${statusChip.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusChip.dot}`} />
                  {getStatusInfo(selectedTask.status).label}
                </span>
              </div>
              <button type="button" onClick={() => onClose()} title="Yopish" aria-label="Yopish" className={`sm:hidden h-11 w-11 rounded-xl shrink-0 ${closeBtn}`}>
                <IcClose />
              </button>
            </div>
            {selectedTask.createdBy && (
              <div className="text-[13px] text-[#5d6272] dark:text-gray-400">
                Yaratdi: <span className="font-medium text-[#14161f] dark:text-gray-200">{selectedTask.createdBy.name}</span>
                {createdLine && <span className="hidden sm:inline"> · {createdLine}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onOpenErrorModal()} title="Xato qo'shish" aria-label="Xato qo'shish"
              className={`${iconBtn} border-[#f3d3a6] bg-[#fff7ea] text-[#b45309] hover:bg-[#ffefd2] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20`}>
              <IcAlert />
            </button>
            {selectedTask.createdBy && user && (user.role === 'ADMIN' || selectedTask.createdBy.id === user.id) && (
              <button type="button" onClick={() => onEdit()} title="Tahrirlash" aria-label="Vazifani tahrirlash"
                className={`${iconBtn} border-[#d5d9e6] bg-white text-[#3b4152] hover:bg-[#f8f9fc] dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700`}>
                <IcPen />
              </button>
            )}
            {/* Task o'chirish */}
            {((user?.role === 'ADMIN') ||
              (selectedTask.stages &&
               selectedTask.status !== 'JARAYONDA' &&
               selectedTask.stages.every((stage: any) => stage.status === 'BOSHLANMAGAN'))) && (
                <button type="button" onClick={() => onDeleteTask()} title="O'chirish" aria-label="Vazifani o'chirish"
                  className={`${iconBtn} border-[#d5d9e6] bg-white text-[#b42318] hover:bg-[#fdecea] dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/30`}>
                  <IcTrash />
                </button>
              )}
            <button type="button" onClick={() => downloadStickerPng(selectedTask.id)}
              className="h-11 sm:h-10 flex-1 sm:flex-none px-4 rounded-xl sm:rounded-[10px] bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <IcDownload />
              Stiker
            </button>
            <button type="button" onClick={() => onClose()} title="Yopish" aria-label="Yopish" className={`hidden sm:flex h-10 w-10 rounded-[10px] ${closeBtn}`}>
              <IcClose />
            </button>
          </div>
        </div>

        {/* Umumiy holat */}
        <div className="relative z-10 px-4 py-4 sm:px-7 bg-[#f8f9fc] dark:bg-slate-800/60 border-b border-[#e6e8ef] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">{stageDone} / {stageTotal} bosqich bajarildi</span>
              <span className="hidden sm:inline text-[#5d6272] dark:text-gray-400">{stagePercent}%</span>
              {totalDurationText && <span className="sm:hidden text-[#3b4152] dark:text-gray-300" style={MONO}>{totalDurationText}</span>}
            </div>
            <div className="h-2 rounded-full bg-[#e3e6ef] dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-[#16a34a] transition-all duration-500" style={{ width: `${stagePercent}%` }} />
            </div>
          </div>
          {totalDurationText && (
            <div className="hidden sm:flex flex-col gap-0.5 pl-6 border-l border-[#dde0ea] dark:border-slate-600">
              <span className={LABEL}>Umumiy vaqt</span>
              <span className="text-[15px] font-semibold" style={MONO}>{totalDurationText}</span>
            </div>
          )}
          {selectedTask.updatedBy && (
            <div className="hidden sm:flex flex-col gap-0.5 pl-6 border-l border-[#dde0ea] dark:border-slate-600">
              <span className={LABEL}>Oxirgi o'zgarish</span>
              <span className="text-[13px] font-medium">{ruDate(selectedTask.updatedAt)} · {selectedTask.updatedBy.name}</span>
            </div>
          )}
        </div>

        {/* Izohlar: izoh bo'lsa ko'rinadi, bo'sh bo'lsa umuman yo'q */}
        {userComment && (
          <div className="relative z-10 px-4 pt-4 sm:px-7 sm:pt-5">
            <div className="flex gap-2.5 sm:gap-3 p-3.5 sm:px-4 rounded-xl bg-[#fff8e8] border border-[#f2d9a2] dark:bg-amber-500/10 dark:border-amber-500/30">
              <span className="shrink-0 mt-0.5 text-[#8a5a00] dark:text-amber-400"><IcComment /></span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a5a00] dark:text-amber-400">Izohlar</span>
                <span className="text-sm leading-normal text-[#14161f] dark:text-gray-200 whitespace-pre-wrap break-words">{userComment}</span>
              </div>
            </div>
          </div>
        )}

        {/* Asosiy qism */}
        <div className="relative z-10 px-4 pt-5 pb-2 sm:px-7 flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">

          {/* Bosqichlar */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-3">
            <h3 className="m-0 text-base font-bold">Jarayonlar</h3>
            <div className="flex flex-col gap-2">
              {selectedTask.stages && selectedTask.stages.length > 0 ? (
                selectedTask.stages.map((stage) => {
                  const isDone = stage.status === 'TAYYOR';
                  const durationMinutes = isDone
                    ? calculateStageDuration(stage, selectedTask.stages || [], selectedTask.createdAt)
                    : null;
                  const evaluation = isDone ? evaluateStageTime(stage.name, durationMinutes) : null;
                  const durationText = shortDuration(durationMinutes);
                  const rating = evaluation && durationText ? RATING_CHIP[evaluation.rating] : null;
                  const deklarMultiplier =
                    isDone && stage.name === 'Deklaratsiya' && selectedTask?.customsPaymentMultiplier != null
                      ? Number(selectedTask.customsPaymentMultiplier)
                      : null;

                  return (
                    <div
                      key={stage.id}
                      onClick={() => {
                        if (!updatingStage) {
                          handleStageClick(stage);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 sm:px-3.5 min-h-11 rounded-xl border border-[#e6e8ef] dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-[#f8f9fc] dark:hover:bg-slate-800 transition-colors ${updatingStage === stage.id ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
                    >
                      {isDone ? (
                        <span className="w-[26px] h-[26px] sm:w-6 sm:h-6 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0"><IcCheck /></span>
                      ) : (
                        <span className="w-[26px] h-[26px] sm:w-6 sm:h-6 rounded-full border-2 border-[#b9bfd0] dark:border-slate-500 box-border shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">{stage.name}</span>
                        {isDone && (stage.assignedTo || durationText) && (
                          <span className="text-xs text-[#5d6272] dark:text-gray-400">
                            {stage.assignedTo?.name}
                            <span className="sm:hidden">{stage.assignedTo && durationText ? ' · ' : ''}{durationText}</span>
                          </span>
                        )}
                      </div>
                      {deklarMultiplier != null && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-xs font-semibold bg-[#eef0ff] text-[#3730a3] dark:bg-indigo-500/20 dark:text-indigo-300">
                          BXM {deklarMultiplier} barobari
                          {selectedTask.snapshotCustomsPayment != null && (
                            <span className="font-medium">
                              ({new Intl.NumberFormat('en-US').format(Math.round(Number(selectedTask.snapshotCustomsPayment_amount_uzs || selectedTask.snapshotCustomsPayment))).replace(/,/g, ' ').replace(/\./g, ',')} UZS)
                            </span>
                          )}
                          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleBXMEdit(stage);
                              }}
                              className="ml-0.5 p-0.5 rounded hover:bg-[#dfe3ff] dark:hover:bg-indigo-500/30 transition-colors"
                              title="BXM ni o'zgartirish"
                              aria-label="BXM ni o'zgartirish"
                            >
                              <Icon icon="solar:pen-bold-duotone" className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      )}
                      {isDone && durationText && (
                        <span className="hidden sm:block text-[13px] text-[#3b4152] dark:text-gray-300" style={MONO}>{durationText}</span>
                      )}
                      {isDone && rating && (
                        <span className={`px-2.5 py-[3px] rounded-full text-xs font-semibold ${rating.cls}`}>{rating.label}</span>
                      )}
                      {!isDone && (
                        <span className="hidden sm:block text-xs text-[#5d6272] dark:text-gray-400">Bosish bilan bajarildi deb belgilanadi</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-gray-400">
                  {loadingTask ? 'Jarayonlar yuklanmoqda...' : 'Jarayonlar topilmadi'}
                </div>
              )}
            </div>
          </div>

          {/* Yon panel */}
          <div className="w-full sm:w-[300px] shrink-0 flex flex-col gap-3 sm:gap-4">
            <div className={`${CARD} flex flex-col gap-3.5`}>
              <div className="flex flex-col gap-[3px]">
                <span className={LABEL}>Mijoz</span>
                <span className="text-sm font-semibold break-words">{selectedTask.client.name}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className={LABEL}>Filial</span>
                  <span className="text-sm font-semibold truncate" title={selectedTask.branch.name}>{selectedTask.branch.name}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className={LABEL}>Yaratilgan</span>
                  <span className="text-sm font-semibold">{ruDate(selectedTask.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className={LABEL}>Shartnoma</span>
                <span className="text-sm font-semibold break-words" style={MONO}>{contractText}</span>
              </div>
            </div>

            <div className={`${CARD} flex flex-col gap-3`}>
              <h4 className="m-0 text-[13px] font-bold">PSR ma'lumotlari</h4>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#5d6272] dark:text-gray-400">PSR mavjudligi</span>
                <span className={`px-2.5 py-[3px] rounded-full text-xs font-semibold ${selectedTask.hasPsr
                  ? 'bg-[#e8f7ee] text-[#146c36] dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-[#f0f1f6] text-[#3b4152] dark:bg-slate-700 dark:text-slate-300'}`}>
                  {selectedTask.hasPsr ? 'Bor' : "Yo'q"}
                </span>
              </div>
              {user?.role === 'ADMIN' && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#5d6272] dark:text-gray-400">Qo'shimcha to'lov</span>
                  <span className={`px-2.5 py-[3px] rounded-full text-xs font-semibold ${afterHoursPayerCompany
                    ? 'bg-[#f3e8ff] text-[#6b21a8] dark:bg-purple-500/20 dark:text-purple-300'
                    : 'bg-[#eef0ff] text-[#3730a3] dark:bg-indigo-500/20 dark:text-indigo-300'}`}>
                    {afterHoursPayerCompany ? 'Kompaniya' : 'Mijoz'}
                  </span>
                </div>
              )}
              <label className="flex justify-between items-center gap-3 text-[13px] cursor-pointer min-h-11 sm:min-h-0 pt-3 border-t border-[#eceef4] dark:border-slate-700">
                <span>Ish vaqtidan tashqari ko'rib chiqish</span>
                <input
                  type="checkbox"
                  checked={afterHoursDeclaration}
                  onChange={(e) => handleAfterHoursDeclarationChange(e.target.checked)}
                  className="w-[22px] h-[22px] sm:w-[18px] sm:h-[18px] accent-[#4f46e5] shrink-0 cursor-pointer"
                />
              </label>
              {selectedTask.afterHoursDeclaration && (
                <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#fff8e8] border border-[#f2d9a2] dark:bg-amber-500/10 dark:border-amber-500/30 text-xs font-semibold text-[#8a5a00] dark:text-amber-400">
                  <Icon icon="solar:moon-bold-duotone" className="w-3.5 h-3.5 shrink-0" />
                  Ish vaqtidan tashqari rasmiylashtiruv tasdiqlangan
                </div>
              )}
            </div>

            <div className={`${CARD} flex flex-col gap-3`}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="m-0 text-[13px] font-bold">Haydovchi</h4>
                {selectedTask.driverPhone
                  ? <span className="text-sm font-semibold" style={MONO}>{selectedTask.driverPhone}</span>
                  : <span className="text-[13px] text-[#5d6272] dark:text-gray-400">Kiritilmagan</span>}
              </div>
              <div className="flex gap-2">
                {selectedTask.driverPhone && (
                  <button type="button" onClick={handleTelegramClick}
                    className="flex-1 h-11 sm:h-10 rounded-xl sm:rounded-[10px] bg-[#0f7fb8] hover:bg-[#0c6c9d] text-white text-[13px] font-semibold transition-colors">
                    Telegram
                  </button>
                )}
                <button type="button" onClick={handleOpenSendEmailModal}
                  className="flex-1 h-11 sm:h-10 rounded-xl sm:rounded-[10px] border border-[#b7e2c8] bg-[#effaf3] hover:bg-[#e0f4e8] text-[#146c36] dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors">
                  <IcMail />
                  {selectedTask.driverPhone ? 'Email' : 'Hujjatlarni Email orqali yuborish'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Moliyaviy hisobot */}
        <div className="relative z-10 px-4 sm:px-7">
          {/* Foyda hisoboti: ADMIN — to'liq hisobot; boshqalar — faqat o'z KPI daromadi (netProfit ularga kelmaydi) */}
          {(user?.role !== 'ADMIN' || (selectedTask.netProfit !== null && selectedTask.netProfit !== undefined)) && (
            <div className={`mb-5 relative z-10 p-4 rounded-2xl border-2 shadow-sm ${financial.containerClass}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg shadow-sm ${financial.iconBgClass}`}>
                    <Icon icon={financial.icon} className="w-5 h-5" />
                  </div>
                  <div className={`text-base font-bold tracking-tight ${financial.titleClass}`}>
                    Moliyaviy hisobot
                  </div>
                </div>
                <button
                  onClick={() => setShowFinancialReport(!showFinancialReport)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold ${financial.btnClass}`}
                >
                  <Icon icon={showFinancialReport ? "solar:eye-closed-bold-duotone" : "solar:eye-bold-duotone"} className="w-4 h-4" />
                  <span className="hidden sm:inline">{showFinancialReport ? "Yashirish" : "Ko'rsatish"}</span>
                </button>
              </div>

              {showFinancialReport && (
                <div className="space-y-3.5 mt-5 pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
                  {/* Admin uchun to'liq ma'lumot */}
                  {user?.role === 'ADMIN' && (
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-100 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Shartnoma summasi:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatMoney(financial.dealAmount, financial.currency)}
                          {financial.rep && financial.dealAmount > financial.dealAmountBase + financial.psrAmount && (
                            <span className="text-xs font-semibold text-gray-400 ml-1.5 whitespace-normal">
                              (+ qo'shimcha BXM hisobi qo'shilgan)
                            </span>
                          )}
                        </span>
                      </div>
                      {financial.rep && financial.rep.transferAmount > 0 && (
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 -mt-1.5">
                          <span>Naqt: {formatMoney(financial.rep.cashAmount, financial.currency)}</span>
                          <span>Perechisleniya: {formatMoney(financial.rep.transferAmount, financial.currency)}</span>
                        </div>
                      )}
                      {financial.rep && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">- Sertifikatchi tariflari:</span>
                            <span className="text-sm font-bold text-rose-500 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-md ring-1 ring-rose-100 dark:ring-rose-800">
                              - {formatMoney(financial.rep.certifierFee, financial.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">- Davlat to'lovlari:</span>
                            <span className="text-sm font-bold text-rose-500 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-md ring-1 ring-rose-100 dark:ring-rose-800">
                              - {formatMoney(financial.rep.statePayment, financial.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">- Deklaratsiya to'lovi:</span>
                            <span className="text-sm font-bold text-rose-500 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-md ring-1 ring-rose-100 dark:ring-rose-800">
                              - {formatMoney(financial.rep.declarationPayment, financial.currency)}
                            </span>
                          </div>
                          {financial.rep.hiredWorkerPayment !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">- Ishchilar:</span>
                              <span className="text-sm font-bold text-rose-500 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-md ring-1 ring-rose-100 dark:ring-rose-800">
                                - {formatMoney(financial.rep.hiredWorkerPayment, financial.currency)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {!financial.rep && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Barcha xarajatlar:</span>
                          <span className="text-sm font-bold text-rose-500 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-md ring-1 ring-rose-100 dark:ring-rose-800">
                            - {formatMoney(getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration, financial.currency), financial.currency)}
                          </span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <span className={`text-sm font-bold uppercase tracking-wider ${financial.labelClass}`}>
                          Sof foyda:
                        </span>
                        <span className={`text-lg font-black tracking-tight ${financial.valueClass}`}>
                          {formatMoney(financial.netProfit, financial.currency)}
                        </span>
                      </div>
                      {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                        <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between">
                          <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
                            Qo'shimcha daromad:
                          </span>
                          <span className="text-lg font-black text-indigo-600">
                            + {formatMoney(Number(selectedTask.adminEarnedAmount), financial.currency)}
                          </span>
                        </div>
                      )}
                      {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                        <div className="pt-3 border-t-2 border-indigo-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
                            Jami foyda:
                          </span>
                          <span className="text-2xl font-black text-indigo-700 tracking-tight">
                            {formatMoney(financial.totalProfit, financial.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin'dan boshqa foydalanuvchilar uchun jarayonlar bo'yicha pul ma'lumotlari */}
                  {user?.role !== 'ADMIN' && selectedTask.kpiLogs && selectedTask.kpiLogs.length > 0 && (() => {
                    // Faqat joriy foydalanuvchining shu taskdan ishlab topgan pullarini filter qilamiz
                    const userKpiLogs = selectedTask.kpiLogs.filter(log => log.userId === user?.id);

                    if (userKpiLogs.length === 0) {
                      return (
                        <div className="p-4 bg-gray-50/80 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-center">
                          <Icon icon="solar:dollar-minimalistic-bold-duotone" className="w-6 h-6 text-gray-400" />
                          <div className="text-sm font-medium text-gray-500">
                            Siz bu taskdan hozircha pul ishlab topmadingiz
                          </div>
                        </div>
                      );
                    }

                    const totalAmount = userKpiLogs.reduce((sum, log) => sum + Number(log.amount), 0);

                    return (
                      <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Jarayonlardan topilgan mablag':</div>
                        <div className="space-y-2">
                          {userKpiLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {log.stageName}:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white px-2.5 py-1 bg-white dark:bg-slate-600 rounded-md shadow-sm border border-gray-100 dark:border-slate-500">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 2,
                                }).format(log.amount).replace(/,/g, ' ').replace(/\./g, ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 mt-3 border-t-2 border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-between">
                          <span className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Jami tushum:
                          </span>
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                            }).format(totalAmount).replace(/,/g, ' ').replace(/\./g, ',')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Agar KPI log'lar bo'lmasa */}
                  {user?.role !== 'ADMIN' && (!selectedTask.kpiLogs || selectedTask.kpiLogs.length === 0) && (
                    <div className="p-4 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-center">
                      <Icon icon="solar:dollar-minimalistic-bold-duotone" className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Siz bu taskdan hozircha pul ishlab topmadingiz
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hujjatlar */}
        <div className="relative z-10 px-4 pt-2 pb-6 sm:pt-3 sm:px-7 sm:pb-7 flex flex-col gap-3">
          <div className="flex justify-between items-baseline gap-3">
            <h3 className="m-0 text-base font-bold">Hujjatlar</h3>
            <div className="flex items-center gap-3 min-w-0">
              <span className="hidden sm:block text-xs text-[#5d6272] dark:text-gray-400">Emailga ilova qilingan hujjatlar. Fayllarni shu yerga tashlang.</span>
              {taskDocuments.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      if (!selectedTask?.id) {
                        throw new Error('Task topilmadi');
                      }

                      const response = await apiClient.get(`/documents/task/${selectedTask.id}/download-all`, {
                        responseType: 'blob',
                      });

                      // Agar backend JSON xatolik yuborsa, uni parse qilish
                      if (response.data?.type === 'application/json') {
                        const text = await response.data.text();
                        const errorData = JSON.parse(text);
                        throw new Error(errorData.error || errorData.message || 'Yuklab olishda xatolik');
                      }

                      const blobType = response.data?.type || 'application/zip';
                      const blob = new Blob([response.data], { type: blobType });
                      downloadBlob(blob, `${selectedTask?.title || 'task'}.zip`);
                    } catch (error: any) {
                      console.error('Error downloading ZIP:', error);
                      let message = error?.message || 'Yuklab olishda xatolik';
                      if (error?.response?.data instanceof Blob) {
                        try {
                          const text = await error.response.data.text();
                          const data = JSON.parse(text);
                          message = data.error || data.message || message;
                        } catch {
                          // ignore
                        }
                      }
                      toast.error(message);
                    }
                  }}
                  className="h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-[#3730a3] dark:text-indigo-300 bg-[#eef0ff] dark:bg-indigo-500/20 hover:bg-[#e0e4ff] dark:hover:bg-indigo-500/30 transition-colors"
                  title="ZIP holatida yuklab olish"
                >
                  <Icon icon="solar:download-bold-duotone" className="w-3.5 h-3.5" />
                  Barchasi
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:gap-2.5 border border-[#e6e8ef] dark:border-slate-700 sm:border-0 rounded-xl overflow-hidden sm:overflow-visible">
            {loadingDocuments ? (
              <div className="text-center py-4 text-sm text-[#5d6272] dark:text-gray-400">Yuklanmoqda...</div>
            ) : Array.isArray(taskDocuments) && taskDocuments.length > 0 ? (
              <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-2.5">
                {taskDocuments.map((doc) => {
                  const isExpanded = expandedDocuments.has(doc.id);
                  const hasOCR = canShowOCR(doc.fileType, doc.name);
                  const extractedText = documentExtractedTexts.get(doc.id) || '';
                  const isLoadingText = loadingExtractedTexts.has(doc.id);
                  // aiChecks createdAt bo'yicha desc — birinchi topilgani eng yangisi
                  const docCheck = aiChecks.find((c) => c.taskDocumentId === doc.id);
                  const openDoc = () => (canPreview(doc.fileType)
                    ? openPreview(doc.fileUrl, doc.fileType, doc.name)
                    : downloadDocument(doc.fileUrl, doc.name));

                  return (
                    <React.Fragment key={doc.id}>
                      <div className="flex items-center gap-3 sm:gap-2.5 p-3 sm:px-3 sm:py-2.5 min-w-0 bg-white dark:bg-slate-800/40 border-b border-[#eceef4] dark:border-slate-700 sm:border sm:border-[#e6e8ef] sm:rounded-xl">
                        <button
                          type="button"
                          onClick={openDoc}
                          title={doc.description || (canPreview(doc.fileType) ? "Ko'rish" : 'Yuklab olish')}
                          className="flex-1 min-w-0 flex items-center gap-3 sm:gap-2.5 text-left cursor-pointer"
                        >
                          <span className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-[#eef0ff] text-[#3730a3] dark:bg-indigo-500/20 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {fileExt(doc.name)}
                          </span>
                          <span className="flex-1 min-w-0 flex flex-col gap-px">
                            <span className="text-sm font-medium truncate">{stripExtension(doc.name)}</span>
                            <span className="text-xs text-[#5d6272] dark:text-gray-400">
                              {formatFileSize(doc.fileSize)} · {ruDate(doc.createdAt || doc.archivedAt)}
                            </span>
                          </span>
                        </button>
                        {docCheck?.result === 'PASS' && (
                          <span className="hidden sm:inline px-2 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 bg-[#e8f7ee] text-[#146c36] dark:bg-emerald-500/20 dark:text-emerald-300">Invoys bilan mos</span>
                        )}
{(() => {
                          // Admin har doim o'chira oladi
                          const isAdmin = user?.role === 'ADMIN';

                          // Faqat yuklagan foydalanuvchi o'chira oladi
                          const isOwner = doc.uploadedById === user?.id;

                          // Agar admin yoki yuklagan foydalanuvchi bo'lmasa, hech narsa ko'rsatilmaydi
                          if (!isAdmin && !isOwner) {
                            return null;
                          }

                          // Vaqtni hisoblash (2 kungacha o'chirish mumkin)
                          const uploadTime = new Date(doc.createdAt || doc.archivedAt || '');
                          const now = new Date();
                          const diffInMs = now.getTime() - uploadTime.getTime();
                          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

                          // Admin har doim o'chira oladi
                          if (isAdmin) {
                            return (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="h-11 w-11 sm:h-8 sm:w-8 rounded-xl sm:rounded-lg border border-[#f1d0cc] bg-[#fff5f4] text-[#b42318] hover:bg-[#ffe9e6] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 inline-flex items-center justify-center shrink-0 transition-colors"
                                title="O'chirish (Admin)"
                              >
                                <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" />
                              </button>
                            );
                          }

                          // Yuklagan foydalanuvchi uchun: 2 kungacha o'chira oladi
                          if (isOwner) {
                            if (diffInDays <= 2) {
                              // 2 kungacha o'chirish mumkin
                              return (
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="h-11 w-11 sm:h-8 sm:w-8 rounded-xl sm:rounded-lg border border-[#f1d0cc] bg-[#fff5f4] text-[#b42318] hover:bg-[#ffe9e6] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 inline-flex items-center justify-center shrink-0 transition-colors"
                                  title="O'chirish"
                                >
                                  <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" />
                                </button>
                              );
                            } else {
                              // 2 kundan ko'p vaqt o'tgan, o'chirish mumkin emas
                              const daysPassed = Math.floor(diffInDays);
                              return (
                                <span
                                  className="text-[11px] text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700/50 rounded"
                                  title="2 kundan keyin o'chirish mumkin emas"
                                >
                                  O'chirish mumkin emas ({daysPassed} kun o'tdi)
                                </span>
                              );
                            }
                          }

                          return null;
                        })()}
                      </div>
                      {docCheck && docCheck.result !== 'PASS' && (
                        <div className="sm:col-span-2 px-3 pb-2 border-b border-[#eceef4] dark:border-slate-700 sm:border-0 sm:px-0 sm:pb-0">
                          <DocumentVerificationReport
                            check={docCheck}
                            taskId={selectedTask?.id}
                            onRefresh={() => {
                              if (selectedTask?.id) loadAiChecks(selectedTask.id);
                            }}
                          />
                        </div>
                      )}
                    {isExpanded && hasOCR && (
                      <div className="ml-4 mr-4 mb-2 p-4 bg-white dark:bg-slate-800/60 rounded-lg border border-gray-300 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">OCR Natijasi (O'qilgan matn)</h4>
                          <button
                            onClick={() => {
                              if (extractedText) {
                                navigator.clipboard.writeText(extractedText);
                                toast.success('Matn nusxalandi!');
                              }
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                            title="Nusxalash"
                          >
                            <Icon icon="solar:copy-bold-duotone" className="w-4 h-4" />
                            Nusxalash
                          </button>
                        </div>
                        {isLoadingText ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                            <p className="mt-2 text-sm">Matn yuklanmoqda...</p>
                          </div>
                        ) : extractedText ? (
                          <pre className="text-xs text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 p-3 rounded border border-gray-200 dark:border-slate-700 max-h-96 overflow-y-auto whitespace-pre-wrap break-words font-mono">
                            {formatInvoiceExtractedText(extractedText, doc.documentType)}
                          </pre>
                        ) : (
                          <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                            OCR natijasi topilmadi. Hujjat hali qayta ishlanmagan yoki matn o'qilmagan.
                          </div>
                        )}
                      </div>
                    )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              !canAddDocs && <div className="px-4 py-3.5 text-[13px] text-[#5d6272] dark:text-gray-400 text-center">Hujjat yo'q</div>
            )}
            {canAddDocs && (
              <button
                type="button"
                onClick={() => onOpenDocumentUpload()}
                className="px-4 py-3.5 sm:py-3 bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f0f2f8] dark:hover:bg-slate-800 border-t border-dashed border-[#c6cbdb] dark:border-slate-600 sm:border sm:rounded-xl text-[13px] text-[#5d6272] dark:text-gray-400 text-center cursor-pointer transition-colors"
              >
                <span className="sm:hidden">Hujjat qo'shish</span>
                <span className="hidden sm:inline">Hujjat qo'shish uchun faylni shu yerga tashlang</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(TaskDetailPanel);
