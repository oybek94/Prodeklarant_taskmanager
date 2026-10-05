import React from 'react';
import type { Branch } from './types';

export const StatusBadge = ({ status, onClick, isMobile, progress }: { status: string | undefined, onClick: (e: React.MouseEvent) => void, isMobile?: boolean, progress?: number }) => {
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
  const hasProgress = typeof progress === 'number';
  const buttonBg = hasProgress ? 'bg-white dark:bg-gray-800' : config.bg;
  
  return (
    <button
      type="button"
      onClick={onClick}
      title={hasProgress ? `Jarayonlar: ${progress}%` : "Jarayonlar (task tafsilotlari)"}
      className={`${baseClasses} ${sizeClasses} ${buttonBg} ${config.border} ${config.textClass} relative overflow-hidden`}
    >
      {hasProgress && (
        <div 
          className={`absolute left-0 top-0 bottom-0 ${config.bg} transition-all duration-300 pointer-events-none`}
          style={{ width: `${progress}%` }}
        />
      )}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 relative z-10 ${config.dot}`}></span>
      <span className="relative z-10">{config.text}</span>
    </button>
  );
};

// Invoyslar ro'yxati uchun holat kapsulasi: nuqta + yorliq (ko'k, sariq, yashil-teal)
const STATUS_PILL = {
  new: { bg: 'bg-[#E8EDFB] dark:bg-[#2B4BB0]/20', text: 'text-[#2B4BB0] dark:text-[#9DB4FF]', dot: 'bg-[#2B4BB0] dark:bg-[#9DB4FF]' },
  run: { bg: 'bg-[#FDF1DC] dark:bg-[#C27A0E]/20', text: 'text-[#8A5300] dark:text-[#F5C26B]', dot: 'bg-[#8A5300] dark:bg-[#F5C26B]' },
  done: { bg: 'bg-[#E3F3F1] dark:bg-[#0B6E6E]/25', text: 'text-[#0B6E6E] dark:text-[#5FD0C8]', dot: 'bg-[#0B6E6E] dark:bg-[#5FD0C8]' },
  none: { bg: 'bg-gray-100 dark:bg-slate-800/50', text: 'text-gray-500 dark:text-slate-400', dot: 'bg-gray-400' },
} as const;

export const StatusPill = ({ status, onClick }: { status: string | undefined, onClick: (e: React.MouseEvent) => void }) => {
  const { text, tone } = (() => {
    if (!status) return { text: '—', tone: 'none' as const };
    switch (status.toUpperCase()) {
      case 'BOSHLANMAGAN': return { text: 'Boshlanmagan', tone: 'new' as const };
      case 'JARAYONDA': return { text: 'Jarayonda', tone: 'run' as const };
      case 'TAYYOR': return { text: 'Tayyor', tone: 'run' as const };
      case 'TEKSHIRILGAN': return { text: 'Tekshirilgan', tone: 'run' as const };
      case 'TOPSHIRILDI': return { text: 'Topshirildi', tone: 'run' as const };
      case 'YAKUNLANDI': return { text: 'Yakunlandi', tone: 'done' as const };
      default: return { text: status, tone: 'none' as const };
    }
  })();
  const c = STATUS_PILL[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title="Jarayonlar (task tafsilotlari)"
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80 ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`}></span>
      {text}
    </button>
  );
};

// Bosqichlar chizig'i: bajarilgan = yashil, navbatdagi = sariq (xatolik bo'lsa qizil), qolgani kulrang
export const StageProgress = ({ stages, taskStatus, hasErrors }: { stages?: { name: string; status: string }[]; taskStatus?: string; hasErrors: boolean }) => {
  const total = stages?.length ?? 0;
  if (!stages || total === 0) return <span className="text-sm text-gray-400">—</span>;
  const done = stages.filter((s) => s.status === 'TAYYOR').length;
  const finished = taskStatus === 'YAKUNLANDI' || done === total;
  const activeIdx = finished ? -1 : done;
  const notStarted = taskStatus === 'BOSHLANMAGAN' && done === 0;
  const activeColor = hasErrors ? 'bg-[#B42318]' : notStarted ? 'bg-[#DDE1E7] dark:bg-slate-600' : 'bg-[#C27A0E]';
  return (
    <div>
      <div className="flex gap-[3px]">
        {stages.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-[3px] ${i < done || finished ? 'bg-[#0B6E6E]' : i === activeIdx ? activeColor : 'bg-[#DDE1E7] dark:bg-slate-600'}`}
          />
        ))}
      </div>
      <div className="text-xs text-[#5B6472] dark:text-gray-400 mt-1.5">{finished ? total : done} / {total} bosqich</div>
    </div>
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
