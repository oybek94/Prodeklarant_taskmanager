import React from 'react';

import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';
import {
  formatDate, formatFileSize, formatDuration, formatMoney, getClientCurrency,
  getStatusInfo, getFileIcon, canPreview, canShowOCR,
  calculateStageDuration, evaluateStageTime,
} from './taskHelpers';
import type { TaskDetail, TaskStage, TaskVersion } from './types';

const AFTER_HOURS_EXTRA_USD = 8.5;
const AFTER_HOURS_EXTRA_UZS = 103000;

const getPsrAmount = (task: TaskDetail | null | undefined): number => {
  if (!task || !task.hasPsr) return 0;
  return Number(task.snapshotPsrPrice ?? 10);
};

const getDealAmountDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean
): number => {
  if (!task) return 0;
  const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
  const psr = getPsrAmount(task);
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'CLIENT'
    ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS)
    : 0;
  return base + psr + extra;
};

const getDealAmountBaseDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean
): number => {
  if (!task) return 0;
  const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'CLIENT'
    ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS)
    : 0;
  return base + extra;
};

const getBranchPaymentsDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean
): number => {
  if (!task) return 0;
  const certificatePayment = Number(task.snapshotCertificatePayment || 0);
  const workerPrice = Number(task.snapshotWorkerPrice || 0);
  const psrPrice = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
  const customsPayment = Number(task.snapshotCustomsPayment || 0);
  const base = certificatePayment + workerPrice + psrPrice + customsPayment;
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'COMPANY'
    ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS)
    : 0;
  return base + extra;
};

