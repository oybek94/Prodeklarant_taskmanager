import React from 'react';
import { Icon } from '@iconify/react';
import {
  formatDate, getStatusInfo, getAvatarColor, getInitials,
} from './taskHelpers';
import type { Task } from './types';

// ============== Theme / color constants ==============

interface BranchTheme {
  card: string;
  header: string;
  textTitle: string;
  thead: string;
  textTh: string;
  row: string;
  rowEven: string;
  rowOdd: string;
  divide: string;
  border: string;
  borderCell: string;
  empty: string;
}

const branchCardColors: BranchTheme[] = [
  { card: 'bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800', header: 'bg-indigo-600 dark:bg-slate-800/80 border-b border-indigo-700 dark:border-slate-800', textTitle: 'text-white font-semibold', thead: 'bg-gray-50 dark:bg-slate-900/50', textTh: 'text-gray-600 dark:text-slate-300', row: 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors', rowEven: 'bg-white dark:bg-slate-900', rowOdd: 'bg-gray-50/30 dark:bg-slate-800/30', divide: 'divide-gray-100 dark:divide-slate-800', border: 'border-transparent', borderCell: 'border-gray-100 dark:border-slate-800', empty: 'bg-white dark:bg-slate-900' },
  { card: 'bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800', header: 'bg-emerald-600 dark:bg-slate-800/80 border-b border-emerald-700 dark:border-slate-800', textTitle: 'text-white font-semibold', thead: 'bg-gray-50 dark:bg-slate-900/50', textTh: 'text-gray-600 dark:text-slate-300', row: 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors', rowEven: 'bg-white dark:bg-slate-900', rowOdd: 'bg-gray-50/30 dark:bg-slate-800/30', divide: 'divide-gray-100 dark:divide-slate-800', border: 'border-transparent', borderCell: 'border-gray-100 dark:border-slate-800', empty: 'bg-white dark:bg-slate-900' },
  { card: 'bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800', header: 'bg-violet-600 dark:bg-slate-800/80 border-b border-violet-700 dark:border-slate-800', textTitle: 'text-white font-semibold', thead: 'bg-gray-50 dark:bg-slate-900/50', textTh: 'text-gray-600 dark:text-slate-300', row: 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors', rowEven: 'bg-white dark:bg-slate-900', rowOdd: 'bg-gray-50/30 dark:bg-slate-800/30', divide: 'divide-gray-100 dark:divide-slate-800', border: 'border-transparent', borderCell: 'border-gray-100 dark:border-slate-800', empty: 'bg-white dark:bg-slate-900' },
];

const oltiariqTheme: BranchTheme = { card: 'bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800', header: 'bg-amber-600 dark:bg-slate-800/80 border-b border-amber-700 dark:border-slate-800', textTitle: 'text-white font-semibold', thead: 'bg-gray-50 dark:bg-slate-900/50', textTh: 'text-gray-600 dark:text-slate-300', row: 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors', rowEven: 'bg-white dark:bg-slate-900', rowOdd: 'bg-gray-50/30 dark:bg-slate-800/30', divide: 'divide-gray-100 dark:divide-slate-800', border: 'border-transparent', borderCell: 'border-gray-100 dark:border-slate-800', empty: 'bg-white dark:bg-slate-900' };

const toshkentTheme: BranchTheme = { card: 'bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800', header: 'bg-blue-600 dark:bg-slate-800/80 border-b border-blue-700 dark:border-slate-800', textTitle: 'text-white font-semibold', thead: 'bg-gray-50 dark:bg-slate-900/50', textTh: 'text-gray-600 dark:text-slate-300', row: 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors', rowEven: 'bg-white dark:bg-slate-900', rowOdd: 'bg-gray-50/30 dark:bg-slate-800/30', divide: 'divide-gray-100 dark:divide-slate-800', border: 'border-transparent', borderCell: 'border-gray-100 dark:border-slate-800', empty: 'bg-white dark:bg-slate-900' };

const archiveTheme: BranchTheme = { card: 'bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800', header: 'bg-slate-700 dark:bg-slate-800/80 border-b border-slate-800 dark:border-slate-800', textTitle: 'text-white font-semibold', thead: 'bg-gray-50 dark:bg-slate-900/50', textTh: 'text-gray-600 dark:text-slate-300', row: 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors', rowEven: 'bg-white dark:bg-slate-900', rowOdd: 'bg-gray-50/30 dark:bg-slate-800/30', divide: 'divide-gray-100 dark:divide-slate-800', border: 'border-transparent', borderCell: 'border-gray-100 dark:border-slate-800', empty: 'bg-white dark:bg-slate-900' };

// ============== Helper functions ==============

export function calculateTotalDuration(task: Task): { text: string; color: string } {
  if (!task.stages || task.stages.length === 0) return { text: '-', color: 'text-gray-500' };
  const totalMinutes = task.stages.reduce((sum, stage) => sum + (stage.durationMin || 0), 0);
  if (totalMinutes <= 0) return { text: '-', color: 'text-gray-500' };

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let text = '';
  if (hours > 0) {
    text = `${hours} soat ${minutes} daqiqa`;
  } else {
    text = `${minutes} daqiqa`;
  }

  let color = 'text-gray-500 dark:text-gray-400';
  if (hours < 2) {
    color = 'text-green-600 dark:text-emerald-400';
  } else if (hours >= 2 && hours <= 3) {
    color = 'text-yellow-600 dark:text-amber-400';
  } else {
    color = 'text-red-600 dark:text-red-400';
  }

  return { text, color };
}

export function getBXMColor(multiplier: number | null | undefined): string {
  if (!multiplier) return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400 border border-transparent dark:border-slate-700';
  const value = Number(multiplier);
  if (value === 1) return 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50';
  if (value === 1.5) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50';
  if (value === 2) return 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/30 dark:text-amber-400 border border-transparent dark:border-amber-800/50';
  if (value === 2.5) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-transparent dark:border-orange-800/50';
  if (value === 3) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-transparent dark:border-red-800/50';
  if (value === 4) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-transparent dark:border-purple-800/50';
  return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400 border border-transparent dark:border-slate-700';
}

function getThemeForBranch(branchName: string, colorIndex: number): BranchTheme {
  if (branchName === 'Arxiv') return archiveTheme;
  if (branchName === 'Oltiariq') return oltiariqTheme;
  if (branchName === 'Toshkent') return toshkentTheme;
  return branchCardColors[colorIndex % branchCardColors.length];
}

// ============== Component ==============

interface TaskTableProps {
  tasks: Task[];
  branchName: string;
  branchColorIndex?: number;
  onTaskClick: (taskId: number) => void;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks: branchTasks,
  branchName,
  branchColorIndex = 0,
  onTaskClick,
}) => {
  const isArchive = branchName === 'Arxiv';
  const colors = getThemeForBranch(branchName, branchColorIndex);

  return (
    <div className={`${colors.card} overflow-hidden font-sans`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${colors.header}`}>
        <h2 className={`text-lg font-bold tracking-tight relative z-10 flex items-center gap-2.5 ${colors.textTitle}`}>
          <Icon icon={isArchive ? "lucide:archive" : "lucide:building-2"} className="w-5 h-5 opacity-90" />
          {isArchive ? 'Arxiv' : `${branchName} filiali`}
        </h2>
        <div className="bg-black/10 dark:bg-white/10 px-2.5 py-0.5 rounded-lg text-sm font-bold text-white shadow-sm backdrop-blur-sm ring-1 ring-white/20">
          {branchTasks.length} ta vazifa
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className={`${colors.thead}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                Task
              </th>
              <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                Klient
              </th>
              {isArchive && (
                <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                  Filial
                </th>
              )}
              {isArchive && (
                <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                  PSR
                </th>
              )}
              {isArchive && (
                <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                  BXM
                </th>
              )}
              <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                Start Date
              </th>
              {isArchive && (
                <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                  Vaqt
                </th>
              )}
              <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                Status
              </th>
              <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider border-b ${colors.border} ${colors.textTh}`}>
                Comments
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${colors.divide}`}>
            {branchTasks.length === 0 ? (
              <tr>
                <td colSpan={isArchive ? 9 : 5} className={`px-4 py-12 text-center text-sm text-gray-500 ${colors.empty}`}>
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-full">
                      <Icon icon="lucide:inbox" className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Ma'lumotlar yo'q</span>
                  </div>
                </td>
              </tr>
            ) : (
              branchTasks.map((task, index) => {
                const statusInfo = getStatusInfo(task.status);
                const totalDuration = calculateTotalDuration(task);
                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className={`${colors.row} transition-colors cursor-pointer ${index % 2 === 0 ? colors.rowEven : colors.rowOdd
                      }`}
                  >
                    <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-b ${colors.borderCell}`}>
                      {task.title}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 border-b ${colors.borderCell}`}>
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full ${getAvatarColor(
                            task.client.name
                          )} flex items-center justify-center text-xs font-semibold mr-2 shadow-sm`}
                        >
                          {getInitials(task.client.name)}
                        </div>
                        <span className="text-xs">{task.client.name}</span>
                      </div>
                    </td>
                    {isArchive && (
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b ${colors.borderCell}`}>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50 rounded-full">
                          {task.branch.name}
                        </span>
                      </td>
                    )}
                    {isArchive && (
                      <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border border-transparent ${task.hasPsr ? 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}>
                          {task.hasPsr ? 'Bor' : 'Yo\'q'}
                        </span>
                      </td>
                    )}
                    {isArchive && (
                      <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBXMColor(task.customsPaymentMultiplier)}`}>
                          {task.customsPaymentMultiplier ? `${task.customsPaymentMultiplier} BXM` : '-'}
                        </span>
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-gray-400 border-b ${colors.borderCell}`}>
                      {formatDate(task.createdAt)}
                    </td>
                    {isArchive && (
                      <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                        <div className="flex items-center gap-1.5">
                          <Icon icon="lucide:clock" className={`w-3.5 h-3.5 ${totalDuration.color}`} />
                          <span className={`font-medium ${totalDuration.color}`}>{totalDuration.text}</span>
                        </div>
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap text-sm border-b ${colors.borderCell}`}>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color} shadow-sm`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-xs text-gray-700 dark:text-gray-400 border-b ${colors.borderCell} max-w-[200px] min-w-[150px]`}>
                      <div className="truncate" title={task.comments || undefined}>
                        {task.comments || '-'}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskTable;
