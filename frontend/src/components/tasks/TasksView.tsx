import React from 'react';
import { Icon } from '@iconify/react';
import { TaskTableSkeleton } from './Skeletons';
import TaskTable from './TaskTable';
import type { Task, Branch } from './types';

interface TasksViewProps {
  loading: boolean;
  showArchive: boolean;
  archivePageTasks: Task[];
  archiveTotalPages: number;
  archiveTotalTasks: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  getPageNumbers: (current: number, total: number) => (number | string)[];
  isDeklarantWithBranch: boolean | "" | undefined;
  userBranchTasks: Task[];
  userBranch: Branch | undefined | null;
  branches: Branch[];
  tasksByBranch: Map<string, Task[]>;
  isMobile: boolean;
  handleTaskClick: (taskId: number) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  loading,
  showArchive,
  archivePageTasks,
  archiveTotalPages,
  archiveTotalTasks,
  page,
  setPage,
  getPageNumbers,
  isDeklarantWithBranch,
  userBranchTasks,
  userBranch,
  branches,
  tasksByBranch,
  isMobile,
  handleTaskClick,
}) => {
  return (
    <div className="order-1 md:order-2">
      {loading ? (
        <TaskTableSkeleton rows={6} />
      ) : showArchive ? (
        // Arxiv bo'limida barcha tasklar bitta jadvalda, har sahifada 20 ta (pagination)
        <div>
          <TaskTable tasks={archivePageTasks} branchName='Arxiv' onTaskClick={handleTaskClick} />
          {!loading && archiveTotalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Jami <span className="font-bold text-gray-900 dark:text-gray-100">{archiveTotalTasks}</span> ta task,{' '}
                <span className="font-bold text-gray-900 dark:text-gray-100">{page}</span>/{archiveTotalPages} sahifa
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-1.5 ${page === 1
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-500 dark:bg-slate-700 text-white hover:bg-indigo-600 dark:hover:bg-slate-600'
                    }`}
                >
                  <Icon icon="solar:alt-arrow-left-bold-duotone" className="w-4.5 h-4.5" />
                  Oldingi
                </button>
                {getPageNumbers(page, archiveTotalPages).map((p: number | string) => (
                  <button
                    key={`archive-page-${p}`}
                    type="button"
                    onClick={() => typeof p === 'number' && setPage(p)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${p === page
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(archiveTotalPages, p + 1))}
                  disabled={page === archiveTotalPages}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-1.5 ${page === archiveTotalPages
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-500 dark:bg-slate-700 text-white hover:bg-indigo-600 dark:hover:bg-slate-600'
                    }`}
                >
                  Keyingi
                  <Icon icon="solar:alt-arrow-right-bold-duotone" className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Barcha ishlar bo'limida filiallarga bo'lingan
        isDeklarantWithBranch && userBranch ? (
          // DEKLARANT uchun faqat o'zining filiali to'liq kenglikda
          <div className="w-full">
            <TaskTable tasks={userBranchTasks} branchName={userBranch.name} onTaskClick={handleTaskClick} />
          </div>
        ) : (
          // ADMIN/MANAGER uchun barcha filiallar - dinamik
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-[30px]">
            {Array.isArray(branches) && 
              [...branches]
                .sort((a, b) => {
                  if (!isMobile) return 0; // Desktopda tartibni buzmaymiz
                  const tasksA = tasksByBranch.get(a.name)?.length || 0;
                  const tasksB = tasksByBranch.get(b.name)?.length || 0;
                  return tasksB - tasksA; // Ishi ko'pini tepaga chiqaramiz
                })
                .map((branch, index) => {
                  const branchTasks = tasksByBranch.get(branch.name) || [];
                  return (
                    <div key={branch.id}>
                      <TaskTable tasks={branchTasks} branchName={branch.name} branchColorIndex={index} onTaskClick={handleTaskClick} />
                    </div>
                  );
                })
            }
          </div>
        )
      )}
    </div>
  );
};
