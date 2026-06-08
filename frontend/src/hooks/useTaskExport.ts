import { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import type { Task } from '../components/tasks/types';
import type { ArchiveFiltersState, ReportColumnKey } from '../components/tasks/ArchiveFiltersPanel';
import { REPORT_COLUMNS } from '../components/tasks/ArchiveFiltersPanel';
import { calculateTotalDuration } from '../components/tasks/TaskTable';
import { getStatusInfo, formatDate } from '../components/tasks/taskHelpers';

interface UseTaskExportProps {
  tasks: Task[] | null;
  filteredArchiveTasks: Task[];
  showArchive: boolean;
  archiveFilters: ArchiveFiltersState;
  archiveSearchQuery: string;
}

export const useTaskExport = ({
  tasks,
  filteredArchiveTasks,
  showArchive,
  archiveFilters,
  archiveSearchQuery
}: UseTaskExportProps) => {
  const [reportLoading, setReportLoading] = useState(false);

  // Export to Excel function
  const exportToExcel = async () => {
    const tasksToExport = showArchive ? filteredArchiveTasks : (Array.isArray(tasks) ? tasks : []);

    if (tasksToExport.length === 0) {
      toast.error('Eksport qilish uchun ma\'lumotlar yo\'q');
      return;
    }

    // Dynamic import — faqat kerak bo'lganda yuklanadi
    const XLSX = await import('xlsx');

    // Prepare data for Excel
    const excelData = tasksToExport.map((task) => {
      const durationInfo = calculateTotalDuration(task);
      return {
        'Task nomi': task.title,
        'Mijoz': task.client.name,
        'Filial': task.branch.name,
        'Status': getStatusInfo(task.status).label,
        'PSR': task.hasPsr ? 'Bor' : 'Yo\'q',
        'Sho\'pir tel': task.driverPhone || '-',
        'Izohlar': task.comments || '-',
        'Yaratilgan sana': formatDate(task.createdAt),
        'Yaratgan': task.createdBy?.name || '-',
        'Umumiy vaqt': durationInfo.text,
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Task nomi
      { wch: 20 }, // Mijoz
      { wch: 15 }, // Filial
      { wch: 15 }, // Status
      { wch: 10 }, // PSR
      { wch: 15 }, // Sho'pir tel
      { wch: 30 }, // Izohlar
      { wch: 18 }, // Yaratilgan sana
      { wch: 15 }, // Yaratgan
      { wch: 15 }, // Umumiy vaqt
    ];
    ws['!cols'] = colWidths;

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = showArchive
      ? `Arxiv_Tasks_${dateStr}.xlsx`
      : `Tasks_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  // Export Archive Report — backenddan invoice ma'lumotlarini olib, tanlangan ustunlar bo'yicha Excel yaratish
  const exportArchiveReport = async (selectedColumns: Record<ReportColumnKey, boolean>) => {
    try {
      setReportLoading(true);

      // Joriy filtrlarni query parametrlariga aylantirish
      const params = new URLSearchParams();
      if (archiveFilters.branchId) params.append('branchId', archiveFilters.branchId);
      if (archiveFilters.clientId) params.append('clientId', archiveFilters.clientId);
      if (archiveFilters.startDate) params.append('startDate', archiveFilters.startDate);
      if (archiveFilters.endDate) params.append('endDate', archiveFilters.endDate);
      if (archiveFilters.hasPsr) params.append('hasPsr', archiveFilters.hasPsr);
      if (archiveSearchQuery.trim()) params.append('search', archiveSearchQuery.trim());

      const response = await apiClient.get(`/tasks/archive-report?${params.toString()}`);
      const reportData = response.data;

      if (!Array.isArray(reportData) || reportData.length === 0) {
        toast.error('Hisobot uchun ma\'lumot topilmadi (invoice mavjud taslar yo\'q)');
        return;
      }

      // Tanlangan ustunlar bo'yicha ma'lumotlarni tayyorlash
      let activeColumns = (Object.entries(selectedColumns) as [ReportColumnKey, boolean][])
        .filter(([, v]) => v)
        .map(([key]) => key);
        
      if (activeColumns.includes('invoiceDate')) {
        activeColumns = ['invoiceDate', ...activeColumns.filter(c => c !== 'invoiceDate')];
      }

      const excelData = reportData.map((row: any) => {
        const obj: Record<string, unknown> = {};
        for (const key of activeColumns) {
          const label = REPORT_COLUMNS[key];
          if (key === 'totalAmount') {
            obj[label] = row.totalAmount != null ? Number(row.totalAmount) : 0;
          } else if (key === 'invoiceDate') {
            obj[label] = row[key] ? formatDate(row[key]) : '';
          } else {
            obj[label] = row[key] || '';
          }
        }
        return obj;
      });

      // Excel yaratish (dynamic import)
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hisobot');

      // Ustun kengliklarini o'rnatish
      const colWidths = activeColumns.map((key) => {
        if (key === 'productNames') return { wch: 50 };
        if (key === 'sellerName' || key === 'buyerName') return { wch: 30 };
        if (key === 'customsAddress' || key === 'deliveryTerms') return { wch: 25 };
        if (key === 'totalAmount') return { wch: 18 };
        return { wch: 20 };
      });
      ws['!cols'] = colWidths;

      // Fayl nomi
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `Arxiv_Hisobot_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Hisobot yuklab olindi (${reportData.length} ta yozuv)`);
    } catch (error: any) {
      console.error('Error generating archive report:', error);
      toast.error(error?.response?.data?.error || 'Hisobot yaratishda xatolik yuz berdi');
    } finally {
      setReportLoading(false);
    }
  };

  return {
    exportToExcel,
    exportArchiveReport,
    reportLoading
  };
};
