import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useTaskData } from '../components/tasks/useTaskData';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';
import { TaskDetailSkeleton } from '../components/tasks/Skeletons';
import type { ArchiveFiltersState } from '../components/tasks/ArchiveFiltersPanel';
import { useTaskModals } from '../components/tasks/useTaskModals';
import { useTaskActions } from '../components/tasks/useTaskActions';
import {
  handleTelegramClick as handleTelegramClickHelper,
  formatInvoiceExtractedText,
  formatBxmAmountInSum as formatBxmAmountInSumHelper,
} from '../components/tasks/taskBusinessHelpers';
import type { TasksProps } from '../components/tasks/types';

import { useTaskFilters } from '../hooks/useTaskFilters';
import { useTaskExport } from '../hooks/useTaskExport';
import { useTaskSocket } from '../hooks/useTaskSocket';

import { TasksHeader } from '../components/tasks/TasksHeader';
import { TaskStatsCards } from '../components/tasks/TaskStatsCards';
import { TasksModalsManager } from '../components/tasks/TasksModalsManager';
import { TasksView } from '../components/tasks/TasksView';

const Tasks: React.FC<TasksProps> = ({ isModalMode = false, modalTaskId, onCloseModal }) => {
  const limit = 50; 
  const archiveLimit = 20; 

  const modals = useTaskModals();
  const { user } = useAuth();
  const {
    tasks, loading, clients, branches, workers, stats,
    page, setPage,
    selectedTask, setSelectedTask, loadingTask,
    taskDocuments, loadingDocuments,
    aiChecks, loadingAiChecks, taskVersions, loadingVersions,
    expandedDocuments, documentExtractedTexts, loadingExtractedTexts,
    loadTasks, loadClients, loadBranches, loadWorkers,
    loadTaskDetail, loadTaskVersions, loadTaskDocuments,
    loadAiChecks
  } = useTaskData(user?.role);
  
  const socket = useSocket();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', clientId: '', branchId: '', comments: '', hasPsr: false, afterHoursPayer: 'CLIENT' as 'CLIENT' | 'COMPANY', driverPhone: '',
  });
  const [editForm, setEditForm] = useState({
    title: '', clientId: '', branchId: '', comments: '', hasPsr: false, afterHoursPayer: 'CLIENT' as 'CLIENT' | 'COMPANY', driverPhone: '',
  });
  const filters = useMemo(() => ({ status: '', clientId: '', branchId: '' }), []);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilters, setArchiveFilters] = useState<ArchiveFiltersState>({
    branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '',
  });
  const [showArchiveFilters, setShowArchiveFilters] = useState(false);

  const isArchiveRoute = location.pathname.startsWith('/tasks/archive');
  const isArchiveFiltersRoute = location.pathname === '/tasks/archive/filters';
  const isNewTaskRoute = location.pathname === '/tasks/new';
  const editTaskMatch = location.pathname.match(/^\/tasks\/(\d+)\/edit$/);
  const editTaskId = editTaskMatch ? Number(editTaskMatch[1]) : null;

  const showArchiveFiltersPanel = showArchiveFilters || (isMobile && isArchiveFiltersRoute);

  const taskActions = useTaskActions({
    modals,
    selectedTask, setSelectedTask,
    showArchive, filters: filters as any,
    loadTaskDetail, loadTaskDocuments, loadTasks,
    user: user as any, branches: branches as any, isMobile,
    isNewTaskRoute, isArchiveRoute, editTaskId, navigate,
  });

  const {
    filteredArchiveTasks,
    archiveTotalTasks,
    archiveTotalPages,
    archivePageTasks,
    tasksByBranch,
    isDeklarantWithBranch,
    userBranch,
    userBranchTasks,
    getPageNumbers,
  } = useTaskFilters({
    tasks, branches, showArchive, archiveSearchQuery, archiveFilters, page, archiveLimit, user
  });

  const { exportToExcel, exportArchiveReport, reportLoading } = useTaskExport({
    tasks, filteredArchiveTasks, showArchive, archiveFilters, archiveSearchQuery
  });

  const selectedTaskIdRef = useRef<number | null>(null);
  useEffect(() => {
    selectedTaskIdRef.current = selectedTask?.id || null;
  }, [selectedTask]);

  useTaskSocket({
    socket, isModalMode, loadTasks, showArchive, filters, selectedTaskIdRef, loadTaskDetail
  });

  const handleTaskClick = (taskId: number) => {
    loadTaskDetail(taskId, {
      onLoaded: (taskData) => {
        modals.setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
        modals.setShowTaskModal(true);
      }
    });
  };

  const hasLoadedTaskModalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isModalMode && modalTaskId && hasLoadedTaskModalRef.current !== modalTaskId) {
      hasLoadedTaskModalRef.current = modalTaskId;
      const { setAfterHoursDeclaration, setShowTaskModal } = modals;
      loadTaskDetail(modalTaskId, {
        onLoaded: (taskData) => {
          setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
          setShowTaskModal(true);
        }
      });
    }
  }, [isModalMode, modalTaskId, loadTaskDetail, modals.setAfterHoursDeclaration, modals.setShowTaskModal]);

  const modalWasOpenRef = useRef(false);
  useEffect(() => {
    if (isModalMode && modals.showTaskModal) {
      modalWasOpenRef.current = true;
    }
    if (isModalMode && !modals.showTaskModal && modalWasOpenRef.current) {
      modalWasOpenRef.current = false;
      onCloseModal?.();
    }
  }, [isModalMode, modals.showTaskModal, onCloseModal]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [filters.status, filters.clientId, showArchive, page, setPage]);

  useEffect(() => {
    if (showArchive && page !== 1) setPage(1);
  }, [showArchive, archiveSearchQuery, archiveFilters.branchId, archiveFilters.clientId, archiveFilters.startDate, archiveFilters.endDate, archiveFilters.hasPsr, page, setPage]);

  useEffect(() => {
    if (isModalMode) {
      loadClients(); loadBranches(); loadWorkers();
      return;
    }
    loadTasks(showArchive, filters as any);
    loadClients(); loadBranches(); loadWorkers();
  }, [showArchive, page, filters.status, filters.clientId, filters.branchId, isModalMode, loadTasks, loadClients, loadBranches, loadWorkers, filters]);

  useEffect(() => {
    if (!showArchive) {
      setArchiveSearchQuery('');
      setArchiveFilters({ branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '' });
    }
  }, [showArchive]);

  useEffect(() => {
    if (showArchive !== isArchiveRoute) setShowArchive(isArchiveRoute);
  }, [isArchiveRoute, showArchive]);

  useEffect(() => {
    if (isArchiveFiltersRoute && !showArchiveFilters) setShowArchiveFilters(true);
    if (!isArchiveFiltersRoute && showArchiveFilters && isMobile) setShowArchiveFilters(false);
  }, [isArchiveFiltersRoute, showArchiveFilters, isMobile]);

  useEffect(() => {
    if (branches.length > 0) {
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      if (oltiariqBranch && !form.branchId) {
        setForm((prev) => ({ ...prev, branchId: oltiariqBranch.id.toString() }));
      }
    }
  }, [branches.length, form.branchId]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (modals.showEditModal || editTaskId) {
          if (isMobile && editTaskId) navigate(isArchiveRoute ? '/tasks/archive' : '/tasks');
          else modals.setShowEditModal(false);
        } else if (modals.showTaskModal) {
          if (isModalMode) onCloseModal?.();
          else { modals.setShowTaskModal(false); setSelectedTask(null); }
        } else if (modals.showForm || isNewTaskRoute) {
          if (isMobile && isNewTaskRoute) navigate('/tasks');
          else modals.setShowForm(false);
        } else if (showArchiveFilters || isArchiveFiltersRoute) {
          if (isMobile && isArchiveFiltersRoute) navigate('/tasks/archive');
          else setShowArchiveFilters(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [
    modals.showForm, modals.showTaskModal, modals.showEditModal, showArchiveFilters,
    editTaskId, isMobile, isArchiveRoute, isArchiveFiltersRoute, isNewTaskRoute, navigate, isModalMode, onCloseModal, setSelectedTask, modals
  ]);

  const handleTelegramClick = async () => {
    if (!selectedTask) return;
    await handleTelegramClickHelper(selectedTask, setSelectedTask, branches);
  };
  
  const mergedTaskActions = {
    ...taskActions,
    handleTelegramClick
  };

  const formatBxmAmountInSum = (multiplier: number) =>
    formatBxmAmountInSumHelper(multiplier, modals.currentBxmUzs);

  return (
    <div className={isModalMode ? "" : "max-w-[1920px] mx-auto px-2 sm:px-4 space-y-6 sm:space-y-8 font-sans pb-24"}>
      {isModalMode && !modals.showTaskModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseModal?.(); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
            <TaskDetailSkeleton />
          </div>
        </div>
      )}
      {!isModalMode && (
        <div className="contents">
          <TasksHeader
            isMobile={isMobile}
            navigate={navigate}
            showArchive={showArchive}
            setShowArchive={setShowArchive}
            setPage={setPage}
            exportToExcel={exportToExcel}
            showArchiveFilters={showArchiveFilters}
            setShowArchiveFilters={setShowArchiveFilters}
            isArchiveFiltersRoute={isArchiveFiltersRoute}
            archiveSearchQuery={archiveSearchQuery}
            setArchiveSearchQuery={setArchiveSearchQuery}
            archiveFilters={archiveFilters}
            setArchiveFilters={setArchiveFilters}
            branches={branches}
            clients={clients}
            filteredArchiveTasksLength={filteredArchiveTasks.length}
            exportArchiveReport={exportArchiveReport}
            reportLoading={reportLoading}
            showArchiveFiltersPanel={showArchiveFiltersPanel}
            setShowForm={modals.setShowForm}
          />
        </div>
      )}

      <TaskStatsCards stats={stats} isModalMode={isModalMode} showArchive={showArchive} />

      <div className="flex flex-col">
        <TasksModalsManager
          modals={modals}
          taskActions={mergedTaskActions}
          form={form}
          setForm={setForm}
          editForm={editForm}
          setEditForm={setEditForm}
          errorForm={modals.errorForm}
          setErrorForm={modals.setErrorForm}
          clients={clients}
          branches={branches}
          workers={workers}
          isMobile={isMobile}
          isNewTaskRoute={isNewTaskRoute}
          isArchiveRoute={isArchiveRoute}
          editTaskId={editTaskId}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          taskDocuments={taskDocuments}
          taskVersions={taskVersions}
          aiChecks={aiChecks}
          expandedDocuments={expandedDocuments}
          documentExtractedTexts={documentExtractedTexts}
          loadingVersions={loadingVersions}
          loadingDocuments={loadingDocuments}
          loadingTask={loadingTask}
          loadingAiChecks={loadingAiChecks}
          loadingExtractedTexts={loadingExtractedTexts}
          user={user}
          isModalMode={isModalMode}
          onCloseModal={onCloseModal}
          loadTaskVersions={loadTaskVersions}
          loadAiChecks={loadAiChecks}
          loadTasks={loadTasks}
          loadTaskDocuments={loadTaskDocuments}
          showArchive={showArchive}
          filters={filters}
          formatInvoiceExtractedText={formatInvoiceExtractedText}
          formatBxmAmountInSum={formatBxmAmountInSum}
        />

        <TasksView
          loading={loading}
          showArchive={showArchive}
          archivePageTasks={archivePageTasks}
          archiveTotalPages={archiveTotalPages}
          archiveTotalTasks={archiveTotalTasks}
          page={page}
          setPage={setPage}
          getPageNumbers={getPageNumbers}
          isDeklarantWithBranch={isDeklarantWithBranch}
          userBranchTasks={userBranchTasks}
          userBranch={userBranch}
          branches={branches}
          tasksByBranch={tasksByBranch}
          isMobile={isMobile}
          handleTaskClick={handleTaskClick}
        />
      </div>
    </div>
  );
};

export default Tasks;
