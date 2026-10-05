import React from 'react';
import { Icon } from '@iconify/react';

interface InvoicesHeaderProps {
  canEdit: boolean;
  isMobile: boolean;
  onOpenCreateModal: () => void;
  onReport: () => void;
  reportLoading: boolean;
}

export const InvoicesHeader: React.FC<InvoicesHeaderProps> = ({
  canEdit,
  isMobile,
  onOpenCreateModal,
  onReport,
  reportLoading,
}) => {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-4 sm:mb-6 shrink-0 font-['Onest',system-ui,sans-serif]">
      <div>
        {!isMobile && <div className="text-[13px] font-medium text-[#5B6472] dark:text-gray-400">Ish jarayoni</div>}
        <h1 className="mt-0.5 text-[26px] sm:text-[32px] leading-[1.15] font-bold tracking-[-0.02em] text-[#151A22] dark:text-gray-100">Invoyslar</h1>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {!isMobile && (
          <button
            type="button"
            onClick={onReport}
            disabled={reportLoading}
            className="h-11 px-4 rounded-[10px] border border-[#D5D9E0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#151A22] dark:text-gray-100 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            <Icon icon="solar:download-minimalistic-bold-duotone" className="w-[18px] h-[18px]" />
            {reportLoading ? 'Tayyorlanmoqda...' : 'Hisobot'}
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="h-11 px-4 sm:px-[18px] rounded-[10px] bg-[#0B6E6E] hover:bg-[#095c5c] text-white text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="w-[18px] h-[18px]" />
            {isMobile ? 'Yangi' : 'Yangi invoys'}
          </button>
        )}
      </div>
    </div>
  );
};