interface TaskDetailPanelProps {
  task: TaskDetail;
  showFinancialReport: boolean;
  setShowFinancialReport: (v: boolean) => void;
  afterHoursDeclaration: boolean;
  taskDocuments: any[];
  taskVersions: TaskVersion[];
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
  loadingVersions: boolean;
  loadingDocuments: boolean;
  loadingTask: boolean;
  workers: { id: number; name: string; role: string }[];
  user: { id: number; role: string; name?: string; email?: string } | null;
  isMobile: boolean;
  isModalMode: boolean;
  aiChecks: any[];
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
  onLoadVersions: (taskId: number) => void;
  onLoadAiChecks: (taskId: number) => void;
  onRefreshTasks: () => void;
  formatInvoiceExtractedText: (text: string, documentType?: string) => string;
  formatBxmAmountInSum: (multiplier: number) => string;
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task: selectedTask,
  showFinancialReport,
  setShowFinancialReport,
  afterHoursDeclaration,
  taskDocuments,
  taskVersions,
  showVersions,
  setShowVersions,
  loadingVersions,
  loadingDocuments,
  loadingTask,
  workers,
  user,
  isMobile,
  isModalMode,
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
  onLoadVersions: loadTaskVersions,
  onLoadAiChecks: loadAiChecks,
  onRefreshTasks: loadTasks,
  formatInvoiceExtractedText,
  formatBxmAmountInSum,
}) => {


  return (
    <div
      className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] backdrop-blur-md p-4 sm:p-6"
      style={{
        animation: 'backdropFadeIn 0.3s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50 dark:border-slate-700/50 p-5 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative overflow-hidden"
        style={{
          animation: 'modalFadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        {/* Decorative top solid bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600"></div>

        <div className="relative z-10 flex justify-between items-start mb-5 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{selectedTask.title}</h2>
            {selectedTask.createdBy && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                <Icon icon="lucide:user" className="w-3.5 h-3.5" />
                Yaratdi: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedTask.createdBy.name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => onOpenErrorModal()}
              className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-600 hover:text-white transition-all shadow-sm ring-1 ring-orange-200 dark:ring-orange-800"
              title="Xato"
            >
              <Icon icon="lucide:alert-circle" className="w-4 h-4" />
            </button>
            {selectedTask.createdBy && user && (user.role === 'ADMIN' || selectedTask.createdBy.id === user.id) && (
              <button
                onClick={() => onEdit()}
                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm ring-1 ring-blue-200 dark:ring-blue-800"
                title="O'zgartirish"
              >
                <Icon icon="lucide:pencil" className="w-4 h-4" />
              </button>
            )}
            {/* Task o'chirish */}
            {((user?.role === 'ADMIN') ||
              (selectedTask.stages &&
               selectedTask.status !== 'JARAYONDA' &&
               selectedTask.stages.every((stage: any) => stage.status === 'BOSHLANMAGAN'))) && (
                <button
                  onClick={() => onDeleteTask()}
                  className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm ring-1 ring-red-200 dark:ring-red-800"
                  title="O'chirish"
                >
                  <Icon icon="lucide:trash-2" className="w-4 h-4" />
                </button>
              )}
            <button
              onClick={() => downloadStickerPng(selectedTask.id)}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold flex items-center gap-1.5 shadow-sm text-sm"
            >
              <Icon icon="lucide:download" className="w-4 h-4" />
              Stiker
            </button>
            <button
              onClick={() => onClose()}
              className="p-1.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all ml-1"
            >
              <Icon icon="lucide:x" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Info Grid Elements */}
        <div className="mb-5 bg-gray-50/80 dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4 relative z-10 flex flex-wrap gap-x-6 gap-y-4 shadow-sm">
          <div className="flex-1 min-w-[120px]">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Mijoz</div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate" title={selectedTask.client.name}>{selectedTask.client.name}</div>
          </div>
          <div className="flex-1 min-w-[100px]">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Filial</div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate" title={selectedTask.branch.name}>{selectedTask.branch.name}</div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Status</div>
            <div className="mt-0.5">
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${getStatusInfo(selectedTask.status).color.replace('bg-', 'bg-opacity-20 border-').replace('text-', 'text-')}`}>
                {getStatusInfo(selectedTask.status).label}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-[100px]">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Yaratilgan</div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatDate(selectedTask.createdAt)}</div>
          </div>
          <div className="w-full">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Shartnoma</div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono truncate">
              {selectedTask.invoice?.contract?.contractNumber
                ? `№ ${selectedTask.invoice.contract.contractNumber}${selectedTask.invoice.contract.contractDate ? `, kun: ${new Date(selectedTask.invoice.contract.contractDate).toLocaleDateString('uz-UZ')}` : ''}`
                : selectedTask.invoice?.contractNumber
                  ? `№ ${selectedTask.invoice.contractNumber}`
                  : 'Biriktirilmagan'}
            </div>
          </div>
        </div>

        {selectedTask.updatedBy && (
          <div className="mb-5 flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div>
              <span className="font-semibold">Oxirgi o'zgartirilgan:</span> {selectedTask.updatedAt ? formatDate(selectedTask.updatedAt) : ''}
              <span className="ml-1">by {selectedTask.updatedBy.name}</span>
            </div>
            {selectedTask.stages && selectedTask.stages.length > 0 && (() => {
              const MathFloor = Math.floor;
              const totalMinutes = selectedTask.stages
                .filter(stage => stage.status === 'TAYYOR')
                .reduce((total, stage) => {
                  const duration = calculateStageDuration(stage, selectedTask.stages || [], selectedTask.createdAt);
                  return total + (duration || 0);
                }, 0);
              const totalDuration = formatDuration(totalMinutes);
              return totalDuration ? (
                <div className="font-bold text-gray-700 dark:text-gray-300">
                  Umumiy vaqt: {totalDuration}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* PSR Information */}
        <div className="mb-5 relative z-10 overflow-hidden rounded-2xl border border-blue-100 dark:border-slate-700 bg-blue-50/80 dark:bg-slate-800/80 p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 mb-3 border-b border-blue-100/60 dark:border-slate-700/60 pb-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-400 shadow-sm">
              <Icon icon="lucide:file-text" className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 tracking-tight">PSR Ma'lumotlari</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-max flex items-center justify-between p-2 bg-white/60 dark:bg-white/5 rounded-xl border border-blue-50 dark:border-slate-600/50">
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mr-2">PSR mavjudligi:</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-sm ${selectedTask.hasPsr
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600'
                }`}>
                {selectedTask.hasPsr ? 'Bor' : 'Yo\'q'}
              </span>
            </div>

            {user?.role === 'ADMIN' && (
              <div className="flex-1 min-w-max flex items-center justify-between p-2 bg-white/60 dark:bg-white/5 rounded-xl border border-blue-50 dark:border-slate-600/50">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mr-2">Qo'shimcha to'lov:</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-sm ${String((selectedTask.client as any)?.defaultAfterHoursPayer ?? selectedTask.afterHoursPayer ?? 'CLIENT').toUpperCase() === 'COMPANY'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                  {String((selectedTask.client as any)?.defaultAfterHoursPayer ?? selectedTask.afterHoursPayer ?? 'CLIENT').toUpperCase() === 'COMPANY' ? 'Kompaniya' : 'Mijoz'}
                </span>
              </div>
            )}

            <label className="flex-1 min-w-max flex items-center justify-between p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-blue-50 dark:border-slate-700 gap-2 cursor-pointer group hover:bg-white dark:hover:bg-slate-800 transition-colors">
              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Ish vaqtidan tashqari ko'rib chiqish:</span>
              <div className="relative flex items-center justify-center ml-2">
                <input
                  type="checkbox"
                  checked={afterHoursDeclaration}
                  onChange={(e) => handleAfterHoursDeclarationChange(e.target.checked)}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-300 dark:border-slate-600 checked:border-blue-600 checked:bg-blue-600 transition-all focus:ring-0 focus:ring-offset-0"
                />
                <Icon icon="lucide:check" className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
            </label>

            {selectedTask.afterHoursDeclaration && (
              <div className="w-full flex items-center justify-between p-2 bg-amber-50/80 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-500 flex items-center gap-1.5">
                  <Icon icon="lucide:moon" className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                  Ish vaqtidan tashqari rasmiylashtiruv tasdiqlangan
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-700">Ha</span>
              </div>
            )}

            {selectedTask.driverPhone ? (
              <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex-1 flex items-center justify-between sm:justify-start sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                      <Icon icon="lucide:phone" className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Haydovchi:</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tracking-tight">{selectedTask.driverPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTelegramClick}
                    className="flex-1 sm:flex-none w-auto bg-[#0088cc] hover:bg-[#0077b5] text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold text-xs shadow-sm active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.95 1.25-5.5 3.65-.52.36-.99.53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.29-.48.79-.74 3.08-1.34 5.15-2.23 6.19-2.66 2.95-1.23 3.56-1.44 3.96-1.45.09 0 .28.02.41.11.11.08.14.19.16.27-.01.07.01.2 0 .26z" /></svg>
                    <span>Telegram</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSendEmailModal}
                    className="flex-1 sm:flex-none w-auto bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold text-xs shadow-sm active:scale-[0.99]"
                  >
                    <Icon icon="lucide:mail" className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <button
                  type="button"
                  onClick={handleOpenSendEmailModal}
                  className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold text-xs shadow-sm active:scale-[0.99]"
                >
                  <Icon icon="lucide:mail" className="w-4 h-4" />
                  <span>Hujjatlarni Email orqali yuborish</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stages - Checklist */}
        <div className="mb-5">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">Jarayonlar</h3>
          <div className="space-y-2">
            {selectedTask.stages && selectedTask.stages.length > 0 ? (
              selectedTask.stages.map((stage) => {
                // Vaqtni hisoblash va baholash
                const durationMinutes = stage.status === 'TAYYOR'
                  ? calculateStageDuration(stage, selectedTask.stages || [], selectedTask.createdAt)
                  : null;
                const evaluation = stage.status === 'TAYYOR'
                  ? evaluateStageTime(stage.name, durationMinutes)
                  : null;

                // Rangni aniqlash
                let borderColor = 'border-gray-200 dark:border-slate-700';
                let bgColor = 'dark:bg-slate-800/10';
                if (stage.status === 'TAYYOR' && evaluation) {
                  if (evaluation.rating === 'alo') {
                    borderColor = 'border-green-300 dark:border-green-800/60';
                    bgColor = 'bg-green-50 dark:bg-green-900/10';
                  } else if (evaluation.rating === 'ortacha') {
                    borderColor = 'border-yellow-300 dark:border-yellow-800/60';
                    bgColor = 'bg-yellow-50 dark:bg-yellow-900/10';
                  } else {
                    borderColor = 'border-red-300 dark:border-red-800/60';
                    bgColor = 'bg-red-50 dark:bg-red-900/10';
                  }
                } else if (stage.status === 'TAYYOR') {
                  bgColor = 'bg-gray-50 dark:bg-slate-800/50';
                }

                return (
                  <div
                    key={stage.id}
                    onClick={() => {
                      if (!updatingStage) {
                        handleStageClick(stage);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 border ${borderColor} rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition ${bgColor} ${updatingStage === stage.id ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${stage.status === 'TAYYOR'
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-green-400 dark:hover:border-green-500'
                          } ${updatingStage === stage.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          transition: stage.status === 'TAYYOR'
                            ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            : 'all 0.3s ease-in-out',
                          transform: stage.status === 'TAYYOR' ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: stage.status === 'TAYYOR'
                            ? '0 2px 8px rgba(34, 197, 94, 0.4)'
                            : 'none',
                          animation: stage.status === 'TAYYOR' && updatingStage !== stage.id
                            ? 'checkboxPulse 0.6s ease-out'
                            : 'none'
                        }}
                      >
                        {stage.status === 'TAYYOR' && (
                          <Icon icon="lucide:check" className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <label
                        className={`ml-3 text-sm font-medium flex-1 transition-all duration-300 ${stage.status === 'TAYYOR'
                          ? 'line-through text-gray-400 dark:text-gray-500 opacity-60'
                          : 'text-gray-900 dark:text-gray-200'
                          }`}
                      >
                        {stage.name}
                      </label>
                    </div>
                    {stage.status === 'TAYYOR' && (() => {
                      const durationText = formatDuration(durationMinutes);
                      const deklarMultiplier =
                        stage.name === 'Deklaratsiya' && selectedTask?.customsPaymentMultiplier != null
                          ? Number(selectedTask.customsPaymentMultiplier)
                          : null;

                      return (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 flex items-center gap-2 flex-wrap">
                          {stage.assignedTo && (
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              ({stage.assignedTo.name})
                            </span>
                          )}
                          {deklarMultiplier != null && (
                            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              BXM {deklarMultiplier} barobari
                              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleBXMEdit(stage);
                                  }}
                                  className="ml-1 p-0.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                  title="BXM ni o'zgartirish"
                                >
                                  <Icon icon="lucide:pencil" className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          )}
                          {durationText && <span>{durationText}</span>}
                          {durationText && evaluation && (
                            <i className={`fas ${evaluation.icon} ${evaluation.color}`} title={
                              evaluation.rating === 'alo' ? 'A\'lo' :
                                evaluation.rating === 'ortacha' ? 'Ortacha' :
                                  'Yomon'
                            }></i>
                          )}
                        </div>
                      );
                    })()}
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

        {/* Foyda hisoboti - barcha foydalanuvchilar uchun */}
        {selectedTask.netProfit !== null && selectedTask.netProfit !== undefined && (
          <div className={`mb-5 relative z-10 p-4 rounded-2xl border-2 shadow-sm ${(() => {
            const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
            const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
            const netProfitDisplay = dealAmount - branchPayments;
            return netProfitDisplay >= 0;
          })()
            ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100/80 dark:border-emerald-800/50 shadow-emerald-100/30 dark:shadow-none'
            : 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-100/80 dark:border-rose-800/50 shadow-rose-100/30 dark:shadow-none'
            }`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shadow-sm ${(() => {
                  const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                  const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                  const netProfitDisplay = dealAmount - branchPayments;
                  return netProfitDisplay >= 0 ? 'bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100/80 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400';
                })()}`}>
                  <Icon icon={(() => {
                    const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                    const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                    const netProfitDisplay = dealAmount - branchPayments;
                    return netProfitDisplay >= 0 ? 'lucide:badge-dollar-sign' : 'lucide:trending-down';
                  })()} className="w-5 h-5" />
                </div>
                <div className={`text-base font-bold tracking-tight ${(() => {
                  const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                  const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                  const netProfitDisplay = dealAmount - branchPayments;
                  return netProfitDisplay >= 0 ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400';
                })()}`}>
                  Moliyaviy hisobot
                </div>
              </div>
              <button
                onClick={() => setShowFinancialReport(!showFinancialReport)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold ${(() => {
                  const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                  const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                  const netProfitDisplay = dealAmount - branchPayments;
                  return netProfitDisplay >= 0
                    ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/30'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 bg-rose-50 dark:bg-rose-900/30';
                })()}`}
              >
                <Icon icon={showFinancialReport ? "lucide:eye-off" : "lucide:eye"} className="w-4 h-4" />
                <span className="hidden sm:inline">{showFinancialReport ? "Yashirish" : "Ko'rsatish"}</span>
              </button>
            </div>

            {showFinancialReport && (
              <div className="space-y-3.5 mt-5 pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
                {/* Admin uchun to'liq ma'lumot */}
                {user?.role === 'ADMIN' && (
                  <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Kelishuv summasi:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatMoney(
                          getDealAmountDisplay(selectedTask, afterHoursDeclaration),
                          getClientCurrency(selectedTask.client)
                        )}
                        {selectedTask.hasPsr && (
                          <span className="text-xs font-semibold text-gray-400 ml-1.5">
                            (asosiy: {formatMoney(
                              getDealAmountBaseDisplay(selectedTask, afterHoursDeclaration),
                              getClientCurrency(selectedTask.client)
                            )} + {formatMoney(getPsrAmount(selectedTask), getClientCurrency(selectedTask.client))})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Filial to'lovlari:</span>
                      <span className="text-sm font-bold text-rose-500 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-md ring-1 ring-rose-100 dark:ring-rose-800">
                        - {formatMoney(getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration), getClientCurrency(selectedTask.client))}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <span className={`text-sm font-bold uppercase tracking-wider ${(() => {
                        const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                        const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                        const netProfitDisplay = dealAmount - branchPayments;
                        return netProfitDisplay >= 0 ? 'text-emerald-700 dark:text-emerald-500' : 'text-rose-700 dark:text-rose-500';
                      })()}`}>
                        Sof foyda:
                      </span>
                      <span className={`text-lg font-black tracking-tight ${(() => {
                        const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                        const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                        const netProfitDisplay = dealAmount - branchPayments;
                        return netProfitDisplay >= 0 ? 'text-emerald-600' : 'text-rose-600';
                      })()}`}>
                        {(() => {
                          const currency = getClientCurrency(selectedTask.client);
                          const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                          const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                          const netProfitDisplay = dealAmount - branchPayments;
                          return formatMoney(netProfitDisplay, currency);
                        })()}
                      </span>
                    </div>
                    {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                      <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between">
                        <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
                          Shaxsiy daromad:
                        </span>
                        <span className="text-lg font-black text-indigo-600">
                          + {formatMoney(Number(selectedTask.adminEarnedAmount), getClientCurrency(selectedTask.client))}
                        </span>
                      </div>
                    )}
                    {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                      <div className="pt-3 border-t-2 border-indigo-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
                          Jami foyda:
                        </span>
                        <span className="text-2xl font-black text-indigo-700 tracking-tight">
                          {(() => {
                            const currency = getClientCurrency(selectedTask.client);
                            const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                            const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                            const netProfitDisplay = dealAmount - branchPayments;
                            const totalProfitDisplay = netProfitDisplay + Number(selectedTask.adminEarnedAmount || 0);
                            return formatMoney(totalProfitDisplay, currency);
                          })()}
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
                        <Icon icon="lucide:coins" className="w-6 h-6 text-gray-400" />
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
                              {new Intl.NumberFormat('uz-UZ', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                              }).format(log.amount).replace(/,/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 mt-3 border-t-2 border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-between">
                        <span className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                          Jami tushum:
                        </span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                          {new Intl.NumberFormat('uz-UZ', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(totalAmount).replace(/,/g, ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Agar KPI log'lar bo'lmasa */}
                {user?.role !== 'ADMIN' && (!selectedTask.kpiLogs || selectedTask.kpiLogs.length === 0) && (
                  <div className="p-4 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-center">
                    <Icon icon="lucide:coins" className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Siz bu taskdan hozircha pul ishlab topmadingiz
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedTask.comments && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
              <Icon icon="lucide:message-square" className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Izohlar
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-3 rounded-r-lg">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{selectedTask.comments}</p>
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="mt-5 border-t border-gray-200 dark:border-slate-700 pt-5">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Hujjatlar</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Emailga ilova qilingan hujjatlar.</p>
            </div>
            <div className="flex items-center gap-2">
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
                      const downloadUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = downloadUrl;
                      link.download = `${selectedTask?.title || 'task'}.zip`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(downloadUrl);
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
                      alert(message);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  title="ZIP holatida yuklab olish"
                >
                  <Icon icon="lucide:download" className="w-3.5 h-3.5" />
                  Barchasi
                </button>
              )}
              {(selectedTask.status !== 'YAKUNLANDI' || user?.role === 'ADMIN') && (
                <button
                  onClick={() => onOpenDocumentUpload()}
                  className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                  Hujjat qo'shish
                </button>
              )}
            </div>
          </div>
          {loadingDocuments ? (
            <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
          ) : !Array.isArray(taskDocuments) || taskDocuments.length === 0 ? (
            <div className="text-center py-4 text-gray-400">Hujjatlar yo'q</div>
          ) : (
            <div className="space-y-1">
              {taskDocuments.map((doc) => {
                const isExpanded = expandedDocuments.has(doc.id);
                const hasOCR = canShowOCR(doc.fileType, doc.name);
                const extractedText = documentExtractedTexts.get(doc.id) || '';
                const isLoadingText = loadingExtractedTexts.has(doc.id);

                return (
                  <div key={doc.id} className="space-y-1">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800/80 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.fileType, doc.name)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{doc.name}</div>
                          {doc.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{doc.description}</div>
                          )}
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt || doc.archivedAt).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {canPreview(doc.fileType) && (
                          <button
                            onClick={() => openPreview(doc.fileUrl, doc.fileType, doc.name)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                            title="Ko'rish"
                          >
                            <Icon icon="lucide:eye" className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => downloadDocument(doc.fileUrl, doc.name)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          title="Yuklab olish"
                        >
                          <Icon icon="lucide:download" className="w-4 h-4" />
                        </button>
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
                          const uploadTime = new Date(doc.createdAt || doc.archivedAt);
                          const now = new Date();
                          const diffInMs = now.getTime() - uploadTime.getTime();
                          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

                          // Admin har doim o'chira oladi
                          if (isAdmin) {
                            return (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 dark:border-rose-800/60 bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/40 transition-colors"
                                title="O'chirish (Admin)"
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
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
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 dark:border-rose-800/60 bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/40 transition-colors"
                                  title="O'chirish"
                                >
                                  <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                </button>
                              );
                            } else {
                              // 2 kundan ko'p vaqt o'tgan, o'chirish mumkin emas
                              const daysPassed = Math.floor(diffInDays);
                              return (
                                <span
                                  className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-slate-700/50 rounded"
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
                    </div>
                    {isExpanded && hasOCR && (
                      <div className="ml-4 mr-4 mb-2 p-4 bg-white dark:bg-slate-800/60 rounded-lg border border-gray-300 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">OCR Natijasi (O'qilgan matn)</h4>
                          <button
                            onClick={() => {
                              if (extractedText) {
                                navigator.clipboard.writeText(extractedText);
                                alert('Matn nusxalandi!');
                              }
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                            title="Nusxalash"
                          >
                            <Icon icon="lucide:copy" className="w-4 h-4" />
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Tekshiruv Natijalari Section - Temporarily hidden */}
        {false && (
          <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI Tekshiruv Natijalari</h3>
              <button
                onClick={() => {
                  if (selectedTask) {
                    loadAiChecks(selectedTask.id);
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                title="Yangilash"
              >
                <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                Yangilash
              </button>
            </div>
            {loadingAiChecks ? (
              <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
            ) : !Array.isArray(aiChecks) || aiChecks.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p className="mb-2">AI tekshiruv natijalari yo'q</p>
                <p className="text-xs text-gray-500">
                  Invoice va ST hujjatlarini yuklaganingizdan keyin AI tekshiruvi avtomatik bajariladi
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiChecks.map((check: any) => {
                  // Parse details if it's a JSON string
                  let details = check.details;
                  if (typeof details === 'string') {
                    try {
                      details = JSON.parse(details);
                    } catch (e) {
                      console.error('Error parsing AI check details:', e, 'Raw details:', details);
                      details = {};
                    }
                  }

                  // Debug log
                  console.log('[AI Check] Processing check:', {
                    id: check.id,
                    checkType: check.checkType,
                    result: check.result,
                    details: details,
                    detailsType: typeof details,
                  });

                  // Handle new format: {status: "OK"|"ERROR"|"XATO", errors: []}
                  // or legacy format: {findings: []}
                  const errors = details?.errors || [];
                  const status = details?.status || (check.result === 'PASS' ? 'OK' : 'ERROR');
                  const isPass = status === 'OK' || check.result === 'PASS';

                  // For backward compatibility with old format
                  const legacyFindings = details?.findings || [];

                  // Determine if there are errors (handle both new and legacy formats)
                  const hasErrors =
                    status === 'ERROR' ||
                    status === 'XATO' ||
                    errors.length > 0 ||
                    (legacyFindings.length > 0 && !isPass);

                  console.log('[AI Check] Parsed result:', {
                    status,
                    isPass,
                    hasErrors,
                    errorsCount: errors.length,
                    legacyFindingsCount: legacyFindings.length,
                  });

                  return (
                    <div
                      key={check.id}
                      className={`p-4 rounded-lg border-2 ${isPass
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-semibold ${isPass ? 'text-green-700' : 'text-red-700'
                            }`}>
                            {isPass ? '✓' : '✗'}
                          </span>
                          <div>
                            <div className={`font-semibold ${isPass ? 'text-green-700' : 'text-red-700'
                              }`}>
                              {check.checkType === 'INVOICE_ST' ? 'Invoice-ST Tekshiruvi' : check.checkType}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(check.createdAt).toLocaleString('uz-UZ', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPass
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {isPass ? 'TO\'G\'RI' : (status === 'XATO' ? 'XATO' : 'XATO')}
                        </span>
                      </div>

                      {hasErrors ? (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Topilgan muammolar ({errors.length || legacyFindings.length}):
                          </div>
                          {/* New format: errors array */}
                          {errors.map((error: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 rounded bg-red-100 border border-red-300"
                            >
                              <div className="font-medium text-sm mb-2 text-red-700">
                                🔴 {error.field || 'Noma\'lum maydon'}
                              </div>
                              {error.description && (
                                <div className="text-sm text-gray-700 mb-2">
                                  {error.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-300">
                                {error.invoice && (
                                  <div>
                                    <span className="font-medium">Invoice:</span>{' '}
                                    <span className="font-mono bg-gray-100 px-1 rounded">
                                      {error.invoice}
                                    </span>
                                  </div>
                                )}
                                {(error.st1 || error.st) && (
                                  <div>
                                    <span className="font-medium">ST:</span>{' '}
                                    <span className="font-mono bg-gray-100 px-1 rounded">
                                      {error.st1 || error.st}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {/* Legacy format: findings array (for backward compatibility) */}
                          {legacyFindings.length > 0 && errors.length === 0 && legacyFindings.map((finding: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3 rounded ${finding.severity === 'critical'
                                ? 'bg-red-100 border border-red-300'
                                : 'bg-yellow-100 border border-yellow-300'
                                }`}
                            >
                              <div className="font-medium text-sm mb-2">
                                <span className={finding.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}>
                                  {finding.severity === 'critical' ? '🔴 Kritik:' : '⚠️ Ogohlantirish:'}
                                </span>
                                <span className="ml-1 font-semibold">{finding.field || 'Noma\'lum maydon'}</span>
                              </div>
                              {finding.explanation && (
                                <div className="text-sm text-gray-700 mb-2">
                                  {finding.explanation}
                                </div>
                              )}
                              <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-300">
                                {finding.invoice_value !== undefined && finding.invoice_value !== null && (
                                  <div>
                                    <span className="font-medium">Invoice:</span>{' '}
                                    <span className="font-mono bg-gray-100 px-1 rounded">
                                      {typeof finding.invoice_value === 'object'
                                        ? JSON.stringify(finding.invoice_value, null, 2)
                                        : String(finding.invoice_value)}
                                    </span>
                                  </div>
                                )}
                                {finding.st_value !== undefined && finding.st_value !== null && (
                                  <div>
                                    <span className="font-medium">ST:</span>{' '}
                                    <span className="font-mono bg-gray-100 px-1 rounded">
                                      {typeof finding.st_value === 'object'
                                        ? JSON.stringify(finding.st_value, null, 2)
                                        : String(finding.st_value)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`text-sm mt-2 p-3 rounded ${isPass
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                          {isPass
                            ? '✅ Barcha ma\'lumotlar to\'g\'ri keladi. Xatolik topilmadi.'
                            : 'ℹ️ AI tekshiruvi bajarildi, lekin batafsil natijalar mavjud emas.'}
                        </div>
                      )}

                      {/* Show raw details if available for debugging */}
                      {import.meta.env.MODE === 'development' && details && Object.keys(details).length > 0 && (
                        <details className="mt-3 text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            Batafsil ma'lumot (debug)
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                            {JSON.stringify(details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Versions Section */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Versiyalar</h3>
            <button
              onClick={() => {
                setShowVersions(!showVersions);
                if (!showVersions && selectedTask) {
                  loadTaskVersions(selectedTask.id);
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Icon icon={showVersions ? "lucide:chevron-up" : "lucide:chevron-down"} className="w-4 h-4" />
              {showVersions ? 'Yashirish' : 'Ko\'rsatish'}
            </button>
          </div>
          {showVersions && (
            <div>
              {loadingVersions ? (
                <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
              ) : taskVersions.length === 0 ? (
                <div className="text-center py-4 text-gray-400">Versiyalar yo'q</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {taskVersions.map((version) => (
                    <div
                      key={version.id}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                            V{version.version}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{version.title}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">O'zgartirgan:</span> {version.changedByUser.name}
                      </div>
                      {version.changes && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">O'zgarishlar:</span>
                            {version.changes.changeType === 'STAGE' && version.changes.stage ? (
                              <div className="mt-1 bg-white p-2 rounded border border-blue-100">
                                <div className="font-medium text-blue-700 mb-1">Jarayon o'zgarishi:</div>
                                <div className="space-y-1">
                                  <div><span className="font-medium">Jarayon:</span> {version.changes.stage.name}</div>
                                  <div><span className="font-medium">Status:</span> {version.changes.stage.status === 'TAYYOR' ? 'Tugallandi' : 'Boshlanmagan'}</div>
                                  {version.changes.stage.assignedTo && (
                                    <div><span className="font-medium">Javobgar:</span> {version.changes.stage.assignedTo.name}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 space-y-1">
                                {version.changes.title && (
                                  <div><span className="font-medium">Title:</span> {version.changes.title}</div>
                                )}
                                {version.changes.status && (
                                  <div><span className="font-medium">Status:</span> {version.changes.status}</div>
                                )}
                                {version.changes.comments && (
                                  <div><span className="font-medium">Comments:</span> {version.changes.comments}</div>
                                )}
                                {version.changes.hasPsr !== undefined && (
                                  <div><span className="font-medium">PSR:</span> {version.changes.hasPsr ? 'Bor' : 'Yo\'q'}</div>
                                )}
                                {version.changes.driverPhone && (
                                  <div><span className="font-medium">Driver Phone:</span> {version.changes.driverPhone}</div>
                                )}
                              </div>
                            )}
                            {version.changes.stages && Array.isArray(version.changes.stages) && (
                              <div className="mt-2 pt-2 border-t border-blue-100">
                                <div className="font-medium text-blue-700 mb-1">Barcha jarayonlar holati:</div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {version.changes.stages.map((s: any, idx: number) => (
                                    <div key={idx} className="text-xs flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${s.status === 'TAYYOR' ? 'bg-green-500' : 'bg-gray-300'
                                        }`}></span>
                                      <span>{s.name}</span>
                                      {s.assignedTo && (
                                        <span className="text-gray-500">({s.assignedTo.name})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${getStatusInfo(version.status).color}`}>
                          {getStatusInfo(version.status).label}
                        </span>
                        {version.comments && (
                          <span className="text-gray-500 truncate" title={version.comments}>
                            {version.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TaskDetailPanel;
