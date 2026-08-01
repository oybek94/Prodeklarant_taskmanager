import React from 'react';
import { Icon } from '@iconify/react';
import type { TareWarning } from './invoiceUtils';
import { formatNumber } from './invoiceUtils';

interface TareWarningModalProps {
  warnings: TareWarning[];
  /** "Tuzatish" — modalni yopadi, saqlamaydi */
  onCancel: () => void;
  /** "Baribir saqlash" — tekshiruvni chetlab o'tib saqlaydi */
  onConfirm: () => void;
  saving?: boolean;
}

/**
 * Qadoq turi shubhali bo'lganda chiqadigan tasdiqlash oynasi.
 *
 * Bloklamaydi — deklarant nostandart qadoqda ishlashi mumkin.
 * Maqsad: adashib boshqa qadoq turi tanlanganini saqlashdan oldin ko'rsatish.
 */
export const TareWarningModal: React.FC<TareWarningModalProps> = ({
  warnings,
  onCancel,
  onConfirm,
  saving = false,
}) => {
  if (warnings.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tare-warning-title"
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-amber-200 dark:border-amber-800/60">
        {/* Sarlavha */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100 dark:border-slate-700">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Icon
              icon="solar:danger-triangle-bold-duotone"
              className="w-5 h-5 text-amber-500 dark:text-amber-400"
            />
          </div>
          <div className="min-w-0">
            <h2
              id="tare-warning-title"
              className="text-base font-bold text-gray-800 dark:text-slate-200"
            >
              Qadoq turi to&apos;g&apos;ri tanlanganmi?
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {warnings.length} ta qatorda bir qadoq tarasi tanlangan qadoq turiga mos kelmayapti.
            </p>
          </div>
        </div>

        {/* Shubhali qatorlar */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {warnings.map((w) => (
            <div
              key={w.rowIndex}
              className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-3"
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {w.rowIndex + 1}-qator
                </span>
                <span className="font-medium text-gray-800 dark:text-slate-200">{w.itemName}</span>
              </div>

              <div className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                Tanlangan: <strong>{w.packageType}</strong> — kutilgan tara{' '}
                {formatNumber(w.expectedMin)}–{formatNumber(w.expectedMax)} kg
              </div>
              <div className="text-sm text-gray-700 dark:text-slate-300">
                Hisoblangan tara:{' '}
                <strong className="text-amber-700 dark:text-amber-400">
                  {formatNumber(w.tarePerPkg)} kg
                </strong>{' '}
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  (brutto − netto) / qadoq soni
                </span>
              </div>

              {w.suggestions.length > 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-800 dark:text-slate-200">
                  <Icon
                    icon="solar:lightbulb-bolt-bold-duotone"
                    className="w-4 h-4 mt-0.5 shrink-0 text-amber-500 dark:text-amber-400"
                  />
                  <span>
                    Bu og&apos;irlik{' '}
                    {w.suggestions.map((s, i) => (
                      <React.Fragment key={s}>
                        {i > 0 && ' yoki '}
                        <strong>{s}</strong>
                      </React.Fragment>
                    ))}{' '}
                    ga to&apos;g&apos;ri keladi.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Amallar */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 border-t border-gray-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Baribir saqlash'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            autoFocus
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            Tuzatish
          </button>
        </div>
      </div>
    </div>
  );
};
