import React from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../CurrencyDisplay';

export interface WorkerRowData {
  id: number;
  name: string;
  email: string;
  role: string;
  position?: string;
  salary?: number;
  branch?: { id: number; name: string };
  createdAt?: string;
  phone?: string;
  currentDebt?: number;
  salaryCurrency?: 'USD' | 'UZS';
  active?: boolean;
}

interface WorkerRowProps {
  worker: WorkerRowData;
  isOnline: boolean;
  isMobile: boolean;
  handleEdit: (worker: WorkerRowData) => void;
  handleDelete: (id: number) => void;
  handleArchive: (worker: WorkerRowData) => void;
  handleRestore: (worker: WorkerRowData) => void;
}

export const ROLE_META: Record<string, { label: string; chip: string }> = {
  ADMIN: { label: 'Admin', chip: 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-300' },
  MANAGER: { label: 'Menejer', chip: 'bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-300' },
  DEKLARANT: { label: 'Deklarant', chip: 'bg-teal-100 text-teal-900 dark:bg-teal-500/15 dark:text-teal-300' },
  SELLER: { label: 'Sotuvchi', chip: 'bg-pink-100 text-pink-900 dark:bg-pink-500/15 dark:text-pink-300' },
};

export const WORKER_GRID_COLS =
  'grid-cols-[minmax(0,2.6fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_168px]';

const getInitials = (name: string): string =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const getExperience = (createdAt?: string): string => {
  if (!createdAt) return '—';
  const months = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
  return months < 12 ? `${months} oy` : `${Math.floor(months / 12)} yil`;
};

const WorkerRow = React.memo(({ worker, isOnline, isMobile, handleEdit, handleDelete, handleArchive, handleRestore }: WorkerRowProps) => {
  const navigate = useNavigate();
  const archived = worker.active === false;
  const role = ROLE_META[worker.role] ?? { label: worker.role, chip: 'bg-gray-100 text-gray-800' };
  const hasDebt = (worker.currentDebt ?? 0) > 0;

  const iconBtn =
    'w-10 h-10 flex items-center justify-center rounded-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors';

  return (
    <div className={`grid ${WORKER_GRID_COLS} gap-4 items-center px-6 py-3.5 border-b border-gray-100 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${archived ? 'opacity-75' : ''}`}>
      <Link to={`/workers/${worker.id}`} className="flex items-center gap-3.5 min-w-0">
        <span className="relative shrink-0 w-11 h-11">
          <span className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[15px] font-extrabold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
            {getInitials(worker.name)}
          </span>
          <span
            title={isOnline ? 'Onlayn' : 'Oflayn'}
            className={`absolute -right-[3px] -bottom-[3px] w-[13px] h-[13px] rounded-full border-[2.5px] border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'}`}
          />
        </span>
        <span className="min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">{worker.name}</span>
          <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{worker.email || worker.phone || '—'}</span>
        </span>
      </Link>

      <div>
        <span className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-bold ${role.chip}`}>{role.label}</span>
      </div>

      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{worker.branch?.name || '—'}</div>

      <div className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">{getExperience(worker.createdAt)}</div>

      <div className="flex justify-end">
        <span className={`inline-flex items-center gap-2 h-[30px] px-3 rounded-full text-[13px] font-bold tabular-nums ${hasDebt
          ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200'
          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200'}`}>
          <span className={`w-[7px] h-[7px] rounded-full ${hasDebt ? 'bg-orange-600' : 'bg-emerald-600'}`} />
          {hasDebt ? (
            <CurrencyDisplay amount={worker.currentDebt as number} originalCurrency={worker.salaryCurrency || 'UZS'} forceOriginal={true} />
          ) : (
            "Qarz yo'q"
          )}
        </span>
      </div>

      <div className="flex justify-end gap-1">
        <button type="button" aria-label="Hisobot" title="Hisobot" onClick={() => navigate(`/workers/${worker.id}/report`)} className={iconBtn}>
          <Icon icon="solar:chart-bold-duotone" className="w-[18px] h-[18px]" />
        </button>
        {archived ? (
          <>
            <button type="button" aria-label="Qaytarish" title="Arxivdan qaytarish" onClick={() => handleRestore(worker)} className={iconBtn}>
              <Icon icon="solar:restart-bold-duotone" className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              aria-label="O'chirish"
              title="Butunlay o'chirish"
              onClick={() => handleDelete(worker.id)}
              className={`${iconBtn} !text-red-700 dark:!text-red-400`}
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-[18px] h-[18px]" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label="Tahrirlash"
              title="Tahrirlash"
              onClick={() => (isMobile ? navigate(`/workers/${worker.id}/edit`) : handleEdit(worker))}
              className={iconBtn}
            >
              <Icon icon="solar:pen-bold-duotone" className="w-[18px] h-[18px]" />
            </button>
            <button type="button" aria-label="Arxivlash" title="Arxivlash (ishdan chiqdi)" onClick={() => handleArchive(worker)} className={iconBtn}>
              <Icon icon="solar:archive-down-bold-duotone" className="w-[18px] h-[18px]" />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default WorkerRow;
