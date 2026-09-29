import { useMemo } from 'react';
import type { Task, Branch } from '../components/tasks/types';

interface UseTaskFiltersProps {
  tasks: Task[] | null;
  branches: Branch[];
  showArchive: boolean;
  /** Arxivda: serverdagi filtrlangan yozuvlar soni va sahifalar soni */
  totalTasks: number;
  totalPages: number;
  user: { role?: string; branchId?: number | null } | null;
}

export const useTaskFilters = ({
  tasks,
  branches,
  showArchive,
  totalTasks,
  totalPages,
  user
}: UseTaskFiltersProps) => {

  // Arxiv qidiruvi, filtrlari va sahifalash serverda (GET /tasks) — `tasks` joriy sahifaning o'zi
  const archiveTotalTasks = showArchive ? totalTasks : 0;
  const archiveTotalPages = showArchive ? totalPages : 1;
  const archivePageTasks = useMemo(
    () => (showArchive && Array.isArray(tasks) ? tasks : []),
    [showArchive, tasks]
  );

  // Separate tasks by branch - dynamically group by all branches
  const tasksByBranch = useMemo(() => {
    if (!Array.isArray(tasks) || !Array.isArray(branches)) {
      return new Map<string, Task[]>();
    }

    const grouped = new Map<string, Task[]>();

    // Initialize all branches with empty arrays
    branches.forEach(branch => {
      grouped.set(branch.name, []);
    });

    // Group tasks by branch name
    tasks.forEach(task => {
      const branchName = task.branch?.name;
      if (branchName && grouped.has(branchName)) {
        grouped.get(branchName)!.push(task);
      }
    });

    return grouped;
  }, [tasks, branches]);

  // Check if user is DEKLARANT with a branch assigned
  const isDeklarantWithBranch = user?.role === 'DEKLARANT' && !!user?.branchId;
  const userBranch = isDeklarantWithBranch
    ? branches.find((b) => b.id === user?.branchId)
    : null;

  // Filter tasks for DEKLARANT - only show their branch
  const userBranchTasks = isDeklarantWithBranch && userBranch
    ? (Array.isArray(tasks) ? tasks.filter((task) => task.branch.id === user?.branchId) : [])
    : [];

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return {
    archiveTotalTasks,
    archiveTotalPages,
    archivePageTasks,
    tasksByBranch,
    isDeklarantWithBranch,
    userBranch,
    userBranchTasks,
    getPageNumbers,
  };
};
