import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../../lib/api';
import type { AiCheck, AiCheckDetails, AiCheckError } from './types';

interface DocumentVerificationReportProps {
  check: AiCheck;
  /** Rerun/dismiss uchun kerak; berilmasa tugmalar ko'rsatilmaydi */
  taskId?: number;
  /** Rerun/dismiss'dan keyin ro'yxatni yangilash */
  onRefresh?: () => void;
}

function parseDetails(details: AiCheckDetails | string): AiCheckDetails {
  if (typeof details !== 'string') return details;
  try {
    return JSON.parse(details) as AiCheckDetails;
  } catch {
    return {};
  }
}

/**
 * Yuklangan hujjatning bazadagi invoys bilan moslik tekshiruvi hisoboti.
 * PASS — yashil belgi; NEEDS_REVIEW — sariq blok (sabab/ishonch bali);
 * FAIL — nomuvofiqliklar jadvali (severity ranglari bilan).
 */
export const DocumentVerificationReport: React.FC<DocumentVerificationReportProps> = ({
  check,
  taskId,
  onRefresh,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const details = parseDetails(check.details);
  const errors: AiCheckError[] = Array.isArray(details.errors) ? details.errors : [];
  const isPass = check.result === 'PASS';
  const isNeedsReview = check.result === 'NEEDS_REVIEW';
  const isDismissed = Boolean(details.dismissed);
  const confidence =
    typeof details.confidence === 'number' ? Math.round(details.confidence * 100) : null;

  const canAct = taskId !== undefined && check.taskDocumentId != null;

  const handleRerun = async () => {
    if (!canAct || rerunning) return;
    try {
      setRerunning(true);
      await apiClient.post(`/tasks/${taskId}/ai-checks/rerun`, {
        taskDocumentId: check.taskDocumentId,
      });
      onRefresh?.();
    } catch (error) {
      console.error('AI tekshiruvni qayta ishga tushirishda xato:', error);
    } finally {
      setRerunning(false);
    }
  };

  const handleDismiss = async () => {
    if (!canAct || dismissing) return;
    try {
      setDismissing(true);
      await apiClient.patch(`/tasks/${taskId}/ai-checks/${check.id}/dismiss`, {});
      onRefresh?.();
    } catch (error) {
      console.error('AI tekshiruvni yopishda xato:', error);
    } finally {
      setDismissing(false);
    }
  };

  const actionButtons = canAct ? (
    <span className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          void handleRerun();
        }}
        disabled={rerunning}
        className="h-6 w-6 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        title="Tekshiruvni qayta ishga tushirish"
      >
        <Icon
          icon="solar:refresh-bold-duotone"
          className={`w-4 h-4 ${rerunning ? 'animate-spin' : ''}`}
        />
      </button>
      {!isPass && !isDismissed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleDismiss();
          }}
          disabled={dismissing}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Ko'rib chiqildi deb belgilash (natija noto'g'ri bo'lsa)"
        >
          <Icon icon="solar:check-read-bold-duotone" className="w-4 h-4" />
        </button>
      )}
    </span>
  ) : null;

  if (isPass) {
    return (
      <div className="ml-4 mr-4 mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
        <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" />
        Invoys bilan mos
        {confidence !== null && confidence < 100 && (
          <span className="font-normal text-gray-400 dark:text-gray-500">
            (ishonch: {confidence}%)
          </span>
        )}
        {actionButtons}
      </div>
    );
  }

  const containerClass = isNeedsReview
    ? 'ml-4 mr-4 mb-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20'
    : 'ml-4 mr-4 mb-2 rounded-lg border border-red-200 dark:border-rose-800/60 bg-red-50 dark:bg-rose-900/20';
  const headerClass = isNeedsReview
    ? 'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400'
    : 'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-red-700 dark:text-rose-400';
  const borderRow = isNeedsReview
    ? 'border-amber-200 dark:border-amber-800/60'
    : 'border-red-200 dark:border-rose-800/60';

  const headline = isNeedsReview
    ? errors.length > 0
      ? `Ko'rib chiqish kerak: ${errors.length} ta ogohlantirish`
      : "Ko'rib chiqish kerak"
    : `Invoys bilan nomuvofiqlik: ${errors.length} ta`;

  const hasBody = errors.length > 0 || details.message || details.extra;

  return (
    <div className={containerClass}>
      <button onClick={() => setExpanded((prev) => !prev)} className={headerClass}>
        <span className="flex items-center gap-1.5">
          <Icon
            icon={
              isNeedsReview
                ? 'solar:question-circle-bold-duotone'
                : 'solar:danger-triangle-bold-duotone'
            }
            className="w-4 h-4"
          />
          {headline}
          {confidence !== null && (
            <span className="font-normal opacity-70">(ishonch: {confidence}%)</span>
          )}
          {isDismissed && (
            <span className="font-normal px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400">
              Ko'rib chiqilgan
            </span>
          )}
          {actionButtons}
        </span>
        <Icon
          icon={expanded ? 'solar:alt-arrow-up-bold-duotone' : 'solar:alt-arrow-down-bold-duotone'}
          className="w-4 h-4"
        />
      </button>
      {expanded && hasBody && (
        <div className="px-3 pb-3 space-y-2">
          {details.message && (
            <div className="text-xs text-gray-700 dark:text-gray-300">{details.message}</div>
          )}
          {errors.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className={`text-left text-gray-500 dark:text-gray-400 border-b ${borderRow}`}>
                    <th className="py-1.5 pr-3 font-semibold">Maydon</th>
                    <th className="py-1.5 pr-3 font-semibold">Hujjatda</th>
                    <th className="py-1.5 pr-3 font-semibold">Invoysda</th>
                    <th className="py-1.5 font-semibold">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err, idx) => (
                    <tr
                      key={idx}
                      className={`border-b last:border-b-0 align-top ${
                        isNeedsReview
                          ? 'border-amber-100 dark:border-amber-900/40'
                          : 'border-red-100 dark:border-rose-900/40'
                      }`}
                    >
                      <td className="py-1.5 pr-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {err.severity === 'warning' ? (
                            <Icon
                              icon="solar:info-circle-bold-duotone"
                              className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"
                            />
                          ) : (
                            <Icon
                              icon="solar:danger-circle-bold-duotone"
                              className="w-3.5 h-3.5 text-red-500 dark:text-rose-400"
                            />
                          )}
                          {err.label ?? err.field ?? '—'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 break-words max-w-[180px]">
                        {err.documentValue || err.st || '—'}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 break-words max-w-[180px]">
                        {err.invoiceValue || err.invoice || '—'}
                      </td>
                      <td className="py-1.5 text-gray-600 dark:text-gray-400">
                        {err.description ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {details.extra && Object.keys(details.extra).length > 0 && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {Object.entries(details.extra).map(([label, value]) => (
                <div key={label}>
                  <span className="font-medium">{label}:</span> {value}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
