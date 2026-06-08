import { useMemo } from 'react';
import type { Task, Branch } from '../components/tasks/types';
import type { ArchiveFiltersState } from '../components/tasks/ArchiveFiltersPanel';

interface UseTaskFiltersProps {
  tasks: Task[] | null;
  branches: Branch[];
  showArchive: boolean;
  archiveSearchQuery: string;
  archiveFilters: ArchiveFiltersState;
  page: number;
  archiveLimit: number;
  user: any;
}

export const useTaskFilters = ({
  tasks,
  branches,
  showArchive,
  archiveSearchQuery,
  archiveFilters,
  page,
  archiveLimit,
  user
}: UseTaskFiltersProps) => {

  // Filter archive tasks
  const filteredArchiveTasks = useMemo(() => {
    if (!showArchive || !Array.isArray(tasks)) return [];

    let filtered = tasks;

    // Search filter
    if (archiveSearchQuery.trim()) {
      const query = archiveSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(query) ||
        task.client.name.toLowerCase().includes(query)
      );
    }

    // Branch filter
    if (archiveFilters.branchId) {
      filtered = filtered.filter((task) =>
        task.branch.id.toString() === archiveFilters.branchId
      );
    }

    // Client filter
    if (archiveFilters.clientId) {
      filtered = filtered.filter((task) =>
        task.client.id.toString() === archiveFilters.clientId
      );
    }

    // Date range filter
    if (archiveFilters.startDate) {
      const startDate = new Date(archiveFilters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.createdAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= startDate;
      });
    }

    if (archiveFilters.endDate) {
      const endDate = new Date(archiveFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate <= endDate;
      });
    }

    // PSR filter
    if (archiveFilters.hasPsr !== '') {
      const hasPsr = archiveFilters.hasPsr === 'true';
      filtered = filtered.filter((task) => {
        return task.hasPsr === hasPsr;
      });
    }

    return filtered;
  }, [tasks, showArchive, archiveSearchQuery, archiveFilters]);

  const archiveTotalTasks = filteredArchiveTasks.length;
  const archiveTotalPages = Math.max(1, Math.ceil(archiveTotalTasks / archiveLimit));
  const archivePageTasks = filteredArchiveTasks.slice((page - 1) * archiveLimit, page * archiveLimit);

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
  const isDeklarantWithBranch = user?.role === 'DEKLARANT' && user?.branchId;
  const userBranch = isDeklarantWithBranch
    ? branches.find((b) => b.id === user.branchId)
    : null;

  // Filter tasks for DEKLARANT - only show their branch
  const userBranchTasks = isDeklarantWithBranch && userBranch
    ? (Array.isArray(tasks) ? tasks.filter((task) => task.branch.id === user.branchId) : [])
    : [];

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return {
    filteredArchiveTasks,
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
