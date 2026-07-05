import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import type { AiCheck, AiCheckDetails, AiCheckError } from './types';

interface DocumentVerificationReportProps {
  check: AiCheck;
}

/**
 * Yuklangan hujjatning bazadagi invoys bilan moslik tekshiruvi hisoboti.
 * PASS — yashil belgi; FAIL — nomuvofiqliklar jadvali (ochib-yopiladigan).
 */
export const DocumentVerificationReport: React.FC<DocumentVerificationReportProps> = ({ check }) => {
  const [expanded, setExpanded] = useState(false);

  const details: AiCheckDetails =
    typeof check.details === 'string'
      ? (() => {
          try {
            return JSON.parse(check.details) as AiCheckDetails;
          } catch {
            return {};
          }
        })()
      : check.details;

  const errors: AiCheckError[] = Array.isArray(details.errors) ? details.errors : [];
  const isPass = check.result === 'PASS';

  if (isPass) {
    return (
      <div className="ml-4 mr-4 mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
        <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" />
        Invoys bilan mos
      </div>
    );
  }

  return (
    <div className="ml-4 mr-4 mb-2 rounded-lg border border-red-200 dark:border-rose-800/60 bg-red-50 dark:bg-rose-900/20">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-red-700 dark:text-rose-400"
      >
        <span className="flex items-center gap-1.5">
          <Icon icon="solar:danger-triangle-bold-duotone" className="w-4 h-4" />
          Invoys bilan nomuvofiqlik: {errors.length} ta
        </span>
        <Icon
          icon={expanded ? 'solar:alt-arrow-up-bold-duotone' : 'solar:alt-arrow-down-bold-duotone'}
          className="w-4 h-4"
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-red-200 dark:border-rose-800/60">
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
                  className="border-b border-red-100 dark:border-rose-900/40 last:border-b-0 align-top"
                >
                  <td className="py-1.5 pr-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {err.label ?? err.field ?? '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 break-words max-w-[180px]">
                    {err.documentValue || err.st || '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 break-words max-w-[180px]">
                    {err.invoiceValue || err.invoice || '—'}
                  </td>
                  <td className="py-1.5 text-gray-600 dark:text-gray-400">{err.description ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
