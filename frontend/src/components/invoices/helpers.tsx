import React from 'react';
import type { Branch } from './types';

export const StatusBadge = ({ status, onClick, isMobile }: { status: string | undefined, onClick: (e: React.MouseEvent) => void, isMobile?: boolean }) => {
  const config = (() => {
    if (!status) return { text: '—', bg: 'bg-gray-100/80 dark:bg-slate-800/50', textClass: 'text-gray-500 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-700', dot: 'bg-gray-400' };
    const s = status.toUpperCase();
    switch (s) {
      case 'BOSHLANMAGAN': return { text: 'Boshlanmagan', bg: 'bg-slate-50/80 dark:bg-slate-500/10', textClass: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-500/30', dot: 'bg-slate-400' };
      case 'JARAYONDA': return { text: 'Jarayonda', bg: 'bg-amber-50/80 dark:bg-amber-500/10', textClass: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500 animate-pulse' };
      case 'TAYYOR': return { text: 'Tayyor', bg: 'bg-sky-50/80 dark:bg-sky-500/10', textClass: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-500/30', dot: 'bg-sky-500' };
      case 'TEKSHIRILGAN': return { text: 'Tekshirilgan', bg: 'bg-blue-50/80 dark:bg-blue-500/10', textClass: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30', dot: 'bg-blue-500' };
      case 'TOPSHIRILDI': return { text: 'Topshirildi', bg: 'bg-indigo-50/80 dark:bg-indigo-500/10', textClass: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-500/30', dot: 'bg-indigo-500' };
      case 'YAKUNLANDI': return { text: 'Yakunlandi', bg: 'bg-emerald-50/80 dark:bg-emerald-500/10', textClass: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-500' };
      default: return { text: status, bg: 'bg-gray-50/80 dark:bg-slate-800/50', textClass: 'text-gray-600 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-700', dot: 'bg-gray-400' };
    }
  })();

  const baseClasses = "inline-flex items-center gap-1.5 rounded-full border transition-all duration-200 hover:shadow-sm backdrop-blur-sm cursor-pointer hover:-translate-y-[1px]";
  const sizeClasses = isMobile ? "px-2.5 py-0.5 text-[10px] font-bold tracking-wide" : "px-3 py-1 text-xs font-semibold shadow-sm";
  
  return (
    <button
      type="button"
      onClick={onClick}
      title="Jarayonlar (task tafsilotlari)"
      className={`${baseClasses} ${sizeClasses} ${config.bg} ${config.border} ${config.textClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}></span>
      <span>{config.text}</span>
    </button>
  );
};

const FILIAL_CELL_COLORS = [
  'bg-indigo-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border border-transparent dark:border-violet-800/50',
];

export const getBranchCellClass = (branchName: string | undefined, branchId: number | undefined, branches: Branch[]): string => {
  if (!branchName) return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-transparent dark:border-slate-700';
  if (branchName === 'Oltiariq') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-transparent dark:border-amber-800/50';
  if (branchName === 'Toshkent') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50';
  if (branchName === 'Sirdaryo' || branchName?.includes('irdaryo')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50';
  if (branchName === 'Surxondaryo' || branchName?.includes('Surxon')) return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border border-transparent dark:border-violet-800/50';
  const sorted = [...(branches || [])].sort((a, b) => a.id - b.id);
  const idx = branchId != null ? sorted.findIndex((b) => b.id === branchId) : -1;
  if (idx >= 0) return FILIAL_CELL_COLORS[idx % FILIAL_CELL_COLORS.length];
  return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-transparent dark:border-slate-700';
};
