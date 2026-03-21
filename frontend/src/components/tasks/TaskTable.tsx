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
  { card: 'bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-2xl border border-indigo-50 dark:border-indigo-900/50', header: 'bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-900/30 dark:to-indigo-800/30 border-b border-transparent dark:border-indigo-500/20', textTitle: 'text-white dark:text-indigo-400 font-bold drop-shadow-sm dark:drop-shadow-none', thead: 'bg-indigo-50/50 dark:bg-indigo-900/10 backdrop-blur-sm', textTh: 'text-indigo-900 dark:text-indigo-400', row: 'hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all duration-200', rowEven: 'bg-white dark:bg-gray-800', rowOdd: 'bg-indigo-50/10 dark:bg-indigo-900/5', divide: 'divide-indigo-50/50 dark:divide-indigo-900/30', border: 'border-transparent', borderCell: 'border-indigo-50/50 dark:border-indigo-900/30', empty: 'bg-white dark:bg-gray-800' },
  { card: 'bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-2xl border border-emerald-50 dark:border-emerald-900/50', header: 'bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-900/30 dark:to-emerald-800/30 border-b border-transparent dark:border-emerald-500/20', textTitle: 'text-white dark:text-emerald-400 font-bold drop-shadow-sm dark:drop-shadow-none', thead: 'bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-sm', textTh: 'text-emerald-900 dark:text-emerald-400', row: 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10 transition-all duration-200', rowEven: 'bg-white dark:bg-gray-800', rowOdd: 'bg-emerald-50/10 dark:bg-emerald-900/5', divide: 'divide-emerald-50/50 dark:divide-emerald-900/30', border: 'border-transparent', borderCell: 'border-emerald-50/50 dark:border-emerald-900/30', empty: 'bg-white dark:bg-gray-800' },
  { card: 'bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-2xl border border-violet-50 dark:border-violet-900/50', header: 'bg-gradient-to-r from-violet-500 to-violet-600 dark:from-violet-900/30 dark:to-violet-800/30 border-b border-transparent dark:border-violet-500/20', textTitle: 'text-white dark:text-violet-400 font-bold drop-shadow-sm dark:drop-shadow-none', thead: 'bg-violet-50/50 dark:bg-violet-900/10 backdrop-blur-sm', textTh: 'text-violet-900 dark:text-violet-400', row: 'hover:bg-violet-50/40 dark:hover:bg-violet-500/10 transition-all duration-200', rowEven: 'bg-white dark:bg-gray-800', rowOdd: 'bg-violet-50/10 dark:bg-violet-900/5', divide: 'divide-violet-50/50 dark:divide-violet-900/30', border: 'border-transparent', borderCell: 'border-violet-50/50 dark:border-violet-900/30', empty: 'bg-white dark:bg-gray-800' },
];

const oltiariqTheme: BranchTheme = { card: 'bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-2xl border border-amber-50 dark:border-amber-900/50', header: 'bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-transparent dark:border-amber-500/20', textTitle: 'text-white dark:text-amber-500 font-bold drop-shadow-sm dark:drop-shadow-none', thead: 'bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-sm', textTh: 'text-amber-900 dark:text-amber-500/80', row: 'hover:bg-amber-50/40 dark:hover:bg-amber-500/10 transition-all duration-200', rowEven: 'bg-white dark:bg-gray-800', rowOdd: 'bg-amber-50/10 dark:bg-amber-900/5', divide: 'divide-amber-50/50 dark:divide-amber-900/30', border: 'border-transparent', borderCell: 'border-amber-50/50 dark:border-amber-900/30', empty: 'bg-white dark:bg-gray-800' };

const toshkentTheme: BranchTheme = { card: 'bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-2xl border border-blue-50 dark:border-blue-900/50', header: 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-900/30 dark:to-blue-800/30 border-b border-transparent dark:border-blue-500/20', textTitle: 'text-white dark:text-blue-400 font-bold drop-shadow-sm dark:drop-shadow-none', thead: 'bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-sm', textTh: 'text-blue-900 dark:text-blue-400', row: 'hover:bg-blue-50/40 dark:hover:bg-blue-500/10 transition-all duration-200', rowEven: 'bg-white dark:bg-gray-800', rowOdd: 'bg-blue-50/10 dark:bg-blue-900/5', divide: 'divide-blue-50/50 dark:divide-blue-900/30', border: 'border-transparent', borderCell: 'border-blue-50/50 dark:border-blue-900/30', empty: 'bg-white dark:bg-gray-800' };

const archiveTheme: BranchTheme = { card: 'bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-2xl border border-slate-100 dark:border-slate-700/50', header: 'bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800/80 dark:to-slate-900/80 border-b border-transparent dark:border-slate-700/50', textTitle: 'text-white dark:text-slate-300 font-bold drop-shadow-sm dark:drop-shadow-none', thead: 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 backdrop-blur-sm', textTh: 'text-slate-700 dark:text-slate-400', row: 'hover:bg-slate-200 dark:hover:bg-slate-700/50 cursor-pointer transition-all duration-200 hover:shadow-sm dark:hover:shadow-none', rowEven: 'bg-white dark:bg-gray-800', rowOdd: 'bg-slate-50/30 dark:bg-slate-800/50', divide: 'divide-slate-100/50 dark:divide-slate-700/50', border: 'border-transparent', borderCell: 'border-slate-100/50 dark:border-slate-700/50', empty: 'bg-white dark:bg-gray-800' };

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

  let color = 'text-gray-500';
  if (hours < 2) {
    color = 'text-green-600';
  } else if (hours >= 2 && hours <= 3) {
    color = 'text-yellow-600';
  } else {
    color = 'text-red-600';
  }

  return { text, color };
}

export function getBXMColor(multiplier: number | null | undefined): string {
  if (!multiplier) return 'bg-gray-100 text-gray-800';
  const value = Number(multiplier);
  if (value === 1) return 'bg-green-100 text-green-800';
  if (value === 1.5) return 'bg-blue-100 text-blue-800';
  if (value === 2) return 'bg-yellow-100 text-yellow-800';
  if (value === 2.5) return 'bg-orange-100 text-orange-800';
  if (value === 3) return 'bg-red-100 text-red-800';
  if (value === 4) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
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
      <div className={`px-5 py-3.5 relative overflow-hidden ${colors.header}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none"></div>
        <h2 className={`text-lg tracking-wide relative z-10 ${colors.textTitle}`}>
          {isArchive ? 'Arxiv' : `${branchName} filiali`}
        </h2>
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
                <td colSpan={isArchive ? 9 : 5} className={`px-4 py-3 text-center text-sm text-gray-500 ${colors.empty}`}>
                  Ma'lumotlar yo'q
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
                    <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b ${colors.borderCell}`}>
                      {task.title}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b ${colors.borderCell}`}>
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full ${getAvatarColor(
                            task.client.name
                          )} flex items-center justify-center text-xs font-semibold text-gray-700 mr-2 shadow-sm`}
                        >
                          {getInitials(task.client.name)}
                        </div>
                        <span className="text-xs">{task.client.name}</span>
                      </div>
                    </td>
                    {isArchive && (
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b ${colors.borderCell}`}>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {task.branch.name}
                        </span>
                      </td>
                    )}
                    {isArchive && (
                      <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${task.hasPsr ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                    <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
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
                    <td className={`px-3 py-2 text-xs text-gray-700 border-b ${colors.borderCell} max-w-[200px] min-w-[150px]`}>
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
